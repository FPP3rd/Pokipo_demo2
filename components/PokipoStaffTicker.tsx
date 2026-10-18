
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase-client";

type Feature = {
  key: string;
  total: number;
  last10: number;
  last60: number;
};

type Spot = {
  spot_id: string;
  count?: number;
  total?: number;
  last10?: number;
};

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

const SPOT_NAMES: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

const REWARD_LIMIT = 360;

function n(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function objectValue(
  value: unknown
): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

export default function PokipoStaffTicker() {
  const router = useRouter();

  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "starting",
      text: "POKIPOの運営情報を取得しています...",
      href: "/staff/operations",
      priority: "normal",
    },
  ]);

  const [updatedAt, setUpdatedAt] = useState("");
  const [status, setStatus] = useState<
    "loading" | "online" | "partial" | "error"
  >("loading");

  const [paused, setPaused] = useState(false);

  const previousTotals = useRef<Totals | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

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

      const analytics = objectValue(
        analyticsResult.data
      );

      const health = objectValue(
        healthResult.data
      );

      const rawTotals = objectValue(
        analytics.totals
      );

      const features: Feature[] = Array.isArray(
        health.features
      )
        ? health.features.map((value: unknown) => {
            const x = objectValue(value);

            return {
              key: String(x.key ?? ""),
              total: n(x.total),
              last10: n(x.last10),
              last60: n(x.last60),
            };
          })
        : [];

      const feature = (key: string) =>
        features.find((f) => f.key === key);

      const totals: Totals = {
        registered: analyticsOk
          ? n(rawTotals.registered)
          : n(feature("registration")?.total),
        completed: analyticsOk
          ? n(rawTotals.completed)
          : n(feature("completions")?.total),
        exchanged: analyticsOk
          ? n(rawTotals.exchanged)
          : n(feature("reward_exchanged")?.total),
        stamps: analyticsOk
          ? n(rawTotals.stamps)
          : n(feature("stamps")?.total),
      };

      const items: NewsItem[] = [];

      function add(
        id: string,
        text: string,
        href: string,
        priority: NewsItem["priority"] = "normal"
      ) {
        items.push({ id, text, href, priority });
      }

      // =====================================
      // 重要なお知らせ
      // =====================================

      if (!analyticsOk || !healthOk) {
        add(
          "partial",
          "一部の集計APIが応答していません。運営チェックを確認してください",
          "/staff/operations",
          "warning"
        );
      }

      if (healthOk) {
        const maintenance = objectValue(
          health.maintenance
        );

        const individualKeys = [
          "home",
          "stamp",
          "knowledge",
          "progress",
          "reward",
          "pre_survey",
          "post_survey",
        ];

        if (maintenance.all === true) {
          add(
            "maintenance-all",
            "全体メンテナンスが設定されています",
            "/staff/maintenance",
            "warning"
          );
        } else {
          const stopped = individualKeys.filter(
            (key) => maintenance[key] === true
          );

          if (stopped.length > 0) {
            add(
              "maintenance-partial",
              `${stopped.length}機能が個別メンテナンス設定中です`,
              "/staff/maintenance",
              "warning"
            );
          }
        }
      }

      // =====================================
      // 参加者・完走者・スタンプ
      // =====================================

      add(
        "registered",
        `現在の参加登録者数：${formatNumber(
          totals.registered
        )}人`,
        "/staff/dashboard"
      );

      add(
        "completed",
        `スタンプラリー完走者：${formatNumber(
          totals.completed
        )}人`,
        "/staff/dashboard"
      );

      add(
        "stamps",
        `スタンプ取得総件数：${formatNumber(
          totals.stamps
        )}件`,
        "/staff/analytics"
      );

      if (totals.registered > 0) {
        const rate = Math.round(
          (totals.completed / totals.registered) *
            1000
        ) / 10;

        add(
          "completion-rate",
          `現在の完走率：${rate}%`,
          "/staff/analytics"
        );
      }

      // =====================================
      // 特典交換
      // =====================================

      add(
        "exchange",
        `特典交換済み：${formatNumber(
          totals.exchanged
        )}人`,
        "/staff/dashboard"
      );

      const remaining = Math.max(
        0,
        REWARD_LIMIT - totals.exchanged
      );

      add(
        "remaining",
        `先着360名に対する交換枠の参考残数：${formatNumber(
          remaining
        )}人分`,
        "/staff/reward",
        remaining <= 30 ? "warning" : "normal"
      );

      if (totals.completed > 0) {
        const rate = Math.round(
          (totals.exchanged / totals.completed) *
            1000
        ) / 10;

        add(
          "exchange-rate",
          `完走者の特典交換率：${rate}%`,
          "/staff/analytics"
        );
      }

      // =====================================
      // 直近の活動
      // =====================================

      if (healthOk) {
        const recentConfig = [
          {
            key: "registration",
            label: "新規参加登録",
            unit: "人",
          },
          {
            key: "stamps",
            label: "スタンプ取得",
            unit: "件",
          },
          {
            key: "completions",
            label: "新規完走",
            unit: "人",
          },
          {
            key: "pre_survey",
            label: "参加前アンケート回答",
            unit: "件",
          },
          {
            key: "post_survey",
            label: "参加後アンケート回答",
            unit: "件",
          },
          {
            key: "reward_issued",
            label: "特典交換QR発行記録",
            unit: "件",
          },
          {
            key: "reward_exchanged",
            label: "特典交換",
            unit: "件",
          },
        ];

        for (const config of recentConfig) {
          const row = feature(config.key);
          if (!row) continue;

          add(
            `recent-${config.key}`,
            `直近60分の${config.label}：${formatNumber(
              row.last60
            )}${config.unit}`,
            "/staff/operations"
          );
        }

        const preSurvey = feature("pre_survey");
        const postSurvey = feature("post_survey");

        if (preSurvey) {
          add(
            "pre-total",
            `参加前アンケート回答：累計${formatNumber(
              preSurvey.total
            )}件`,
            "/staff/surveys"
          );
        }

        if (postSurvey) {
          add(
            "post-total",
            `参加後アンケート回答：累計${formatNumber(
              postSurvey.total
            )}件`,
            "/staff/surveys"
          );
        }
      }

      // =====================================
      // スポットの状況
      // =====================================

      const rawSpots = analyticsOk
        ? analytics.spots
        : health.spots;

      const spots: Spot[] = Array.isArray(rawSpots)
        ? rawSpots.map((value: unknown) => {
            const x = objectValue(value);

            return {
              spot_id: String(x.spot_id ?? ""),
              count: n(x.count ?? x.total),
              last10: n(x.last10),
            };
          })
        : [];

      for (const [id, name] of Object.entries(
        SPOT_NAMES
      )) {
        const spot = spots.find(
          (row) => row.spot_id === id
        );

        add(
          `spot-${id}`,
          `${name}：スタンプ取得${formatNumber(
            spot?.count ?? 0
          )}件`,
          "/staff/analytics"
        );
      }

      // =====================================
      // 前回からの増加速報
      // =====================================

      const previous = previousTotals.current;

      if (previous) {
        const increases: {
          key: keyof Totals;
          label: string;
          unit: string;
        }[] = [
          {
            key: "registered",
            label: "参加登録者",
            unit: "人",
          },
          {
            key: "completed",
            label: "完走者",
            unit: "人",
          },
          {
            key: "exchanged",
            label: "特典交換者",
            unit: "人",
          },
          {
            key: "stamps",
            label: "スタンプ取得",
            unit: "件",
          },
        ];

        for (const item of increases) {
          const difference =
            totals[item.key] -
            previous[item.key];

          if (difference > 0) {
            add(
              `increase-${item.key}`,
              `速報：前回更新から${item.label}が${formatNumber(
                difference
              )}${item.unit}増加しました`,
              "/staff/dashboard",
              "highlight"
            );
          }
        }
      }

      if (analyticsOk && healthOk) {
        previousTotals.current = totals;
      }

      // =====================================
      // 登録・完走の節目
      // =====================================

      if (
        previous &&
        analyticsOk &&
        healthOk
      ) {
        for (const milestone of [
          50, 100, 200, 300, 500, 1000,
        ]) {
          if (
            previous.registered < milestone &&
            totals.registered >= milestone
          ) {
            add(
              `milestone-registered-${milestone}`,
              `登録者数が${milestone}人を突破しました！`,
              "/staff/dashboard",
              "highlight"
            );
          }

          if (
            previous.completed < milestone &&
            totals.completed >= milestone
          ) {
            add(
              `milestone-completed-${milestone}`,
              `スタンプ完走者が${milestone}人を突破しました！`,
              "/staff/dashboard",
              "highlight"
            );
          }
        }
      }

      // =====================================
      // イベント案内
      // =====================================

      add(
        "event",
        "特典交換会：10月27日 12:35〜16:00／雄飛ホール",
        "/staff/reward",
        "highlight"
      );

      add(
        "api",
        analyticsOk && healthOk
          ? "分析API・参加者機能監視APIともに応答あり"
          : "一部APIの応答を確認できません",
        "/staff/operations",
        analyticsOk && healthOk
          ? "normal"
          : "warning"
      );

      // 警告・速報を先頭に配置
      const order = {
        warning: 0,
        highlight: 1,
        normal: 2,
      };

      items.sort(
        (a, b) =>
          order[a.priority] -
          order[b.priority]
      );

      setNews(items);
      setStatus(
        analyticsOk && healthOk
          ? "online"
          : "partial"
      );

      setUpdatedAt(
        new Date().toLocaleTimeString("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      console.error("POKIPO LIVE NEWS:", error);

      if (mountedRef.current) {
        setStatus("error");
        setNews([
          {
            id: "connection-error",
            text:
              "運営速報の更新に失敗しました。運営チェックを確認してください",
            href: "/staff/operations",
            priority: "warning",
          },
        ]);
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void refresh();

    const timer = window.setInterval(() => {
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
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [refresh]);

  function openNews(item: NewsItem) {
    router.push(item.href);
  }

  // 同じニュースを2組並べてシームレスにループ
  const renderItems = (suffix: string) =>
    news.map((item) => (
      <button
        type="button"
        key={`${suffix}-${item.id}`}
        className={`pokipoTickerItem ${item.priority}`}
        onClick={() => openNews(item)}
        tabIndex={suffix === "copy" ? -1 : 0}
        aria-hidden={suffix === "copy"}
      >
        <span className="pokipoTickerSeparator">
          ◆
        </span>
        {item.text}
      </button>
    ));

  return (
    <section
      className="pokipoStaffTicker"
      aria-label="POKIPO運営速報"
    >
      <div className="pokipoTickerHeader">
        <div className="pokipoTickerBrand">
          <span className="pokipoTickerLive">
            LIVE
          </span>
          <strong>現在のPOKIPO運営状況</strong>
        </div>

        <div className="pokipoTickerInfo">
          <span
            className={`pokipoTickerConnection ${status}`}
          >
            {status === "online"
              ? "API応答あり"
              : status === "partial"
              ? "一部要確認"
              : status === "error"
              ? "取得失敗"
              : "取得中"}
          </span>

          {updatedAt && (
            <span className="pokipoTickerTime">
              {updatedAt}更新
            </span>
          )}

          <button
            type="button"
            className="pokipoTickerPause"
            onClick={() =>
              setPaused((current) => !current)
            }
            aria-label={
              paused
                ? "ニュースのスクロールを再開"
                : "ニュースのスクロールを停止"
            }
          >
            {paused ? "▶ 再開" : "Ⅱ 停止"}
          </button>
        </div>
      </div>

      <div
        className="pokipoTickerViewport"
        aria-label="運営速報テロップ"
      >
        <div
          className={`pokipoTickerTrack ${
            paused ? "paused" : ""
          }`}
          style={{
            animationDuration: `${Math.max(
              50,
              news.reduce(
                (total, item) =>
                  total + item.text.length,
                0
              ) * 0.22
            )}s`,
          }}
        >
          <div className="pokipoTickerGroup">
            {renderItems("original")}
          </div>

          <div
            className="pokipoTickerGroup"
            aria-hidden="true"
          >
            {renderItems("copy")}
          </div>
        </div>
      </div>
    </section>
  );
}
