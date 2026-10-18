
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Totals = {
  registered: number;
  completed: number;
  exchanged: number;
  stamps: number;
};

type Daily = {
  date: string;
  registered: number;
  stamps: number;
  completed: number;
  exchanged: number;
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

type Metric =
  | "registered"
  | "stamps"
  | "completed"
  | "exchanged";

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

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function percentage(part: number, all: number) {
  if (all <= 0) return 0;
  return Math.round((part / all) * 100);
}

function dateLabel(date: string) {
  const pieces = date.split("-");
  return `${Number(pieces[1])}/${Number(pieces[2])}`;
}

function normalizeData(raw: unknown): AnalyticsData {
  const obj =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const rawTotals =
    obj.totals && typeof obj.totals === "object"
      ? (obj.totals as Record<string, unknown>)
      : {};

  const daily = Array.isArray(obj.daily) ? obj.daily : [];
  const spots = Array.isArray(obj.spots) ? obj.spots : [];

  return {
    totals: {
      registered: safeNumber(rawTotals.registered),
      completed: safeNumber(rawTotals.completed),
      exchanged: safeNumber(rawTotals.exchanged),
      stamps: safeNumber(rawTotals.stamps),
    },
    daily: daily.map((row) => ({
      date: String(row.date ?? ""),
      registered: safeNumber(row.registered),
      stamps: safeNumber(row.stamps),
      completed: safeNumber(row.completed),
      exchanged: safeNumber(row.exchanged),
    })),
    spots: spots.map((row) => ({
      spot_id: String(row.spot_id ?? ""),
      count: safeNumber(row.count),
    })),
  };
}

function BarChart({
  data,
  metric,
}: {
  data: Daily[];
  metric: Metric;
}) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => item[metric])
  );

  const total = data.reduce(
    (sum, item) => sum + item[metric],
    0
  );

  return (
    <div className="pokipoAnalyticsChart">
      <div className="pokipoAnalyticsChartSummary">
        <span>選択期間の合計</span>
        <strong>{total.toLocaleString()} 件</strong>
      </div>

      <div className="pokipoAnalyticsBars">
        {data.map((item) => (
          <div
            className="pokipoAnalyticsBarColumn"
            key={item.date}
            title={`${item.date}：${item[metric]}件`}
          >
            <div className="pokipoAnalyticsBarTrack">
              <span
                style={{
                  height: `${
                    (item[metric] / maxValue) * 100
                  }%`,
                }}
              />
            </div>
            <small>{dateLabel(item.date)}</small>
          </div>
        ))}
      </div>

      <p className="pokipoAnalyticsNote">
        各棒にカーソルを重ねると日付と件数を確認できます。
      </p>
    </div>
  );
}

function TrendChart({
  data,
  total,
  metric,
}: {
  data: Daily[];
  total: number;
  metric: "registered" | "completed";
}) {
  const selectedTotal = data.reduce(
    (sum, item) => sum + item[metric],
    0
  );

  const baseline = Math.max(0, total - selectedTotal);

  let running = baseline;
  const values = data.map((day) => {
    running += day[metric];
    return running;
  });

  const maxValue = Math.max(1, ...values);

  const width = 760;
  const height = 240;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 34;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const points = values.map((value, index) => {
    const x =
      left +
      (values.length <= 1
        ? plotWidth / 2
        : (index / (values.length - 1)) * plotWidth);

    const y =
      top + plotHeight * (1 - value / maxValue);

    return { x, y, value };
  });

  const linePoints = points
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <div className="pokipoAnalyticsTrend">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          metric === "registered"
            ? "累計登録者数の推移"
            : "累計完走者数の推移"
        }
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = top + plotHeight * (1 - fraction);

          return (
            <g key={fraction}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#eaded8"
                strokeDasharray="4 5"
              />
              <text
                x={left - 8}
                y={y + 4}
                fontSize="12"
                textAnchor="end"
                fill="#765d52"
              >
                {Math.round(maxValue * fraction)}
              </text>
            </g>
          );
        })}

        {points.length > 0 && (
          <>
            <polyline
              points={linePoints}
              fill="none"
              stroke="#d32932"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, index) => (
              <circle
                key={index}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#d32932"
              >
                <title>
                  {data[index]?.date}：{p.value}人
                </title>
              </circle>
            ))}
          </>
        )}

        {data.length > 0 && (
          <>
            <text
              x={left}
              y={height - 5}
              fontSize="12"
              fill="#765d52"
            >
              {dateLabel(data[0].date)}
            </text>
            <text
              x={width - right}
              y={height - 5}
              fontSize="12"
              textAnchor="end"
              fill="#765d52"
            >
              {dateLabel(data[data.length - 1].date)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

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
  const displayedGood = Math.min(good, total);
  const remaining = Math.max(0, total - displayedGood);
  const percent = percentage(displayedGood, total);

  return (
    <div className="pokipoAnalyticsDonutCard">
      <h3>{title}</h3>

      <div className="pokipoAnalyticsDonutRow">
        <div
          className="pokipoAnalyticsDonut"
          style={{
            background: `conic-gradient(
              #d32932 0% ${percent}%,
              #f1ded4 ${percent}% 100%
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
            <strong>{displayedGood.toLocaleString()}人</strong>
          </p>
          <p>
            <i className="pokipoAnalyticsLegendPale" />
            {remainingLabel}
            <strong>{remaining.toLocaleString()}人</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function SpotChart({ spots }: { spots: Spot[] }) {
  const spotRows = Object.entries(SPOT_NAMES).map(
    ([id, name]) => ({
      id,
      name,
      count:
        spots.find((s) => s.spot_id === id)?.count ?? 0,
    })
  );

  const maxValue = Math.max(
    1,
    ...spotRows.map((s) => s.count)
  );

  return (
    <div className="pokipoAnalyticsSpotList">
      {spotRows.map((spot, index) => (
        <div className="pokipoAnalyticsSpotRow" key={spot.id}>
          <div className="pokipoAnalyticsSpotMeta">
            <span>SPOT {index + 1}</span>
            <strong>{spot.name}</strong>
            <b>{spot.count.toLocaleString()}人</b>
          </div>

          <div className="pokipoAnalyticsSpotTrack">
            <span
              style={{
                width: `${
                  (spot.count / maxValue) * 100
                }%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffAnalyticsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);

  const [period, setPeriod] = useState(14);
  const [barMetric, setBarMetric] =
    useState<Metric>("registered");
  const [trendMetric, setTrendMetric] =
    useState<"registered" | "completed">("registered");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: auth, error } =
        await supabase.auth.getUser();

      if (!active) return;

      if (error || !auth.user) {
        setMessage("スタッフログインが必要です。");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", auth.user.id)
          .maybeSingle();

      if (!active) return;

      if (profileError || !profile) {
        setMessage("スタッフ権限がありません。");
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
      const { data: result, error } = await supabase.rpc(
        "pokipo_staff_analytics"
      );

      if (!active) return;

      if (error) {
        console.error("分析データ取得エラー:", error);
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

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, 60000);

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
              登録者・スタンプ・完走・特典交換の状況を
              グラフで確認できます。
            </p>
          </div>

          <button
            type="button"
            className="pokipoAnalyticsBack"
            onClick={() => router.push("/staff/dashboard")}
          >
            ← ダッシュボードに戻る
          </button>
        </header>

        {message && (
          <div className="pokipoAnalyticsMessage" role="alert">
            {message}
          </div>
        )}

        {loading && (
          <div className="pokipoAnalyticsMessage">
            分析データを読み込んでいます...
          </div>
        )}

        {!loading && data && (
          <>
            <div className="pokipoAnalyticsStats">
              {[
                ["登録者", totals?.registered ?? 0],
                ["完走者", totals?.completed ?? 0],
                ["交換済み", totals?.exchanged ?? 0],
                ["スタンプ取得件数", totals?.stamps ?? 0],
              ].map(([label, value]) => (
                <article
                  className="pokipoAnalyticsStat"
                  key={String(label)}
                >
                  <span>{label}</span>
                  <strong>
                    {Number(value).toLocaleString()}
                  </strong>
                </article>
              ))}
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
                  {[7, 14, 30, 90].map((days) => (
                    <button
                      type="button"
                      key={days}
                      className={
                        period === days ? "active" : ""
                      }
                      onClick={() => setPeriod(days)}
                    >
                      {days}日
                    </button>
                  ))}
                </div>
              </div>

              <TrendChart
                data={displayedDays}
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
                スポットごとに重複参加者を除いた人数です。
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
                  <strong>{completionRate}%</strong>
                  <p>参加者のうち完走した割合</p>
                </div>
                <div>
                  <span>EXCHANGE RATE</span>
                  <strong>{exchangeRate}%</strong>
                  <p>完走者のうち特典交換した割合</p>
                </div>
              </div>

              <div className="pokipoAnalyticsDonuts">
                <DonutChart
                  title="参加者の完走状況"
                  good={totals?.completed ?? 0}
                  total={totals?.registered ?? 0}
                  goodLabel="完走"
                  remainingLabel="未完走"
                />

                <DonutChart
                  title="完走者の交換状況"
                  good={totals?.exchanged ?? 0}
                  total={totals?.completed ?? 0}
                  goodLabel="交換済み"
                  remainingLabel="未交換"
                />
              </div>
            </section>

            <p className="pokipoAnalyticsFootnote">
              集計日時は日本時間基準です。
              日別グラフは直近90日間の記録をもとに表示します。
              累計値にはそれ以前の記録も含まれます。
              データは画面表示中、約60秒ごとに更新されます。
            </p>
          </>
        )}
      </section>
    </main>
  );
}
