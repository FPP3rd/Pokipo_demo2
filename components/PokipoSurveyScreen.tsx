"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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

type ExtraAnswers = {
  frequency_reason: string;
  frequency_reason_other: string | null;
  price_feeling: string | null;
  acceptable_price: number | null;
  development_understanding: number;
  development_topic: string;
  development_actor: string;
  development_action: string;
};

type PostAnswers = ExtraAnswers & {
  interest_score: number;
  eat_intent_score: number;
  share_intent_score: number;
  renewal_understanding_score: number;
  memorable_point: string | null;
};

const interestOptions = [
  "まったく興味がない",
  "あまり興味がない",
  "やや興味がある",
  "とても興味がある",
];

const intentOptions = [
  "まったく思わない",
  "あまり思わない",
  "やや思う",
  "とても思う",
];

const renewalOptions = [
  "知ることができなかった",
  "あまり知ることができなかった",
  "ある程度知ることができた",
  "よく知ることができた",
];

const developmentOptions = [
  "まったく深まらなかった",
  "あまり深まらなかった",
  "ある程度深まった",
  "とても深まった",
];

const frequencies = [
  "毎日食べる",
  "週1回",
  "月1〜2回",
  "半年に1回",
  "食べない",
];

const reasons = [
  "味や食感が関係しているから",
  "価格や購入しやすさが関係しているから",
  "食べる機会や習慣が関係しているから",
  "友人や家族とシェアする機会が関係しているから",
  "他のお菓子との好みや優先順位が関係しているから",
  "その他",
];

const priceFeelings = [
  "高いと感じる",
  "やや高いと感じる",
  "高いとも安いとも感じない",
  "やや安いと感じる",
  "安いと感じる",
];

const developmentTopics = [
  "カカオ農家の所得や生活の課題",
  "児童労働と教育機会の課題",
  "企業や地域社会による支援・取り組み",
  "消費者の選択と生産者のつながり",
  "特に印象に残ったものはない",
];

const developmentActors = [
  "農家や地域社会",
  "企業や流通業者",
  "政府や支援団体",
  "消費者",
  "さまざまな立場の協力",
];

const developmentActions = [
  "商品の生産背景について調べてみたい",
  "企業の社会的な取り組みを知りたい",
  "友人や家族と話してみたい",
  "普段の商品選びで意識してみたい",
  "特にない",
];

const PRICE_REASON = reasons[1];

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

export default function PokipoSurveyScreen({
  stage,
  testMode = false,
}: Props) {
  const router = useRouter();
  const before = stage === "before";

  const returnPath = testMode
    ? "/staff/test"
    : before
      ? "/home"
      : "/reward";

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

  const [shareSituation, setShareSituation] =
    useState("");

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

  const [frequencyReason, setFrequencyReason] =
    useState("");

  const [
    frequencyReasonOther,
    setFrequencyReasonOther,
  ] = useState("");

  const [priceFeeling, setPriceFeeling] =
    useState("");

  const [acceptablePrice, setAcceptablePrice] =
    useState(200);

  const [priceTouched, setPriceTouched] =
    useState(false);

  const [
    developmentUnderstanding,
    setDevelopmentUnderstanding,
  ] = useState<number | null>(null);

  const [developmentTopic, setDevelopmentTopic] =
    useState("");

  const [developmentActor, setDevelopmentActor] =
    useState("");

  const [developmentAction, setDevelopmentAction] =
    useState("");

  const [memorablePoint, setMemorablePoint] =
    useState("");

  function restorePre(s: PreSurvey) {
    setGender(s.gender ?? "");
    setFrequency(s.pocky_frequency ?? "");

    setKnewRenewal(
      typeof s.knew_renewal === "boolean"
        ? s.knew_renewal
        : null
    );

    setHasShared(
      typeof s.has_shared_pocky === "boolean"
        ? s.has_shared_pocky
        : null
    );

    setShareSituation(s.share_situation ?? "");

    setInterestScore(
      isScore(s.interest_score)
        ? s.interest_score
        : null
    );

    setEatIntentScore(
      isScore(s.eat_intent_score)
        ? s.eat_intent_score
        : null
    );

    setShareIntentScore(
      isScore(s.share_intent_score)
        ? s.share_intent_score
        : null
    );
  }

  function restorePost(s: Record<string, unknown>) {
    setInterestScore(
      isScore(s.interest_score)
        ? s.interest_score
        : null
    );

    setEatIntentScore(
      isScore(s.eat_intent_score)
        ? s.eat_intent_score
        : null
    );

    setShareIntentScore(
      isScore(s.share_intent_score)
        ? s.share_intent_score
        : null
    );

    setRenewalUnderstandingScore(
      isScore(s.renewal_understanding_score)
        ? s.renewal_understanding_score
        : null
    );

    setMemorablePoint(
      typeof s.memorable_point === "string"
        ? s.memorable_point
        : ""
    );

    setFrequencyReason(
      typeof s.frequency_reason === "string"
        ? s.frequency_reason
        : ""
    );

    setFrequencyReasonOther(
      typeof s.frequency_reason_other === "string"
        ? s.frequency_reason_other
        : ""
    );

    setPriceFeeling(
      typeof s.price_feeling === "string"
        ? s.price_feeling
        : ""
    );

    if (typeof s.acceptable_price === "number") {
      setAcceptablePrice(s.acceptable_price);
      setPriceTouched(true);
    }

    setDevelopmentUnderstanding(
      isScore(s.development_understanding)
        ? s.development_understanding
        : null
    );

    setDevelopmentTopic(
      typeof s.development_topic === "string"
        ? s.development_topic
        : ""
    );

    setDevelopmentActor(
      typeof s.development_actor === "string"
        ? s.development_actor
        : ""
    );

    setDevelopmentAction(
      typeof s.development_action === "string"
        ? s.development_action
        : ""
    );
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setReady(false);
      setMessage("");

      try {
        if (testMode) {
          const session = await getPokipoTestSession();

          if (!active) return;

          if (before) {
            if (session.pre_survey) {
              restorePre(session.pre_survey as PreSurvey);
            }
          } else {
            if (!session.pre_survey) {
              throw new Error(
                "参加前アンケートを先に回答してください。"
              );
            }

            setPreSurvey(
              session.pre_survey as PreSurvey
            );

            if (session.post_survey) {
              restorePost(
                session.post_survey as Record<string, unknown>
              );
            }
          }
        } else {
          const participantId = getParticipantId();

          if (!participantId) {
            router.replace("/");
            return;
          }

          if (before) {
            const { data, error } = await supabase.rpc(
              "has_completed_pokipo_pre_survey",
              {
                p_participant_id: participantId,
              }
            );

            if (error) throw error;

            if (data === true) {
              router.replace("/home");
              return;
            }
          } else {
            const {
              data: completed,
              error: completeError,
            } = await supabase.rpc(
              "has_completed_pokipo_post_survey",
              {
                p_participant_id: participantId,
              }
            );

            if (completeError) throw completeError;

            if (completed === true) {
              router.replace("/reward");
              return;
            }

            const { data, error } = await supabase.rpc(
              "get_pokipo_pre_survey",
              {
                p_participant_id: participantId,
              }
            );

            if (error) throw error;

            if (
              !Array.isArray(data) ||
              data.length === 0
            ) {
              throw new Error(
                "参加前アンケートの回答が見つかりません。"
              );
            }

            setPreSurvey(data[0] as PreSurvey);
          }
        }

        if (active) {
          setReady(true);
        }
      } catch (error) {
        console.error(
          "アンケート読み込みエラー:",
          error
        );

        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "アンケート情報を読み込めませんでした。"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [before, router, testMode]);

  function choice(
    options: readonly string[],
    value: string,
    setter: (v: string) => void
  ) {
    return (
      <div className="surveyChoiceList">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={
              value === option
                ? "surveyChoice active"
                : "surveyChoice"
            }
            disabled={submitting}
            onClick={() => {
              setter(option);
              setMessage("");
            }}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  function score(
    options: string[],
    value: number | null,
    setter: (v: number) => void
  ) {
    return (
      <div className="surveyScoreOptions">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={
              value === i + 1
                ? "surveyScoreOption active"
                : "surveyScoreOption"
            }
            disabled={submitting}
            onClick={() => {
              setter(i + 1);
              setMessage("");
            }}
          >
            <span>{i + 1}</span>
            <strong>{option}</strong>
          </button>
        ))}
      </div>
    );
  }

  function card(
    number: string,
    title: string,
    content: ReactNode
  ) {
    return (
      <section className="surveyQuestionCard">
        <div className="surveyQuestionNumber">
          {number}
        </div>

        <h2>{title}</h2>
        {content}
      </section>
    );
  }

  function part(
    no: string,
    heading: string,
    description: string
  ) {
    return (
      <section
        className="surveyComparisonIntro"
        style={{
          borderTop: "4px solid #c52230",
          marginTop: 24,
        }}
      >
        <span>{no}</span>
        <h2>{heading}</h2>
        <p>{description}</p>
      </section>
    );
  }

  async function submitSurvey() {
    if (!ready || submitting) return;

    if (before) {
      if (
        !gender ||
        !frequency ||
        knewRenewal === null ||
        hasShared === null ||
        (hasShared && !shareSituation.trim())
      ) {
        setMessage(
          "参加前アンケートの未回答項目を入力してください。"
        );
        return;
      }
    }

    if (
      interestScore === null ||
      eatIntentScore === null ||
      shareIntentScore === null
    ) {
      setMessage(
        "ポッキーについての3問すべてに回答してください。"
      );
      return;
    }

    if (!before) {
      if (
        !frequencyReason ||
        (
          frequencyReason === "その他" &&
          !frequencyReasonOther.trim()
        )
      ) {
        setMessage(
          "食べる頻度の理由を回答してください。"
        );
        return;
      }

      if (
        frequencyReason === PRICE_REASON &&
        (!priceFeeling || !priceTouched)
      ) {
        setMessage(
          "価格の追加質問2問に回答してください。"
        );
        return;
      }

      if (
        developmentUnderstanding === null ||
        !developmentTopic ||
        !developmentActor ||
        !developmentAction ||
        renewalUnderstandingScore === null
      ) {
        setMessage(
          "開発経済学・POKIPOについての未回答項目を入力してください。"
        );
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      if (testMode) {
        const staffId =
          await getVerifiedTestStaffId();

        const session =
          await getPokipoTestSession();

        if (session.staff_user_id !== staffId) {
          throw new Error(
            "検証セッションが一致しません。"
          );
        }

        const preAnswers: PreSurvey = {
          gender,
          pocky_frequency: frequency,
          knew_renewal: knewRenewal === true,
          has_shared_pocky: hasShared === true,
          share_situation: hasShared
            ? shareSituation.trim()
            : null,
          interest_score: interestScore,
          eat_intent_score: eatIntentScore,
          share_intent_score: shareIntentScore,
        };

        const postAnswers: PostAnswers = {
          interest_score: interestScore,
          eat_intent_score: eatIntentScore,
          share_intent_score: shareIntentScore,
          renewal_understanding_score:
            renewalUnderstandingScore ?? 1,
          memorable_point:
            memorablePoint.trim() || null,

          frequency_reason: frequencyReason,
          frequency_reason_other:
            frequencyReason === "その他"
              ? frequencyReasonOther.trim()
              : null,

          price_feeling:
            frequencyReason === PRICE_REASON
              ? priceFeeling
              : null,

          acceptable_price:
            frequencyReason === PRICE_REASON
              ? acceptablePrice
              : null,

          development_understanding:
            developmentUnderstanding ?? 1,

          development_topic: developmentTopic,
          development_actor: developmentActor,
          development_action: developmentAction,
        };

        const { data, error } = await supabase
          .from("pokipo_test_sessions")
          .update(
            before
              ? {
                  pre_survey: preAnswers,
                  updated_at:
                    new Date().toISOString(),
                }
              : {
                  post_survey: postAnswers,
                  updated_at:
                    new Date().toISOString(),
                }
          )
          .eq("staff_user_id", staffId)
          .select("staff_user_id")
          .single();

        if (error || !data) {
          throw new Error(
            error?.message ??
              "検証回答の保存に失敗しました。"
          );
        }

        router.replace("/staff/test");
        return;
      }

      const participantId = getParticipantId();

      if (!participantId) {
        throw new Error(
          "参加者情報が見つかりません。"
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
            p_share_intent_score:
              shareIntentScore,
          }
        );

        if (error) throw error;

        localStorage.setItem(
          "pokipo_pre_survey_completed",
          "true"
        );

        router.replace("/home");
        return;
      }

      const { error: extraError } =
        await supabase.rpc(
          "submit_pokipo_post_survey_extra",
          {
            p_participant_id: participantId,
            p_frequency_reason:
              frequencyReason,

            p_frequency_reason_other:
              frequencyReason === "その他"
                ? frequencyReasonOther.trim()
                : null,

            p_price_feeling:
              frequencyReason === PRICE_REASON
                ? priceFeeling
                : null,

            p_acceptable_price:
              frequencyReason === PRICE_REASON
                ? acceptablePrice
                : null,

            p_development_understanding:
              developmentUnderstanding,

            p_development_topic:
              developmentTopic,

            p_development_actor:
              developmentActor,

            p_development_action:
              developmentAction,
          }
        );

      if (extraError) throw extraError;

      const { error } = await supabase.rpc(
        "submit_pokipo_post_survey",
        {
          p_participant_id: participantId,
          p_interest_score: interestScore,
          p_eat_intent_score: eatIntentScore,
          p_share_intent_score:
            shareIntentScore,

          p_renewal_understanding_score:
            renewalUnderstandingScore,

          p_memorable_point:
            memorablePoint.trim(),
        }
      );

      if (error) throw error;

      localStorage.setItem(
        "pokipo_post_survey_completed",
        "true"
      );

      router.replace("/reward");
    } catch (error) {
      console.error(
        "アンケート保存エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? `保存できませんでした：${error.message}`
          : "回答の保存に失敗しました。"
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
            アンケート情報を確認しています...
          </div>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="shell">
        <section className="surveyPage">
          <p
            className="surveyError"
            role="alert"
          >
            {message ||
              "画面を開けませんでした。"}
          </p>

          <button
            type="button"
            className="rewardBackHomeButton"
            onClick={() =>
              router.push(returnPath)
            }
          >
            戻る
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="surveyPage">
        <header className="surveyComparisonIntro">
          <span>
            {before
              ? "BEFORE POKIPO"
              : "AFTER POKIPO"}

            {testMode
              ? " / STAFF TEST"
              : ""}
          </span>

          <h1>
            {before
              ? "参加前アンケート"
              : "参加後アンケート"}
          </h1>

          <p>
            {before
              ? "現在の気持ちを教えてください。"
              : "POKIPOを体験した感想をお聞かせください。4つのテーマに分けて質問します。"}
          </p>
        </header>

        {testMode && (
          <section className="surveyIntroCard">
            <strong>
              LiPost動作確認モード
            </strong>
            <p>
              実際の参加者と同じ設問です。
              回答は検証用データだけに保存されます。
            </p>
          </section>
        )}

        {before && (
          <>
            {card(
              "01",
              "性別を教えてください",
              choice(
                [
                  "男性",
                  "女性",
                  "回答しない",
                ],
                gender,
                setGender
              )
            )}

            {card(
              "02",
              "ポッキーを食べる頻度はどれくらいですか？",
              choice(
                frequencies,
                frequency,
                setFrequency
              )
            )}

            {card(
              "03",
              "2025年9月にポッキーがリニューアルしたことを知っていましたか？",
              <div className="surveyChoiceGrid two">
                <button
                  type="button"
                  className={
                    knewRenewal === true
                      ? "surveyChoice active"
                      : "surveyChoice"
                  }
                  disabled={submitting}
                  onClick={() =>
                    setKnewRenewal(true)
                  }
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
                  onClick={() =>
                    setKnewRenewal(false)
                  }
                >
                  いいえ
                </button>
              </div>
            )}

            {card(
              "04",
              "ポッキーをシェアして食べたことがありますか？",
              <>
                <div className="surveyChoiceGrid two">
                  <button
                    type="button"
                    className={
                      hasShared === true
                        ? "surveyChoice active"
                        : "surveyChoice"
                    }
                    disabled={submitting}
                    onClick={() =>
                      setHasShared(true)
                    }
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

                {hasShared && (
                  <div className="surveyTextField">
                    <label
                      htmlFor="shareSituation"
                    >
                      どんな時にシェアしますか？
                    </label>

                    <textarea
                      id="shareSituation"
                      rows={3}
                      maxLength={200}
                      value={shareSituation}
                      disabled={submitting}
                      onChange={(e) =>
                        setShareSituation(
                          e.target.value
                        )
                      }
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {part(
          before
            ? "BEFORE / AFTER"
            : "PART 1 / 4",
          "ポッキーについて",
          "参加前と参加後で同じ3問に回答し、変化を比較します。"
        )}

        {card(
          before ? "05" : "01",
          "現在、ポッキーにどの程度興味がありますか？",
          score(
            interestOptions,
            interestScore,
            setInterestScore
          )
        )}

        {card(
          before ? "06" : "02",
          "今後、ポッキーを食べたいと思いますか？",
          score(
            intentOptions,
            eatIntentScore,
            setEatIntentScore
          )
        )}

        {card(
          before ? "07" : "03",
          "今後、ポッキーを誰かとシェアして食べたいと思いますか？",
          score(
            intentOptions,
            shareIntentScore,
            setShareIntentScore
          )
        )}

        {!before && (
          <>
            {part(
              "PART 2 / 4",
              "ポッキーの購買行動について",
              "参加前の食べる頻度の回答を振り返り、その理由をお聞きします。"
            )}

            <section className="surveyBeforeSummary">
              <span>
                YOUR BEFORE ANSWER
              </span>

              <h2>
                参加前のあなたの回答
              </h2>

              <div className="surveyBeforeSummaryGrid">
                <div>
                  <span>食べる頻度</span>
                  <strong>
                    {preSurvey?.pocky_frequency ||
                      "未回答"}
                  </strong>
                </div>
              </div>
            </section>

            {card(
              "04",
              "参加前アンケートでこの食べる頻度を選んだ理由は何だと思いますか？",
              <>
                {choice(
                  reasons,
                  frequencyReason,
                  (v) => {
                    setFrequencyReason(v);
                    setPriceFeeling("");
                    setPriceTouched(false);
                  }
                )}

                {frequencyReason === "その他" && (
                  <div className="surveyTextField">
                    <label htmlFor="reasonOther">
                      その他の理由
                    </label>

                    <textarea
                      id="reasonOther"
                      maxLength={500}
                      rows={3}
                      value={frequencyReasonOther}
                      disabled={submitting}
                      onChange={(e) =>
                        setFrequencyReasonOther(
                          e.target.value
                        )
                      }
                      placeholder="理由を入力してください"
                    />
                  </div>
                )}
              </>
            )}

            {frequencyReason === PRICE_REASON && (
              <>
                {card(
                  "04-2",
                  "現在のポッキーの価格を高いと感じますか、安いと感じますか？",
                  choice(
                    priceFeelings,
                    priceFeeling,
                    setPriceFeeling
                  )
                )}

                {card(
                  "04-3",
                  "ポッキー1箱がいくら程度なら気軽に買いたいと思いますか？",
                  <div
                    style={{
                      padding: "16px 4px",
                    }}
                  >
                    <p
                      style={{
                        color: "#78655d",
                        fontSize: 13,
                      }}
                    >
                      一般的なポッキー1箱（税込）を
                      想定して回答してください。
                    </p>

                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 32,
                        fontWeight: 900,
                        color: "#c52230",
                      }}
                    >
                      {acceptablePrice}円
                    </div>

                    <input
                      aria-label="気軽に買いたい価格帯"
                      type="range"
                      min={50}
                      max={400}
                      step={10}
                      value={acceptablePrice}
                      disabled={submitting}
                      onChange={(e) => {
                        setAcceptablePrice(
                          Number(e.target.value)
                        );
                        setPriceTouched(true);
                      }}
                      style={{
                        width: "100%",
                        accentColor: "#c52230",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        fontSize: 12,
                      }}
                    >
                      <span>50円</span>
                      <span>400円</span>
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        color: "#80665c",
                      }}
                    >
                      {priceTouched
                        ? "回答済み"
                        : "スライダーを動かして選択してください。"}
                    </p>
                  </div>
                )}
              </>
            )}

            {part(
              "PART 3 / 4",
              "開発経済学について",
              "スタンプラリー内ではポッキーの価値とともに、原料であるカカオをベースとした「開発経済学」の内容も紹介してきました。こちらについてもご意見をお聞かせください。"
            )}

            {card(
              "05",
              "カカオの生産背景や生産者が抱える課題について、どの程度理解が深まりましたか？",
              score(
                developmentOptions,
                developmentUnderstanding,
                setDevelopmentUnderstanding
              )
            )}

            {card(
              "06",
              "特に印象に残った開発経済学のテーマは何ですか？",
              choice(
                developmentTopics,
                developmentTopic,
                setDevelopmentTopic
              )
            )}

            {card(
              "07",
              "カカオの生産や流通に関わる課題の解決には、誰の取り組みが重要だと思いますか？",
              choice(
                developmentActors,
                developmentActor,
                setDevelopmentActor
              )
            )}

            {card(
              "08",
              "POKIPOで学んだことをきっかけに、今後あなたがしてみたいことはありますか？",
              choice(
                developmentActions,
                developmentAction,
                setDevelopmentAction
              )
            )}

            {part(
              "PART 4 / 4",
              "POKIPOについて",
              "最後に、リニューアル内容について知ったことや印象に残ったことを教えてください。"
            )}

            {card(
              "09",
              "POKIPOを通じて、ポッキーのリニューアル内容をどの程度知ることができましたか？",
              score(
                renewalOptions,
                renewalUnderstandingScore,
                setRenewalUnderstandingScore
              )
            )}

            {card(
              "10",
              "POKIPOで印象に残ったことを教えてください。",
              <div className="surveyTextField">
                <textarea
                  rows={5}
                  maxLength={500}
                  value={memorablePoint}
                  disabled={submitting}
                  onChange={(e) =>
                    setMemorablePoint(
                      e.target.value
                    )
                  }
                  placeholder="自由にご記入ください（任意）"
                />

                <span>
                  {memorablePoint.length}/500
                </span>
              </div>
            )}
          </>
        )}

        {message && (
          <p
            role="alert"
            className="surveyError"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          className="surveySubmitButton"
          disabled={submitting}
          onClick={() =>
            void submitSurvey()
          }
        >
          <span>
            {submitting
              ? "保存中..."
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
            style={{
              marginTop: 15,
            }}
            disabled={submitting}
            onClick={() =>
              router.push("/staff/test")
            }
          >
            回答せずに戻る
          </button>
        )}
      </section>
    </main>
  );
}