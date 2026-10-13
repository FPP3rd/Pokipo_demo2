"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

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

type AnalysisTab = "before" | "after" | "comparison";

type Filters = {
  gender: string;
  frequency: string;
  renewal: string;
  share: string;
};

type Pair = {
  before: PreSurvey;
  after: PostSurvey;
};

type ScoreKey =
  | "interest_score"
  | "eat_intent_score"
  | "share_intent_score";

const initialFilters: Filters = {
  gender: "all",
  frequency: "all",
  renewal: "all",
  share: "all",
};

const frequencyOptions = [
  "毎日食べる",
  "週1回",
  "月1〜2回",
  "半年に1回",
  "食べない",
];

const scoreOptions = [
  { value: 4, label: "4点" },
  { value: 3, label: "3点" },
  { value: 2, label: "2点" },
  { value: 1, label: "1点" },
];

const understandingOptions = [
  { value: 4, label: "よく知ることができた" },
  { value: 3, label: "ある程度知ることができた" },
  { value: 2, label: "あまり知ることができなかった" },
  { value: 1, label: "知ることができなかった" },
];

const sharedQuestions: {
  key: ScoreKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "interest_score",
    title: "ポッキーへの興味",
    subtitle: "現在、ポッキーにどの程度興味がありますか？",
  },
  {
    key: "eat_intent_score",
    title: "ポッキーを食べたい気持ち",
    subtitle: "今後、ポッキーを食べたいと思いますか？",
  },
  {
    key: "share_intent_score",
    title: "ポッキーをシェアしたい気持ち",
    subtitle: "今後、ポッキーを誰かとシェアして食べたいと思いますか？",
  },
];

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) /
    values.length;
}

function positiveRate(values: number[]): number {
  if (values.length === 0) return 0;

  return (
    values.filter((value) => value >= 3).length /
    values.length
  ) * 100;
}

function scoreText(value: number): string {
  return value.toFixed(2);
}

function rateText(value: number): string {
  return `${Math.round(value)}%`;
}

function differenceText(value: number): string {
  const formatted = value.toFixed(2);
  return value > 0 ? `+${formatted}` : formatted;
}

function countValues<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length;
}

function matchesFilters(
  survey: PreSurvey,
  filters: Filters
): boolean {
  if (
    filters.gender !== "all" &&
    survey.gender !== filters.gender
  ) {
    return false;
  }

  if (
    filters.frequency !== "all" &&
    survey.pocky_frequency !== filters.frequency
  ) {
    return false;
  }

  if (
    filters.renewal === "known" &&
    !survey.knew_renewal
  ) {
    return false;
  }

  if (
    filters.renewal === "unknown" &&
    survey.knew_renewal
  ) {
    return false;
  }

  if (
    filters.share === "shared" &&
    !survey.has_shared_pocky
  ) {
    return false;
  }

  if (
    filters.share === "not-shared" &&
    survey.has_shared_pocky
  ) {
    return false;
  }

  return true;
}

/* ========================================
   GRAPH COMPONENT
======================================== */

type GraphItem = {
  label: string;
  count: number;
};

function DistributionGraph({
  title,
  description,
  items,
  total,
}: {
  title: string;
  description?: string;
  items: GraphItem[];
  total: number;
}) {
  return (
    <article className="surveyAnalysisGraphCard">
      <h3>{title}</h3>

      {description && (
        <p className="surveyAnalysisGraphDescription">
          {description}
        </p>
      )}

      {total === 0 ? (
        <p className="surveyAnalysisEmpty">
          集計できる回答がありません。
        </p>
      ) : (
        <div className="surveyAnalysisGraphRows">
          {items.map((item) => {
            const rate =
              total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div
                key={item.label}
                className="surveyAnalysisGraphRow"
              >
                <div className="surveyAnalysisGraphRowTop">
                  <span>{item.label}</span>

                  <strong>
                    {item.count}人
                    <small>（{rateText(rate)}）</small>
                  </strong>
                </div>

                <div
                  className="surveyAnalysisGraphTrack"
                  role="progressbar"
                  aria-label={`${title}：${item.label}`}
                  aria-valuenow={rate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="surveyAnalysisGraphFill"
                    style={{
                      width: `${Math.min(
                        Math.max(rate, 0),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function ScoreDistribution({
  title,
  values,
  labels = scoreOptions,
}: {
  title: string;
  values: number[];
  labels?: { value: number; label: string }[];
}) {
  return (
    <DistributionGraph
      title={title}
      description={
        values.length > 0
          ? `平均 ${scoreText(average(values))} / 4 ・ 肯定率 ${rateText(
              positiveRate(values)
            )}（3〜4点）`
          : "4段階評価"
      }
      total={values.length}
      items={labels.map((option) => ({
        label: option.label,
        count: values.filter(
          (value) => value === option.value
        ).length,
      }))}
    />
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <article className="surveyAnalysisStatCard">
      <span>{label}</span>
      <strong>{value}</strong>

      {description && <p>{description}</p>}
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="staffSurveySectionTitle">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

/* ========================================
   STAFF SURVEY PAGE
======================================== */

export default function StaffSurveyPage() {
  const router = useRouter();

  const [authenticated, setAuthenticated] =
    useState(false);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loading, setLoading] = useState(true);

  const [preSurveys, setPreSurveys] =
    useState<PreSurvey[]>([]);

  const [postSurveys, setPostSurveys] =
    useState<PostSurvey[]>([]);

  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] =
    useState<AnalysisTab>("before");

  const [filters, setFilters] =
    useState<Filters>(initialFilters);

  const [lastUpdated, setLastUpdated] =
    useState("");

  /* ========================================
     STAFF AUTHENTICATION
  ======================================== */

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (!active) return;

        if (error || !data.session) {
          router.replace("/staff/reward");
          return;
        }

        setAuthenticated(true);
      } catch (error) {
        console.error(
          "スタッフ認証確認エラー:",
          error
        );

        if (active) {
          router.replace("/staff/reward");
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  /* ========================================
     READ SURVEY DATA
  ======================================== */

  useEffect(() => {
    if (!authenticated) return;

    let active = true;

    async function loadSurveyData() {
      setLoading(true);
      setMessage("");

      try {
        const [preResult, postResult] =
          await Promise.all([
            supabase
              .from("pokipo_pre_surveys")
              .select(
                "participant_id, gender, pocky_frequency, knew_renewal, has_shared_pocky, share_situation, interest_score, eat_intent_score, share_intent_score, created_at"
              ),

            supabase
              .from("pokipo_post_surveys")
              .select(
                "participant_id, interest_score, eat_intent_score, share_intent_score, renewal_understanding_score, memorable_point, created_at"
              ),
          ]);

        if (preResult.error) {
          throw new Error(
            `参加前アンケート: ${preResult.error.message}`
          );
        }

        if (postResult.error) {
          throw new Error(
            `参加後アンケート: ${postResult.error.message}`
          );
        }

        if (!active) return;

        setPreSurveys(
          (preResult.data ?? []) as PreSurvey[]
        );

        setPostSurveys(
          (postResult.data ?? []) as PostSurvey[]
        );

        setLastUpdated(
          new Date().toLocaleString("ja-JP")
        );
      } catch (error) {
        console.error(
          "アンケート取得エラー:",
          error
        );

        if (active) {
          setMessage(
            "アンケートを取得できませんでした。通信環境やスタッフ権限を確認してください。"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSurveyData();

    return () => {
      active = false;
    };
  }, [authenticated]);

  /* ========================================
     FILTERING
  ======================================== */

  const filteredPreSurveys = useMemo(
    () =>
      preSurveys.filter((survey) =>
        matchesFilters(survey, filters)
      ),
    [preSurveys, filters]
  );

  const filteredPreIds = useMemo(
    () =>
      new Set(
        filteredPreSurveys.map(
          (survey) => survey.participant_id
        )
      ),
    [filteredPreSurveys]
  );

  const filterIsActive = Object.values(
    filters
  ).some((value) => value !== "all");

  // 参加後のみの回答者は、参加前属性が不明なため
  // 属性フィルター適用時には含めない。
  const filteredPostSurveys = useMemo(
    () =>
      filterIsActive
        ? postSurveys.filter((survey) =>
            filteredPreIds.has(
              survey.participant_id
            )
          )
        : postSurveys,
    [
      postSurveys,
      filteredPreIds,
      filterIsActive,
    ]
  );

  /* ========================================
     MATCHED BEFORE / AFTER
  ======================================== */

  const comparisonPairs = useMemo(() => {
    const postById = new Map(
      postSurveys.map((survey) => [
        survey.participant_id,
        survey,
      ])
    );

    const pairs: Pair[] = [];

    for (const before of filteredPreSurveys) {
      const after = postById.get(
        before.participant_id
      );

      if (after) {
        pairs.push({ before, after });
      }
    }

    return pairs;
  }, [filteredPreSurveys, postSurveys]);

  /* ========================================
     COMPARISON HELPERS
  ======================================== */

  function getPairScores(
    pairs: Pair[],
    key: ScoreKey
  ) {
    return {
      before: pairs.map(
        (pair) => pair.before[key]
      ),
      after: pairs.map(
        (pair) => pair.after[key]
      ),
    };
  }

  function getChangeCounts(
    pairs: Pair[],
    key: ScoreKey
  ) {
    return {
      improved: pairs.filter(
        (pair) =>
          pair.after[key] > pair.before[key]
      ).length,

      same: pairs.filter(
        (pair) =>
          pair.after[key] === pair.before[key]
      ).length,

      decreased: pairs.filter(
        (pair) =>
          pair.after[key] < pair.before[key]
      ).length,
    };
  }

  function renderComparisonMetric(
    key: ScoreKey,
    title: string,
    pairs: Pair[]
  ) {
    const scores = getPairScores(pairs, key);

    const beforeAverage = average(
      scores.before
    );

    const afterAverage = average(
      scores.after
    );

    const beforePositive = positiveRate(
      scores.before
    );

    const afterPositive = positiveRate(
      scores.after
    );

    const counts = getChangeCounts(
      pairs,
      key
    );

    return (
      <article
        key={key}
        className="staffSurveyMetricCard"
      >
        <div className="staffSurveyMetricHeader">
          <div>
            <span>BEFORE / AFTER</span>
            <h3>{title}</h3>
          </div>

          <strong>
            {pairs.length > 0
              ? differenceText(
                  afterAverage - beforeAverage
                )
              : "—"}
          </strong>
        </div>

        <div className="staffSurveyBeforeAfter">
          <div>
            <span>BEFORE</span>
            <strong>
              {pairs.length > 0
                ? scoreText(beforeAverage)
                : "—"}
            </strong>
            <small>/ 4</small>
          </div>

          <div className="arrow">→</div>

          <div>
            <span>AFTER</span>
            <strong>
              {pairs.length > 0
                ? scoreText(afterAverage)
                : "—"}
            </strong>
            <small>/ 4</small>
          </div>
        </div>

        <div className="staffSurveyPositiveRate">
          <span>肯定率</span>

          <strong>
            {pairs.length > 0
              ? `${rateText(
                  beforePositive
                )} → ${rateText(afterPositive)}`
              : "—"}
          </strong>

          <b>
            {pairs.length > 0
              ? `${differenceText(
                  afterPositive - beforePositive
                )}pt`
              : "—"}
          </b>
        </div>

        <div className="surveyAnalysisChangeSummary">
          <div>
            <span>改善</span>
            <strong>{counts.improved}人</strong>
            <small>
              {rateText(
                pairs.length
                  ? (counts.improved /
                      pairs.length) *
                      100
                  : 0
              )}
            </small>
          </div>

          <div>
            <span>変化なし</span>
            <strong>{counts.same}人</strong>
            <small>
              {rateText(
                pairs.length
                  ? (counts.same /
                      pairs.length) *
                      100
                  : 0
              )}
            </small>
          </div>

          <div>
            <span>低下</span>
            <strong>{counts.decreased}人</strong>
            <small>
              {rateText(
                pairs.length
                  ? (counts.decreased /
                      pairs.length) *
                      100
                  : 0
              )}
            </small>
          </div>
        </div>
      </article>
    );
  }

  function renderSegment(
    title: string,
    description: string,
    pairs: Pair[]
  ) {
    return (
      <article className="surveyAnalysisSegmentCard">
        <h3>{title}</h3>
        <p>{description}</p>
        <strong className="surveyAnalysisSegmentCount">
          {pairs.length}人
        </strong>

        {sharedQuestions.map((question) => {
          const scores = getPairScores(
            pairs,
            question.key
          );

          const beforeAverage = average(
            scores.before
          );

          const afterAverage = average(
            scores.after
          );

          return (
            <div
              key={question.key}
              className="surveyAnalysisSegmentRow"
            >
              <span>{question.title}</span>

              <strong>
                {pairs.length > 0
                  ? `${scoreText(
                      beforeAverage
                    )} → ${scoreText(afterAverage)}`
                  : "—"}
              </strong>

              <small>
                {pairs.length > 0
                  ? differenceText(
                      afterAverage - beforeAverage
                    )
                  : "—"}
              </small>
            </div>
          );
        })}
      </article>
    );
  }

  /* ========================================
     TAB AND FILTERS
  ======================================== */

  function updateFilter(
    key: keyof Filters,
    value: string
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  /* ========================================
     LOADING
  ======================================== */

  if (authLoading) {
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
     MAIN VIEW
  ======================================== */

  return (
    <main className="shell">
      <section className="staffSurveyPage">
        <header className="staffSurveyHeader">
          <div>
            <span>POKIPO STAFF</span>
            <h1>アンケート分析</h1>
            <p>
              参加前・参加後・前後比較の
              3つの分析を切り替えて確認できます。
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/staff")}
          >
            メニューへ
          </button>
        </header>

        {message && (
          <p
            className="staffSurveyMessage"
            role="alert"
          >
            {message}
          </p>
        )}

        {/* =================================
            RESPONSE COUNTS
        ================================= */}

        <section className="staffSurveyCounts">
          <article>
            <span>BEFORE</span>
            <strong>
              {loading ? "—" : preSurveys.length}
            </strong>
            <p>参加前回答</p>
          </article>

          <article>
            <span>AFTER</span>
            <strong>
              {loading ? "—" : postSurveys.length}
            </strong>
            <p>参加後回答</p>
          </article>

          <article className="comparison">
            <span>COMPARISON</span>
            <strong>
              {loading
                ? "—"
                : new Set(
                    preSurveys
                      .filter((survey) =>
                        postSurveys.some(
                          (post) =>
                            post.participant_id ===
                            survey.participant_id
                        )
                      )
                      .map(
                        (survey) =>
                          survey.participant_id
                      )
                  ).size}
            </strong>
            <p>前後比較可能</p>
          </article>
        </section>

        {/* =================================
            THREE TABS
        ================================= */}

        <nav
          className="surveyAnalysisTabs"
          aria-label="アンケート分析メニュー"
        >
          <button
            type="button"
            className={`surveyAnalysisTab ${
              activeTab === "before" ? "active" : ""
            }`}
            onClick={() => setActiveTab("before")}
            aria-current={
              activeTab === "before"
                ? "page"
                : undefined
            }
          >
            <span>BEFORE</span>
            <strong>参加前の結果</strong>
          </button>

          <button
            type="button"
            className={`surveyAnalysisTab ${
              activeTab === "after" ? "active" : ""
            }`}
            onClick={() => setActiveTab("after")}
            aria-current={
              activeTab === "after"
                ? "page"
                : undefined
            }
          >
            <span>AFTER</span>
            <strong>参加後の結果</strong>
          </button>

          <button
            type="button"
            className={`surveyAnalysisTab ${
              activeTab === "comparison"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("comparison")
            }
            aria-current={
              activeTab === "comparison"
                ? "page"
                : undefined
            }
          >
            <span>COMPARE</span>
            <strong>前後比較</strong>
          </button>
        </nav>

        {/* =================================
            FILTERS
        ================================= */}

        <section className="staffSurveyFilterSection">
          <SectionHeading
            eyebrow="FILTER"
            title="分析条件"
            description={
              activeTab === "comparison"
                ? "参加前の属性で絞り込み、前後両方に回答した人を比較します。"
                : "参加前アンケートの属性を利用して、対象者を絞り込みます。"
            }
          />

          <div className="staffSurveyFilters">
            <label>
              <span>性別</span>

              <select
                value={filters.gender}
                onChange={(event) =>
                  updateFilter(
                    "gender",
                    event.target.value
                  )
                }
              >
                <option value="all">すべて</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="回答しない">
                  回答しない
                </option>
              </select>
            </label>

            <label>
              <span>食べる頻度</span>

              <select
                value={filters.frequency}
                onChange={(event) =>
                  updateFilter(
                    "frequency",
                    event.target.value
                  )
                }
              >
                <option value="all">すべて</option>

                {frequencyOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>リニューアル認知</span>

              <select
                value={filters.renewal}
                onChange={(event) =>
                  updateFilter(
                    "renewal",
                    event.target.value
                  )
                }
              >
                <option value="all">すべて</option>
                <option value="known">
                  知っていた
                </option>
                <option value="unknown">
                  知らなかった
                </option>
              </select>
            </label>

            <label>
              <span>シェア経験</span>

              <select
                value={filters.share}
                onChange={(event) =>
                  updateFilter(
                    "share",
                    event.target.value
                  )
                }
              >
                <option value="all">すべて</option>
                <option value="shared">
                  経験あり
                </option>
                <option value="not-shared">
                  経験なし
                </option>
              </select>
            </label>
          </div>

          <div className="staffSurveyFilterResult">
            <span>現在の分析対象</span>

            <strong>
              {loading
                ? "—"
                : activeTab === "before"
                ? filteredPreSurveys.length
                : activeTab === "after"
                ? filteredPostSurveys.length
                : comparisonPairs.length}
              人
            </strong>

            <button
              type="button"
              onClick={resetFilters}
            >
              条件をリセット
            </button>
          </div>
        </section>

        {loading ? (
          <div className="staffLoadingCard">
            アンケートを集計しています...
          </div>
        ) : (
          <>
            {/* =================================
                BEFORE TAB
            ================================= */}

            {activeTab === "before" && (
              <div className="surveyAnalysisTabContent">
                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="BEFORE SURVEY"
                    title="参加前アンケートの結果"
                    description="参加前アンケートに回答した人を対象に、各設問の集計結果を表示しています。参加後未回答者も含みます。"
                  />

                  <div className="staffSurveySimpleStats">
                    <StatCard
                      label="回答人数"
                      value={`${filteredPreSurveys.length}人`}
                      description="現在の条件に該当する回答"
                    />

                    <StatCard
                      label="リニューアル認知率"
                      value={rateText(
                        filteredPreSurveys.length
                          ? (countValues(
                              filteredPreSurveys,
                              (survey) =>
                                survey.knew_renewal
                            ) /
                              filteredPreSurveys.length) *
                              100
                          : 0
                      )}
                      description="リニューアルを知っていた割合"
                    />

                    <StatCard
                      label="シェア経験率"
                      value={rateText(
                        filteredPreSurveys.length
                          ? (countValues(
                              filteredPreSurveys,
                              (survey) =>
                                survey.has_shared_pocky
                            ) /
                              filteredPreSurveys.length) *
                              100
                          : 0
                      )}
                      description="シェア経験がある割合"
                    />
                  </div>

                  <div className="surveyAnalysisGraphGrid">
                    <DistributionGraph
                      title="性別"
                      total={filteredPreSurveys.length}
                      items={[
                        "男性",
                        "女性",
                        "回答しない",
                      ].map((option) => ({
                        label: option,
                        count: countValues(
                          filteredPreSurveys,
                          (survey) =>
                            survey.gender === option
                        ),
                      }))}
                    />

                    <DistributionGraph
                      title="ポッキーを食べる頻度"
                      total={filteredPreSurveys.length}
                      items={frequencyOptions.map(
                        (option) => ({
                          label: option,
                          count: countValues(
                            filteredPreSurveys,
                            (survey) =>
                              survey.pocky_frequency ===
                              option
                          ),
                        })
                      )}
                    />

                    <DistributionGraph
                      title="リニューアル認知"
                      total={filteredPreSurveys.length}
                      items={[
                        {
                          label: "知っていた",
                          count: countValues(
                            filteredPreSurveys,
                            (survey) =>
                              survey.knew_renewal
                          ),
                        },
                        {
                          label: "知らなかった",
                          count: countValues(
                            filteredPreSurveys,
                            (survey) =>
                              !survey.knew_renewal
                          ),
                        },
                      ]}
                    />

                    <DistributionGraph
                      title="ポッキーのシェア経験"
                      total={filteredPreSurveys.length}
                      items={[
                        {
                          label: "経験あり",
                          count: countValues(
                            filteredPreSurveys,
                            (survey) =>
                              survey.has_shared_pocky
                          ),
                        },
                        {
                          label: "経験なし",
                          count: countValues(
                            filteredPreSurveys,
                            (survey) =>
                              !survey.has_shared_pocky
                          ),
                        },
                      ]}
                    />
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="BEFORE SCORES"
                    title="参加前の気持ち・意向"
                    description="4段階評価の人数・割合・平均点を表示します。肯定率は3点または4点の割合です。"
                  />

                  <div className="surveyAnalysisGraphGrid">
                    {sharedQuestions.map((question) => (
                      <ScoreDistribution
                        key={question.key}
                        title={question.title}
                        values={filteredPreSurveys.map(
                          (survey) =>
                            survey[question.key]
                        )}
                      />
                    ))}
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="SHARE SITUATIONS"
                    title="ポッキーをシェアする場面"
                    description="参加前アンケートの自由記述回答です。"
                  />

                  <div className="staffSurveyComments">
                    {filteredPreSurveys.filter(
                      (survey) =>
                        Boolean(
                          survey.share_situation?.trim()
                        )
                    ).length === 0 ? (
                      <div className="staffSurveyEmpty">
                        現在の条件に該当する回答はありません。
                      </div>
                    ) : (
                      filteredPreSurveys
                        .filter((survey) =>
                          Boolean(
                            survey.share_situation?.trim()
                          )
                        )
                        .map((survey, index) => (
                          <article
                            key={survey.participant_id}
                          >
                            <span>
                              ANSWER {index + 1}
                            </span>
                            <p>
                              {survey.share_situation}
                            </p>
                          </article>
                        ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* =================================
                AFTER TAB
            ================================= */}

            {activeTab === "after" && (
              <div className="surveyAnalysisTabContent">
                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="AFTER SURVEY"
                    title="参加後アンケートの結果"
                    description="参加後アンケートに回答した人を対象に、各設問の結果を表示しています。"
                  />

                  <div className="staffSurveyAfterStats">
                    <StatCard
                      label="回答人数"
                      value={`${filteredPostSurveys.length}人`}
                    />

                    <StatCard
                      label="リニューアル理解・肯定率"
                      value={rateText(
                        positiveRate(
                          filteredPostSurveys.map(
                            (survey) =>
                              survey.renewal_understanding_score
                          )
                        )
                      )}
                    />

                    <StatCard
                      label="ポッキーへの興味・肯定率"
                      value={rateText(
                        positiveRate(
                          filteredPostSurveys.map(
                            (survey) =>
                              survey.interest_score
                          )
                        )
                      )}
                    />

                    <StatCard
                      label="食べたい気持ち・肯定率"
                      value={rateText(
                        positiveRate(
                          filteredPostSurveys.map(
                            (survey) =>
                              survey.eat_intent_score
                          )
                        )
                      )}
                    />

                    <StatCard
                      label="シェア意向・肯定率"
                      value={rateText(
                        positiveRate(
                          filteredPostSurveys.map(
                            (survey) =>
                              survey.share_intent_score
                          )
                        )
                      )}
                    />
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="AFTER SCORES"
                    title="参加後の回答分布"
                    description="参加後の回答を4段階の棒グラフで表示します。"
                  />

                  <div className="surveyAnalysisGraphGrid">
                    {sharedQuestions.map((question) => (
                      <ScoreDistribution
                        key={question.key}
                        title={question.title}
                        values={filteredPostSurveys.map(
                          (survey) =>
                            survey[question.key]
                        )}
                      />
                    ))}

                    <ScoreDistribution
                      title="リニューアル内容の理解度"
                      values={filteredPostSurveys.map(
                        (survey) =>
                          survey.renewal_understanding_score
                      )}
                      labels={understandingOptions}
                    />
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="COMMENTS"
                    title="POKIPOで印象に残ったこと"
                    description="参加後アンケートの自由記述回答です。"
                  />

                  <div className="staffSurveyComments">
                    {filteredPostSurveys.filter(
                      (survey) =>
                        Boolean(
                          survey.memorable_point?.trim()
                        )
                    ).length === 0 ? (
                      <div className="staffSurveyEmpty">
                        現在の条件に該当する自由記述はありません。
                      </div>
                    ) : (
                      filteredPostSurveys
                        .filter((survey) =>
                          Boolean(
                            survey.memorable_point?.trim()
                          )
                        )
                        .map((survey, index) => (
                          <article
                            key={survey.participant_id}
                          >
                            <span>
                              COMMENT {index + 1}
                            </span>
                            <p>
                              {survey.memorable_point}
                            </p>
                          </article>
                        ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* =================================
                COMPARISON TAB
            ================================= */}

            {activeTab === "comparison" && (
              <div className="surveyAnalysisTabContent">
                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="BEFORE / AFTER"
                    title="参加前後の比較"
                    description="参加前と参加後の両方に回答した同一参加者だけを対象に比較しています。"
                  />

                  <div className="staffSurveySimpleStats">
                    <StatCard
                      label="比較対象者"
                      value={`${comparisonPairs.length}人`}
                      description="両方のアンケートに回答"
                    />

                    <StatCard
                      label="参加前回答者"
                      value={`${filteredPreSurveys.length}人`}
                    />

                    <StatCard
                      label="参加後回答者"
                      value={`${filteredPostSurveys.length}人`}
                    />
                  </div>

                  <div className="staffSurveyMetricList">
                    {sharedQuestions.map((question) =>
                      renderComparisonMetric(
                        question.key,
                        question.title,
                        comparisonPairs
                      )
                    )}
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="SCORE DISTRIBUTION"
                    title="参加前後の回答分布"
                    description="同じ参加者を対象に、参加前と参加後の回答の偏りを比べます。"
                  />

                  <div className="surveyAnalysisGraphGrid">
                    {sharedQuestions.map((question) => {
                      const scores = getPairScores(
                        comparisonPairs,
                        question.key
                      );

                      return (
                        <div key={question.key}>
                          <h3 className="surveyAnalysisPairTitle">
                            {question.title}
                          </h3>

                          <div className="surveyAnalysisPairGrid">
                            <ScoreDistribution
                              title="参加前"
                              values={scores.before}
                            />

                            <ScoreDistribution
                              title="参加後"
                              values={scores.after}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="CHANGE ANALYSIS"
                    title="一人ひとりの変化"
                    description="参加前から参加後にかけて、改善・変化なし・低下した人数を集計しています。"
                  />

                  <div className="surveyAnalysisGraphGrid">
                    {sharedQuestions.map((question) => {
                      const counts = getChangeCounts(
                        comparisonPairs,
                        question.key
                      );

                      return (
                        <DistributionGraph
                          key={question.key}
                          title={question.title}
                          total={comparisonPairs.length}
                          items={[
                            {
                              label: "改善",
                              count: counts.improved,
                            },
                            {
                              label: "変化なし",
                              count: counts.same,
                            },
                            {
                              label: "低下",
                              count: counts.decreased,
                            },
                          ]}
                        />
                      );
                    })}
                  </div>
                </section>

                <section className="staffSurveySection">
                  <SectionHeading
                    eyebrow="SEGMENT ANALYSIS"
                    title="参加前の状態別に比較"
                    description="リニューアル認知・シェア経験の違いによって、変化に差があるかを確認できます。"
                  />

                  <div className="surveyAnalysisSegmentGrid">
                    {renderSegment(
                      "リニューアルを知っていた人",
                      "参加前にリニューアルを認知していた参加者",
                      comparisonPairs.filter(
                        (pair) =>
                          pair.before.knew_renewal
                      )
                    )}

                    {renderSegment(
                      "リニューアルを知らなかった人",
                      "参加前にリニューアルを認知していなかった参加者",
                      comparisonPairs.filter(
                        (pair) =>
                          !pair.before.knew_renewal
                      )
                    )}

                    {renderSegment(
                      "シェア経験がある人",
                      "参加前からシェア経験があった参加者",
                      comparisonPairs.filter(
                        (pair) =>
                          pair.before.has_shared_pocky
                      )
                    )}

                    {renderSegment(
                      "シェア経験がない人",
                      "参加前にシェア経験がなかった参加者",
                      comparisonPairs.filter(
                        (pair) =>
                          !pair.before.has_shared_pocky
                      )
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {lastUpdated && (
          <p className="surveyAnalysisUpdated">
            最終取得：{lastUpdated}
          </p>
        )}
      </section>
    </main>
  );
}