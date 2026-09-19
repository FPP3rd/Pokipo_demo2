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

const understandingOptions: ScoreOption[] = [
  {
    value: 4,
    label: "よく知ることができた",
  },
  {
    value: 3,
    label: "ある程度知ることができた",
  },
  {
    value: 2,
    label: "あまり知ることができなかった",
  },
  {
    value: 1,
    label: "知ることができなかった",
  },
];

export default function AfterSurveyPage() {
  const router =
    useRouter();

  const [
    preSurvey,
    setPreSurvey,
  ] = useState<PreSurvey | null>(
    null
  );

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

  const [
    renewalUnderstandingScore,
    setRenewalUnderstandingScore,
  ] = useState<number | null>(
    null
  );

  const [
    memorablePoint,
    setMemorablePoint,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    async function loadSurveyData() {
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
        data:
          completedData,

        error:
          completedError,
      } =
        await supabase.rpc(
          "has_completed_pokipo_post_survey",
          {
            p_participant_id:
              participantId,
          }
        );

      if (
        completedError
      ) {
        console.error(
          "参加後アンケート確認エラー:",
          completedError
        );

        setLoading(
          false
        );

        return;
      }

      if (
        completedData ===
        true
      ) {
        localStorage.setItem(
          "pokipo_post_survey_completed",
          "true"
        );

        router.replace(
          "/reward"
        );

        return;
      }

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_pokipo_pre_survey",
          {
            p_participant_id:
              participantId,
          }
        );

      if (
        error
      ) {
        console.error(
          "参加前アンケート取得エラー:",
          error
        );

        setMessage(
          "参加前アンケートの回答を読み込めませんでした。"
        );

        setLoading(
          false
        );

        return;
      }

      if (
        data &&
        data.length >
          0
      ) {
        setPreSurvey(
          data[0] as PreSurvey
        );
      }

      setLoading(
        false
      );
    }

    void loadSurveyData();
  }, [
    router,
  ]);

  function scoreLabel(
    type:
      | "interest"
      | "intent",
    value: number
  ) {
    const options =
      type ===
      "interest"
        ? interestOptions
        : intentOptions;

    return (
      options.find(
        (
          option
        ) =>
          option.value ===
          value
      )?.label ??
      ""
    );
  }

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

  async function submitSurvey() {
    if (
      interestScore ===
      null
    ) {
      setMessage(
        "① ポッキーへの興味を選択してください。"
      );

      return;
    }

    if (
      eatIntentScore ===
      null
    ) {
      setMessage(
        "② ポッキーを食べたい気持ちを選択してください。"
      );

      return;
    }

    if (
      shareIntentScore ===
      null
    ) {
      setMessage(
        "③ ポッキーをシェアしたい気持ちを選択してください。"
      );

      return;
    }

    if (
      renewalUnderstandingScore ===
      null
    ) {
      setMessage(
        "④ リニューアル内容の理解度を選択してください。"
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
          "submit_pokipo_post_survey",
          {
            p_participant_id:
              participantId,

            p_interest_score:
              interestScore,

            p_eat_intent_score:
              eatIntentScore,

            p_share_intent_score:
              shareIntentScore,

            p_renewal_understanding_score:
              renewalUnderstandingScore,

            p_memorable_point:
              memorablePoint.trim(),
          }
        );

      if (
        error
      ) {
        console.error(
          "参加後アンケート保存エラー:",
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
          "アンケートを保存できませんでした。通信環境を確認してください。"
        );

        return;
      }

      localStorage.setItem(
        "pokipo_post_survey_completed",
        "true"
      );

      router.replace(
        "/reward"
      );
    } catch (
      error
    ) {
      console.error(
        "参加後アンケート通信エラー:",
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

  if (
    loading
  ) {
    return (
      <MaintenanceGate page="survey_after">

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

  return (
    <MaintenanceGate page="survey_after">

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
              POKIPOを体験した後の、
              現在の気持ちを教えてください。
            </p>

          </header>

          {/* =================================
              BEFORE ANSWERS
          ================================= */}

          {preSurvey && (
            <section className="surveyBeforeSummary">

              <span>
                YOUR BEFORE ANSWERS
              </span>

              <h2>
                参加前のあなたの回答
              </h2>

              <p>
                参加前の回答を参考にしながら、
                現在の気持ちを回答してください。
              </p>

              <div className="surveyBeforeSummaryGrid">

                <div>

                  <span>
                    食べる頻度
                  </span>

                  <strong>
                    {preSurvey.pocky_frequency}
                  </strong>

                </div>

                <div>

                  <span>
                    リニューアル認知
                  </span>

                  <strong>
                    {preSurvey.knew_renewal
                      ? "知っていた"
                      : "知らなかった"}
                  </strong>

                </div>

                <div>

                  <span>
                    シェア経験
                  </span>

                  <strong>
                    {preSurvey.has_shared_pocky
                      ? "あり"
                      : "なし"}
                  </strong>

                </div>

                <div>

                  <span>
                    ポッキーへの興味
                  </span>

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

                  <span>
                    食べたい気持ち
                  </span>

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

                  <span>
                    シェア意向
                  </span>

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

                    <span>
                      シェアする場面
                    </span>

                    <p>
                      {preSurvey.share_situation}
                    </p>

                  </div>
                )}

            </section>
          )}

          <section className="surveyComparisonIntro">

            <span>
              BEFORE / AFTER
            </span>

            <h2>
              参加後の気持ちを教えてください
            </h2>

            <p>
              次の3問は参加前と同じ質問です。
              POKIPOを体験した現在の気持ちを選んでください。
            </p>

          </section>

          {/* Q1 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              01
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

          {/* Q2 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              02
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

          {/* Q3 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              03
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

          {/* Q4 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              04
            </div>

            <h2>
              POKIPOを通じて、ポッキーのリニューアル内容をどの程度知ることができましたか？
            </h2>

            {renderScoreQuestion(
              understandingOptions,
              renewalUnderstandingScore,
              setRenewalUnderstandingScore
            )}

          </section>

          {/* Q5 */}

          <section className="surveyQuestionCard">

            <div className="surveyQuestionNumber">
              05
            </div>

            <h2>
              POKIPOで一番印象に残ったことを教えてください
            </h2>

            <div className="surveyTextField">

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
                maxLength={
                  500
                }
                rows={
                  6
                }
                placeholder="自由に入力してください（任意）"
              />

              <span>
                {memorablePoint.length}/500
              </span>

            </div>

          </section>

          {message && (
            <p className="surveyError">
              {message}
            </p>
          )}

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
                : "回答して特典交換へ進む"}

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