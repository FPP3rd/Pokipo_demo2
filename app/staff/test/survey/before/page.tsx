
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../../../../lib/supabase-client";
import {
  getPokipoTestSession,
  getVerifiedTestStaffId,
} from "../../../../../lib/pokipo-test-data";

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

export default function StaffTestBeforeSurveyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const session = await getPokipoTestSession();

        if (!active) return;

        if (session.pre_survey) {
          const previous = session.pre_survey as Record<
            string,
            unknown
          >;

          setGender(String(previous.gender ?? ""));
          setFrequency(
            String(previous.pocky_frequency ?? "")
          );

          setKnewRenewal(
            typeof previous.knew_renewal === "boolean"
              ? previous.knew_renewal
              : null
          );

          setHasShared(
            typeof previous.has_shared_pocky === "boolean"
              ? previous.has_shared_pocky
              : null
          );

          setShareSituation(
            String(previous.share_situation ?? "")
          );

          setInterestScore(
            typeof previous.interest_score === "number"
              ? previous.interest_score
              : null
          );

          setEatIntentScore(
            typeof previous.eat_intent_score === "number"
              ? previous.eat_intent_score
              : null
          );

          setShareIntentScore(
            typeof previous.share_intent_score === "number"
              ? previous.share_intent_score
              : null
          );
        }

        setReady(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "検証セッションを確認できませんでした。"
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
          >
            <span>{option.value}</span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
    );
  }

  async function submitSurvey() {
    if (submitting) return;

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

    if (interestScore === null) {
      setMessage(
        "⑤ ポッキーへの興味を選択してください。"
      );
      return;
    }

    if (eatIntentScore === null) {
      setMessage(
        "⑥ ポッキーを食べたい気持ちを選択してください。"
      );
      return;
    }

    if (shareIntentScore === null) {
      setMessage(
        "⑦ ポッキーをシェアしたい気持ちを選択してください。"
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
          "検証セッションとログイン情報が一致しません。"
        );
      }

      const surveyAnswers = {
        gender,
        pocky_frequency: frequency,
        knew_renewal: knewRenewal,
        has_shared_pocky: hasShared,
        share_situation: hasShared
          ? shareSituation.trim()
          : null,
        interest_score: interestScore,
        eat_intent_score: eatIntentScore,
        share_intent_score: shareIntentScore,
      };

      // 検証用セッションだけに保存する
      // submit_pokipo_pre_survey は呼び出さない
      const { data, error } = await supabase
        .from("pokipo_test_sessions")
        .update({
          pre_survey: surveyAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq("staff_user_id", staffId)
        .select("staff_user_id")
        .single();

      if (error || !data) {
        throw new Error(
          error?.message ??
            "検証アンケートを保存できませんでした。"
        );
      }

      router.push("/staff/test");
    } catch (error) {
      console.error(
        "検証用参加前アンケート保存エラー:",
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

  if (!ready) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <p role="alert" className="surveyError">
            {message}
          </p>

          <button
            type="button"
            className="surveySubmitButton"
            onClick={() => router.push("/staff/test")}
          >
            動作確認メニューへ戻る
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="surveyPage">
        <header className="surveyHeader">
          <span>BEFORE POKIPO - STAFF TEST</span>
          <h1>参加前アンケート</h1>
          <p>
            POKIPOを体験する前の、あなたのポッキーに
            対する印象を教えてください。
          </p>
        </header>

        <section className="surveyIntroCard">
          <strong>POKIPO動作確認モード</strong>
          <p>
            回答内容は検証専用データに保存されます。
            本番のアンケート結果には反映されません。
          </p>
        </section>

        {/* Q1 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">01</div>
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
                  onClick={() => setGender(option)}
                >
                  {option}
                </button>
              )
            )}
          </div>
        </section>

        {/* Q2 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">02</div>
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
                onClick={() => setFrequency(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        {/* Q3 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">03</div>
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
              onClick={() => setKnewRenewal(false)}
            >
              いいえ
            </button>
          </div>
        </section>

        {/* Q4 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">04</div>
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
              <label htmlFor="testShareSituation">
                どんな時にシェアしますか？
              </label>

              <textarea
                id="testShareSituation"
                value={shareSituation}
                onChange={(event) =>
                  setShareSituation(event.target.value)
                }
                maxLength={200}
                rows={4}
                placeholder="例：友達と休み時間にお菓子を食べる時"
              />

              <span>{shareSituation.length}/200</span>
            </div>
          )}
        </section>

        <section className="surveyComparisonIntro">
          <span>BEFORE / AFTER</span>
          <h2>現在の気持ちを教えてください</h2>
          <p>
            最初の3問は、POKIPO体験後にも同じ質問をします。
            今の気持ちに最も近いものを選んでください。
          </p>
        </section>

        {/* Q5 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">05</div>
          <h2>
            現在、ポッキーにどの程度興味がありますか？
          </h2>
          {renderScoreQuestion(
            interestOptions,
            interestScore,
            setInterestScore
          )}
        </section>

        {/* Q6 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">06</div>
          <h2>
            今後、ポッキーを食べたいと思いますか？
          </h2>
          {renderScoreQuestion(
            intentOptions,
            eatIntentScore,
            setEatIntentScore
          )}
        </section>

        {/* Q7 */}
        <section className="surveyQuestionCard">
          <div className="surveyQuestionNumber">07</div>
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

        {message && (
          <p className="surveyError" role="alert">
            {message}
          </p>
        )}

        <button
          type="button"
          className="surveySubmitButton"
          onClick={() => void submitSurvey()}
          disabled={submitting}
        >
          <span>
            {submitting
              ? "検証回答を保存中..."
              : "回答を保存して動作確認に戻る"}
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
