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

  const [
    nickname,
    setNickname,
  ] = useState("");

  /* ========================================
     SURVEY
  ======================================== */

  const [
    gender,
    setGender,
  ] = useState("");

  const [
    pockyFrequency,
    setPockyFrequency,
  ] = useState("");

  const [
    knewRenewal,
    setKnewRenewal,
  ] = useState<
    boolean | null
  >(null);

  const [
    hasSharedPocky,
    setHasSharedPocky,
  ] = useState<
    boolean | null
  >(null);

  const [
    shareSituation,
    setShareSituation,
  ] = useState("");

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

    setLoading(
      false
    );
  }, [
    router,
  ]);

  /* ========================================
     VALIDATION
  ======================================== */

  function validateForm() {
    if (
      !gender
    ) {
      return "性別を選択してください。";
    }

    if (
      !pockyFrequency
    ) {
      return "ポッキーを食べる頻度を選択してください。";
    }

    if (
      knewRenewal ===
      null
    ) {
      return "ポッキーのリニューアルを知っていたか選択してください。";
    }

    if (
      hasSharedPocky ===
      null
    ) {
      return "ポッキーをシェアしたことがあるか選択してください。";
    }

    if (
      hasSharedPocky &&
      !shareSituation.trim()
    ) {
      return "どんな時にポッキーをシェアするか入力してください。";
    }

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
      /*
        同じ参加者の参加前回答が
        すでに存在するか確認
      */

      const {
        data:
          existingData,

        error:
          existingError,
      } =
        await supabase
          .from(
            "pokipo_pre_surveys"
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
          "参加前アンケート確認エラー:",
          existingError
        );

        setErrorMessage(
          "アンケート情報を確認できませんでした。"
        );

        return;
      }

      const surveyPayload = {
        participant_id:
          participantId,

        gender,

        pocky_frequency:
          pockyFrequency,

        knew_renewal:
          knewRenewal,

        has_shared_pocky:
          hasSharedPocky,

        share_situation:
          hasSharedPocky
            ? shareSituation.trim()
            : null,

        interest_score:
          interestScore,

        eat_intent_score:
          eatIntentScore,

        share_intent_score:
          shareIntentScore,
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
              "pokipo_pre_surveys"
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
            "参加前アンケート更新エラー:",
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
              "pokipo_pre_surveys"
            )
            .insert(
              surveyPayload
            );

        if (
          error
        ) {
          console.error(
            "参加前アンケート保存エラー:",
            error
          );

          setErrorMessage(
            error.message
          );

          return;
        }
      }

      localStorage.setItem(
        "pokipo_pre_survey_completed",
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

      setErrorMessage(
        "通信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  /* ========================================
     SCORE BUTTON
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

        {/* HEADER */}

        <header className="surveyHeader">

          <span>
            BEFORE POKIPO
          </span>

          <h1>
            参加前アンケート
          </h1>

          <p>
            {nickname
              ? `${nickname}さん、`
              : ""}
            POKIPOを始める前の
            あなたの気持ちを教えてください。
          </p>

        </header>

        {/* 01 GENDER */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            01
          </span>

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
                value
              ) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  className={
                    gender ===
                    value
                      ? "surveyChoiceButton active"
                      : "surveyChoiceButton"
                  }
                  onClick={() =>
                    setGender(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}

          </div>

        </section>

        {/* 02 FREQUENCY */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            02
          </span>

          <h2>
            ポッキーを食べる頻度は
            どれくらいですか？
          </h2>

          <div className="surveyChoiceGrid single">

            {[
              "毎日食べる",
              "週1回",
              "月1〜2回",
              "半年に1回",
              "食べない",
            ].map(
              (
                value
              ) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  className={
                    pockyFrequency ===
                    value
                      ? "surveyChoiceButton active"
                      : "surveyChoiceButton"
                  }
                  onClick={() =>
                    setPockyFrequency(
                      value
                    )
                  }
                >
                  {value}
                </button>
              )
            )}

          </div>

        </section>

        {/* 03 RENEWAL */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            03
          </span>

          <h2>
            ポッキーがリニューアルしたことを
            知っていましたか？
          </h2>

          <div className="surveyChoiceGrid">

            <button
              type="button"
              className={
                knewRenewal ===
                true
                  ? "surveyChoiceButton active"
                  : "surveyChoiceButton"
              }
              onClick={() =>
                setKnewRenewal(
                  true
                )
              }
            >
              知っていた
            </button>

            <button
              type="button"
              className={
                knewRenewal ===
                false
                  ? "surveyChoiceButton active"
                  : "surveyChoiceButton"
              }
              onClick={() =>
                setKnewRenewal(
                  false
                )
              }
            >
              知らなかった
            </button>

          </div>

          <div className="surveyInfoBox">

            <strong>
              2025年9月2日から全面リニューアル
            </strong>

            <p>
              江崎グリコ株式会社では、
              ポッキーとポッキー極細を
              全面リニューアルしました。
            </p>

            <p>
              チョコレートには複数のカカオを
              ブレンドし、
              プレッツェルには国産全粒粉や
              発酵バターを新たに使用するなど、
              素材や味わいが見直されています。
            </p>

          </div>

        </section>

        {/* 04 SHARE */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            04
          </span>

          <h2>
            ポッキーをシェアして
            食べたことがありますか？
          </h2>

          <div className="surveyChoiceGrid">

            <button
              type="button"
              className={
                hasSharedPocky ===
                true
                  ? "surveyChoiceButton active"
                  : "surveyChoiceButton"
              }
              onClick={() =>
                setHasSharedPocky(
                  true
                )
              }
            >
              はい
            </button>

            <button
              type="button"
              className={
                hasSharedPocky ===
                false
                  ? "surveyChoiceButton active"
                  : "surveyChoiceButton"
              }
              onClick={() => {
                setHasSharedPocky(
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

          {hasSharedPocky ===
            true && (
            <div className="surveyTextAreaWrap">

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
                placeholder="例：友達と休み時間に食べる時"
                rows={
                  4
                }
              />

            </div>
          )}

        </section>

        {/* FEELINGS */}

        <section className="surveyFeelingSection">

          <span>
            BEFORE CHECK
          </span>

          <h2>
            現在の気持ちを教えてください
          </h2>

          <p>
            それぞれ4段階で
            選択してください。
          </p>

        </section>

        {/* 05 INTEREST */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            05
          </span>

          <h2>
            ポッキーに興味がありますか？
          </h2>

          {renderScoreButtons(
            interestScore,
            setInterestScore
          )}

        </section>

        {/* 06 EAT */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            06
          </span>

          <h2>
            ポッキーを食べたいと思いますか？
          </h2>

          {renderScoreButtons(
            eatIntentScore,
            setEatIntentScore
          )}

        </section>

        {/* 07 SHARE INTENT */}

        <section className="surveyQuestionCard">

          <span className="surveyQuestionNumber">
            07
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

        {/* ERROR */}

        {errorMessage && (
          <div className="surveyError">
            {errorMessage}
          </div>
        )}

        {/* SUBMIT */}

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
            : "回答してPOKIPOをはじめる"}
        </button>

      </section>

    </main>
  );
}