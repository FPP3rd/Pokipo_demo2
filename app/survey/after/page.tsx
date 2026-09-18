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

/* ========================================
   TYPES
======================================== */

type FourPointScore =
  | 1
  | 2
  | 3
  | 4
  | null;

type PreSurvey = {
  interest_score:
    number | null;

  eat_intent_score:
    number | null;

  share_intent_score:
    number | null;

  knew_renewal:
    boolean | null;

  has_shared_pocky:
    boolean | null;
};

/* ========================================
   PAGE
======================================== */

export default function AfterSurveyPage() {
  const router =
    useRouter();

  /* ========================================
     PARTICIPANT
  ======================================== */

  const [
    participantId,
    setParticipantId,
  ] = useState("");

  const [
    nickname,
    setNickname,
  ] = useState("");

  /* ========================================
     BEFORE SURVEY
  ======================================== */

  const [
    preSurvey,
    setPreSurvey,
  ] =
    useState<PreSurvey | null>(
      null
    );

  /* ========================================
     AFTER SURVEY
  ======================================== */

  const [
    interestScore,
    setInterestScore,
  ] =
    useState<FourPointScore>(
      null
    );

  const [
    eatIntentScore,
    setEatIntentScore,
  ] =
    useState<FourPointScore>(
      null
    );

  const [
    shareIntentScore,
    setShareIntentScore,
  ] =
    useState<FourPointScore>(
      null
    );

  const [
    renewalUnderstandingScore,
    setRenewalUnderstandingScore,
  ] =
    useState<FourPointScore>(
      null
    );

  const [
    memorablePoint,
    setMemorablePoint,
  ] = useState("");

  /* ========================================
     UI
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    async function loadSurvey() {
      const savedParticipantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      const savedNickname =
        localStorage.getItem(
          "pokipo_nickname"
        ) ?? "";

      if (
        !savedParticipantId
      ) {
        router.replace(
          "/"
        );

        return;
      }

      setParticipantId(
        savedParticipantId
      );

      setNickname(
        savedNickname
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_pre_surveys"
            )
            .select(
              "interest_score, eat_intent_score, share_intent_score, knew_renewal, has_shared_pocky"
            )
            .eq(
              "participant_id",
              savedParticipantId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            );

        if (
          error
        ) {
          console.error(
            "参加前アンケート取得エラー:",
            error
          );
        } else if (
          data &&
          data.length >
            0
        ) {
          setPreSurvey(
            data[0] as PreSurvey
          );
        }
      } catch (
        error
      ) {
        console.error(
          "参加前アンケート通信エラー:",
          error
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadSurvey();
  }, [
    router,
  ]);

  /* ========================================
     SCORE LABEL
  ======================================== */

  function getScoreLabel(
    score:
      number | null
  ) {
    switch (
      score
    ) {
      case 1:
        return "そう思わない";

      case 2:
        return "あまりそう思わない";

      case 3:
        return "ややそう思う";

      case 4:
        return "とてもそう思う";

      default:
        return "回答なし";
    }
  }

  /* ========================================
     SCALE
  ======================================== */

  function renderScoreButtons(
    value: FourPointScore,
    setter: (
      score: FourPointScore
    ) => void
  ) {
    const options = [
      {
        value:
          1 as const,

        label:
          "そう思わない",
      },
      {
        value:
          2 as const,

        label:
          "あまりそう思わない",
      },
      {
        value:
          3 as const,

        label:
          "ややそう思う",
      },
      {
        value:
          4 as const,

        label:
          "とてもそう思う",
      },
    ];

    return (
      <div className="surveyScaleGrid">

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
                value ===
                option.value
                  ? "surveyScaleButton active"
                  : "surveyScaleButton"
              }
              onClick={() =>
                setter(
                  option.value
                )
              }
            >
              <strong>
                {option.value}
              </strong>

              <span>
                {option.label}
              </span>
            </button>
          )
        )}

      </div>
    );
  }

  /* ========================================
     VALIDATION
  ======================================== */

  function validateForm() {
    if (
      interestScore ===
      null
    ) {
      return "ポッキーへの興味を選択してください。";
    }

    if (
      eatIntentScore ===
      null
    ) {
      return "ポッキーを食べたい気持ちを選択してください。";
    }

    if (
      shareIntentScore ===
      null
    ) {
      return "ポッキーをシェアしたい気持ちを選択してください。";
    }

    if (
      renewalUnderstandingScore ===
      null
    ) {
      return "リニューアルへの理解度を選択してください。";
    }

    return "";
  }

  /* ========================================
     SUBMIT
  ======================================== */

  async function submitSurvey() {
    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setErrorMessage(
        validationError
      );

      return;
    }

    if (
      !participantId
    ) {
      setErrorMessage(
        "参加者情報を確認できませんでした。"
      );

      return;
    }

    setSubmitting(
      true
    );

    setErrorMessage("");

    try {
      const {
        data:
          existingData,

        error:
          existingError,
      } =
        await supabase
          .from(
            "pokipo_post_surveys"
          )
          .select(
            "id"
          )
          .eq(
            "participant_id",
            participantId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            1
          );

      if (
        existingError
      ) {
        console.error(
          "参加後アンケート確認エラー:",
          existingError
        );

        setErrorMessage(
          "回答状況を確認できませんでした。"
        );

        return;
      }

      const surveyPayload = {
        participant_id:
          participantId,

        interest_score:
          interestScore,

        eat_intent_score:
          eatIntentScore,

        share_intent_score:
          shareIntentScore,

        renewal_understanding_score:
          renewalUnderstandingScore,

        memorable_point:
          memorablePoint.trim()
            ? memorablePoint.trim()
            : null,
      };

      if (
        existingData &&
        existingData.length >
          0
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "pokipo_post_surveys"
            )
            .update(
              surveyPayload
            )
            .eq(
              "id",
              existingData[0].id
            );

        if (
          error
        ) {
          console.error(
            "参加後アンケート更新エラー:",
            error
          );

          setErrorMessage(
            error.message
          );

          return;
        }
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "pokipo_post_surveys"
            )
            .insert(
              surveyPayload
            );

        if (
          error
        ) {
          console.error(
            "参加後アンケート保存エラー:",
            error
          );

          setErrorMessage(
            error.message
          );

          return;
        }
      }

      localStorage.setItem(
        "pokipo_post_survey_completed",
        "true"
      );

      router.push(
        "/reward"
      );
    } catch (
      error
    ) {
      console.error(
        "参加後アンケート通信エラー:",
        error
      );

      setErrorMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    loading
  ) {
    return (
      <main className="shell">

        <section className="surveyPage">

          <div className="surveyLoadingCard">
            読み込み中...
          </div>

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

        <header className="surveyHeader">

          <span>
            AFTER POKIPO
          </span>

          <h1>
            参加後アンケート
          </h1>

          <p>
            {nickname
              ? `${nickname}さん、`
              : ""}
            POKIPOを体験したあとの
            気持ちを教えてください。
          </p>

        </header>

        {/* BEFORE SUMMARY */}

        {preSurvey && (
          <section className="surveyBeforeSummary">

            <span>
              BEFORE
            </span>

            <h2>
              参加前の回答
            </h2>

            <p>
              参加前に回答した内容を
              参考として確認できます。
            </p>

            <div className="surveyBeforeSummaryGrid">

              <div>

                <span>
                  興味
                </span>

                <strong>
                  {preSurvey.interest_score ??
                    "—"} / 4
                </strong>

                <small>
                  {getScoreLabel(
                    preSurvey.interest_score
                  )}
                </small>

              </div>

              <div>

                <span>
                  食べたい
                </span>

                <strong>
                  {preSurvey.eat_intent_score ??
                    "—"} / 4
                </strong>

                <small>
                  {getScoreLabel(
                    preSurvey.eat_intent_score
                  )}
                </small>

              </div>

              <div>

                <span>
                  シェア意向
                </span>

                <strong>
                  {preSurvey.share_intent_score ??
                    "—"} / 4
                </strong>

                <small>
                  {getScoreLabel(
                    preSurvey.share_intent_score
                  )}
                </small>

              </div>

            </div>

          </section>
        )}

        {/* AFTER */}

        <section className="surveyFeelingSection">

          <span>
            AFTER CHECK
          </span>

          <h2>
            現在の気持ちを教えてください
          </h2>

          <p>
            参加前と同じ質問に
            もう一度回答してください。
          </p>

        </section>

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            01
          </span>

          <h2>
            ポッキーに興味がありますか？
          </h2>

          {renderScoreButtons(
            interestScore,
            setInterestScore
          )}

        </section>

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            02
          </span>

          <h2>
            ポッキーを食べたいと思いますか？
          </h2>

          {renderScoreButtons(
            eatIntentScore,
            setEatIntentScore
          )}

        </section>

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            03
          </span>

          <h2>
            誰かとポッキーを
            シェアしたいと思いますか？
          </h2>

          {renderScoreButtons(
            shareIntentScore,
            setShareIntentScore
          )}

        </section>

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            04
          </span>

          <h2>
            ポッキーのリニューアル内容を
            理解できましたか？
          </h2>

          {renderScoreButtons(
            renewalUnderstandingScore,
            setRenewalUnderstandingScore
          )}

        </section>

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            05
          </span>

          <h2>
            POKIPOで印象に残ったことを
            教えてください
          </h2>

          <div className="surveyTextAreaWrap">

            <textarea
              value={
                memorablePoint
              }
              onChange={(
                event
              ) =>
                setMemorablePoint(
                  event.target.value
                )
              }
              placeholder="例：ポッキーのリニューアルについて初めて知った"
              rows={
                5
              }
            />

          </div>

        </section>

        {errorMessage && (
          <div className="surveyError">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          className="surveySubmitButton"
          disabled={
            submitting
          }
          onClick={() =>
            void submitSurvey()
          }
        >
          {submitting
            ? "回答を保存中..."
            : "回答して特典を確認する"}
        </button>

      </section>

    </main>
  );
}