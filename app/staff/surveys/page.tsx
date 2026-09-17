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

  preInterest: number;
  postInterest: number;

  preEatIntent: number;
  postEatIntent: number;

  preShareIntent: number;
  postShareIntent: number;
};

/* ========================================
   HELPERS
======================================== */

function average(
  values: number[]
) {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    values.length
  );
}

function positiveRate(
  values: number[]
) {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  const positive =
    values.filter(
      (
        value
      ) =>
        value >=
        3
    ).length;

  return (
    positive /
    values.length
  ) *
    100;
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
    value >
    0
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
    rounded >
    0
  ) {
    return `+${rounded}pt`;
  }

  return `${rounded}pt`;
}

/* ========================================
   PAGE
======================================== */

export default function StaffSurveyPage() {
  const router =
    useRouter();

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

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
     AUTH
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
     LOAD DATA
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
            preData ??
            []
          ) as PreSurvey[]
        );

        setPostSurveys(
          (
            postData ??
            []
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
     COMPARISON DATA
  ======================================== */

  const comparisonRows =
    useMemo(
      () => {
        const rows:
          ComparisonRow[] = [];

        for (
          const pre of
          preSurveys
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
     CORE METRICS
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
     OTHER SURVEY METRICS
  ======================================== */

  const renewalAwareCount =
    preSurveys.filter(
      (
        survey
      ) =>
        survey.knew_renewal
    ).length;

  const renewalAwareRate =
    preSurveys.length >
    0
      ? (
          renewalAwareCount /
          preSurveys.length
        ) *
        100
      : 0;

  const sharedCount =
    preSurveys.filter(
      (
        survey
      ) =>
        survey.has_shared_pocky
    ).length;

  const sharedRate =
    preSurveys.length >
    0
      ? (
          sharedCount /
          preSurveys.length
        ) *
        100
      : 0;

  const understandingAverage =
    average(
      postSurveys.map(
        (
          survey
        ) =>
          survey.renewal_understanding_score
      )
    );

  /* ========================================
     UNDERSTANDING DISTRIBUTION
  ======================================== */

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
      postSurveys.length ===
      0
    ) {
      return 0;
    }

    return (
      understandingCount(
        score
      ) /
      postSurveys.length
    ) *
      100;
  }

  /* ========================================
     FREQ DISTRIBUTION
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

        {/* PRE SURVEY BASIC */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              BEFORE SURVEY
            </span>

            <h2>
              参加前の状況
            </h2>

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
                  preSurveys.length >
                  0
                    ? (
                        count /
                        preSurveys.length
                      ) *
                      100
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

        {/* RENEWAL UNDERSTANDING */}

        <section className="staffSurveySection">

          <div className="staffSurveySectionTitle">

            <span>
              AFTER SURVEY
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

        {/* FREE TEXT */}

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
            ).length ===
            0 ? (
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