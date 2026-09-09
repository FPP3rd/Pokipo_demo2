"use client";

import {
  useEffect,
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

type RewardHistoryItem = {
  id: string;

  participant_id: string;

  student_number: string;

  exchanged_at:
    | string
    | null;

  nickname: string;
};

/* ========================================
   STAFF DASHBOARD
======================================== */

export default function StaffDashboardPage() {
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
     STATS
  ======================================== */

  const [
    participantCount,
    setParticipantCount,
  ] = useState(0);

  const [
    completionCount,
    setCompletionCount,
  ] = useState(0);

  const [
    exchangedCount,
    setExchangedCount,
  ] = useState(0);

  const [
    todayExchangedCount,
    setTodayExchangedCount,
  ] = useState(0);

  /* ========================================
     HISTORY
  ======================================== */

  const [
    latestHistory,
    setLatestHistory,
  ] = useState<
    RewardHistoryItem[]
  >([]);

  /* ========================================
     UI
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

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
      } =
        await supabase.auth.getSession();

      if (
        !data.session
      ) {
        setAuthenticated(
          false
        );

        setAuthLoading(
          false
        );

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

    checkAuth();
  }, [router]);

  /* ========================================
     LOAD DASHBOARD
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    async function loadDashboard() {
      setLoading(
        true
      );

      setMessage("");

      try {
        /* =================================
           PARTICIPANT COUNT
        ================================= */

        const {
          data:
            participantCountData,

          error:
            participantCountError,
        } =
          await supabase.rpc(
            "get_participant_count"
          );

        if (
          participantCountError
        ) {
          console.error(
            "参加者数取得エラー:",
            participantCountError
          );
        } else {
          setParticipantCount(
            Number(
              participantCountData ??
              0
            )
          );
        }

        /* =================================
           COMPLETION COUNT
        ================================= */

        const {
          count:
            completionCountData,

          error:
            completionCountError,
        } =
          await supabase
            .from(
              "participant_completions"
            )
            .select(
              "*",
              {
                count:
                  "exact",

                head:
                  true,
              }
            );

        if (
          completionCountError
        ) {
          console.error(
            "完走者数取得エラー:",
            completionCountError
          );
        } else {
          setCompletionCount(
            completionCountData ??
            0
          );
        }

        /* =================================
           EXCHANGED COUNT
        ================================= */

        const {
          count:
            exchangedCountData,

          error:
            exchangedCountError,
        } =
          await supabase
            .from(
              "reward_exchanges"
            )
            .select(
              "*",
              {
                count:
                  "exact",

                head:
                  true,
              }
            )
            .eq(
              "status",
              "exchanged"
            );

        if (
          exchangedCountError
        ) {
          console.error(
            "交換済み人数取得エラー:",
            exchangedCountError
          );
        } else {
          setExchangedCount(
            exchangedCountData ??
            0
          );
        }

        /* =================================
           TODAY EXCHANGED
        ================================= */

        const now =
          new Date();

        const startOfToday =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0
          );

        const startOfTomorrow =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0
          );

        const {
          count:
            todayCountData,

          error:
            todayCountError,
        } =
          await supabase
            .from(
              "reward_exchanges"
            )
            .select(
              "*",
              {
                count:
                  "exact",

                head:
                  true,
              }
            )
            .eq(
              "status",
              "exchanged"
            )
            .gte(
              "exchanged_at",
              startOfToday.toISOString()
            )
            .lt(
              "exchanged_at",
              startOfTomorrow.toISOString()
            );

        if (
          todayCountError
        ) {
          console.error(
            "本日交換人数取得エラー:",
            todayCountError
          );
        } else {
          setTodayExchangedCount(
            todayCountData ??
            0
          );
        }

        /* =================================
           LATEST EXCHANGES
        ================================= */

        const {
          data:
            rewardData,

          error:
            rewardError,
        } =
          await supabase
            .from(
              "reward_exchanges"
            )
            .select(
              "id, participant_id, student_number, exchanged_at"
            )
            .eq(
              "status",
              "exchanged"
            )
            .order(
              "exchanged_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              5
            );

        if (
          rewardError
        ) {
          console.error(
            "最新交換履歴取得エラー:",
            rewardError
          );

          setLatestHistory(
            []
          );
        } else {
          const rewards =
            rewardData ??
            [];

          if (
            rewards.length ===
            0
          ) {
            setLatestHistory(
              []
            );
          } else {
            const participantIds =
              rewards.map(
                (
                  item
                ) =>
                  item.participant_id
              );

            const {
              data:
                participantData,

              error:
                participantError,
            } =
              await supabase
                .from(
                  "participants"
                )
                .select(
                  "id, nickname"
                )
                .in(
                  "id",
                  participantIds
                );

            if (
              participantError
            ) {
              console.error(
                "最新履歴参加者取得エラー:",
                participantError
              );
            }

            const participants =
              participantData ??
              [];

            const combined =
              rewards.map(
                (
                  reward
                ) => {
                  const participant =
                    participants.find(
                      (
                        item
                      ) =>
                        item.id ===
                        reward.participant_id
                    );

                  return {
                    id:
                      reward.id,

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
                }
              );

            setLatestHistory(
              combined
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "ダッシュボード取得エラー:",
          error
        );

        setMessage(
          "ダッシュボード情報を取得できませんでした。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadDashboard();

    /* ========================================
       REALTIME
    ======================================== */

    const participantsChannel =
      supabase
        .channel(
          "staff-dashboard-participants"
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "participants",
          },
          () => {
            loadDashboard();
          }
        )
        .subscribe();

    const completionsChannel =
      supabase
        .channel(
          "staff-dashboard-completions"
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "participant_completions",
          },
          () => {
            loadDashboard();
          }
        )
        .subscribe();

    const rewardsChannel =
      supabase
        .channel(
          "staff-dashboard-rewards"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "reward_exchanges",
          },
          () => {
            loadDashboard();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        participantsChannel
      );

      supabase.removeChannel(
        completionsChannel
      );

      supabase.removeChannel(
        rewardsChannel
      );
    };
  }, [
    authenticated,
  ]);

  /* ========================================
     FORMAT DATE
  ======================================== */

  function formatDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "----";
    }

    return new Date(
      value
    ).toLocaleString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }

  /* ========================================
     COMPLETION RATE
  ======================================== */

  const completionRate =
    participantCount >
    0
      ? Math.round(
          (
            completionCount /
            participantCount
          ) *
            100
        )
      : 0;

  /* ========================================
     EXCHANGE RATE
  ======================================== */

  const exchangeRate =
    completionCount >
    0
      ? Math.round(
          (
            exchangedCount /
            completionCount
          ) *
            100
        )
      : 0;

  /* ========================================
     LOADING AUTH
  ======================================== */

  if (
    authLoading
  ) {
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

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="staffDashboardPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffDashboardHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              管理ダッシュボード
            </h1>

            <p>
              POKIPOの現在の参加状況
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff/reward"
              )
            }
          >
            QR交換
          </button>

        </header>

        {/* =================================
            LIVE
        ================================= */}

        <div className="staffDashboardLive">

          <span className="staffDashboardLiveDot" />

          LIVE DATA

        </div>

        {/* =================================
            STATS
        ================================= */}

        <section className="staffDashboardStats">

          {/* PARTICIPANTS */}

          <article className="staffDashboardStatCard">

            <span>
              PARTICIPANTS
            </span>

            <div>

              <strong>

                {loading
                  ? "—"
                  : participantCount}

              </strong>

              <small>
                人
              </small>

            </div>

            <p>
              現在の参加者
            </p>

          </article>

          {/* COMPLETED */}

          <article className="staffDashboardStatCard">

            <span>
              COMPLETED
            </span>

            <div>

              <strong>

                {loading
                  ? "—"
                  : completionCount}

              </strong>

              <small>
                人
              </small>

            </div>

            <p>
              スタンプ完走者
            </p>

          </article>

          {/* EXCHANGED */}

          <article className="staffDashboardStatCard">

            <span>
              EXCHANGED
            </span>

            <div>

              <strong>

                {loading
                  ? "—"
                  : exchangedCount}

              </strong>

              <small>
                人
              </small>

            </div>

            <p>
              特典交換済み
            </p>

          </article>

          {/* TODAY */}

          <article className="staffDashboardStatCard today">

            <span>
              TODAY
            </span>

            <div>

              <strong>

                {loading
                  ? "—"
                  : todayExchangedCount}

              </strong>

              <small>
                人
              </small>

            </div>

            <p>
              本日の特典交換
            </p>

          </article>

        </section>

        {/* =================================
            RATES
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
                  width:
                    `${Math.min(
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
                  width:
                    `${Math.min(
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
              router.push(
                "/staff/reward"
              )
            }
          >

            <span>
              QR
            </span>

            <div>

              <strong>
                景品交換
              </strong>

              <small>
                参加者QRを読み取る
              </small>

            </div>

            <b>
              →
            </b>

          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff/reward/history"
              )
            }
          >

            <span>
              LOG
            </span>

            <div>

              <strong>
                交換履歴
              </strong>

              <small>
                交換済み参加者を確認
              </small>

            </div>

            <b>
              →
            </b>

          </button>

        </section>

        {/* =================================
            LATEST HISTORY
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
          ) : latestHistory.length ===
            0 ? (
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

              {latestHistory.map(
                (
                  item
                ) => (
                  <article
                    key={
                      item.id
                    }
                  >

                    <div className="staffDashboardHistoryAvatar">

                      {item.nickname
                        .slice(
                          0,
                          1
                        )}

                    </div>

                    <div className="staffDashboardHistoryUser">

                      <strong>
                        {item.nickname}
                        さん
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
                )
              )}

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