"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../../../lib/supabase-client";

import MaintenanceGate
  from "../../../components/MaintenanceGate";

/* ========================================
   SCORE OPTIONS
======================================== */

type ScoreOption = {
  value: number;
  label: string;
};

const interestOptions: ScoreOption[] = [
  {
    value: 4,
    label: "とても興味がある",
  },
  {
    value: 3,
    label: "やや興味がある",
  },
  {
    value: 2,
    label: "あまり興味がない",
  },
  {
    value: 1,
    label: "まったく興味がない",
  },
];

const intentOptions: ScoreOption[] = [
  {
    value: 4,
    label: "とても思う",
  },
  {
    value: 3,
    label: "やや思う",
  },
  {
    value: 2,
    label: "あまり思わない",
  },
  {
    value: 1,
    label: "まったく思わない",
  },
];

/* ========================================
   PAGE
======================================== */

export default function BeforeSurveyPage() {
  const router =
    useRouter();

  /* ========================================
     BASIC QUESTIONS
  ======================================== */

  const [
    gender,
    setGender,
  ] = useState("");

  const [
    frequency,
    setFrequency,
  ] = useState("");

  const [
    knewRenewal,
    setKnewRenewal,
  ] = useState<
    boolean | null
  >(null);

  const [
    hasShared,
    setHasShared,
  ] = useState<
    boolean | null
  >(null);

  const [
    shareSituation,
    setShareSituation,
  ] = useState("");

  /* ========================================
     PRE / POST COMPARISON
  ======================================== */

  const [
    interestScore,
    setInterestScore,
  ] = useState<number | null>(
    null
  );

  const [
    eatIntentScore,
    setEatIntentScore,
  ] = useState<number | null>(
    null
  );

  const [
    shareIntentScore,
    setShareIntentScore,
  ] = useState<number | null>(
    null
  );

  /* ========================================
     UI
  ======================================== */

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     ACCESS CHECK
  ======================================== */

  useEffect(() => {
    async function checkSurvey() {
      const participantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      if (
        !participantId
      ) {
        router.replace(
          "/"
        );

        return;
      }

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "has_completed_pokipo_pre_survey",
          {
            p_participant_id:
              participantId,
          }
        );

      if (
        error
      ) {
        console.error(
          "参加前アンケート確認エラー:",
          error
        );

        setLoading(
          false
        );

        return;
      }

      if (
        data === true
      ) {
        localStorage.setItem(
          "pokipo_pre_survey_completed",
          "true"
        );

        router.replace(
          "/home"
        );

        return;
      }

      setLoading(
        false
      );
    }

    void checkSurvey();
  }, [
    router,
  ]);

  /* ========================================
     SUBMIT
  ======================================== */

  async function submitSurvey() {
    if (
      !gender
    ) {
      setMessage(
        "① 性別を選択してください。"
      );

      return;
    }

    if (
      !frequency
    ) {
      setMessage(
        "② ポッキーを食べる頻度を選択してください。"
      );

      return;
    }

    if (
      knewRenewal ===
      null
    ) {
      setMessage(
        "③ リニューアルについて回答してください。"
      );

      return;
    }

    if (
      hasShared ===
      null
    ) {
      setMessage(
        "④ シェア経験について回答してください。"
      );

      return;
    }

    if (
      hasShared &&
      !shareSituation.trim()
    ) {
      setMessage(
        "ポッキーをどんな時にシェアするか入力してください。"
      );

      return;
    }

    if (
      interestScore ===
      null
    ) {
      setMessage(
        "⑤ ポッキーへの興味を選択してください。"
      );

      return;
    }

    if (
      eatIntentScore ===
      null
    ) {
      setMessage(
        "⑥ ポッキーを食べたい気持ちを選択してください。"
      );

      return;
    }

    if (
      shareIntentScore ===
      null
    ) {
      setMessage(
        "⑦ ポッキーをシェアしたい気持ちを選択してください。"
      );

      return;
    }

    const participantId =
      localStorage.getItem(
        "pokipo_participant_id"
      ) ??
      localStorage.getItem(
        "pokipo_user_id"
      );

    if (
      !participantId
    ) {
      setMessage(
        "参加者情報を確認できませんでした。"
      );

      return;
    }

    setSubmitting(
      true
    );

    setMessage("");

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "submit_pokipo_pre_survey",
          {
            p_participant_id:
              participantId,

            p_gender:
              gender,

            p_pocky_frequency:
              frequency,

            p_knew_renewal:
              knewRenewal,

            p_has_shared_pocky:
              hasShared,

            p_share_situation:
              hasShared
                ? shareSituation.trim()
                : "",

            p_interest_score:
              interestScore,

            p_eat_intent_score:
              eatIntentScore,

            p_share_intent_score:
              shareIntentScore,
          }
        );

      if (
        error
      ) {
        console.error(
          "参加前アンケート保存エラー:",
          {
            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,

            code:
              error.code,
          }
        );

        setMessage(
          "アンケートを保存できませんでした。通信環境を確認して、もう一度お試しください。"
        );

        return;
      }

      localStorage.setItem(
        "pokipo_pre_survey_completed",
        "true"
      );

      router.replace(
        "/home"
      );
    } catch (
      error
    ) {
      console.error(
        "参加前アンケート通信エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  /* ========================================
     SCORE QUESTION
  ======================================== */

  function renderScoreQuestion(
    options: ScoreOption[],
    currentValue: number | null,
    setter: (
      value: number
    ) => void
  ) {
    return (
      <div className="surveyScoreOptions">

        {options.map(
          (
            option
          ) => (
            <button
              key={
                option.value
              }
              type="button"
              className={
                currentValue ===
                option.value
                  ? "surveyScoreOption active"
                  : "surveyScoreOption"
              }
              onClick={() =>
                setter(
                  option.value
                )
              }
            >

              <span>
                {option.value}
              </span>

              <strong>
                {option.label}
              </strong>

            </button>
          )
        )}

      </div>
    );
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    loading
  ) {
    return (
      <MaintenanceGate>

        <main className="shell">

          <section className="surveyPage">

            <div className="surveyLoading">
              アンケート情報を確認中...
            </div>

          </section>

        </main>

      </MaintenanceGate>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <MaintenanceGate>

      <main className="shell">

        <section className="surveyPage">

          {/* =================================
              HEADER
          ================================= */}

          <header className="surveyHeader">

            <span>
              BEFORE POKIPO
            </span>

            <h1>
              参加前アンケート
            </h1>

            <p>
              POKIPOを体験する前の、
              あなたのポッキーに対する印象を教えてください。
            </p>

          </header>

          {/* =================================
              PROGRESS NOTICE
          ================================= */}

          <section className="surveyIntroCard">

            <strong>
              回答後、POKIPOがスタートします！
            </strong>

            <p>
              このアンケートはPOKIPO体験前後の変化を分析するために使用します。
            </p>

          </section>

          {/* =================================
              Q1
          ================================= */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              01
            </div>

            <h2>
              性別を教えてください
            </h2>

            <div className="surveyChoiceGrid">

              {[
                "男性",
                "女性",
                "回答しない",
              ].map(
                (
                  option
                ) => (
                  <button
                    key={
                      option
                    }
                    type="button"
                    className={
                      gender ===
                      option
                        ? "surveyChoice active"
                        : "surveyChoice"
                    }
                    onClick={() =>
                      setGender(
                        option
                      )
                    }
                  >
                    {option}
                  </button>
                )
              )}

            </div>

          </section>

          {/* =================================
              Q2
          ================================= */}

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
              ].map(
                (
                  option
                ) => (
                  <button
                    key={
                      option
                    }
                    type="button"
                    className={
                      frequency ===
                      option
                        ? "surveyChoice active"
                        : "surveyChoice"
                    }
                    onClick={() =>
                      setFrequency(
                        option
                      )
                    }
                  >
                    {option}
                  </button>
                )
              )}

            </div>

          </section>

          {/* =================================
              Q3
          ================================= */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              03
            </div>

            <h2>
              2025年9月にポッキーがリニューアルしたことを知っていましたか？
            </h2>

            <div className="surveyChoiceGrid two">

              <button
                type="button"
                className={
                  knewRenewal ===
                  true
                    ? "surveyChoice active"
                    : "surveyChoice"
                }
                onClick={() =>
                  setKnewRenewal(
                    true
                  )
                }
              >
                はい
              </button>

              <button
                type="button"
                className={
                  knewRenewal ===
                  false
                    ? "surveyChoice active"
                    : "surveyChoice"
                }
                onClick={() =>
                  setKnewRenewal(
                    false
                  )
                }
              >
                いいえ
              </button>

            </div>

          </section>

          {/* =================================
              Q4
          ================================= */}

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
                  hasShared ===
                  true
                    ? "surveyChoice active"
                    : "surveyChoice"
                }
                onClick={() =>
                  setHasShared(
                    true
                  )
                }
              >
                はい
              </button>

              <button
                type="button"
                className={
                  hasShared ===
                  false
                    ? "surveyChoice active"
                    : "surveyChoice"
                }
                onClick={() => {
                  setHasShared(
                    false
                  );

                  setShareSituation(
                    ""
                  );
                }}
              >
                いいえ
              </button>

            </div>

            {hasShared ===
              true && (
              <div className="surveyTextField">

                <label htmlFor="shareSituation">
                  どんな時にシェアしますか？
                </label>

                <textarea
                  id="shareSituation"
                  value={
                    shareSituation
                  }
                  onChange={(
                    event
                  ) =>
                    setShareSituation(
                      event.target.value
                    )
                  }
                  maxLength={
                    200
                  }
                  rows={
                    4
                  }
                  placeholder="例：友達と休み時間にお菓子を食べる時"
                />

                <span>
                  {shareSituation.length}/200
                </span>

              </div>
            )}

          </section>

          {/* =================================
              PRE / POST SECTION
          ================================= */}

          <section className="surveyComparisonIntro">

            <span>
              BEFORE / AFTER
            </span>

            <h2>
              現在の気持ちを教えてください
            </h2>

            <p>
              次の3問は、POKIPO体験後にも同じ質問をします。
              今の気持ちに最も近いものを選んでください。
            </p>

          </section>

          {/* =================================
              Q5
          ================================= */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              05
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

          {/* =================================
              Q6
          ================================= */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              06
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

          {/* =================================
              Q7
          ================================= */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              07
            </div>

            <h2>
              今後、ポッキーを誰かとシェアして食べたいと思いますか？
            </h2>

            {renderScoreQuestion(
              intentOptions,
              shareIntentScore,
              setShareIntentScore
            )}

          </section>

          {/* =================================
              MESSAGE
          ================================= */}

          {message && (
            <p className="surveyError">
              {message}
            </p>
          )}

          {/* =================================
              SUBMIT
          ================================= */}

          <button
            type="button"
            className="surveySubmitButton"
            onClick={
              submitSurvey
            }
            disabled={
              submitting
            }
          >

            <span>

              {submitting
                ? "回答を保存中..."
                : "回答してPOKIPOをはじめる"}

            </span>

            <strong>
              →
            </strong>

          </button>

        </section>

      </main>

    </MaintenanceGate>
  );
}