
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Metric =
  | "registered"
  | "stamps"
  | "completed"
  | "exchanged";

type TrendMetric = "registered" | "completed";

type Daily = {
  date: string;
  registered: number;
  stamps: number;
  completed: number;
  exchanged: number;
};

type Totals = {
  registered: number;
  completed: number;
  exchanged: number;
  stamps: number;
};

type Spot = {
  spot_id: string;
  count: number;
};

type AnalyticsData = {
  totals: Totals;
  daily: Daily[];
  spots: Spot[];
};

const SPOT_NAMES: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

const METRICS: {
  key: Metric;
  label: string;
}[] = [
  { key: "registered", label: "新規登録者" },
  { key: "stamps", label: "スタンプ取得" },
  { key: "completed", label: "新規完走者" },
  { key: "exchanged", label: "特典交換" },
];

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function percentage(part: number, total: number) {
  return total > 0
    ? Math.round((part / total) * 100)
    : 0;
}

function dateLabel(value: string) {
  const parts = value.split("-");
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function fullDateLabel(value: string) {
  const parts = value.split("-");
  return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
}

function normalizeData(raw: unknown): AnalyticsData {
  const obj =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const t =
    obj.totals && typeof obj.totals === "object"
      ? (obj.totals as Record<string, unknown>)
      : {};

  const daily = Array.isArray(obj.daily)
    ? obj.daily
    : [];

  const spots = Array.isArray(obj.spots)
    ? obj.spots
    : [];

  return {
    totals: {
      registered: numberValue(t.registered),
      completed: numberValue(t.completed),
      exchanged: numberValue(t.exchanged),
      stamps: numberValue(t.stamps),
    },
    daily: daily.map((item) => ({
      date: String(item.date ?? ""),
      registered: numberValue(item.registered),
      stamps: numberValue(item.stamps),
      completed: numberValue(item.completed),
      exchanged: numberValue(item.exchanged),
    })),
    spots: spots.map((item) => ({
      spot_id: String(item.spot_id ?? ""),
      count: numberValue(item.count),
    })),
  };
}

function cumulativeValues(
  days: Daily[],
  allDays: Daily[],
  total: number,
  metric: TrendMetric
) {
  const allDailyTotal = allDays.reduce(
    (sum, day) => sum + day[metric],
    0
  );

  let running = Math.max(
    0,
    total - allDailyTotal
  );

  const firstDate = days[0]?.date;

  const earlierDays = allDays.filter(
    (day) => firstDate && day.date < firstDate
  );

  for (const day of earlierDays) {
    running += day[metric];
  }

  return days.map((day) => {
    running += day[metric];
    return running;
  });
}

function DayDetail({
  day,
  cumulative,
  highlighted,
}: {
  day: Daily | null;
  cumulative?: number;
  highlighted?: string;
}) {
  if (!day) {
    return (
      <div className="pokipoGraphDetail empty">
        <span>日付を選択</span>
        <p>
          グラフの棒または点をタップすると、
          その日の実績が表示されます。
        </p>
      </div>
    );
  }

  const items = [
    {
      key: "registered",
      label: "新規登録者",
      value: day.registered,
      unit: "人",
    },
    {
      key: "stamps",
      label: "スタンプ取得",
      value: day.stamps,
      unit: "件",
    },
    {
      key: "completed",
      label: "新規完走者",
      value: day.completed,
      unit: "人",
    },
    {
      key: "exchanged",
      label: "特典交換",
      value: day.exchanged,
      unit: "件",
    },
  ];

  return (
    <div
      className="pokipoGraphDetail"
      role="status"
      aria-live="polite"
    >
      <div className="pokipoGraphDetailHeader">
        <span>SELECTED DATE</span>
        <strong>{fullDateLabel(day.date)}</strong>
      </div>

      <div className="pokipoGraphDetailGrid">
        {items.map((item) => (
          <div
            key={item.key}
            className={
              highlighted === item.key
                ? "pokipoGraphDetailItem selected"
                : "pokipoGraphDetailItem"
            }
          >
            <span>{item.label}</span>
            <strong>
              {item.value.toLocaleString()}
              <small>{item.unit}</small>
            </strong>
          </div>
        ))}
      </div>

      {cumulative !== undefined && (
        <p className="pokipoGraphCumulative">
          この日までの累計：
          <strong>
            {cumulative.toLocaleString()}人
          </strong>
        </p>
      )}
    </div>
  );
}

/* =====================================
   動く折れ線グラフ
===================================== */

function TrendChart({
  data,
  allDays,
  total,
  metric,
}: {
  data: Daily[];
  allDays: Daily[];
  total: number;
  metric: TrendMetric;
}) {
  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const values = cumulativeValues(
    data,
    allDays,
    total,
    metric
  );

  const maxValue = Math.max(1, ...values);

  const W = 760;
  const H = 255;
  const LEFT = 48;
  const RIGHT = 18;
  const TOP = 20;
  const BOTTOM = 40;

  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;

  const points = values.map((value, index) => {
    const x =
      LEFT +
      (values.length < 2
        ? plotW / 2
        : (index / (values.length - 1)) * plotW);

    const y =
      TOP +
      plotH * (1 - value / maxValue);

    return {
      x,
      y,
      value,
      date: data[index].date,
    };
  });

  const line = points
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const activeIndex = data.findIndex(
    (day) => day.date === selectedDate
  );

  const activeDay =
    activeIndex >= 0 ? data[activeIndex] : null;

  const activeCumulative =
    activeIndex >= 0
      ? values[activeIndex]
      : undefined;

  const lineKey = `${metric}-${data.length}-${data[0]?.date ?? ""}`;

  return (
    <div className="pokipoInteractiveChart">
      <div className="pokipoAnalyticsTrend">
        <svg
          key={lineKey}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="累計人数推移。各点を選択できます"
        >
          {[0, 0.25, 0.5, 0.75, 1].map(
            (fraction) => {
              const y =
                TOP +
                plotH * (1 - fraction);

              return (
                <g key={fraction}>
                  <line
                    x1={LEFT}
                    x2={W - RIGHT}
                    y1={y}
                    y2={y}
                    stroke="#e8dfd8"
                    strokeDasharray="4 5"
                  />
                  <text
                    x={LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#786c64"
                  >
                    {Math.round(
                      maxValue * fraction
                    )}
                  </text>
                </g>
              );
            }
          )}

          {points.length > 0 && (
            <>
              <polyline
                points={line}
                fill="none"
                stroke="#8a1822"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pokipoGraphDrawLine"
              />

              {points.map((point, index) => {
                const selected =
                  point.date === selectedDate;

                return (
                  <g
                    key={point.date}
                    role="button"
                    tabIndex={0}
                    aria-label={`${fullDateLabel(
                      point.date
                    )} 累計${point.value}人`}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "pokipoGraphPoint selected"
                        : "pokipoGraphPoint"
                    }
                    onClick={() =>
                      setSelectedDate(point.date)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        setSelectedDate(point.date);
                      }
                    }}
                    style={{
                      animationDelay: `${
                        150 + index * 8
                      }ms`,
                    }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="13"
                      fill="transparent"
                    />
                    {selected && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="9"
                        fill="#8a1822"
                        fillOpacity="0.13"
                      />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={selected ? 5.8 : 3.3}
                      fill={
                        selected
                          ? "#ffffff"
                          : "#8a1822"
                      }
                      stroke="#8a1822"
                      strokeWidth={selected ? 2.5 : 0}
                    />
                    <title>
                      {fullDateLabel(point.date)}
                      ：累計{point.value}人
                    </title>
                  </g>
                );
              })}
            </>
          )}

          {data.length > 0 && (
            <>
              <text
                x={LEFT}
                y={H - 7}
                fill="#786c64"
                fontSize="12"
              >
                {dateLabel(data[0].date)}
              </text>
              <text
                x={W - RIGHT}
                y={H - 7}
                fill="#786c64"
                fontSize="12"
                textAnchor="end"
              >
                {dateLabel(
                  data[data.length - 1].date
                )}
              </text>
            </>
          )}
        </svg>
      </div>

      <DayDetail
        day={activeDay}
        cumulative={activeCumulative}
        highlighted={metric}
      />
    </div>
  );
}

/* =====================================
   動く棒グラフ
===================================== */

function BarChart({
  data,
  metric,
}: {
  data: Daily[];
  metric: Metric;
}) {
  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const maxValue = Math.max(
    1,
    ...data.map((day) => day[metric])
  );

  const total = data.reduce(
    (sum, day) => sum + day[metric],
    0
  );

  const selectedDay =
    data.find(
      (day) => day.date === selectedDate
    ) ?? null;

  return (
    <div className="pokipoInteractiveChart">
      <div className="pokipoAnalyticsChartSummary">
        <span>選択期間の合計</span>
        <strong>
          {total.toLocaleString()}
          {metric === "stamps" || metric === "exchanged"
            ? " 件"
            : " 人"}
        </strong>
      </div>

      <div
        className="pokipoAnalyticsBars pokipoGraphAnimatedBars"
        key={`${metric}-${data.length}-${data[0]?.date ?? ""}`}
      >
        {data.map((day, index) => {
          const selected =
            selectedDate === day.date;

          const height =
            (day[metric] / maxValue) * 100;

          return (
            <button
              type="button"
              key={day.date}
              className={
                selected
                  ? "pokipoAnalyticsBarColumn pokipoGraphBarButton selected"
                  : "pokipoAnalyticsBarColumn pokipoGraphBarButton"
              }
              onClick={() =>
                setSelectedDate(day.date)
              }
              aria-pressed={selected}
              aria-label={`${fullDateLabel(day.date)}：${day[metric]}件`}
              title={`${day.date}：${day[metric]}件`}
            >
              <span className="pokipoAnalyticsBarTrack">
                <span
                  className="pokipoGraphAnimatedBar"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${
                      Math.min(index * 15, 600)
                    }ms`,
                  }}
                />
              </span>

              <small>
                {dateLabel(day.date)}
              </small>
            </button>
          );
        })}
      </div>

      <p className="pokipoAnalyticsNote">
        棒グラフをタップすると、その日の詳細が表示されます。
      </p>

      <DayDetail
        day={selectedDay}
        highlighted={metric}
      />
    </div>
  );
}

/* =====================================
   円グラフ
===================================== */

function DonutChart({
  title,
  good,
  total,
  goodLabel,
  remainingLabel,
}: {
  title: string;
  good: number;
  total: number;
  goodLabel: string;
  remainingLabel: string;
}) {
  const achieved = Math.min(
    Math.max(good, 0),
    Math.max(total, 0)
  );
  const remaining = Math.max(0, total - achieved);
  const percent = percentage(achieved, total);

  return (
    <div className="pokipoAnalyticsDonutCard">
      <h3>{title}</h3>

      <div className="pokipoAnalyticsDonutRow">
        <div
          className="pokipoAnalyticsDonut pokipoGraphAnimatedDonut"
          style={{
            background: `conic-gradient(
              #8a1822 0% ${percent}%,
              #eee6df ${percent}% 100%
            )`,
          }}
          role="img"
          aria-label={`${goodLabel} ${percent}%`}
        >
          <div>
            <strong>{percent}%</strong>
          </div>
        </div>

        <div className="pokipoAnalyticsLegend">
          <p>
            <i className="pokipoAnalyticsLegendRed" />
            {goodLabel}
            <strong>
              {achieved.toLocaleString()}人
            </strong>
          </p>
          <p>
            <i className="pokipoAnalyticsLegendPale" />
            {remainingLabel}
            <strong>
              {remaining.toLocaleString()}人
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}

/* =====================================
   スポット別
===================================== */

function SpotChart({
  spots,
}: {
  spots: Spot[];
}) {
  const rows = Object.entries(SPOT_NAMES).map(
    ([id, name]) => ({
      id,
      name,
      count:
        spots.find(
          (spot) => spot.spot_id === id
        )?.count ?? 0,
    })
  );

  const maxValue = Math.max(
    1,
    ...rows.map((row) => row.count)
  );

  const [selectedSpot, setSelectedSpot] =
    useState<string | null>(null);

  const selectedRow = rows.find(
    (row) => row.id === selectedSpot
  );

  return (
    <>
      <div className="pokipoAnalyticsSpotList">
        {rows.map((spot, index) => (
          <button
            type="button"
            key={spot.id}
            className={
              selectedSpot === spot.id
                ? "pokipoAnalyticsSpotRow pokipoGraphSpotButton selected"
                : "pokipoAnalyticsSpotRow pokipoGraphSpotButton"
            }
            onClick={() =>
              setSelectedSpot(spot.id)
            }
          >
            <span className="pokipoAnalyticsSpotMeta">
              <span>SPOT {index + 1}</span>
              <strong>{spot.name}</strong>
              <b>
                {spot.count.toLocaleString()}人
              </b>
            </span>

            <span className="pokipoAnalyticsSpotTrack">
              <span
                className="pokipoGraphSpotFill"
                style={{
                  width: `${
                    (spot.count / maxValue) * 100
                  }%`,
                  animationDelay: `${index * 100}ms`,
                }}
              />
            </span>
          </button>
        ))}
      </div>

      {selectedRow && (
        <div
          className="pokipoGraphSpotDetail"
          role="status"
        >
          <span>選択したスポット</span>
          <strong>{selectedRow.name}</strong>
          <p>
            累計読み取り人数：
            <b>
              {selectedRow.count.toLocaleString()}人
            </b>
          </p>
        </div>
      )}
    </>
  );
}

/* =====================================
   メインページ
===================================== */

export default function StaffAnalyticsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [data, setData] =
    useState<AnalyticsData | null>(null);

  const [period, setPeriod] =
    useState(14);

  const [barMetric, setBarMetric] =
    useState<Metric>("registered");

  const [trendMetric, setTrendMetric] =
    useState<TrendMetric>("registered");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: auth, error } =
        await supabase.auth.getUser();

      if (!active) return;

      if (error || !auth.user) {
        setMessage(
          "スタッフログインが必要です。"
        );
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("staff_profiles")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profile) {
        setMessage(
          "スタッフ権限がありません。"
        );
        setLoading(false);
        return;
      }

      setAuthorized(true);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authorized) return;

    let active = true;

    async function load() {
      const {
        data: result,
        error,
      } = await supabase.rpc(
        "pokipo_staff_analytics"
      );

      if (!active) return;

      if (error) {
        console.error(
          "分析データ取得エラー:",
          error
        );

        setMessage(
          "分析データの取得に失敗しました。SQL関数を確認してください。"
        );
      } else {
        setData(normalizeData(result));
        setMessage("");
      }

      setLoading(false);
    }

    void load();

    const timer = window.setInterval(
      () => {
        if (
          document.visibilityState === "visible"
        ) {
          void load();
        }
      },
      60000
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authorized]);

  const displayedDays = useMemo(() => {
    return data?.daily.slice(-period) ?? [];
  }, [data, period]);

  const totals = data?.totals;

  const completionRate = percentage(
    totals?.completed ?? 0,
    totals?.registered ?? 0
  );

  const exchangeRate = percentage(
    totals?.exchanged ?? 0,
    totals?.completed ?? 0
  );

  return (
    <main className="shell">
      <section className="pokipoAnalyticsPage">
        <header className="pokipoAnalyticsHeader">
          <div>
            <span className="pokipoAnalyticsEyebrow">
              POKIPO DATA ANALYTICS
            </span>
            <h1>グラフ分析</h1>
            <p>
              登録者・スタンプ・完走・特典交換の
              推移を確認できます。
            </p>
          </div>

          <button
            type="button"
            className="pokipoAnalyticsBack"
            onClick={() =>
              router.push("/staff/dashboard")
            }
          >
            ← ダッシュボードに戻る
          </button>
        </header>

        {message && (
          <div
            className="pokipoAnalyticsMessage"
            role="alert"
          >
            {message}
          </div>
        )}

        {loading && (
          <div className="pokipoAnalyticsMessage">
            分析データを読み込み中...
          </div>
        )}

        {!loading && data && (
          <>
            <div className="pokipoAnalyticsStats">

<div className="pokipoAnalyticsStats">
  {[
    {
      label: "登録者",
      value: totals?.registered ?? 0,
      unit: "人",
    },
    {
      label: "完走者",
      value: totals?.completed ?? 0,
      unit: "人",
    },
    {
      label: "交換済み",
      value: totals?.exchanged ?? 0,
      unit: "人",
    },
    {
      label: "スタンプ取得件数",
      value: totals?.stamps ?? 0,
      unit: "件",
    },
  ].map((item) => (
    <article
      className="pokipoAnalyticsStat"
      key={item.label}
    >
      <span>{item.label}</span>

      <div className="pokipoAnalyticsStatValue">
        <strong>
          {item.value.toLocaleString()}
        </strong>

        <small>{item.unit}</small>
      </div>
    </article>
  ))}
</div>

            </div>

            <section className="pokipoAnalyticsCard">
              <div className="pokipoAnalyticsSectionHeader">
                <div>
                  <span>TREND ANALYSIS</span>
                  <h2>累計人数の推移</h2>
                </div>
              </div>

              <div className="pokipoAnalyticsControls">
                <div className="pokipoAnalyticsTabs">
                  <button
                    type="button"
                    className={
                      trendMetric === "registered"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setTrendMetric("registered")
                    }
                  >
                    累計登録者
                  </button>

                  <button
                    type="button"
                    className={
                      trendMetric === "completed"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setTrendMetric("completed")
                    }
                  >
                    累計完走者
                  </button>
                </div>

                <div className="pokipoAnalyticsTabs">
                  {[7, 14, 30, 90].map(
                    (days) => (
                      <button
                        type="button"
                        key={days}
                        className={
                          period === days
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setPeriod(days)
                        }
                      >
                        {days}日
                      </button>
                    )
                  )}
                </div>
              </div>

              <TrendChart
                key={`${trendMetric}-${period}`}
                data={displayedDays}
                allDays={data.daily}
                metric={trendMetric}
                total={
                  trendMetric === "registered"
                    ? totals?.registered ?? 0
                    : totals?.completed ?? 0
                }
              />
            </section>

            <section className="pokipoAnalyticsCard">
              <div className="pokipoAnalyticsSectionHeader">
                <div>
                  <span>DAILY ACTIVITY</span>
                  <h2>日別実績の棒グラフ</h2>
                </div>
              </div>

              <div className="pokipoAnalyticsTabs">
                {METRICS.map((metric) => (
                  <button
                    type="button"
                    key={metric.key}
                    className={
                      barMetric === metric.key
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setBarMetric(metric.key)
                    }
                  >
                    {metric.label}
                  </button>
                ))}
              </div>

              <BarChart
                key={`${barMetric}-${period}`}
                data={displayedDays}
                metric={barMetric}
              />
            </section>

            <section className="pokipoAnalyticsCard">
              <div className="pokipoAnalyticsSectionHeader">
                <div>
                  <span>SPOT PERFORMANCE</span>
                  <h2>スポット別読み取り人数</h2>
                </div>
              </div>

              <SpotChart spots={data.spots} />

              <p className="pokipoAnalyticsNote">
                同じスポットでの重複取得を除いた
                累計人数です。
              </p>
            </section>

            <section className="pokipoAnalyticsCard">
              <div className="pokipoAnalyticsSectionHeader">
                <div>
                  <span>CONVERSION ANALYSIS</span>
                  <h2>完走率・特典交換率</h2>
                </div>
              </div>

              <div className="pokipoAnalyticsRates">
                <div>
                  <span>COMPLETION RATE</span>
                  <strong>
                    {completionRate}%
                  </strong>
                  <p>
                    参加者のうち完走した割合
                  </p>
                </div>

                <div>
                  <span>EXCHANGE RATE</span>
                  <strong>
                    {exchangeRate}%
                  </strong>
                  <p>
                    完走者のうち特典交換した割合
                  </p>
                </div>
              </div>

              <div className="pokipoAnalyticsDonuts">
                <DonutChart
                  title="参加者の完走状況"
                  good={
                    totals?.completed ?? 0
                  }
                  total={
                    totals?.registered ?? 0
                  }
                  goodLabel="完走"
                  remainingLabel="未完走"
                />

                <DonutChart
                  title="完走者の交換状況"
                  good={
                    totals?.exchanged ?? 0
                  }
                  total={
                    totals?.completed ?? 0
                  }
                  goodLabel="交換済み"
                  remainingLabel="未交換"
                />
              </div>
            </section>

            <p className="pokipoAnalyticsFootnote">
              日付は日本時間です。
              日別実績は直近90日分を使用しています。
              データは画面表示中、約60秒ごとに更新されます。
              各日の人数は登録・完走・交換の記録から
              集計した数値です。
            </p>
          </>
        )}
      </section>
    </main>
  );
}
