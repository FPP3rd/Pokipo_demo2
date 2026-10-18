
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "../../../lib/supabase-client";

type FeatureKey =
  | "registration"
  | "stamps"
  | "completions"
  | "pre_survey"
  | "post_survey"
  | "reward_issued"
  | "reward_exchanged";

type Feature = {
  key: string;
  total: number;
  last10: number;
  last60: number;
  last_at: string | null;
};

type Spot = {
  spot_id: string;
  total: number;
  last10: number;
  last60: number;
  last_at: string | null;
};

type Maintenance = {
  all: boolean;
  home: boolean;
  stamp: boolean;
  knowledge: boolean;
  progress: boolean;
  reward: boolean;
  pre_survey: boolean;
  post_survey: boolean;
};

type HealthSnapshot = {
  server_time: string;
  features: Feature[];
  spots: Spot[];
  maintenance: Maintenance | null;
};

const FEATURE_CONFIG: {
  key: FeatureKey;
  title: string;
  description: string;
  unit: string;
  maintenanceKey?: keyof Maintenance;
}[] = [
  {
    key: "registration",
    title: "参加者登録",
    description: "新規プロフィールの保存記録",
    unit: "人",
    maintenanceKey: "home",
  },
  {
    key: "stamps",
    title: "QR読み取り・スタンプ取得",
    description: "スタンプが保存された件数",
    unit: "件",
    maintenanceKey: "stamp",
  },
  {
    key: "completions",
    title: "スタンプラリー完走",
    description: "完走情報の登録記録",
    unit: "人",
    maintenanceKey: "progress",
  },
  {
    key: "pre_survey",
    title: "参加前アンケート",
    description: "回答の保存記録",
    unit: "件",
    maintenanceKey: "pre_survey",
  },
  {
    key: "post_survey",
    title: "参加後アンケート",
    description: "回答の保存記録",
    unit: "件",
    maintenanceKey: "post_survey",
  },
  {
    key: "reward_issued",
    title: "特典交換QR発行",
    description: "交換レコードの作成記録",
    unit: "件",
    maintenanceKey: "reward",
  },
  {
    key: "reward_exchanged",
    title: "スタッフによる特典交換",
    description: "交換済みとして確定した記録",
    unit: "件",
    maintenanceKey: "reward",
  },
];

const SPOT_NAMES: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toFeature(value: unknown): Feature {
  const x = (value ?? {}) as Record<string, unknown>;

  return {
    key: String(x.key ?? ""),
    total: numberValue(x.total),
    last10: numberValue(x.last10),
    last60: numberValue(x.last60),
    last_at:
      typeof x.last_at === "string"
        ? x.last_at
        : null,
  };
}

function toSpot(value: unknown): Spot {
  const x = (value ?? {}) as Record<string, unknown>;

  return {
    spot_id: String(x.spot_id ?? ""),
    total: numberValue(x.total),
    last10: numberValue(x.last10),
    last60: numberValue(x.last60),
    last_at:
      typeof x.last_at === "string"
        ? x.last_at
        : null,
  };
}

function normalize(raw: unknown): HealthSnapshot {
  const x = (raw ?? {}) as Record<string, unknown>;

  const rawMaintenance =
    x.maintenance &&
    typeof x.maintenance === "object"
      ? (x.maintenance as Record<string, unknown>)
      : null;

  const maintenance: Maintenance | null =
    rawMaintenance
      ? {
          all: rawMaintenance.all === true,
          home: rawMaintenance.home === true,
          stamp: rawMaintenance.stamp === true,
          knowledge: rawMaintenance.knowledge === true,
          progress: rawMaintenance.progress === true,
          reward: rawMaintenance.reward === true,
          pre_survey:
            rawMaintenance.pre_survey === true,
          post_survey:
            rawMaintenance.post_survey === true,
        }
      : null;

  return {
    server_time: String(x.server_time ?? ""),
    features: Array.isArray(x.features)
      ? x.features.map(toFeature)
      : [],
    spots: Array.isArray(x.spots)
      ? x.spots.map(toSpot)
      : [],
    maintenance,
  };
}

function formatTime(value: string | null) {
  if (!value) return "まだ記録なし";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "時刻不明";
  }

  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isMaintenance(
  maintenance: Maintenance | null,
  key?: keyof Maintenance
) {
  if (!maintenance) return false;

  return (
    maintenance.all ||
    (key !== undefined && maintenance[key])
  );
}

export default function HealthPanel() {
  const [data, setData] =
    useState<HealthSnapshot | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccess, setLastSuccess] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const { data: result, error: rpcError } =
        await supabase.rpc(
          "pokipo_staff_health_snapshot"
        );

      if (rpcError) {
        throw rpcError;
      }

      if (!result) {
        throw new Error(
          "監視APIからデータが返されませんでした"
        );
      }

      const next = normalize(result);
      setData(next);
      setError("");

      setLastSuccess(
        new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (caught) {
      console.error("POKIPO監視取得エラー:", caught);
      setError(
        "監視APIの取得に失敗しました。通信・認証・SQL関数を確認してください。"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30000);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, [refresh]);

  const visibleFeatures = FEATURE_CONFIG.map((config) => {
    const feature = data?.features.find(
      (item) => item.key === config.key
    );

    const stopped = isMaintenance(
      data?.maintenance ?? null,
      config.maintenanceKey
    );

    return {
      ...config,
      total: feature?.total ?? 0,
      last10: feature?.last10 ?? 0,
      last60: feature?.last60 ?? 0,
      last_at: feature?.last_at ?? null,
      stopped,
      observed: Boolean(feature),
    };
  });

  const activeFeatures = visibleFeatures.filter(
    (feature) => !feature.stopped
  );

  const recentActiveCount = activeFeatures.filter(
    (feature) => feature.last10 > 0
  ).length;

  return (
    <section className="pokipoHealthPanel">
      <div className="pokipoHealthHeader">
        <div>
          <span className="pokipoHealthEyebrow">
            PARTICIPANT FLOW MONITOR
          </span>

          <h2>参加者機能・稼働監視</h2>

          <p>
            登録から景品交換まで、
            実際の保存記録を30秒ごとに確認します。
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="pokipoHealthRefresh"
        >
          {refreshing ? "更新中..." : "↻ 更新"}
        </button>
      </div>

      <div className="pokipoHealthSummary">
        <div>
          <span>監視API</span>
          <strong className={error ? "error" : ""}>
            {loading
              ? "確認中"
              : error
              ? "取得失敗"
              : "応答あり"}
          </strong>
        </div>

        <div>
          <span>直近10分に記録のある機能</span>
          <strong>
            {data
              ? `${recentActiveCount} / ${activeFeatures.length}`
              : "—"}
          </strong>
        </div>

        <div>
          <span>最終取得成功</span>
          <strong>{lastSuccess || "—"}</strong>
        </div>
      </div>

      {error && (
        <div className="pokipoHealthError" role="alert">
          <strong>データ取得を確認してください</strong>
          <p>{error}</p>
          {data && (
            <small>
              以下には最後に取得できたデータを
              表示しています。現在値ではありません。
            </small>
          )}
        </div>
      )}

      {data && (
        <>
          <div className="pokipoHealthSectionHeading">
            <h3>機能別の記録状況</h3>
            <p>
              直近10分・60分・累計・最終記録
            </p>
          </div>

          <div className="pokipoHealthGrid">
            {visibleFeatures.map((feature) => {
              const hasRecentActivity =
                feature.last10 > 0;

              const status =
                feature.stopped
                  ? "maintenance"
                  : hasRecentActivity
                  ? "active"
                  : "idle";

              return (
                <article
                  key={feature.key}
                  className={`pokipoHealthCard ${status}`}
                >
                  <div className="pokipoHealthCardTop">
                    <strong>{feature.title}</strong>

                    <span
                      className={`pokipoHealthStatus ${status}`}
                    >
                      {feature.stopped
                        ? "停止設定中"
                        : hasRecentActivity
                        ? "直近の記録あり"
                        : "直近の記録なし"}
                    </span>
                  </div>

                  <p>{feature.description}</p>

                  <div className="pokipoHealthNumbers">
                    <div>
                      <span>10分</span>
                      <strong>
                        {feature.last10.toLocaleString()}
                        <small>{feature.unit}</small>
                      </strong>
                    </div>
                    <div>
                      <span>60分</span>
                      <strong>
                        {feature.last60.toLocaleString()}
                        <small>{feature.unit}</small>
                      </strong>
                    </div>
                    <div>
                      <span>累計</span>
                      <strong>
                        {feature.total.toLocaleString()}
                        <small>{feature.unit}</small>
                      </strong>
                    </div>
                  </div>

                  <div className="pokipoHealthLast">
                    最終記録：{formatTime(feature.last_at)}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="pokipoHealthSectionHeading">
            <h3>5スポット別の記録状況</h3>
            <p>
              どのQRスポットで最近取得があったかを
              確認します。
            </p>
          </div>

          <div className="pokipoHealthSpotList">
            {Object.entries(SPOT_NAMES).map(
              ([spotId, name]) => {
                const spot = data.spots.find(
                  (item) => item.spot_id === spotId
                );

                return (
                  <div
                    className="pokipoHealthSpot"
                    key={spotId}
                  >
                    <div className="pokipoHealthSpotName">
                      <strong>{name}</strong>
                      <span>
                        最終：
                        {formatTime(
                          spot?.last_at ?? null
                        )}
                      </span>
                    </div>

                    <div className="pokipoHealthSpotStats">
                      <span>
                        10分：
                        <b>{spot?.last10 ?? 0}件</b>
                      </span>
                      <span>
                        60分：
                        <b>{spot?.last60 ?? 0}件</b>
                      </span>
                      <span>
                        累計：
                        <b>{spot?.total ?? 0}件</b>
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <p className="pokipoHealthNote">
            データ基準時刻：
            {formatTime(data.server_time)}
          </p>
        </>
      )}

      {!data && loading && (
        <p className="pokipoHealthNote">
          参加者機能の記録を確認しています...
        </p>
      )}

      <div className="pokipoHealthExplanation">
        <strong>監視結果の読み方</strong>
        <p>
          「直近の記録あり」は、
          データベースへの保存記録を確認できた状態です。
          「直近の記録なし」は、
          過去10分間に記録がない状態であり、
          障害と断定するものではありません。
        </p>
        <p>
          この画面では通信失敗と記録件数を確認できますが、
          参加者端末での画面表示、QR読み取り失敗、
          保存前のエラー、ネットワーク切断を
          個別に検知することはできません。
        </p>
      </div>
    </section>
  );
}
