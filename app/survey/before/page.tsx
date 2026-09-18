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

type Score =
  | 1
  | 2
  | 3
  | 4
  | null;

/* ========================================
   SCORE OPTIONS
======================================== */

const scoreOptions = [
  {
    value: 1 as const,
    label: "そう思わない",
  },
  {
    value: 2 as const,
    label: "あまりそう思わない",
  },
  {
    value: 3 as const,
    label: "ややそう思う",
  },
  {
    value: 4 as const,
    label: "とてもそう思う",
  },
];

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
     BASIC QUESTIONS
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
  ] =
    useState<boolean | null>(
      null
    );

  const [
    hasSharedPocky,
    setHasSharedPocky,
  ] =
    useState<boolean | null>(
      null
    );

  const [
    shareSituation,
    setShareSituation,
  ] = useState("");

  /* ========================================
     SCORES
  ======================================== */

  const [
    interestScore,
    setInterestScore,
  ] =
    useState<Score>(
      null
    );

  const [
    eatIntentScore,
    setEatIntentScore,
  ] =
    useState<Score>(
      null
    );

  const [
    shareIntentScore,
    setShareIntentScore,
  ] =
    useState<Score>(
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
     LOAD PARTICIPANT
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

  function validate() {
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
      return "どんな時にシェアするか入力してください。";
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
      validate();

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
      const payload = {
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
          existingError.message
        );

        return;
      }

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
              payload
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
              payload
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
     SCORE BLOCK
  ======================================== */

  function ScoreQuestion({
    value,
    onChange,
  }: {
    value: Score;
    onChange: (
      value: Score
    ) => void;
  }) {
    return (
      <div className="beforeSurveyScoreGrid">

        {scoreOptions.map(
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
                  ? "beforeSurveyScoreButton active"
                  : "beforeSurveyScoreButton"
              }
              onClick={() =>
                onChange(
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
      <main className="beforeSurveyShell">

        <div className="beforeSurveyLoading">
          読み込み中...
        </div>

      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="beforeSurveyShell">

      <section className="beforeSurveyPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="beforeSurveyHeader">

          <div className="beforeSurveyHeaderBadge">
            BEFORE POKIPO
          </div>

          <h1>
            参加前アンケート
          </h1>

          <p>
            {nickname
              ? `${nickname}さん、`
              : ""}
            POKIPOを始める前の
            あなたのことを教えてください。
          </p>

        </header>

        {/* =================================
            GUIDE
        ================================= */}

        <section className="beforeSurveyGuide">

          <div>
            01
          </div>

          <p>
            回答は数分で完了します。
            POKIPO参加前後の変化を
            確認するために使用します。
          </p>

        </section>

        {/* =================================
            01 GENDER
        ================================= */}

        <section className="beforeSurveyCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              01
            </span>

            <div>

              <small>
                PROFILE
              </small>

              <h2>
                性別を教えてください
              </h2>

            </div>

          </div>

          <div className="beforeSurveyChoiceGrid three">

            {[
              "男性",
              "女性",
              "回答しない",
            ].map(
              (
                item
              ) => (
                <button
                  key={
                    item
                  }
                  type="button"
                  className={
                    gender ===
                    item
                      ? "beforeSurveyChoice active"
                      : "beforeSurveyChoice"
                  }
                  onClick={() =>
                    setGender(
                      item
                    )
                  }
                >
                  {item}
                </button>
              )
            )}

          </div>

        </section>

        {/* =================================
            02 FREQUENCY
        ================================= */}

        <section className="beforeSurveyCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              02
            </span>

            <div>

              <small>
                FREQUENCY
              </small>

              <h2>
                ポッキーを食べる頻度は
                どれくらいですか？
              </h2>

            </div>

          </div>

          <div className="beforeSurveyChoiceList">

            {[
              "毎日食べる",
              "週1回",
              "月1〜2回",
              "半年に1回",
              "食べない",
            ].map(
              (
                item
              ) => (
                <button
                  key={
                    item
                  }
                  type="button"
                  className={
                    pockyFrequency ===
                    item
                      ? "beforeSurveyChoiceRow active"
                      : "beforeSurveyChoiceRow"
                  }
                  onClick={() =>
                    setPockyFrequency(
                      item
                    )
                  }
                >

                  <span>
                    {item}
                  </span>

                  <strong>
                    {pockyFrequency ===
                    item
                      ? "✓"
                      : ""}
                  </strong>

                </button>
              )
            )}

          </div>

        </section>

        {/* =================================
            03 RENEWAL
        ================================= */}

        <section className="beforeSurveyCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              03
            </span>

            <div>

              <small>
                RENEWAL
              </small>

              <h2>
                ポッキーがリニューアルしたことを
                知っていましたか？
              </h2>

            </div>

          </div>

          <div className="beforeSurveyChoiceGrid two">

            <button
              type="button"
              className={
                knewRenewal ===
                true
                  ? "beforeSurveyChoice active"
                  : "beforeSurveyChoice"
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
                  ? "beforeSurveyChoice active"
                  : "beforeSurveyChoice"
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

          <div className="beforeSurveyRenewalInfo">

            <span>
              2025.09.02 RENEWAL
            </span>

            <h3>
              ポッキーとポッキー極細が
              全面リニューアル
            </h3>

            <p>
              瞬間的な「Share Happiness」ではなく、
              誰でも気軽に世代や境遇を超えて
              シェアできる、
              持続的な「Share Happiness」を
              作りたいという思いから
              全面リニューアルしました。
            </p>

            <div className="beforeSurveyRenewalGrid">

              <div>

                <strong>
                  チョコレート
                </strong>

                <p>
                  スパイシーな風味や
                  フローラル・フルーティーな香りを
                  持つ複数のカカオをブレンド。
                </p>

              </div>

              <div>

                <strong>
                  プレッツェル
                </strong>

                <p>
                  国産全粒粉5％、
                  発酵バター0.8％を新たに使用。
                  数百回の試作検証を実施。
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =================================
            04 SHARE
        ================================= */}

        <section className="beforeSurveyCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              04
            </span>

            <div>

              <small>
                SHARE
              </small>

              <h2>
                ポッキーをシェアして
                食べたことがありますか？
              </h2>

            </div>

          </div>

          <div className="beforeSurveyChoiceGrid two">

            <button
              type="button"
              className={
                hasSharedPocky ===
                true
                  ? "beforeSurveyChoice active"
                  : "beforeSurveyChoice"
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
                  ? "beforeSurveyChoice active"
                  : "beforeSurveyChoice"
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
            <div className="beforeSurveyTextareaBox">

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

        {/* =================================
            FEELINGS HEADER
        ================================= */}

        <section className="beforeSurveyFeelingHeader">

          <span>
            BEFORE CHECK
          </span>

          <h2>
            現在の気持ちを教えてください
          </h2>

          <p>
            それぞれ、
            今の気持ちに最も近いものを
            4段階で選んでください。
          </p>

        </section>

        {/* =================================
            05 INTEREST
        ================================= */}

        <section className="beforeSurveyCard scoreCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              05
            </span>

            <div>

              <small>
                INTEREST
              </small>

              <h2>
                ポッキーに興味がありますか？
              </h2>

            </div>

          </div>

          <ScoreQuestion
            value={
              interestScore
            }
            onChange={
              setInterestScore
            }
          />

        </section>

        {/* =================================
            06 EAT
        ================================= */}

        <section className="beforeSurveyCard scoreCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              06
            </span>

            <div>

              <small>
                EAT INTENT
              </small>

              <h2>
                ポッキーを食べたいと思いますか？
              </h2>

            </div>

          </div>

          <ScoreQuestion
            value={
              eatIntentScore
            }
            onChange={
              setEatIntentScore
            }
          />

        </section>

        {/* =================================
            07 SHARE INTENT
        ================================= */}

        <section className="beforeSurveyCard scoreCard">

          <div className="beforeSurveyQuestionHeader">

            <span>
              07
            </span>

            <div>

              <small>
                SHARE INTENT
              </small>

              <h2>
                誰かとポッキーを
                シェアしたいと思いますか？
              </h2>

            </div>

          </div>

          <ScoreQuestion
            value={
              shareIntentScore
            }
            onChange={
              setShareIntentScore
            }
          />

        </section>

        {/* =================================
            ERROR
        ================================= */}

        {errorMessage && (
          <div className="beforeSurveyError">

            <span>
              !
            </span>

            <p>
              {errorMessage}
            </p>

          </div>
        )}

        {/* =================================
            SUBMIT
        ================================= */}

        <button
          type="button"
          className="beforeSurveySubmit"
          disabled={
            submitting
          }
          onClick={() =>
            void submitSurvey()
          }
        >

          <span>

            <strong>
              {submitting
                ? "回答を保存中..."
                : "回答してPOKIPOをはじめる"}
            </strong>

            {!submitting && (
              <small>
                ここからスタンプラリーがスタート
              </small>
            )}

          </span>

          {!submitting && (
            <b>
              →
            </b>
          )}

        </button>

      </section>

    </main>
  );
}