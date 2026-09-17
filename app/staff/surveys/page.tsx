"use client";

import {
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

type PreSurvey = {
  participant_id: string;
  gender: string;
  pocky_frequency: string;
  knew_renewal: boolean;
  has_shared_pocky: boolean;
  share_situation: string | null;
  interest_score: number;
  eat_intent_score: number;
  share_intent_score: number;
  created_at: string;
};

type PostSurvey = {
  participant_id: string;
  interest_score: number;
  eat_intent_score: number;
  share_intent_score: number;
  renewal_understanding_score: number;
  memorable_point: string | null;
  created_at: string;
};

type ComparisonRow = {
  participantId: string;

  knewRenewal: boolean;
  hasSharedPocky: boolean;
  pockyFrequency: string;

  preInterest: number;
  postInterest: number;

  preEatIntent: number;
  postEatIntent: number;

  preShareIntent: number;
  postShareIntent: number;
};

type SegmentMetric = {
  count: number;

  interestBefore: number;
  interestAfter: number;
  interestChange: number;

  eatBefore: number;
  eatAfter: number;
  eatChange: number;

  shareBefore: number;
  shareAfter: number;
  shareChange: number;
};

/* ========================================
   HELPERS
======================================== */

function average(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    ) /
    values.length
  );
}

function positiveRate(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const positive =
    values.filter(
      (
        value
      ) =>
        value >= 3
    ).length;

  return (
    positive /
    values.length
  ) * 100;
}

function formatScore(
  value: number
) {
  return value.toFixed(
    2
  );
}

function formatRate(
  value: number
) {
  return `${Math.round(
    value
  )}%`;
}

function formatDifference(
  value: number
) {
  if (
    value > 0
  ) {
    return `+${value.toFixed(
      2
    )}`;
  }

  return value.toFixed(
    2
  );
}

function formatPointDifference(
  value: number
) {
  const rounded =
    Math.round(
      value
    );

  if (
    rounded > 0
  ) {
    return `+${rounded}pt`;
  }

  return `${rounded}pt`;
}

function changeSummary(
  beforeValues: number[],
  afterValues: number[]
) {
  const total =
    Math.min(
      beforeValues.length,
      afterValues.length
    );

  if (
    total === 0
  ) {
    return {
      improved: 0,
      same: 0,
      decreased: 0,

      improvedRate: 0,
      sameRate: 0,
      decreasedRate: 0,
    };
  }

  let improved = 0;
  let same = 0;
  let decreased = 0;

  for (
    let index = 0;
    index < total;
    index += 1
  ) {
    const before =
      beforeValues[index];

    const after =
      afterValues[index];

    if (
      after > before
    ) {
      improved += 1;
    } else if (
      after === before
    ) {
      same += 1;
    } else {
      decreased += 1;
    }
  }

  return {
    improved,
    same,
    decreased,

    improvedRate:
      (
        improved /
        total
      ) * 100,

    sameRate:
      (
        same /
        total
      ) * 100,

    decreasedRate:
      (
        decreased /
        total
      ) * 100,
  };
}

function calculateSegmentMetric(
  rows: ComparisonRow[]
): SegmentMetric {
  if (
    rows.length === 0
  ) {
    return {
      count: 0,

      interestBefore: 0,
      interestAfter: 0,
      interestChange: 0,

      eatBefore: 0,
      eatAfter: 0,
      eatChange: 0,

      shareBefore: 0,
      shareAfter: 0,
      shareChange: 0,
    };
  }

  const interestBefore =
    average(
      rows.map(
        (
          row
        ) =>
          row.preInterest
      )
    );

  const interestAfter =
    average(
      rows.map(
        (
          row
        ) =>
          row.postInterest
      )
    );

  const eatBefore =
    average(
      rows.map(
        (
          row
        ) =>
          row.preEatIntent
      )
    );

  const eatAfter =
    average(
      rows.map(
        (
          row
        ) =>
          row.postEatIntent
      )
    );

  const shareBefore =
    average(
      rows.map(
        (
          row
        ) =>
          row.preShareIntent
      )
    );

  const shareAfter =
    average(
      rows.map(
        (
          row
        ) =>
          row.postShareIntent
      )
    );

  return {
    count:
      rows.length,

    interestBefore,

    interestAfter,

    interestChange:
      interestAfter -
      interestBefore,

    eatBefore,

    eatAfter,

    eatChange:
      eatAfter -
      eatBefore,

    shareBefore,

    shareAfter,

    shareChange:
      shareAfter -
      shareBefore,
  };
}

/* ========================================
   PAGE
======================================== */

export default function StaffSurveyPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  /* ========================================
     DATA
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    preSurveys,
    setPreSurveys,
  ] = useState<
    PreSurvey[]
  >([]);

  const [
    postSurveys,
    setPostSurveys,
  ] = useState<
    PostSurvey[]
  >([]);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkAuth() {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (
        error ||
        !data.session
      ) {
        router.replace(
          "/staff/reward"
        );

        return;
      }

      setAuthenticated(
        true
      );

      setAuthLoading(
        false
      );
    }

    void checkAuth();
  }, [
    router,
  ]);

  /* ========================================
     LOAD SURVEY DATA
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    async function loadSurveyData() {
      setLoading(
        true
      );

      setMessage("");

      try {
        const {
          data:
            preData,

          error:
            preError,
        } =
          await supabase
            .from(
              "pokipo_pre_surveys"
            )
            .select(
              "participant_id, gender, pocky_frequency, knew_renewal, has_shared_pocky, share_situation, interest_score, eat_intent_score, share_intent_score, created_at"
            );

        if (
          preError
        ) {
          console.error(
            "参加前アンケート取得エラー:",
            preError
          );

          setMessage(
            "参加前アンケートを取得できませんでした。"
          );

          return;
        }

        const {
          data:
            postData,

          error:
            postError,
        } =
          await supabase
            .from(
              "pokipo_post_surveys"
            )
            .select(
              "participant_id, interest_score, eat_intent_score, share_intent_score, renewal_understanding_score, memorable_point, created_at"
            );

        if (
          postError
        ) {
          console.error(
            "参加後アンケート取得エラー:",
            postError
          );

          setMessage(
            "参加後アンケートを取得できませんでした。"
          );

          return;
        }

        setPreSurveys(
          (
            preData ?? []
          ) as PreSurvey[]
        );

        setPostSurveys(
          (
            postData ?? []
          ) as PostSurvey[]
        );
      } catch (
        error
      ) {
        console.error(
          "アンケート分析通信エラー:",
          error
        );

        setMessage(
          "アンケート情報の読み込み中にエラーが発生しました。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadSurveyData();
  }, [
    authenticated,
  ]);

  /* ========================================
     COMPARISON ROWS
  ======================================== */

  const comparisonRows =
    useMemo(
      () => {
        const rows:
          ComparisonRow[] = [];

        for (
          const pre of preSurveys
        ) {
          const post =
            postSurveys.find(
              (
                item
              ) =>
                item.participant_id ===
                pre.participant_id
            );

          if (
            !post
          ) {
            continue;
          }

          rows.push({
            participantId:
              pre.participant_id,

            knewRenewal:
              pre.knew_renewal,

            hasSharedPocky:
              pre.has_shared_pocky,

            pockyFrequency:
              pre.pocky_frequency,

            preInterest:
              pre.interest_score,

            postInterest:
              post.interest_score,

            preEatIntent:
              pre.eat_intent_score,

            postEatIntent:
              post.eat_intent_score,

            preShareIntent:
              pre.share_intent_score,

            postShareIntent:
              post.share_intent_score,
          });
        }

        return rows;
      },
      [
        preSurveys,
        postSurveys,
      ]
    );

  /* ========================================
     VALUES
  ======================================== */

  const preInterestValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.preInterest
    );

  const postInterestValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.postInterest
    );

  const preEatValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.preEatIntent
    );

  const postEatValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.postEatIntent
    );

  const preShareValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.preShareIntent
    );

  const postShareValues =
    comparisonRows.map(
      (
        row
      ) =>
        row.postShareIntent
    );

  /* ========================================
     AVERAGES
  ======================================== */

  const interestPreAverage =
    average(
      preInterestValues
    );

  const interestPostAverage =
    average(
      postInterestValues
    );

  const eatPreAverage =
    average(
      preEatValues
    );

  const eatPostAverage =
    average(
      postEatValues
    );

  const sharePreAverage =
    average(
      preShareValues
    );

  const sharePostAverage =
    average(
      postShareValues
    );

  /* ========================================
     POSITIVE RATES
  ======================================== */

  const interestPrePositive =
    positiveRate(
      preInterestValues
    );

  const interestPostPositive =
    positiveRate(
      postInterestValues
    );

  const eatPrePositive =
    positiveRate(
      preEatValues
    );

  const eatPostPositive =
    positiveRate(
      postEatValues
    );

  const sharePrePositive =
    positiveRate(
      preShareValues
    );

  const sharePostPositive =
    positiveRate(
      postShareValues
    );

  /* ========================================
     BEFORE STATUS
  ======================================== */

  const renewalAwareCount =
    preSurveys.filter(
      (
        survey
      ) =>
        survey.knew_renewal
    ).length;

  const renewalAwareRate =
    preSurveys.length > 0
      ? (
          renewalAwareCount /
          preSurveys.length
        ) * 100
      : 0;

  const sharedCount =
    preSurveys.filter(
      (
        survey
      ) =>
        survey.has_shared_pocky
    ).length;

  const sharedRate =
    preSurveys.length > 0
      ? (
          sharedCount /
          preSurveys.length
        ) * 100
      : 0;

  /* ========================================
     AFTER STATUS
  ======================================== */

  const postInterestPositiveRate =
    positiveRate(
      postSurveys.map(
        (
          survey
        ) =>
          survey.interest_score
      )
    );

  const postEatPositiveRate =
    positiveRate(
      postSurveys.map(
        (
          survey
        ) =>
          survey.eat_intent_score
      )
    );

  const postSharePositiveRate =
    positiveRate(
      postSurveys.map(
        (
          survey
        ) =>
          survey.share_intent_score
      )
    );

  const renewalUnderstandingPositiveRate =
    positiveRate(
      postSurveys.map(
        (
          survey
        ) =>
          survey.renewal_understanding_score
      )
    );

  /* ========================================
     CHANGE ANALYSIS
  ======================================== */

  const interestChange =
    changeSummary(
      preInterestValues,
      postInterestValues
    );

  const eatChange =
    changeSummary(
      preEatValues,
      postEatValues
    );

  const shareChange =
    changeSummary(
      preShareValues,
      postShareValues
    );

  /* ========================================
     SEGMENT ANALYSIS
  ======================================== */

  const knewRenewalRows =
    comparisonRows.filter(
      (
        row
      ) =>
        row.knewRenewal
    );

  const didNotKnowRenewalRows =
    comparisonRows.filter(
      (
        row
      ) =>
        !row.knewRenewal
    );

  const sharedBeforeRows =
    comparisonRows.filter(
      (
        row
      ) =>
        row.hasSharedPocky
    );

  const neverSharedRows =
    comparisonRows.filter(
      (
        row
      ) =>
        !row.hasSharedPocky
    );

  const knewRenewalSegment =
    calculateSegmentMetric(
      knewRenewalRows
    );

  const didNotKnowRenewalSegment =
    calculateSegmentMetric(
      didNotKnowRenewalRows
    );

  const sharedBeforeSegment =
    calculateSegmentMetric(
      sharedBeforeRows
    );

  const neverSharedSegment =
    calculateSegmentMetric(
      neverSharedRows
    );

  /* ========================================
     UNDERSTANDING
  ======================================== */

  const understandingAverage =
    average(
      postSurveys.map(
        (
          survey
        ) =>
          survey.renewal_understanding_score
      )
    );

  function understandingCount(
    score: number
  ) {
    return postSurveys.filter(
      (
        survey
      ) =>
        survey.renewal_understanding_score ===
        score
    ).length;
  }

  function understandingRate(
    score: number
  ) {
    if (
      postSurveys.length === 0
    ) {
      return 0;
    }

    return (
      understandingCount(
        score
      ) /
      postSurveys.length
    ) * 100;
  }

  /* ========================================
     FREQUENCY
  ======================================== */

  const frequencyOptions = [
    "毎日食べる",
    "週1回",
    "月1〜2回",
    "半年に1回",
    "食べない",
  ];

  function frequencyCount(
    value: string
  ) {
    return preSurveys.filter(
      (
        survey
      ) =>
        survey.pocky_frequency ===
        value
    ).length;
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffSurveyPage">

          <div className="staffLoadingCard">
            スタッフ情報を確認中...
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

      <section className="staffSurveyPage">

        {/* HEADER */}

        <header className="staffSurveyHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              アンケート分析
            </h1>

            <p>
              POKIPO参加前後の回答変化を確認できます。
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff"
              )
            }
          >
            メニューへ
          </button>

        </header>

        {message && (
          <p className="staffSurveyMessage">
            {message}
          </p>
        )}

        {/* RESPONSE COUNTS */}

        <section className="staffSurveyCounts">

          <article>

            <span>
              BEFORE
            </span>

            <strong>
              {loading
                ? "—"
                : preSurveys.length}
            </strong>

            <p>
              参加前回答
            </p>

          </article>

          <article>

            <span>
              AFTER
            </span>

            <strong>
              {loading
                ? "—"
                : postSurveys.length}
            </strong>

            <p>
              参加後回答
            </p>

          </article>

          <article className="comparison">

            <span>
              COMPARISON
            </span>

            <strong>
              {loading
                ? "—"
                : comparisonRows.length}
            </strong>

            <p>
              前後比較可能
            </p>

          </article>

        </section>

        {/* MAIN COMPARISON */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              BEFORE / AFTER
            </span>

            <h2>
              主要指標の変化
            </h2>

            <p>
              前後両方に回答した参加者のみで比較しています。
            </p>

          </div>

          <div className="staffSurveyMetricList">

            {/* INTEREST */}

            <article className="staffSurveyMetricCard">

              <div className="staffSurveyMetricHeader">

                <div>

                  <span>
                    INTEREST
                  </span>

                  <h3>
                    ポッキーへの興味
                  </h3>

                </div>

                <strong>
                  {formatDifference(
                    interestPostAverage -
                    interestPreAverage
                  )}
                </strong>

              </div>

              <div className="staffSurveyBeforeAfter">

                <div>

                  <span>
                    BEFORE
                  </span>

                  <strong>
                    {formatScore(
                      interestPreAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

                <div className="arrow">
                  →
                </div>

                <div>

                  <span>
                    AFTER
                  </span>

                  <strong>
                    {formatScore(
                      interestPostAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

              </div>

              <div className="staffSurveyPositiveRate">

                <span>
                  肯定率
                </span>

                <strong>
                  {formatRate(
                    interestPrePositive
                  )}
                  {" → "}
                  {formatRate(
                    interestPostPositive
                  )}
                </strong>

                <b>
                  {formatPointDifference(
                    interestPostPositive -
                    interestPrePositive
                  )}
                </b>

              </div>

            </article>

            {/* EAT */}

            <article className="staffSurveyMetricCard">

              <div className="staffSurveyMetricHeader">

                <div>

                  <span>
                    EAT INTENT
                  </span>

                  <h3>
                    ポッキーを食べたい気持ち
                  </h3>

                </div>

                <strong>
                  {formatDifference(
                    eatPostAverage -
                    eatPreAverage
                  )}
                </strong>

              </div>

              <div className="staffSurveyBeforeAfter">

                <div>

                  <span>
                    BEFORE
                  </span>

                  <strong>
                    {formatScore(
                      eatPreAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

                <div className="arrow">
                  →
                </div>

                <div>

                  <span>
                    AFTER
                  </span>

                  <strong>
                    {formatScore(
                      eatPostAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

              </div>

              <div className="staffSurveyPositiveRate">

                <span>
                  肯定率
                </span>

                <strong>
                  {formatRate(
                    eatPrePositive
                  )}
                  {" → "}
                  {formatRate(
                    eatPostPositive
                  )}
                </strong>

                <b>
                  {formatPointDifference(
                    eatPostPositive -
                    eatPrePositive
                  )}
                </b>

              </div>

            </article>

            {/* SHARE */}

            <article className="staffSurveyMetricCard">

              <div className="staffSurveyMetricHeader">

                <div>

                  <span>
                    SHARE INTENT
                  </span>

                  <h3>
                    ポッキーをシェアしたい気持ち
                  </h3>

                </div>

                <strong>
                  {formatDifference(
                    sharePostAverage -
                    sharePreAverage
                  )}
                </strong>

              </div>

              <div className="staffSurveyBeforeAfter">

                <div>

                  <span>
                    BEFORE
                  </span>

                  <strong>
                    {formatScore(
                      sharePreAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

                <div className="arrow">
                  →
                </div>

                <div>

                  <span>
                    AFTER
                  </span>

                  <strong>
                    {formatScore(
                      sharePostAverage
                    )}
                  </strong>

                  <small>
                    / 4
                  </small>

                </div>

              </div>

              <div className="staffSurveyPositiveRate">

                <span>
                  肯定率
                </span>

                <strong>
                  {formatRate(
                    sharePrePositive
                  )}
                  {" → "}
                  {formatRate(
                    sharePostPositive
                  )}
                </strong>

                <b>
                  {formatPointDifference(
                    sharePostPositive -
                    sharePrePositive
                  )}
                </b>

              </div>

            </article>

          </div>

        </section>

        {/* BEFORE STATUS */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              BEFORE SURVEY
            </span>

            <h2>
              参加前の状況
            </h2>

            <p>
              POKIPO体験前の参加者の状態です。
            </p>

          </div>

          <div className="staffSurveySimpleStats">

            <article>

              <span>
                リニューアル認知率
              </span>

              <strong>
                {formatRate(
                  renewalAwareRate
                )}
              </strong>

              <p>
                {renewalAwareCount}
                人が「知っていた」
              </p>

            </article>

            <article>

              <span>
                シェア経験率
              </span>

              <strong>
                {formatRate(
                  sharedRate
                )}
              </strong>

              <p>
                {sharedCount}
                人がシェア経験あり
              </p>

            </article>

          </div>

          <div className="staffSurveyDistribution">

            <h3>
              ポッキーを食べる頻度
            </h3>

            {frequencyOptions.map(
              (
                option
              ) => {
                const count =
                  frequencyCount(
                    option
                  );

                const rate =
                  preSurveys.length > 0
                    ? (
                        count /
                        preSurveys.length
                      ) * 100
                    : 0;

                return (
                  <div
                    key={
                      option
                    }
                    className="staffSurveyDistributionRow"
                  >

                    <span>
                      {option}
                    </span>

                    <div>

                      <div
                        style={{
                          width:
                            `${rate}%`,
                        }}
                      />

                    </div>

                    <strong>
                      {count}人
                    </strong>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* AFTER STATUS */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              AFTER SURVEY
            </span>

            <h2>
              参加後の状況
            </h2>

            <p>
              POKIPO体験後の肯定回答率です。
            </p>

          </div>

          <div className="staffSurveyAfterStats">

            <article>

              <span>
                リニューアル理解
              </span>

              <strong>
                {formatRate(
                  renewalUnderstandingPositiveRate
                )}
              </strong>

              <p>
                「よく／ある程度知ることができた」
              </p>

            </article>

            <article>

              <span>
                ポッキーへの興味
              </span>

              <strong>
                {formatRate(
                  postInterestPositiveRate
                )}
              </strong>

              <p>
                参加後の肯定回答
              </p>

            </article>

            <article>

              <span>
                食べたい気持ち
              </span>

              <strong>
                {formatRate(
                  postEatPositiveRate
                )}
              </strong>

              <p>
                参加後の肯定回答
              </p>

            </article>

            <article>

              <span>
                シェア意向
              </span>

              <strong>
                {formatRate(
                  postSharePositiveRate
                )}
              </strong>

              <p>
                参加後の肯定回答
              </p>

            </article>

          </div>

        </section>

        {/* CHANGE ANALYSIS */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              CHANGE ANALYSIS
            </span>

            <h2>
              一人ひとりの変化
            </h2>

            <p>
              前後両方に回答した参加者を、
              改善・変化なし・低下に分類しています。
            </p>

          </div>

          <div className="staffSurveyChangeList">

            {/* INTEREST */}

            <article>

              <div className="staffSurveyChangeTitle">

                <span>
                  INTEREST
                </span>

                <h3>
                  ポッキーへの興味
                </h3>

              </div>

              <div className="staffSurveyChangeNumbers">

                <div className="improved">

                  <span>
                    改善
                  </span>

                  <strong>
                    {formatRate(
                      interestChange.improvedRate
                    )}
                  </strong>

                  <small>
                    {interestChange.improved}
                    人
                  </small>

                </div>

                <div className="same">

                  <span>
                    変化なし
                  </span>

                  <strong>
                    {formatRate(
                      interestChange.sameRate
                    )}
                  </strong>

                  <small>
                    {interestChange.same}
                    人
                  </small>

                </div>

                <div className="decreased">

                  <span>
                    低下
                  </span>

                  <strong>
                    {formatRate(
                      interestChange.decreasedRate
                    )}
                  </strong>

                  <small>
                    {interestChange.decreased}
                    人
                  </small>

                </div>

              </div>

            </article>

            {/* EAT */}

            <article>

              <div className="staffSurveyChangeTitle">

                <span>
                  EAT INTENT
                </span>

                <h3>
                  ポッキーを食べたい気持ち
                </h3>

              </div>

              <div className="staffSurveyChangeNumbers">

                <div className="improved">

                  <span>
                    改善
                  </span>

                  <strong>
                    {formatRate(
                      eatChange.improvedRate
                    )}
                  </strong>

                  <small>
                    {eatChange.improved}
                    人
                  </small>

                </div>

                <div className="same">

                  <span>
                    変化なし
                  </span>

                  <strong>
                    {formatRate(
                      eatChange.sameRate
                    )}
                  </strong>

                  <small>
                    {eatChange.same}
                    人
                  </small>

                </div>

                <div className="decreased">

                  <span>
                    低下
                  </span>

                  <strong>
                    {formatRate(
                      eatChange.decreasedRate
                    )}
                  </strong>

                  <small>
                    {eatChange.decreased}
                    人
                  </small>

                </div>

              </div>

            </article>

            {/* SHARE */}

            <article>

              <div className="staffSurveyChangeTitle">

                <span>
                  SHARE INTENT
                </span>

                <h3>
                  ポッキーをシェアしたい気持ち
                </h3>

              </div>

              <div className="staffSurveyChangeNumbers">

                <div className="improved">

                  <span>
                    改善
                  </span>

                  <strong>
                    {formatRate(
                      shareChange.improvedRate
                    )}
                  </strong>

                  <small>
                    {shareChange.improved}
                    人
                  </small>

                </div>

                <div className="same">

                  <span>
                    変化なし
                  </span>

                  <strong>
                    {formatRate(
                      shareChange.sameRate
                    )}
                  </strong>

                  <small>
                    {shareChange.same}
                    人
                  </small>

                </div>

                <div className="decreased">

                  <span>
                    低下
                  </span>

                  <strong>
                    {formatRate(
                      shareChange.decreasedRate
                    )}
                  </strong>

                  <small>
                    {shareChange.decreased}
                    人
                  </small>

                </div>

              </div>

            </article>

          </div>

        </section>

        {/* SEGMENT ANALYSIS */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              SEGMENT ANALYSIS
            </span>

            <h2>
              属性・参加前状況別の変化
            </h2>

            <p>
              参加前の状態ごとに、
              POKIPO体験後の変化を比較します。
            </p>

          </div>

          {/* RENEWAL */}

          <div className="staffSurveySegmentBlock">

            <div className="staffSurveySegmentHeading">

              <span>
                RENEWAL AWARENESS
              </span>

              <h3>
                リニューアル認知別
              </h3>

              <p>
                参加前にリニューアルを知っていた人と
                知らなかった人を比較します。
              </p>

            </div>

            <div className="staffSurveySegmentGrid">

              <article className="staffSurveySegmentCard">

                <div className="staffSurveySegmentCardHeader">

                  <div>

                    <span>
                      KNOW
                    </span>

                    <h4>
                      知っていた人
                    </h4>

                  </div>

                  <strong>
                    {knewRenewalSegment.count}人
                  </strong>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    ポッキーへの興味
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.interestBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.interestAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      knewRenewalSegment.interestChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    食べたい気持ち
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.eatBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.eatAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      knewRenewalSegment.eatChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    シェア意向
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.shareBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        knewRenewalSegment.shareAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      knewRenewalSegment.shareChange
                    )}
                  </em>

                </div>

              </article>

              <article className="staffSurveySegmentCard highlight">

                <div className="staffSurveySegmentCardHeader">

                  <div>

                    <span>
                      DID NOT KNOW
                    </span>

                    <h4>
                      知らなかった人
                    </h4>

                  </div>

                  <strong>
                    {didNotKnowRenewalSegment.count}人
                  </strong>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    ポッキーへの興味
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.interestBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.interestAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      didNotKnowRenewalSegment.interestChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    食べたい気持ち
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.eatBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.eatAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      didNotKnowRenewalSegment.eatChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    シェア意向
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.shareBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        didNotKnowRenewalSegment.shareAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      didNotKnowRenewalSegment.shareChange
                    )}
                  </em>

                </div>

              </article>

            </div>

          </div>

          {/* SHARE EXPERIENCE */}

          <div className="staffSurveySegmentBlock">

            <div className="staffSurveySegmentHeading">

              <span>
                SHARE EXPERIENCE
              </span>

              <h3>
                シェア経験別
              </h3>

              <p>
                もともとシェア経験がある人と
                ない人を比較します。
              </p>

            </div>

            <div className="staffSurveySegmentGrid">

              <article className="staffSurveySegmentCard">

                <div className="staffSurveySegmentCardHeader">

                  <div>

                    <span>
                      EXPERIENCED
                    </span>

                    <h4>
                      シェア経験あり
                    </h4>

                  </div>

                  <strong>
                    {sharedBeforeSegment.count}人
                  </strong>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    シェア意向
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        sharedBeforeSegment.shareBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        sharedBeforeSegment.shareAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      sharedBeforeSegment.shareChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    ポッキーへの興味
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        sharedBeforeSegment.interestBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        sharedBeforeSegment.interestAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      sharedBeforeSegment.interestChange
                    )}
                  </em>

                </div>

              </article>

              <article className="staffSurveySegmentCard highlight">

                <div className="staffSurveySegmentCardHeader">

                  <div>

                    <span>
                      NO EXPERIENCE
                    </span>

                    <h4>
                      シェア経験なし
                    </h4>

                  </div>

                  <strong>
                    {neverSharedSegment.count}人
                  </strong>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    シェア意向
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        neverSharedSegment.shareBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        neverSharedSegment.shareAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      neverSharedSegment.shareChange
                    )}
                  </em>

                </div>

                <div className="staffSurveySegmentMetric">

                  <span>
                    ポッキーへの興味
                  </span>

                  <div>

                    <strong>
                      {formatScore(
                        neverSharedSegment.interestBefore
                      )}
                    </strong>

                    <b>
                      →
                    </b>

                    <strong>
                      {formatScore(
                        neverSharedSegment.interestAfter
                      )}
                    </strong>

                  </div>

                  <em>
                    {formatDifference(
                      neverSharedSegment.interestChange
                    )}
                  </em>

                </div>

              </article>

            </div>

          </div>

        </section>

        {/* UNDERSTANDING */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              RENEWAL UNDERSTANDING
            </span>

            <h2>
              リニューアル理解度
            </h2>

            <p>
              平均
              {" "}
              {formatScore(
                understandingAverage
              )}
              /4
            </p>

          </div>

          <div className="staffSurveyUnderstandingList">

            {[
              {
                score: 4,
                label:
                  "よく知ることができた",
              },
              {
                score: 3,
                label:
                  "ある程度知ることができた",
              },
              {
                score: 2,
                label:
                  "あまり知ることができなかった",
              },
              {
                score: 1,
                label:
                  "知ることができなかった",
              },
            ].map(
              (
                item
              ) => (
                <article
                  key={
                    item.score
                  }
                >

                  <div>

                    <span>
                      {item.score}
                    </span>

                    <strong>
                      {item.label}
                    </strong>

                  </div>

                  <p>
                    {understandingCount(
                      item.score
                    )}
                    人
                  </p>

                  <b>
                    {formatRate(
                      understandingRate(
                        item.score
                      )
                    )}
                  </b>

                </article>
              )
            )}

          </div>

        </section>

        {/* COMMENTS */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              COMMENTS
            </span>

            <h2>
              印象に残ったこと
            </h2>

          </div>

          <div className="staffSurveyComments">

            {postSurveys.filter(
              (
                survey
              ) =>
                Boolean(
                  survey.memorable_point?.trim()
                )
            ).length === 0 ? (
              <div className="staffSurveyEmpty">
                まだ自由記述回答はありません。
              </div>
            ) : (
              postSurveys
                .filter(
                  (
                    survey
                  ) =>
                    Boolean(
                      survey.memorable_point?.trim()
                    )
                )
                .map(
                  (
                    survey,
                    index
                  ) => (
                    <article
                      key={
                        survey.participant_id
                      }
                    >

                      <span>
                        COMMENT {index + 1}
                      </span>

                      <p>
                        {survey.memorable_point}
                      </p>

                    </article>
                  )
                )
            )}

          </div>

        </section>

      </section>

    </main>
  );
}