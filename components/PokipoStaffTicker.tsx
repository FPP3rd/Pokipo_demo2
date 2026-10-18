
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type NewsItem = {
  id: string;
  text: string;
  href: string;
  priority: "normal" | "highlight" | "warning";
};

type Totals = {
  registered: number;
  completed: number;
  exchanged: number;
  stamps: number;
};

type Feature = {
  key: string;
  total: number;
  last10: number;
  last60: number;
};

type Spot = {
  spot_id: string;
  count: number;
};

type Status =
  | "loading"
  | "online"
  | "partial"
  | "error";

/* ========================================
   CONFIG
======================================== */

const REWARD_LIMIT = 360;

const SPOT_NAMES: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

const MAINTENANCE_NAMES: Record<string, string> = {
  home: "ホーム",
  stamp: "スタンプ",
  knowledge: "豆知識",
  progress: "進捗",
  reward: "特典",
  pre_survey: "参加前アンケート",
  post_survey: "参加後アンケート",
};

/* ========================================
   HELPERS
======================================== */

function obj(value: unknown): Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function fmt(value: number): string {
  return value.toLocaleString("ja-JP");
}

function pct(a: number, b: number): string {
  return b > 0
    ? ((a / b) * 100).toFixed(1)
    : "0.0";
}

function japanDate(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function japanTime(): string {
  return new Date().toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ========================================
   MAIN
======================================== */

export default function PokipoStaffTicker() {
  const router = useRouter();

  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "loading",
      text: "POKIPO運営情報を取得しています...",
      href: "/staff/operations",
      priority: "normal",
    },
  ]);

  const [status, setStatus] = useState<Status>("loading");
  const [updatedAt, setUpdatedAt] = useState("");

  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const previousTotals = useRef<Totals | null>(null);

  /* ========================================
     DATA REFRESH
  ======================================== */

  const refresh = useCallback(async () => {
    if (busyRef.current) return;

    busyRef.current = true;

    try {
      const [analyticsResult, healthResult] =
        await Promise.all([
          supabase.rpc("pokipo_staff_analytics"),
          supabase.rpc("pokipo_staff_health_snapshot"),
        ]);

      if (!mountedRef.current) return;

      const analyticsOk =
        !analyticsResult.error &&
        analyticsResult.data != null;

      const healthOk =
        !healthResult.error &&
        healthResult.data != null;

      if (!analyticsOk && !healthOk) {
        previousTotals.current = null;
        setStatus("error");

        setNews([
          {
            id: "error",
            text:
              "運営データを取得できません。システム稼働状況を確認してください",
            href: "/staff/operations",
            priority: "warning",
          },
        ]);

        return;
      }

      const analytics = obj(analyticsResult.data);
      const health = obj(healthResult.data);
      const rawTotals = obj(analytics.totals);

      const features: Feature[] = Array.isArray(
        health.features
      )
        ? health.features.map((value: unknown) => {
            const row = obj(value);

            return {
              key: String(row.key ?? ""),
              total: num(row.total),
              last10: num(row.last10),
              last60: num(row.last60),
            };
          })
        : [];

      const feature = (key: string) =>
        features.find((row) => row.key === key);

      const totals: Totals = {
        registered: analyticsOk
          ? num(rawTotals.registered)
          : num(feature("registration")?.total),

        completed: analyticsOk
          ? num(rawTotals.completed)
          : num(feature("completions")?.total),

        exchanged: analyticsOk
          ? num(rawTotals.exchanged)
          : num(feature("reward_exchanged")?.total),

        stamps: analyticsOk
          ? num(rawTotals.stamps)
          : num(feature("stamps")?.total),
      };

      const items: NewsItem[] = [];

      function add(
        id: string,
        text: string,
        href: string,
        priority: NewsItem["priority"] = "normal"
      ) {
        items.push({
          id,
          text,
          href,
          priority,
        });
      }

      /* ====================================
         API WARNINGS
      ==================================== */

      if (!analyticsOk || !healthOk) {
        add(
          "api-warning",
          "一部の集計APIを取得できません。運営チェックをご確認ください",
          "/staff/operations",
          "warning"
        );
      }

      /* ====================================
         MAINTENANCE
      ==================================== */

      if (healthOk) {
        const maintenance = obj(health.maintenance);

        if (maintenance.all === true) {
          add(
            "maintenance-all",
            "全体メンテナンスが設定されています",
            "/staff/maintenance",
            "warning"
          );
        } else {
          const stopped = Object.entries(
            MAINTENANCE_NAMES
          )
            .filter(([key]) => maintenance[key] === true)
            .map(([, name]) => name);

          if (stopped.length > 0) {
            add(
              "maintenance-partial",
              `個別メンテナンス設定中：${stopped.join("・")}`,
              "/staff/maintenance",
              "warning"
            );
          }
        }
      }

      /* ====================================
         PARTICIPANTS
      ==================================== */

      add(
        "registered",
        `参加登録者：${fmt(totals.registered)}人`,
        "/staff/dashboard"
      );

      add(
        "completed",
        `スタンプ完走者：${fmt(totals.completed)}人`,
        "/staff/dashboard"
      );

      add(
        "stamps",
        `スタンプ取得総件数：${fmt(totals.stamps)}件`,
        "/staff/dashboard"
      );

      if (totals.registered > 0) {
        add(
          "completion-rate",
          `完走率：${pct(
            totals.completed,
            totals.registered
          )}%`,
          "/staff/dashboard"
        );
      }

      /* ====================================
         REWARD EXCHANGE
      ==================================== */

      add(
        "exchanged",
        `特典交換済み：${fmt(totals.exchanged)}人`,
        "/staff/reward/history"
      );

      if (totals.completed >= totals.exchanged) {
        add(
          "not-exchanged",
          `完走者のうち未交換：${fmt(
            totals.completed - totals.exchanged
          )}人`,
          "/staff/dashboard"
        );
      }

      if (totals.completed > 0) {
        add(
          "exchange-rate",
          `完走者に対する交換率：${pct(
            totals.exchanged,
            totals.completed
          )}%`,
          "/staff/dashboard"
        );
      }

      const remaining = Math.max(
        0,
        REWARD_LIMIT - totals.exchanged
      );

      add(
        "reward-remaining",
        `先着360名に対する交換記録上の参考残数：${fmt(
          remaining
        )}人分`,
        "/staff/reward",
        remaining <= 30 ? "warning" : "normal"
      );

      /* ====================================
         RECENT ACTIVITY
      ==================================== */

      if (healthOk) {
        const configurations = [
          ["registration", "参加登録", "人"],
          ["stamps", "スタンプ取得", "件"],
          ["completions", "完走", "人"],
          ["pre_survey", "参加前アンケート", "件"],
          ["post_survey", "参加後アンケート", "件"],
          ["reward_issued", "特典QR発行記録", "件"],
          ["reward_exchanged", "特典交換", "件"],
        ] as const;

        for (const [key, label, unit] of configurations) {
          const row = feature(key);

          if (!row) continue;

          add(
            `recent10-${key}`,
            `直近10分の${label}：${fmt(
              row.last10
            )}${unit}`,
            "/staff/operations",
            row.last10 > 0 ? "highlight" : "normal"
          );

          add(
            `recent60-${key}`,
            `直近60分の${label}：${fmt(
              row.last60
            )}${unit}`,
            "/staff/operations"
          );
        }

        const pre = feature("pre_survey");
        const post = feature("post_survey");
        const issued = feature("reward_issued");

        if (pre) {
          add(
            "pre-total",
            `参加前アンケート累計：${fmt(
              pre.total
            )}件`,
            "/staff/surveys"
          );
        }

        if (post) {
          add(
            "post-total",
            `参加後アンケート累計：${fmt(
              post.total
            )}件`,
            "/staff/surveys"
          );
        }

        if (issued) {
          add(
            "issued-total",
            `特典QR発行記録累計：${fmt(
              issued.total
            )}件`,
            "/staff/reward/history"
          );
        }
      }

      /* ====================================
         SPOT DATA
      ==================================== */

      const rawSpots = analyticsOk
        ? analytics.spots
        : health.spots;

      const spots: Spot[] = Array.isArray(rawSpots)
        ? rawSpots.map((value: unknown) => {
            const row = obj(value);

            return {
              spot_id: String(row.spot_id ?? ""),
              count: num(row.count ?? row.total),
            };
          })
        : [];

      if (analyticsOk || healthOk) {
        for (const [id, name] of Object.entries(
          SPOT_NAMES
        )) {
          const spot = spots.find(
            (row) => row.spot_id === id
          );

          add(
            `spot-${id}`,
            `${name}：取得${fmt(
              spot?.count ?? 0
            )}件`,
            "/staff/dashboard"
          );
        }
      }

      /* ====================================
         TODAY
      ==================================== */

      if (
        analyticsOk &&
        Array.isArray(analytics.daily)
      ) {
        const today = japanDate();

        const todayRow = analytics.daily
          .map((value: unknown) => obj(value))
          .find((row) => row.date === today);

        if (todayRow) {
          add(
            "today-registered",
            `本日の新規登録：${fmt(
              num(todayRow.registered)
            )}人`,
            "/staff/dashboard"
          );

          add(
            "today-stamps",
            `本日のスタンプ取得：${fmt(
              num(todayRow.stamps)
            )}件`,
            "/staff/dashboard"
          );

          add(
            "today-completed",
            `本日の新規完走：${fmt(
              num(todayRow.completed)
            )}人`,
            "/staff/dashboard"
          );

          add(
            "today-exchanged",
            `本日の特典交換：${fmt(
              num(todayRow.exchanged)
            )}件`,
            "/staff/reward/history"
          );
        }
      }

      /* ====================================
         INCREASE NOTIFICATIONS
      ==================================== */

      const previous = previousTotals.current;

      if (previous && analyticsOk && healthOk) {
        const comparisons = [
          ["registered", "参加登録", "人"],
          ["completed", "完走", "人"],
          ["stamps", "スタンプ取得", "件"],
          ["exchanged", "特典交換", "人"],
        ] as const;

        for (const [key, label, unit] of comparisons) {
          const difference = totals[key] - previous[key];

          if (difference > 0) {
            add(
              `increase-${key}`,
              `速報：前回の更新から${label}が${fmt(
                difference
              )}${unit}増加！`,
              "/staff/dashboard",
              "highlight"
            );
          }
        }
      }

      previousTotals.current =
        analyticsOk && healthOk ? totals : null;

      /* ====================================
         EVENT INFORMATION
      ==================================== */

      const today = japanDate();
      const eventDate = "2026-10-27";

      if (today < eventDate) {
        const days = Math.round(
          (
            Date.parse(`${eventDate}T00:00:00Z`) -
            Date.parse(`${today}T00:00:00Z`)
          ) / 86400000
        );

        add(
          "event-countdown",
          `特典交換会まであと${days}日`,
          "/staff/reward",
          "highlight"
        );
      } else if (today === eventDate) {
        add(
          "event-today",
          "本日は特典交換会当日です！",
          "/staff/reward",
          "highlight"
        );
      }

      add(
        "event",
        "特典交換会：10月27日 12:35〜16:00／雄飛ホール",
        "/staff/reward"
      );

      add(
        "api",
        analyticsOk && healthOk
          ? "分析API・運営記録取得APIともに応答あり"
          : "一部の集計APIで取得エラー",
        "/staff/operations",
        analyticsOk && healthOk
          ? "normal"
          : "warning"
      );

      /* ====================================
         PRIORITY
      ==================================== */

      const priorityOrder = {
        warning: 0,
        highlight: 1,
        normal: 2,
      };

      items.sort(
        (a, b) =>
          priorityOrder[a.priority] -
          priorityOrder[b.priority]
      );

      setNews(items);

      setStatus(
        analyticsOk && healthOk
          ? "online"
          : "partial"
      );

      setUpdatedAt(japanTime());
    } catch (error) {
      console.error("POKIPO STAFF NEWS:", error);

      if (mountedRef.current) {
        previousTotals.current = null;
        setStatus("error");

        setNews([
          {
            id: "unexpected-error",
            text:
              "運営ニュースの取得に失敗しました。運営チェックをご確認ください",
            href: "/staff/operations",
            priority: "warning",
          },
        ]);
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  /* ========================================
     AUTO UPDATE
  ======================================== */

  useEffect(() => {
    mountedRef.current = true;

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [refresh]);

  /* ========================================
     NEWS CONTENT
  ======================================== */

  function renderGroup(copy: boolean) {
    return (
      <div
        className="pokipoTickerGroup"
        aria-hidden={copy}
      >
        {news.map((item) => (
          <button
            type="button"
            key={`${copy ? "copy" : "main"}-${item.id}`}
            className={`pokipoTickerItem ${item.priority}`}
            tabIndex={copy ? -1 : 0}
            onClick={() => router.push(item.href)}
            style={{
              fontSize: 10,
              lineHeight: 1.3,
              paddingTop: 0,
              paddingBottom: 0,
              whiteSpace: "nowrap",
            }}
          >
            <span className="pokipoTickerSeparator">
              ◆
            </span>
            {item.text}
          </button>
        ))}
      </div>
    );
  }

  const duration = Math.max(
    50,
    news.reduce(
      (sum, item) => sum + item.text.length,
      0
    ) * 0.2
  );

  /* ========================================
     RENDER
     SLIM / AUTO SCROLL
     NO PAUSE BUTTON
  ======================================== */

  return (
    <section
      className="pokipoStaffTicker"
      aria-label="POKIPO運営速報"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minWidth: 0,
        height: 34,
        minHeight: 34,
        padding: "0 9px",
        marginBottom: 12,
        borderRadius: 8,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* LIVE LABEL */}

      <div
        className="pokipoTickerBrand"
        style={{
          display: "flex",
          alignItems: "center",
          flex: "0 0 auto",
          gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        <span
          className="pokipoTickerLive"
          style={{
            fontSize: 8,
            padding: "2px 5px",
          }}
        >
          LIVE
        </span>

        <strong
          style={{
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          POKIPO
        </strong>
      </div>

      {/* AUTO-SCROLL NEWS */}

      <div
        className="pokipoTickerViewport"
        aria-label="運営ニュース"
        style={{
          flex: "1 1 0",
          minWidth: 0,
          width: 0,
          padding: 0,
          margin: 0,
          border: "none",
          overflow: "hidden",
        }}
      >
        <div
          className="pokipoTickerTrack"
          style={{
            animationDuration: `${duration}s`,
            animationPlayState: "running",
          }}
        >
          {renderGroup(false)}
          {renderGroup(true)}
        </div>
      </div>

      {/* CONNECTION STATUS */}

      <span
        className={`pokipoTickerConnection ${status}`}
        title={
          updatedAt
            ? `運営データ最終取得：${updatedAt}`
            : "運営データ取得中"
        }
        style={{
          flex: "0 0 auto",
          fontSize: 12,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {status === "online"
          ? "●"
          : status === "loading"
          ? "○"
          : "!"}
      </span>
    </section>
  );
}
