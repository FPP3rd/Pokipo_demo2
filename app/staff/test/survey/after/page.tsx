
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase-client";

import {
  getPokipoTestSession,
  getVerifiedTestStaffId,
} from "../../../../../lib/pokipo-test-data";

/* ========================================
   TYPES
======================================== */

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

type ScoreOption = {
  value: number;
  label: string;
};

/* ========================================
   OPTIONS
======================================== */

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

/* ========================================
   PAGE
======================================== */

export default function StaffTestAfterSurveyPage() {
  const router = useRouter();

  /* PRE SURVEY */
  const [preSurvey, setPreSurvey] =
    useState<PreSurvey | null>(null);

  /* ANSWERS */
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

  const [memorablePoint, setMemorablePoint] =
    useState("");

  /* STATUS */
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const session = await getPokipoTestSession();

        if (!active) return;

        if (!session.pre_survey) {
          setMessage(
            "参加前アンケートが未回答です。先に参加前アンケートの動作確認を行ってください。"
          );
          return;
        }

        const previous = session.pre_survey as unknown as PreSurvey;

        setPreSurvey(previous);

        // 保存済みの検証回答があれば再表示
        if (session.post_survey) {
          const saved = session.post_survey as Record<
            string,
            unknown
          >;

          if (typeof saved.interest_score === "number") {
            setInterestScore(saved.interest_score);
          }

          if (
            typeof saved.eat_intent_score === "number"
          ) {
            setEatIntentScore(saved.eat_intent_score);
          }

          if (
            typeof saved.share_intent_score === "number"
          ) {
            setShareIntentScore(saved.share_intent_score);
          }

          if (
            typeof saved.renewal_understanding_score ===
            "number"
          ) {
            setRenewalUnderstandingScore(
              saved.renewal_understanding_score
            );
          }

          if (typeof saved.memorable_point === "string") {
            setMemorablePoint(saved.memorable_point);
          }
        }

        setReady(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "検証用アンケートを読み込めませんでした。"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  /* ========================================
     SCORE LABEL
  ======================================== */

  function scoreLabel(
    type: "interest" | "intent",
    value: number
  ) {
    const options =
      type === "interest"
        ? interestOptions
        : intentOptions;

    return (
      options.find((option) => option.value === value)
        ?.label ?? ""
    );
  }

  /* ========================================
     SCORE QUESTION
  ======================================== */

  function renderScoreQuestion(
    options: ScoreOption[],
    currentValue: number | null,
    setter: (value: number) => void
  ) {
    return (
      <div className="surveyScoreOptions">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              currentValue === option.value
                ? "surveyScoreOption active"
                : "surveyScoreOption"
            }
            onClick={() => setter(option.value)}
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
    if (submitting || !ready) return;

    if (interestScore === null) {
      setMessage(
        "① ポッキーへの興味を選択してください。"
      );
      return;
    }

    if (eatIntentScore === null) {
      setMessage(
        "② ポッキーを食べたい気持ちを選択してください。"
      );
      return;
    }

    if (shareIntentScore === null) {
      setMessage(
        "③ ポッキーをシェアしたい気持ちを選択してください。"
      );
      return;
    }

    if (renewalUnderstandingScore === null) {
      setMessage(
        "④ リニューアル内容の理解度を選択してください。"
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const staffId = await getVerifiedTestStaffId();
      const session = await getPokipoTestSession();

      if (session.staff_user_id !== staffId) {
        throw new Error(
          "ログイン情報と検証セッションが一致しません。"
        );
      }

      if (!session.pre_survey) {
        throw new Error(
          "参加前アンケートの回答が必要です。"
        );
      }

      const surveyAnswers = {
        interest_score: interestScore,
        eat_intent_score: eatIntentScore,
        share_intent_score: shareIntentScore,
        renewal_understanding_score:
          renewalUnderstandingScore,
        memorable_point: memorablePoint.trim() || null,
      };

      // 本番用 submit_pokipo_post_survey は呼び出さない
      const { data, error } = await supabase
        .from("pokipo_test_sessions")
        .update({
          post_survey: surveyAnswers,
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

      router.push("/staff/test");
    } catch (error) {
      console.error(
        "検証用参加後アンケート保存エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "アンケートの保存中にエラーが発生しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <div className="surveyLoading">
            検証用アンケートを読み込み中...
          </div>
        </section>
      </main>
    );
  }

  /* ========================================
     ACCESS ERROR
  ======================================== */

  if (!ready) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <header className="surveyHeader">
            <span>STAFF TEST</span>
            <h1>参加後アンケート</h1>
          </header>

          <p className="surveyError" role="alert">
            {message}
          </p>

          <button
            type="button"
            className="surveySubmitButton"
            onClick={() =>
              router.push("/staff/test/survey/before")
            }
          >
            参加前アンケートを開く →
          </button>

          <button
            type="button"
            className="rewardBackHomeButton"
            onClick={() => router.push("/staff/test")}
          >
            動作確認メニューへ戻る
          </button>
        </section>
      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">
      <section className="surveyPage">
        {/* HEADER */}
        <header className="surveyHeader">
          <span>AFTER POKIPO - STAFF TEST</span>

          <h1>参加後アンケート</h1>

          <p>
            POKIPOを体験した後の、
            現在の気持ちを教えてください。
          </p>
        </header>

        {/* TEST NOTICE */}
        <section className="surveyIntroCard">
          <strong>POKIPO動作確認モード</strong>
          <p>
            回答内容は検証専用データに保存します。
            本番のアンケート結果には反映されません。
          </p>
        </section>

        {/* BEFORE ANSWERS */}
        {preSurvey && (
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

          <h2>参加後の気持ちを教えてください</h2>

          <p>
            最初の3問は参加前と同じ質問です。
            POKIPOを体験した現在の気持ちを選んでください。
          </p>
        </section>

        {/* Q1 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">01</div>

          <h2>
            現在、ポッキーにどの程度興味がありますか？
          </h2>

          {renderScoreQuestion(
            interestOptions,
            interestScore,
            setInterestScore
          )}
        </section>

        {/* Q2 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">02</div>

          <h2>
            今後、ポッキーを食べたいと思いますか？
          </h2>

          {renderScoreQuestion(
            intentOptions,
            eatIntentScore,
            setEatIntentScore
          )}
        </section>

        {/* Q3 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">03</div>

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

        {/* Q4 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">04</div>

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

        {/* Q5 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">05</div>

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

        {/* MESSAGE */}
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
              ? "検証回答を保存中..."
              : "回答を保存して動作確認へ戻る"}
          </span>
          <strong>→</strong>
        </button>

        <button
          type="button"
          className="rewardBackHomeButton"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/staff/test")}
          disabled={submitting}
        >
          回答せずに戻る
        </button>
      </section>
    </main>
  );
}
