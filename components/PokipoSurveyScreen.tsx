
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase-client";
import {
  getPokipoTestSession,
  getVerifiedTestStaffId,
} from "../lib/pokipo-test-data";

type Props = {
  stage: "before" | "after";
  testMode?: boolean;
};

type PreSurvey = {
  gender: string;
  pocky_frequency: string;
  knew_renewal: boolean;
  has_shared_pocky: boolean;
  share_situation: string | null;
  interest_score: number;
  eat_intent_score: number;
  share_intent_score: number;
};

type SurveyAnswers = {
  interest_score: number;
  eat_intent_score: number;
  share_intent_score: number;
  renewal_understanding_score: number;
  memorable_point: string | null;
};

type ScoreOption = {
  value: number;
  label: string;
};

const interestOptions: ScoreOption[] = [
  { value: 4, label: "とても興味がある" },
  { value: 3, label: "やや興味がある" },
  { value: 2, label: "あまり興味がない" },
  { value: 1, label: "まったく興味がない" },
];

const intentOptions: ScoreOption[] = [
  { value: 4, label: "とても思う" },
  { value: 3, label: "やや思う" },
  { value: 2, label: "あまり思わない" },
  { value: 1, label: "まったく思わない" },
];

const understandingOptions: ScoreOption[] = [
  { value: 4, label: "よく知ることができた" },
  { value: 3, label: "ある程度知ることができた" },
  { value: 2, label: "あまり知ることができなかった" },
  { value: 1, label: "知ることができなかった" },
];

function getParticipantId(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("pokipo_participant_id") ??
    localStorage.getItem("pokipo_user_id") ??
    ""
  );
}

function isScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  );
}

function scoreLabel(
  type: "interest" | "intent",
  value: number
): string {
  const options =
    type === "interest"
      ? interestOptions
      : intentOptions;

  return (
    options.find((item) => item.value === value)?.label ??
    ""
  );
}

export default function PokipoSurveyScreen({
  stage,
  testMode = false,
}: Props) {
  const router = useRouter();
  const before = stage === "before";

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [preSurvey, setPreSurvey] =
    useState<PreSurvey | null>(null);

  const [gender, setGender] = useState("");
  const [frequency, setFrequency] = useState("");
  const [knewRenewal, setKnewRenewal] =
    useState<boolean | null>(null);
  const [hasShared, setHasShared] =
    useState<boolean | null>(null);
  const [shareSituation, setShareSituation] = useState("");

  const [interestScore, setInterestScore] =
    useState<number | null>(null);
  const [eatIntentScore, setEatIntentScore] =
    useState<number | null>(null);
  const [shareIntentScore, setShareIntentScore] =
    useState<number | null>(null);

  const [
    renewalUnderstandingScore,
    setRenewalUnderstandingScore,
  ] = useState<number | null>(null);

  const [memorablePoint, setMemorablePoint] = useState("");

  const returnPath = testMode
    ? "/staff/test"
    : before
    ? "/home"
    : "/reward";

  function restorePreSurvey(saved: Record<string, unknown>) {
    setGender(
      typeof saved.gender === "string" ? saved.gender : ""
    );
    setFrequency(
      typeof saved.pocky_frequency === "string"
        ? saved.pocky_frequency
        : ""
    );

    setKnewRenewal(
      typeof saved.knew_renewal === "boolean"
        ? saved.knew_renewal
        : null
    );

    setHasShared(
      typeof saved.has_shared_pocky === "boolean"
        ? saved.has_shared_pocky
        : null
    );

    setShareSituation(
      typeof saved.share_situation === "string"
        ? saved.share_situation
        : ""
    );

    setInterestScore(
      isScore(saved.interest_score)
        ? saved.interest_score
        : null
    );

    setEatIntentScore(
      isScore(saved.eat_intent_score)
        ? saved.eat_intent_score
        : null
    );

    setShareIntentScore(
      isScore(saved.share_intent_score)
        ? saved.share_intent_score
        : null
    );
  }

  function restorePostSurvey(saved: Record<string, unknown>) {
    setInterestScore(
      isScore(saved.interest_score)
        ? saved.interest_score
        : null
    );
    setEatIntentScore(
      isScore(saved.eat_intent_score)
        ? saved.eat_intent_score
        : null
    );
    setShareIntentScore(
      isScore(saved.share_intent_score)
        ? saved.share_intent_score
        : null
    );
    setRenewalUnderstandingScore(
      isScore(saved.renewal_understanding_score)
        ? saved.renewal_understanding_score
        : null
    );
    setMemorablePoint(
      typeof saved.memorable_point === "string"
        ? saved.memorable_point
        : ""
    );
  }

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setReady(false);
      setMessage("");

      try {
        if (testMode) {
          // スタッフ権限が確認できない場合は
          // 本番の処理へ切り替えずエラーにする。
          const session = await getPokipoTestSession();

          if (!active) return;

          if (before) {
            if (session.pre_survey) {
              restorePreSurvey(session.pre_survey);
            }
          } else {
            if (!session.pre_survey) {
              throw new Error(
                "先に参加前アンケートを回答してください。"
              );
            }

            setPreSurvey(
              session.pre_survey as PreSurvey
            );

            if (session.post_survey) {
              restorePostSurvey(session.post_survey);
            }
          }

          setReady(true);
          return;
        }

        // ここからは本番参加者専用の処理
        const participantId = getParticipantId();

        if (!participantId) {
          router.replace("/");
          return;
        }

        if (before) {
          const { data, error } = await supabase.rpc(
            "has_completed_pokipo_pre_survey",
            { p_participant_id: participantId }
          );

          if (error) {
            throw new Error(
              "参加前アンケートの状態を確認できませんでした。"
            );
          }

          if (data === true) {
            localStorage.setItem(
              "pokipo_pre_survey_completed",
              "true"
            );
            router.replace("/home");
            return;
          }
        } else {
          const { data: completed, error: completedError } =
            await supabase.rpc(
              "has_completed_pokipo_post_survey",
              { p_participant_id: participantId }
            );

          if (completedError) {
            throw new Error(
              "参加後アンケートの状態を確認できませんでした。"
            );
          }

          if (completed === true) {
            localStorage.setItem(
              "pokipo_post_survey_completed",
              "true"
            );
            router.replace("/reward");
            return;
          }

          const { data, error } = await supabase.rpc(
            "get_pokipo_pre_survey",
            { p_participant_id: participantId }
          );

          if (error) {
            throw new Error(
              "参加前アンケートの回答を読み込めませんでした。"
            );
          }

          if (Array.isArray(data) && data.length > 0) {
            setPreSurvey(data[0] as PreSurvey);
          }
        }

        if (active) setReady(true);
      } catch (error) {
        console.error("アンケート読み込みエラー:", error);

        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "アンケートを読み込めませんでした。"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [stage, testMode, before, router]);

  /* ========================================
     SCORE QUESTION
  ======================================== */

  function renderScoreQuestion(
    options: ScoreOption[],
    value: number | null,
    setter: (value: number) => void
  ) {
    return (
      <div className="surveyScoreOptions">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              value === option.value
                ? "surveyScoreOption active"
                : "surveyScoreOption"
            }
            onClick={() => {
              setter(option.value);
              setMessage("");
            }}
            disabled={submitting}
          >
            <span>{option.value}</span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
    );
  }

  /* ========================================
     SUBMIT
  ======================================== */

  async function submitSurvey() {
    if (!ready || submitting) return;

    if (before) {
      if (!gender) {
        setMessage("① 性別を選択してください。");
        return;
      }

      if (!frequency) {
        setMessage(
          "② ポッキーを食べる頻度を選択してください。"
        );
        return;
      }

      if (knewRenewal === null) {
        setMessage(
          "③ リニューアルについて回答してください。"
        );
        return;
      }

      if (hasShared === null) {
        setMessage(
          "④ シェア経験について回答してください。"
        );
        return;
      }

      if (hasShared && !shareSituation.trim()) {
        setMessage(
          "ポッキーをどんな時にシェアするか入力してください。"
        );
        return;
      }
    }

    if (interestScore === null) {
      setMessage(
        before
          ? "⑤ ポッキーへの興味を選択してください。"
          : "① ポッキーへの興味を選択してください。"
      );
      return;
    }

    if (eatIntentScore === null) {
      setMessage(
        before
          ? "⑥ ポッキーを食べたい気持ちを選択してください。"
          : "② ポッキーを食べたい気持ちを選択してください。"
      );
      return;
    }

    if (shareIntentScore === null) {
      setMessage(
        before
          ? "⑦ ポッキーをシェアしたい気持ちを選択してください。"
          : "③ ポッキーをシェアしたい気持ちを選択してください。"
      );
      return;
    }

    if (!before && renewalUnderstandingScore === null) {
      setMessage(
        "④ リニューアル内容の理解度を選択してください。"
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      if (testMode) {
        // 検証専用の保存処理。
        // 本番アンケートRPCは絶対に呼ばない。
        const staffId = await getVerifiedTestStaffId();
        const session = await getPokipoTestSession();

        if (session.staff_user_id !== staffId) {
          throw new Error(
            "スタッフの検証セッションが一致しません。"
          );
        }

        if (before) {
          const answers: PreSurvey = {
            gender,
            pocky_frequency: frequency,
            knew_renewal: knewRenewal as boolean,
            has_shared_pocky: hasShared as boolean,
            share_situation: hasShared
              ? shareSituation.trim()
              : null,
            interest_score: interestScore,
            eat_intent_score: eatIntentScore,
            share_intent_score: shareIntentScore,
          };

          const { data, error } = await supabase
            .from("pokipo_test_sessions")
            .update({
              pre_survey: answers,
              updated_at: new Date().toISOString(),
            })
            .eq("staff_user_id", staffId)
            .select("staff_user_id")
            .single();

          if (error || !data) {
            throw new Error(
              error?.message ??
                "検証用アンケートを保存できませんでした。"
            );
          }
        } else {
          if (!session.pre_survey) {
            throw new Error(
              "参加前アンケートを先に回答してください。"
            );
          }

          const answers: SurveyAnswers = {
            interest_score: interestScore,
            eat_intent_score: eatIntentScore,
            share_intent_score: shareIntentScore,
            renewal_understanding_score:
              renewalUnderstandingScore as number,
            memorable_point:
              memorablePoint.trim() || null,
          };

          const { data, error } = await supabase
            .from("pokipo_test_sessions")
            .update({
              post_survey: answers,
              updated_at: new Date().toISOString(),
            })
            .eq("staff_user_id", staffId)
            .select("staff_user_id")
            .single();

          if (error || !data) {
            throw new Error(
              error?.message ??
                "検証用アンケートを保存できませんでした。"
            );
          }
        }

        router.replace("/staff/test");
        return;
      }

      // 本番参加者の保存処理
      const participantId = getParticipantId();

      if (!participantId) {
        throw new Error(
          "参加者情報を確認できませんでした。"
        );
      }

      if (before) {
        const { error } = await supabase.rpc(
          "submit_pokipo_pre_survey",
          {
            p_participant_id: participantId,
            p_gender: gender,
            p_pocky_frequency: frequency,
            p_knew_renewal: knewRenewal,
            p_has_shared_pocky: hasShared,
            p_share_situation: hasShared
              ? shareSituation.trim()
              : "",
            p_interest_score: interestScore,
            p_eat_intent_score: eatIntentScore,
            p_share_intent_score: shareIntentScore,
          }
        );

        if (error) throw new Error(error.message);

        localStorage.setItem(
          "pokipo_pre_survey_completed",
          "true"
        );

        router.replace("/home");
      } else {
        const { error } = await supabase.rpc(
          "submit_pokipo_post_survey",
          {
            p_participant_id: participantId,
            p_interest_score: interestScore,
            p_eat_intent_score: eatIntentScore,
            p_share_intent_score: shareIntentScore,
            p_renewal_understanding_score:
              renewalUnderstandingScore,
            p_memorable_point: memorablePoint.trim(),
          }
        );

        if (error) throw new Error(error.message);

        localStorage.setItem(
          "pokipo_post_survey_completed",
          "true"
        );

        router.replace("/reward");
      }
    } catch (error) {
      console.error("アンケート保存エラー:", error);

      setMessage(
        testMode && error instanceof Error
          ? error.message
          : "アンケートを保存できませんでした。通信環境を確認して、もう一度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ========================================
     LOADING / ACCESS ERROR
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <div className="surveyLoading">
            アンケート情報を確認中...
          </div>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <header className="surveyHeader">
            <span>
              {before ? "BEFORE POKIPO" : "AFTER POKIPO"}
            </span>
            <h1>
              {before
                ? "参加前アンケート"
                : "参加後アンケート"}
            </h1>
          </header>

          <p role="alert" className="surveyError">
            {message ||
              "アンケートを表示できませんでした。"}
          </p>

          {testMode && (
            <button
              type="button"
              className="rewardBackHomeButton"
              onClick={() => router.push("/staff/test")}
            >
              動作確認メニューへ戻る
            </button>
          )}
        </section>
      </main>
    );
  }

  /* ========================================
     SHARED SCREEN
  ======================================== */

  return (
    <main className="shell">
      <section className="surveyPage">
        <header className="surveyHeader">
          <span>
            {before
              ? "BEFORE POKIPO"
              : "AFTER POKIPO"}
            {testMode ? " - STAFF TEST" : ""}
          </span>

          <h1>
            {before
              ? "参加前アンケート"
              : "参加後アンケート"}
          </h1>

          <p>
            {before
              ? "POKIPOを体験する前の、あなたのポッキーに対する印象を教えてください。"
              : "POKIPOを体験した後の、現在の気持ちを教えてください。"}
          </p>
        </header>

        {before && !testMode && (
          <section className="surveyIntroCard">
            <strong>
              回答後、POKIPOがスタートします！
            </strong>

            <p>
              このアンケートはPOKIPO体験前後の変化を
              分析するために使用します。
            </p>
          </section>
        )}

        {testMode && (
          <section className="surveyIntroCard">
            <strong>LiPost動作確認モード</strong>
            <p>
              本番と同じアンケート画面を使用しています。
              回答は検証専用データにのみ保存されます。
            </p>
          </section>
        )}

        {/* BEFORE QUESTIONS */}
        {before && (
          <>
            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                01
              </div>
              <h2>性別を教えてください</h2>

              <div className="surveyChoiceGrid">
                {["男性", "女性", "回答しない"].map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        gender === option
                          ? "surveyChoice active"
                          : "surveyChoice"
                      }
                      disabled={submitting}
                      onClick={() => setGender(option)}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </section>

            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                02
              </div>
              <h2>
                ポッキーを食べる頻度はどれくらいですか？
              </h2>

              <div className="surveyChoiceList">
                {[
                  "毎日食べる",
                  "週1回",
                  "月1〜2回",
                  "半年に1回",
                  "食べない",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      frequency === option
                        ? "surveyChoice active"
                        : "surveyChoice"
                    }
                    disabled={submitting}
                    onClick={() => setFrequency(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                03
              </div>
              <h2>
                2025年9月にポッキーがリニューアルしたことを
                知っていましたか？
              </h2>

              <div className="surveyChoiceGrid two">
                <button
                  type="button"
                  className={
                    knewRenewal === true
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  disabled={submitting}
                  onClick={() => setKnewRenewal(true)}
                >
                  はい
                </button>

                <button
                  type="button"
                  className={
                    knewRenewal === false
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  disabled={submitting}
                  onClick={() => setKnewRenewal(false)}
                >
                  いいえ
                </button>
              </div>
            </section>

            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                04
              </div>
              <h2>
                ポッキーをシェアして食べたことがありますか？
              </h2>

              <div className="surveyChoiceGrid two">
                <button
                  type="button"
                  className={
                    hasShared === true
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  disabled={submitting}
                  onClick={() => setHasShared(true)}
                >
                  はい
                </button>

                <button
                  type="button"
                  className={
                    hasShared === false
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  disabled={submitting}
                  onClick={() => {
                    setHasShared(false);
                    setShareSituation("");
                  }}
                >
                  いいえ
                </button>
              </div>

              {hasShared === true && (
                <div className="surveyTextField">
                  <label htmlFor="shareSituation">
                    どんな時にシェアしますか？
                  </label>

                  <textarea
                    id="shareSituation"
                    value={shareSituation}
                    onChange={(event) =>
                      setShareSituation(event.target.value)
                    }
                    maxLength={200}
                    rows={4}
                    disabled={submitting}
                    placeholder="例：友達と休み時間にお菓子を食べる時"
                  />

                  <span>{shareSituation.length}/200</span>
                </div>
              )}
            </section>
          </>
        )}

        {/* PRE-SURVEY SUMMARY FOR AFTER */}
        {!before && preSurvey && (
          <section className="surveyBeforeSummary">
            <span>YOUR BEFORE ANSWERS</span>

            <h2>参加前のあなたの回答</h2>

            <p>
              参加前の回答を参考にしながら、
              現在の気持ちを回答してください。
            </p>

            <div className="surveyBeforeSummaryGrid">
              <div>
                <span>食べる頻度</span>
                <strong>
                  {preSurvey.pocky_frequency}
                </strong>
              </div>

              <div>
                <span>リニューアル認知</span>
                <strong>
                  {preSurvey.knew_renewal
                    ? "知っていた"
                    : "知らなかった"}
                </strong>
              </div>

              <div>
                <span>シェア経験</span>
                <strong>
                  {preSurvey.has_shared_pocky
                    ? "あり"
                    : "なし"}
                </strong>
              </div>

              <div>
                <span>ポッキーへの興味</span>
                <strong>
                  {preSurvey.interest_score}/4
                </strong>
                <small>
                  {scoreLabel(
                    "interest",
                    preSurvey.interest_score
                  )}
                </small>
              </div>

              <div>
                <span>食べたい気持ち</span>
                <strong>
                  {preSurvey.eat_intent_score}/4
                </strong>
                <small>
                  {scoreLabel(
                    "intent",
                    preSurvey.eat_intent_score
                  )}
                </small>
              </div>

              <div>
                <span>シェア意向</span>
                <strong>
                  {preSurvey.share_intent_score}/4
                </strong>
                <small>
                  {scoreLabel(
                    "intent",
                    preSurvey.share_intent_score
                  )}
                </small>
              </div>
            </div>

            {preSurvey.has_shared_pocky &&
              preSurvey.share_situation && (
                <div className="surveyBeforeShareSituation">
                  <span>シェアする場面</span>
                  <p>{preSurvey.share_situation}</p>
                </div>
              )}
          </section>
        )}

        {/* COMPARISON INTRO */}
        <section className="surveyComparisonIntro">
          <span>BEFORE / AFTER</span>

          <h2>
            {before
              ? "現在の気持ちを教えてください"
              : "参加後の気持ちを教えてください"}
          </h2>

          <p>
            {before
              ? "最初の3問は、POKIPO体験後にも同じ質問をします。今の気持ちに最も近いものを選んでください。"
              : "最初の3問は参加前と同じ質問です。POKIPOを体験した現在の気持ちを選んでください。"}
          </p>
        </section>

        {/* SHARED COMPARISON QUESTIONS */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">
            {before ? "05" : "01"}
          </div>

          <h2>
            現在、ポッキーにどの程度興味がありますか？
          </h2>

          {renderScoreQuestion(
            interestOptions,
            interestScore,
            setInterestScore
          )}
        </section>

        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">
            {before ? "06" : "02"}
          </div>

          <h2>
            今後、ポッキーを食べたいと思いますか？
          </h2>

          {renderScoreQuestion(
            intentOptions,
            eatIntentScore,
            setEatIntentScore
          )}
        </section>

        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">
            {before ? "07" : "03"}
          </div>

          <h2>
            今後、ポッキーを誰かとシェアして
            食べたいと思いますか？
          </h2>

          {renderScoreQuestion(
            intentOptions,
            shareIntentScore,
            setShareIntentScore
          )}
        </section>

        {/* AFTER-ONLY QUESTIONS */}
        {!before && (
          <>
            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                04
              </div>

              <h2>
                POKIPOを通じて、ポッキーのリニューアル内容を
                どの程度知ることができましたか？
              </h2>

              {renderScoreQuestion(
                understandingOptions,
                renewalUnderstandingScore,
                setRenewalUnderstandingScore
              )}
            </section>

            <section className="surveyQuestionCard">
              <div className="surveyQuestionNumber">
                05
              </div>

              <h2>
                POKIPOで一番印象に残ったことを教えてください
              </h2>

              <div className="surveyTextField">
                <textarea
                  value={memorablePoint}
                  onChange={(event) =>
                    setMemorablePoint(event.target.value)
                  }
                  maxLength={500}
                  rows={6}
                  placeholder="自由に入力してください（任意）"
                  disabled={submitting}
                />

                <span>{memorablePoint.length}/500</span>
              </div>
            </section>
          </>
        )}

        {/* ERROR */}
        {message && (
          <p className="surveyError" role="alert">
            {message}
          </p>
        )}

        {/* SUBMIT */}
        <button
          type="button"
          className="surveySubmitButton"
          onClick={() => void submitSurvey()}
          disabled={submitting}
        >
          <span>
            {submitting
              ? "回答を保存中..."
              : testMode
              ? "回答を保存して動作確認へ戻る"
              : before
              ? "回答してPOKIPOをはじめる"
              : "回答して特典交換へ進む"}
          </span>

          <strong>→</strong>
        </button>

        {testMode && (
          <button
            type="button"
            className="rewardBackHomeButton"
            style={{ marginTop: 16 }}
            onClick={() => router.push("/staff/test")}
            disabled={submitting}
          >
            回答せずに戻る
          </button>
        )}
      </section>
    </main>
  );
}
