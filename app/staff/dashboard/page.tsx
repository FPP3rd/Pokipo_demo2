"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

import PokipoStampDistribution from "../../../components/PokipoStampDistribution";
import PokipoAnimatedNumber from "../../../components/PokipoAnimatedNumber";
import PokipoLiveClock from "../../../components/PokipoLiveClock";

/* ========================================
   TYPES
======================================== */

type RewardHistoryItem = {
  id: string;
  participant_id: string;
  student_number: string;
  exchanged_at: string | null;
  nickname: string;
};

type SpotSummary = {
  spot_id: string;
  scan_count: number;
  last_scanned_at: string | null;
};

/* ========================================
   SPOTS
======================================== */

const SPOT_INFORMATION: Record<
  string,
  {
    number: number;
    name: string;
  }
> = {
  spot1: {
    number: 1,
    name: "学生センター",
  },
  spot2: {
    number: 2,
    name: "東棟2階",
  },
  spot3: {
    number: 3,
    name: "ゆうちょ銀行ATM付近掲示板",
  },
  spot4: {
    number: 4,
    name: "ラーニングスクエア",
  },
  spot5: {
    number: 5,
    name: "セブンイレブン付近掲示板",
  },
};

/* ========================================
   FORMAT HELPERS
======================================== */

function formatDate(value: string | null) {
  if (!value) return "----";

  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSpotDate(value: string | null) {
  if (!value) return "読み取りなし";

  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(
  value: string | null,
  currentTime: number
) {
  if (!value) return "まだ読み取りなし";

  const scannedAt = new Date(value).getTime();

  const difference = Math.max(
    0,
    currentTime - scannedAt
  );

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (seconds < 60) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;

  return `${days}日前`;
}

/* ========================================
   JST DATE RANGE
======================================== */

function getTodayJstRange() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(
      parts.find((part) => part.type === type)?.value ?? 0
    );

  const year = get("year");
  const month = get("month");
  const day = get("day");

  const start = new Date(
    Date.UTC(year, month - 1, day, -9)
  );

  const end = new Date(
    Date.UTC(year, month - 1, day + 1, -9)
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/* ========================================
   STAFF DASHBOARD
======================================== */

export default function StaffDashboardPage() {
  const router = useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [authenticated, setAuthenticated] =
    useState(false);

  const [authLoading, setAuthLoading] =
    useState(true);

  /* ========================================
     STATISTICS
  ======================================== */

  const [participantCount, setParticipantCount] =
    useState(0);

  const [completionCount, setCompletionCount] =
    useState(0);

  const [exchangedCount, setExchangedCount] =
    useState(0);

  const [
    todayExchangedCount,
    setTodayExchangedCount,
  ] = useState(0);

  /* ========================================
     SPOT STATUS
  ======================================== */

  const [spotSummaries, setSpotSummaries] =
    useState<SpotSummary[]>([]);

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  /* ========================================
     REWARD HISTORY
  ======================================== */

  const [latestHistory, setLatestHistory] =
    useState<RewardHistoryItem[]>([]);

  /* ========================================
     UI
  ======================================== */

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  /* ========================================
     RELATIVE TIME REFRESH
  ======================================== */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const { data, error } =
        await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setAuthenticated(false);
        setAuthLoading(false);

        router.replace("/staff/reward");
        return;
      }

      setAuthenticated(true);
      setAuthLoading(false);
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  /* ========================================
     LOAD DASHBOARD
  ======================================== */

  useEffect(() => {
    if (!authenticated) return;

    let active = true;
    let requestId = 0;

    async function loadDashboard() {
      const thisRequest = ++requestId;

      const isCurrent = () =>
        active && thisRequest === requestId;

      if (isCurrent()) {
        setLoading(true);
        setMessage("");
      }

      try {
        /* =================================
           PARTICIPANT COUNT
        ================================= */

        const {
          data: participantCountData,
          error: participantCountError,
        } = await supabase.rpc(
          "get_participant_count"
        );

        if (!isCurrent()) return;

        if (participantCountError) {
          console.error(
            "参加者数取得エラー:",
            participantCountError
          );
        } else {
          setParticipantCount(
            Number(participantCountData ?? 0)
          );
        }

        /* =================================
           COMPLETION COUNT
        ================================= */

        const {
          data: completionCountData,
          error: completionCountError,
        } = await supabase.rpc(
          "get_completed_participant_count"
        );

        if (!isCurrent()) return;

        if (completionCountError) {
          console.error(
            "完走者数取得エラー:",
            completionCountError
          );
        } else {
          setCompletionCount(
            Number(completionCountData ?? 0)
          );
        }

        /* =================================
           SPOT SUMMARY
        ================================= */

        const {
          data: spotSummaryData,
          error: spotSummaryError,
        } = await supabase.rpc(
          "get_spot_scan_summary"
        );

        if (!isCurrent()) return;

        if (spotSummaryError) {
          console.error(
            "スポット読み取り状況取得エラー:",
            spotSummaryError
          );

          setSpotSummaries([]);
        } else {
          const normalized: SpotSummary[] = (
            spotSummaryData ?? []
          ).map(
            (item: {
              spot_id: string;
              scan_count: number | string;
              last_scanned_at: string | null;
            }) => ({
              spot_id: item.spot_id,
              scan_count: Number(
                item.scan_count ?? 0
              ),
              last_scanned_at:
                item.last_scanned_at,
            })
          );

          setSpotSummaries(normalized);
        }

        /* =================================
           EXCHANGED COUNT
        ================================= */

        const {
          count: exchangedCountData,
          error: exchangedCountError,
        } = await supabase
          .from("reward_exchanges")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "exchanged");

        if (!isCurrent()) return;

        if (exchangedCountError) {
          console.error(
            "交換済み人数取得エラー:",
            exchangedCountError
          );
        } else {
          setExchangedCount(
            exchangedCountData ?? 0
          );
        }

        /* =================================
           TODAY EXCHANGED (JST)
        ================================= */

        const todayRange = getTodayJstRange();

        const {
          count: todayCountData,
          error: todayCountError,
        } = await supabase
          .from("reward_exchanges")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "exchanged")
          .gte(
            "exchanged_at",
            todayRange.start
          )
          .lt(
            "exchanged_at",
            todayRange.end
          );

        if (!isCurrent()) return;

        if (todayCountError) {
          console.error(
            "本日交換人数取得エラー:",
            todayCountError
          );
        } else {
          setTodayExchangedCount(
            todayCountData ?? 0
          );
        }

        /* =================================
           LATEST EXCHANGES
        ================================= */

        const {
          data: rewardData,
          error: rewardError,
        } = await supabase
          .from("reward_exchanges")
          .select(
            "id, participant_id, student_number, exchanged_at"
          )
          .eq("status", "exchanged")
          .order("exchanged_at", {
            ascending: false,
          })
          .limit(5);

        if (!isCurrent()) return;

        if (rewardError) {
          console.error(
            "最新交換履歴取得エラー:",
            rewardError
          );

          setLatestHistory([]);
        } else {
          const rewards = rewardData ?? [];

          if (rewards.length === 0) {
            setLatestHistory([]);
          } else {
            const participantIds = rewards.map(
              (item) => item.participant_id
            );

            const {
              data: participantData,
              error: participantError,
            } = await supabase
              .from("participants")
              .select("id, nickname")
              .in("id", participantIds);

            if (!isCurrent()) return;

            if (participantError) {
              console.error(
                "最新履歴参加者取得エラー:",
                participantError
              );
            }

            const participants =
              participantData ?? [];

            const combined: RewardHistoryItem[] =
              rewards.map((reward) => {
                const participant =
                  participants.find(
                    (item) =>
                      item.id ===
                      reward.participant_id
                  );

                return {
                  id: reward.id,
                  participant_id:
                    reward.participant_id,
                  student_number:
                    reward.student_number,
                  exchanged_at:
                    reward.exchanged_at,
                  nickname:
                    participant?.nickname ??
                    "不明",
                };
              });

            setLatestHistory(combined);
          }
        }
      } catch (error) {
        if (!isCurrent()) return;

        console.error(
          "ダッシュボード取得エラー:",
          error
        );

        setMessage(
          "ダッシュボード情報を取得できませんでした。"
        );
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    /* ========================================
       REALTIME - PARTICIPANTS
    ======================================== */

    const participantsChannel = supabase
      .channel("staff-dashboard-participants")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
        },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    /* ========================================
       REALTIME - STAMPS
    ======================================== */

    const stampsChannel = supabase
      .channel("staff-dashboard-stamps")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participant_stamps",
        },
        () => {
          setCurrentTime(Date.now());
          void loadDashboard();
        }
      )
      .subscribe();

    /* ========================================
       REALTIME - REWARDS
    ======================================== */

    const rewardsChannel = supabase
      .channel("staff-dashboard-rewards")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_exchanges",
        },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    /* ========================================
       PERIODIC REFRESH
    ======================================== */

    const refreshTimer = window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadDashboard();
        }
      },
      30000
    );

    /* ========================================
       FOCUS REFRESH
    ======================================== */

    function handleFocus() {
      setCurrentTime(Date.now());
      void loadDashboard();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        setCurrentTime(Date.now());
        void loadDashboard();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      active = false;
      requestId++;

      window.clearInterval(refreshTimer);

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      void supabase.removeChannel(
        participantsChannel
      );

      void supabase.removeChannel(
        stampsChannel
      );

      void supabase.removeChannel(
        rewardsChannel
      );
    };
  }, [authenticated]);

  /* ========================================
     SPOT HELPERS
  ======================================== */

  function getSpotSummary(
    spotId: string
  ): SpotSummary {
    return (
      spotSummaries.find(
        (item) => item.spot_id === spotId
      ) ?? {
        spot_id: spotId,
        scan_count: 0,
        last_scanned_at: null,
      }
    );
  }

  /* ========================================
     RATES
  ======================================== */

  const completionRate =
    participantCount > 0
      ? Math.round(
          (completionCount / participantCount) * 100
        )
      : 0;

  const exchangeRate =
    completionCount > 0
      ? Math.round(
          (exchangedCount / completionCount) * 100
        )
      : 0;

  /* ========================================
     AUTH LOADING
  ======================================== */

  if (authLoading) {
    return (
      <main className="shell">
        <section className="staffDashboardPage">
          <div className="staffLoadingCard">
            スタッフ情報を確認中...
          </div>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  /* ========================================
     DASHBOARD VIEW
  ======================================== */

  return (
    <main className="shell">
      <section className="staffDashboardPage">

        {/* =================================
            HEADER + LIVE CLOCK
        ================================= */}

        <header className="staffDashboardHeader">

          <div className="pokipoDashboardHeaderTitle">
            <span>POKIPO STAFF</span>

            <h1>
              管理ダッシュボード
            </h1>

            <p>
              POKIPOの現在の参加状況
            </p>
          </div>

          <div className="pokipoDashboardClockSlot">
            <PokipoLiveClock />
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/staff/reward")
            }
          >
            QR交換
          </button>

        </header>

        {/* =================================
            LIVE DATA
        ================================= */}

        <div className="staffDashboardLive">
          <span className="staffDashboardLiveDot" />
          LIVE DATA
        </div>

        {/* =================================
            MAIN STATISTICS
        ================================= */}

        <section className="staffDashboardStats">

          {/* 参加人数 */}
          <article className="staffDashboardStatCard">
            <span>
              PARTICIPANTS
            </span>

            <div>
              <strong>
                <PokipoAnimatedNumber
                  value={
                    loading
                      ? null
                      : participantCount
                  }
                />
              </strong>

              <small>人</small>
            </div>

            <p>
              現在の参加者
            </p>
          </article>

          {/* 完走者数 */}
          <article className="staffDashboardStatCard">
            <span>
              COMPLETED
            </span>

            <div>
              <strong>
                <PokipoAnimatedNumber
                  value={
                    loading
                      ? null
                      : completionCount
                  }
                />
              </strong>

              <small>人</small>
            </div>

            <p>
              スタンプ完走者
            </p>
          </article>

          {/* 特典交換済み人数 */}
          <article className="staffDashboardStatCard">
            <span>
              EXCHANGED
            </span>

            <div>
              <strong>
                <PokipoAnimatedNumber
                  value={
                    loading
                      ? null
                      : exchangedCount
                  }
                />
              </strong>

              <small>人</small>
            </div>

            <p>
              特典交換済み
            </p>
          </article>

          {/* 本日の交換人数 */}
          <article className="staffDashboardStatCard today">
            <span>
              TODAY
            </span>

            <div>
              <strong>
                <PokipoAnimatedNumber
                  value={
                    loading
                      ? null
                      : todayExchangedCount
                  }
                />
              </strong>

              <small>人</small>
            </div>

            <p>
              本日の特典交換
            </p>
          </article>

        </section>

        {/* =================================
            STAMP DISTRIBUTION
            0〜5個
        ================================= */}

        <PokipoStampDistribution />

        {/* =================================
            SPOT LIVE STATUS
        ================================= */}

        <section className="staffSpotSection">

          <div className="staffDashboardSectionTitle">
            <div>
              <span>
                SPOT LIVE STATUS
              </span>

              <h2>
                スポット別読み取り状況
              </h2>

              <p className="staffSpotSectionDescription">
                各スポットのQR読み取り人数と、
                最終読み取り状況をリアルタイムで表示します。
              </p>
            </div>

            <div className="staffSpotJstBadge">
              JST
            </div>
          </div>

          <div className="staffSpotGrid">

            {Object.entries(
              SPOT_INFORMATION
            ).map(([spotId, spot]) => {
              const summary =
                getSpotSummary(spotId);

              const hasScan =
                Boolean(
                  summary.last_scanned_at
                );

              return (
                <article
                  key={spotId}
                  className={
                    hasScan
                      ? "staffSpotCard active"
                      : "staffSpotCard"
                  }
                >

                  <div className="staffSpotCardHeader">

                    <div className="staffSpotNumber">
                      {String(
                        spot.number
                      ).padStart(2, "0")}
                    </div>

                    <div className="staffSpotCardTitle">
                      <span>
                        SPOT {spot.number}
                      </span>

                      <strong>
                        {spot.name}
                      </strong>
                    </div>

                    <div className="staffSpotStatus">
                      <span />

                      {hasScan
                        ? "ACTIVE"
                        : "NO DATA"}
                    </div>

                  </div>

                  <div className="staffSpotScanCount">

                    <span>
                      読み取り人数
                    </span>

                    <div>
                      <strong>
                        <PokipoAnimatedNumber
                          value={
                            loading
                              ? null
                              : summary.scan_count
                          }
                          duration={850}
                        />
                      </strong>

                      <small>人</small>
                    </div>

                  </div>

                  <div className="staffSpotLastScan">

                    <span>
                      最終読み取り
                    </span>

                    <strong>
                      {loading
                        ? "確認中..."
                        : formatRelativeTime(
                            summary.last_scanned_at,
                            currentTime
                          )}
                    </strong>

                    <time>
                      {loading
                        ? "----"
                        : formatSpotDate(
                            summary.last_scanned_at
                          )}
                    </time>

                  </div>

                </article>
              );
            })}

          </div>
        </section>

        {/* =================================
            COMPLETION / EXCHANGE RATES
        ================================= */}

        <section className="staffDashboardRates">

          <div className="staffDashboardRateCard">

            <div>
              <span>
                COMPLETION RATE
              </span>

              <strong>
                {completionRate}%
              </strong>
            </div>

            <div className="staffDashboardRateBar">
              <div
                style={{
                  width: `${Math.min(
                    completionRate,
                    100
                  )}%`,
                }}
              />
            </div>

            <p>
              参加者のうち完走した割合
            </p>

          </div>

          <div className="staffDashboardRateCard">

            <div>
              <span>
                EXCHANGE RATE
              </span>

              <strong>
                {exchangeRate}%
              </strong>
            </div>

            <div className="staffDashboardRateBar">
              <div
                style={{
                  width: `${Math.min(
                    exchangeRate,
                    100
                  )}%`,
                }}
              />
            </div>

            <p>
              完走者のうち特典交換した割合
            </p>

          </div>

        </section>

        {/* =================================
            ACTIONS
        ================================= */}

        <section className="staffDashboardActions">

          <button
            type="button"
            onClick={() =>
              router.push("/staff/reward")
            }
          >
            <span>QR</span>

            <div>
              <strong>
                景品交換
              </strong>

              <small>
                参加者QRを読み取る
              </small>
            </div>

            <b>→</b>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff/reward/history"
              )
            }
          >
            <span>LOG</span>

            <div>
              <strong>
                交換履歴
              </strong>

              <small>
                交換済み参加者を確認
              </small>
            </div>

            <b>→</b>
          </button>

        </section>

        {/* =================================
            LATEST EXCHANGES
        ================================= */}

        <section className="staffDashboardHistory">

          <div className="staffDashboardSectionTitle">

            <div>
              <span>
                LATEST EXCHANGES
              </span>

              <h2>
                最新の特典交換
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/staff/reward/history"
                )
              }
            >
              すべて見る
            </button>

          </div>

          {loading ? (

            <div className="staffDashboardEmpty">
              読み込み中...
            </div>

          ) : latestHistory.length === 0 ? (

            <div className="staffDashboardEmpty">

              <strong>
                まだ交換履歴はありません
              </strong>

              <p>
                景品交換が完了すると
                ここに表示されます。
              </p>

            </div>

          ) : (

            <div className="staffDashboardHistoryList">

              {latestHistory.map((item) => (

                <article key={item.id}>

                  <div className="staffDashboardHistoryAvatar">
                    {item.nickname.slice(0, 1)}
                  </div>

                  <div className="staffDashboardHistoryUser">

                    <strong>
                      {item.nickname}さん
                    </strong>

                    <span>
                      学籍番号：
                      {item.student_number}
                    </span>

                  </div>

                  <time>
                    {formatDate(
                      item.exchanged_at
                    )}
                  </time>

                </article>

              ))}

            </div>

          )}

        </section>

        {/* =================================
            MESSAGE
        ================================= */}

        {message && (
          <p className="staffMessage">
            {message}
          </p>
        )}

      </section>
    </main>
  );
}