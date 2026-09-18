"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type GenderValue =
  | "male"
  | "female"
  | "no_answer"
  | "";

type FrequencyValue =
  | "daily"
  | "weekly"
  | "monthly"
  | "half_year"
  | "never"
  | "";

type YesNoValue =
  | "yes"
  | "no"
  | "";

type ScaleValue =
  | 1
  | 2
  | 3
  | 4
  | null;

/* ========================================
   PAGE
======================================== */

export default function BeforeSurveyPage() {
  const router =
    useRouter();

  /* ========================================
     PARTICIPANT
  ======================================== */

  const [
    participantId,
    setParticipantId,
  ] = useState("");

  /* ========================================
     QUESTION 01
  ======================================== */

  const [
    gender,
    setGender,
  ] =
    useState<GenderValue>("");

  /* ========================================
     QUESTION 02
  ======================================== */

  const [
    pockyFrequency,
    setPockyFrequency,
  ] =
    useState<FrequencyValue>("");

  /* ========================================
     QUESTION 03
  ======================================== */

  const [
    renewalKnown,
    setRenewalKnown,
  ] =
    useState<YesNoValue>("");

  /* ========================================
     QUESTION 04
  ======================================== */

  const [
    hasShared,
    setHasShared,
  ] =
    useState<YesNoValue>("");

  const [
    shareSituation,
    setShareSituation,
  ] = useState("");

  /* ========================================
     FEELING
  ======================================== */

  const [
    interestScore,
    setInterestScore,
  ] =
    useState<ScaleValue>(
      null
    );

  const [
    wantToEatScore,
    setWantToEatScore,
  ] =
    useState<ScaleValue>(
      null
    );

  const [
    shareIntentionScore,
    setShareIntentionScore,
  ] =
    useState<ScaleValue>(
      null
    );

  /* ========================================
     UI
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     LOAD PARTICIPANT
  ======================================== */

  useEffect(() => {
    const savedParticipantId =
      localStorage.getItem(
        "pokipo_participant_id"
      ) ??
      localStorage.getItem(
        "pokipo_user_id"
      ) ??
      "";

    setParticipantId(
      savedParticipantId
    );

    if (
      !savedParticipantId
    ) {
      setMessage(
        "参加者情報を確認できませんでした。最初の登録画面からもう一度お試しください。"
      );
    }
  }, []);

  /* ========================================
     COMPLETE CHECK
  ======================================== */

  const isComplete =
    useMemo(
      () => {
        if (
          !gender ||
          !pockyFrequency ||
          !renewalKnown ||
          !hasShared
        ) {
          return false;
        }

        if (
          hasShared ===
            "yes" &&
          !shareSituation.trim()
        ) {
          return false;
        }

        if (
          interestScore ===
            null ||
          wantToEatScore ===
            null ||
          shareIntentionScore ===
            null
        ) {
          return false;
        }

        return true;
      },
      [
        gender,
        pockyFrequency,
        renewalKnown,
        hasShared,
        shareSituation,
        interestScore,
        wantToEatScore,
        shareIntentionScore,
      ]
    );

  /* ========================================
     SCALE LABEL
  ======================================== */

  function getScaleLabel(
    value: number
  ) {
    switch (
      value
    ) {
      case 1:
        return "あまりそう思わない";

      case 2:
        return "どちらかといえばそう思わない";

      case 3:
        return "どちらかといえばそう思う";

      case 4:
        return "とてもそう思う";

      default:
        return "";
    }
  }

  /* ========================================
     SUBMIT
  ======================================== */

  async function submitSurvey(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !participantId
    ) {
      setMessage(
        "参加者情報を確認できませんでした。最初の登録画面からもう一度お試しください。"
      );

      return;
    }

    if (
      !isComplete
    ) {
      setMessage(
        "未回答の項目があります。すべての質問に回答してください。"
      );

      return;
    }

    setLoading(
      true
    );

    setMessage("");

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "pokipo_pre_surveys"
          )
          .upsert(
            {
              participant_id:
                participantId,

              gender,

              pocky_frequency:
                pockyFrequency,

              renewal_known:
                renewalKnown,

              has_shared_pocky:
                hasShared,

              share_situation:
                hasShared ===
                "yes"
                  ? shareSituation.trim()
                  : null,

              interest_score:
                interestScore,

              want_to_eat_score:
                wantToEatScore,

              share_intention_score:
                shareIntentionScore,
            },
            {
              onConflict:
                "participant_id",
            }
          );

      if (
        error
      ) {
        console.error(
          "参加前アンケート保存エラー:",
          error
        );

        setMessage(
          `アンケートを保存できませんでした。${error.message}`
        );

        return;
      }

      localStorage.setItem(
        "pokipo_before_survey_completed",
        "true"
      );

      router.push(
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
        "通信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* ========================================
     SCALE BUTTONS
  ======================================== */

  function renderScaleButtons(
    value: ScaleValue,
    setter: (
      value: ScaleValue
    ) => void
  ) {
    return (
      <div className="surveyScaleGrid">

        {[1, 2, 3, 4].map(
          (
            score
          ) => (
            <button
              key={
                score
              }
              type="button"
              className={
                value ===
                score
                  ? "surveyScaleButton active"
                  : "surveyScaleButton"
              }
              onClick={() =>
                setter(
                  score as ScaleValue
                )
              }
            >

              <strong>
                {score}
              </strong>

              <span>
                {getScaleLabel(
                  score
                )}
              </span>

            </button>
          )
        )}

      </div>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="surveyPage">

        <header className="surveyHeader">

          <span className="surveyEyebrow">
            BEFORE POKIPO
          </span>

          <h1>
            参加前アンケート
          </h1>

          <p>
            POKIPOを始める前の
            あなたのことを教えてください。
          </p>

        </header>

        <form
          onSubmit={
            submitSurvey
          }
          className="surveyForm"
        >

          {/* 01 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              01
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                QUESTION
              </span>

              <h2>
                性別を教えてください。
              </h2>

              <div className="surveyChoiceGrid">

                <button
                  type="button"
                  className={
                    gender ===
                    "male"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setGender(
                      "male"
                    )
                  }
                >
                  男性
                </button>

                <button
                  type="button"
                  className={
                    gender ===
                    "female"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setGender(
                      "female"
                    )
                  }
                >
                  女性
                </button>

                <button
                  type="button"
                  className={
                    gender ===
                    "no_answer"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setGender(
                      "no_answer"
                    )
                  }
                >
                  回答しない
                </button>

              </div>

            </div>

          </section>

          {/* 02 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              02
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                QUESTION
              </span>

              <h2>
                ポッキーを食べる頻度は
                どれくらいですか？
              </h2>

              <div className="surveyChoiceGrid singleColumn">

                {[
                  {
                    value:
                      "daily",
                    label:
                      "毎日食べる",
                  },
                  {
                    value:
                      "weekly",
                    label:
                      "週1回",
                  },
                  {
                    value:
                      "monthly",
                    label:
                      "月1〜2回",
                  },
                  {
                    value:
                      "half_year",
                    label:
                      "半年に1回",
                  },
                  {
                    value:
                      "never",
                    label:
                      "食べない",
                  },
                ].map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      className={
                        pockyFrequency ===
                        item.value
                          ? "surveyChoice active"
                          : "surveyChoice"
                      }
                      onClick={() =>
                        setPockyFrequency(
                          item.value as FrequencyValue
                        )
                      }
                    >
                      {item.label}
                    </button>
                  )
                )}

              </div>

            </div>

          </section>

          {/* 03 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              03
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                QUESTION
              </span>

              <h2>
                2025年9月に
                ポッキーがリニューアルしたことを
                知っていましたか？
              </h2>

              <div className="surveyChoiceGrid">

                <button
                  type="button"
                  className={
                    renewalKnown ===
                    "yes"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setRenewalKnown(
                      "yes"
                    )
                  }
                >
                  知っていた
                </button>

                <button
                  type="button"
                  className={
                    renewalKnown ===
                    "no"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setRenewalKnown(
                      "no"
                    )
                  }
                >
                  知らなかった
                </button>

              </div>

            </div>

          </section>

          {/* 04 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              04
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                QUESTION
              </span>

              <h2>
                ポッキーを
                誰かとシェアして
                食べたことがありますか？
              </h2>

              <div className="surveyChoiceGrid">

                <button
                  type="button"
                  className={
                    hasShared ===
                    "yes"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() =>
                    setHasShared(
                      "yes"
                    )
                  }
                >
                  はい
                </button>

                <button
                  type="button"
                  className={
                    hasShared ===
                    "no"
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  onClick={() => {
                    setHasShared(
                      "no"
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
                "yes" && (
                <div className="surveyFreeText">

                  <label htmlFor="shareSituation">
                    どんなときに
                    シェアしますか？
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
                    placeholder="例：友達とお菓子を食べるとき"
                    rows={
                      4
                    }
                  />

                </div>
              )}

            </div>

          </section>

          {/* FEELING */}

          <section className="surveyFeelingHeader">

            <span>
              CURRENT FEELING
            </span>

            <h2>
              現在の気持ちを教えてください
            </h2>

            <p>
              それぞれ、
              今のあなたの気持ちに
              一番近いものを選んでください。
            </p>

          </section>

          {/* 05 */}

          <section className="surveyQuestionCard feeling">

            <div className="surveyQuestionNumber">
              05
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                BEFORE SCORE
              </span>

              <h2>
                ポッキーについて
                もっと知りたいと思いますか？
              </h2>

              {renderScaleButtons(
                interestScore,
                setInterestScore
              )}

            </div>

          </section>

          {/* 06 */}

          <section className="surveyQuestionCard feeling">

            <div className="surveyQuestionNumber">
              06
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                BEFORE SCORE
              </span>

              <h2>
                今、
                ポッキーを食べたいと思いますか？
              </h2>

              {renderScaleButtons(
                wantToEatScore,
                setWantToEatScore
              )}

            </div>

          </section>

          {/* 07 */}

          <section className="surveyQuestionCard feeling">

            <div className="surveyQuestionNumber">
              07
            </div>

            <div className="surveyQuestionBody">

              <span className="surveyQuestionLabel">
                BEFORE SCORE
              </span>

              <h2>
                今後、
                誰かとポッキーを
                シェアしてみたいと思いますか？
              </h2>

              {renderScaleButtons(
                shareIntentionScore,
                setShareIntentionScore
              )}

            </div>

          </section>

          {message && (
            <div className="surveyMessage">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="surveySubmitButton"
            disabled={
              !isComplete ||
              loading
            }
          >

            <span>

              <strong>
                {loading
                  ? "保存しています..."
                  : "POKIPOをはじめる"}
              </strong>

              <small>
                回答後、
                ホーム画面へ進みます
              </small>

            </span>

            <span className="buttonArrow">
              →
            </span>

          </button>

        </form>

      </section>

    </main>
  );
}