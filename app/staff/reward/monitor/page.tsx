"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type MonitorState = {
  station_id: string;

  state:
    | "idle"
    | "presented"
    | "completed";

  participant_id: string | null;

  nickname: string | null;

  achievement_rank: number | null;

  route_type: string | null;

  updated_at: string;
};

type StampRow = {
  spot_id: string;
  acquired_at: string;
};

type RouteStop = {
  spotId: string;
  number: number;
  name: string;
};

/* ========================================
   SETTINGS
======================================== */

const STATION_ID =
  "main";

const THANK_YOU_SECONDS =
  10;

const DEVICE_MODE_KEY =
  "pokipo_staff_reward_device_mode";

/* ========================================
   SPOT NAMES
======================================== */

const SPOT_NAMES:
  Record<string, string> = {
    spot1:
      "学生センター",

    spot2:
      "東棟2階",

    spot3:
      "ラーニングスクエア",

    spot4:
      "ゆうちょ銀行ATM",

    spot5:
      "セブンイレブン付近掲示板",
  };

/* ========================================
   PAGE
======================================== */

export default function RewardMonitorPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  /* ========================================
     MONITOR
  ======================================== */

  const [
    monitorState,
    setMonitorState,
  ] =
    useState<MonitorState | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    realtimeConnected,
    setRealtimeConnected,
  ] = useState(false);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(
    THANK_YOU_SECONDS
  );

  /* ========================================
     ROUTE
  ======================================== */

  const [
    routeStops,
    setRouteStops,
  ] =
    useState<RouteStop[]>(
      []
    );

  const [
    routeLoading,
    setRouteLoading,
  ] = useState(false);

  /* ========================================
     FULLSCREEN
  ======================================== */

  const [
    fullscreen,
    setFullscreen,
  ] = useState(false);

  const lastMonitorTapRef =
    useRef(0);

  /* ========================================
     TIMER
  ======================================== */

  const completedTimerRef =
    useRef<number | null>(
      null
    );

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (
          error ||
          !data.session
        ) {
          setAuthenticated(
            false
          );

          router.replace(
            "/staff/reward"
          );

          return;
        }

        const mode =
          sessionStorage.getItem(
            DEVICE_MODE_KEY
          );

        if (
          mode !==
          "monitor"
        ) {
          router.replace(
            "/staff/reward"
          );

          return;
        }

        setAuthenticated(
          true
        );
      } catch (
        error
      ) {
        console.error(
          "モニター認証確認エラー:",
          error
        );

        router.replace(
          "/staff/reward"
        );
      } finally {
        setAuthLoading(
          false
        );
      }
    }

    void checkSession();
  }, [
    router,
  ]);

  /* ========================================
     LOAD + REALTIME
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    let mounted =
      true;

    async function loadMonitorState() {
      setLoading(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "reward_monitor_state"
            )
            .select(
              `
                station_id,
                state,
                participant_id,
                nickname,
                achievement_rank,
                route_type,
                updated_at
              `
            )
            .eq(
              "station_id",
              STATION_ID
            )
            .single();

        if (
          error
        ) {
          console.error(
            "モニター状態取得エラー:",
            error
          );

          return;
        }

        if (
          mounted &&
          data
        ) {
          setMonitorState(
            data as MonitorState
          );
        }
      } catch (
        error
      ) {
        console.error(
          "モニター状態通信エラー:",
          error
        );
      } finally {
        if (
          mounted
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void loadMonitorState();

    const channel =
      supabase
        .channel(
          "reward-monitor-main"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "reward_monitor_state",

            filter:
              `station_id=eq.${STATION_ID}`,
          },
          (
            payload
          ) => {
            const nextState =
              payload.new as MonitorState;

            setMonitorState(
              nextState
            );
          }
        )
        .subscribe(
          (
            status
          ) => {
            setRealtimeConnected(
              status ===
                "SUBSCRIBED"
            );
          }
        );

    return () => {
      mounted =
        false;

      setRealtimeConnected(
        false
      );

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    authenticated,
  ]);

  /* ========================================
     LOAD PARTICIPANT ROUTE
  ======================================== */

  useEffect(() => {
    const participantId =
      monitorState?.participant_id;

    if (
      monitorState?.state !==
        "presented" ||
      !participantId
    ) {
      if (
        monitorState?.state ===
        "idle"
      ) {
        setRouteStops(
          []
        );
      }

      return;
    }

    let cancelled =
      false;

    async function loadRoute() {
      setRouteLoading(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_pokipo_stamps",
            {
              p_participant_id:
                participantId,
            }
          );

        if (
          error
        ) {
          console.error(
            "モニタールート取得エラー:",
            error
          );

          if (
            !cancelled
          ) {
            setRouteStops(
              []
            );
          }

          return;
        }

        const stamps =
          (
            data ?? []
          ) as StampRow[];

        const route =
          stamps.map(
            (
              stamp
            ) => {
              const number =
                Number(
                  stamp.spot_id.replace(
                    "spot",
                    ""
                  )
                );

              return {
                spotId:
                  stamp.spot_id,

                number:
                  Number.isFinite(
                    number
                  )
                    ? number
                    : 0,

                name:
                  SPOT_NAMES[
                    stamp.spot_id
                  ] ??
                  stamp.spot_id,
              };
            }
          );

        if (
          !cancelled
        ) {
          setRouteStops(
            route
          );
        }
      } catch (
        error
      ) {
        console.error(
          "モニタールート通信エラー:",
          error
        );

        if (
          !cancelled
        ) {
          setRouteStops(
            []
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setRouteLoading(
            false
          );
        }
      }
    }

    void loadRoute();

    return () => {
      cancelled =
        true;
    };
  }, [
    monitorState?.state,
    monitorState?.participant_id,
    monitorState?.updated_at,
  ]);

  /* ========================================
     COMPLETED COUNTDOWN
  ======================================== */

  useEffect(() => {
    if (
      completedTimerRef.current !==
      null
    ) {
      window.clearInterval(
        completedTimerRef.current
      );

      completedTimerRef.current =
        null;
    }

    if (
      monitorState?.state !==
      "completed"
    ) {
      setRemainingSeconds(
        THANK_YOU_SECONDS
      );

      return;
    }

    let seconds =
      THANK_YOU_SECONDS;

    setRemainingSeconds(
      seconds
    );

    completedTimerRef.current =
      window.setInterval(
        () => {
          seconds -= 1;

          setRemainingSeconds(
            Math.max(
              seconds,
              0
            )
          );
        },
        1000
      );

    const idleTimer =
      window.setTimeout(
        async () => {
          if (
            completedTimerRef.current !==
            null
          ) {
            window.clearInterval(
              completedTimerRef.current
            );

            completedTimerRef.current =
              null;
          }

          try {
            const {
              error,
            } =
              await supabase
                .from(
                  "reward_monitor_state"
                )
                .update({
                  state:
                    "idle",

                  participant_id:
                    null,

                  nickname:
                    null,

                  achievement_rank:
                    null,

                  route_type:
                    null,

                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "station_id",
                  STATION_ID
                )
                .eq(
                  "state",
                  "completed"
                );

            if (
              error
            ) {
              console.error(
                "モニター待機状態復帰エラー:",
                error
              );
            }
          } catch (
            error
          ) {
            console.error(
              "モニター待機状態復帰通信エラー:",
              error
            );
          }
        },
        THANK_YOU_SECONDS *
          1000
      );

    return () => {
      window.clearTimeout(
        idleTimer
      );

      if (
        completedTimerRef.current !==
        null
      ) {
        window.clearInterval(
          completedTimerRef.current
        );

        completedTimerRef.current =
          null;
      }
    };
  }, [
    monitorState?.state,
    monitorState?.updated_at,
  ]);

  /* ========================================
     FULLSCREEN WATCH
  ======================================== */

  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(
        Boolean(
          document.fullscreenElement
        )
      );
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    handleFullscreenChange();

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  /* ========================================
     ENTER FULLSCREEN
  ======================================== */

  async function enterFullscreen() {
    try {
      if (
        !document.fullscreenElement
      ) {
        await document.documentElement.requestFullscreen();
      }
    } catch (
      error
    ) {
      console.error(
        "全画面表示エラー:",
        error
      );
    }
  }

  /* ========================================
     EXIT FULLSCREEN
  ======================================== */

  async function exitFullscreen() {
    try {
      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();
      }
    } catch (
      error
    ) {
      console.error(
        "全画面終了エラー:",
        error
      );
    }
  }

  /* ========================================
     DOUBLE TAP
  ======================================== */

  function handleMonitorPointerUp() {
    if (
      !document.fullscreenElement
    ) {
      return;
    }

    const now =
      Date.now();

    const difference =
      now -
      lastMonitorTapRef.current;

    if (
      difference > 0 &&
      difference < 350
    ) {
      lastMonitorTapRef.current =
        0;

      void exitFullscreen();

      return;
    }

    lastMonitorTapRef.current =
      now;
  }

  /* ========================================
     RESET
  ======================================== */

  async function resetMonitor() {
    try {
      const {
        error,
      } =
        await supabase
          .from(
            "reward_monitor_state"
          )
          .update({
            state:
              "idle",

            participant_id:
              null,

            nickname:
              null,

            achievement_rank:
              null,

            route_type:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "station_id",
            STATION_ID
          );

      if (
        error
      ) {
        console.error(
          "モニターリセットエラー:",
          error
        );
      }
    } catch (
      error
    ) {
      console.error(
        "モニターリセット通信エラー:",
        error
      );
    }
  }

  /* ========================================
     EXIT MONITOR
  ======================================== */

  async function exitMonitor() {
    await exitFullscreen();

    sessionStorage.removeItem(
      DEVICE_MODE_KEY
    );

    router.push(
      "/staff/reward"
    );
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="rewardMonitorScreen">

        <div className="rewardMonitorLoading">

          <span>
            POKIPO
          </span>

          <p>
            モニターを準備しています...
          </p>

        </div>

      </main>
    );
  }

  if (
    !authenticated
  ) {
    return null;
  }

  /* ========================================
     VALUES
  ======================================== */

  const currentState =
    monitorState?.state ??
    "idle";

  const nickname =
    monitorState?.nickname ??
    "";

  const achievementRank =
    monitorState?.achievement_rank ??
    null;

  const routeType =
    monitorState?.route_type ??
    "自由気まま型";

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main
      className={
        `rewardMonitorScreen state-${currentState}`
      }
      onPointerUp={
        handleMonitorPointerUp
      }
    >

      {!fullscreen && (
        <div className="rewardMonitorControl">

          <div
            className={
              realtimeConnected
                ? "rewardMonitorConnection connected"
                : "rewardMonitorConnection"
            }
          >

            <span />

            {realtimeConnected
              ? "LIVE"
              : "接続中"}

          </div>

          <button
            type="button"
            onClick={() =>
              void enterFullscreen()
            }
          >
            全画面表示
          </button>

          <button
            type="button"
            onClick={() =>
              void resetMonitor()
            }
          >
            待機画面
          </button>

          <button
            type="button"
            onClick={() =>
              void exitMonitor()
            }
          >
            端末設定へ戻る
          </button>

        </div>
      )}

      {/* ========================================
          IDLE
      ======================================== */}

      {currentState ===
        "idle" && (
        <section className="rewardMonitorIdle">

          <div className="rewardMonitorIdleDecor decorOne" />

          <div className="rewardMonitorIdleDecor decorTwo" />

          <div className="rewardMonitorIdleDecor decorThree" />

          <span className="rewardMonitorEyebrow">
            高安ゼミ LiPost × POCKY
          </span>

          <h1>
            POKIPO
          </h1>

          <div className="rewardMonitorIdleLine" />

          <h2>
            5つのスポットを巡って
            <br />
            ポッキーの持つ価値を知ろう
          </h2>

          <p>
            特典交換に来た参加者を
            お待ちしています
          </p>

          <div className="rewardMonitorWaiting">

            <span className="rewardMonitorWaitingDot" />

            NEXT CHALLENGER...

          </div>

        </section>
      )}

      {/* ========================================
          PRESENTED
      ======================================== */}

      {currentState ===
        "presented" && (
        <section
          key={
            monitorState?.updated_at
          }
          className="rewardMonitorPresented"
        >

          <span className="rewardMonitorPresentedEyebrow">
            POKIPO COMPLETE
          </span>

          <h1>
            CONGRATULATIONS!
          </h1>

          <div className="rewardMonitorParticipantName">

            <strong>
              {nickname}
            </strong>

            <span>
              さん
            </span>

          </div>

          {achievementRank !==
            null && (
            <div className="rewardMonitorRank">

              <span>
                あなたは
              </span>

              <strong>
                {achievementRank}
              </strong>

              <span>
                番目のゴール！
              </span>

            </div>
          )}

          {/* ========================================
              YOUR ROUTE
          ======================================== */}

          <section className="rewardMonitorRoute">

            <div className="rewardMonitorRouteTitle">

              <span>
                YOUR ROUTE
              </span>

              <strong>
                あなたが回った順番
              </strong>

            </div>

            {routeLoading ? (
              <div className="rewardMonitorRouteLoading">
                ルートを読み込み中...
              </div>
            ) : routeStops.length >
              0 ? (
              <div className="rewardMonitorRouteTrack">

                {routeStops.map(
                  (
                    stop,
                    index
                  ) => (
                    <div
                      key={
                        `${stop.spotId}-${index}`
                      }
                      className="rewardMonitorRouteGroup"
                      style={{
                        animationDelay:
                          `${index * 0.12}s`,
                      }}
                    >

                      <div className="rewardMonitorRouteStop">

                        <span>
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <div>

                          <small>
                            SPOT {stop.number}
                          </small>

                          <strong>
                            {stop.name}
                          </strong>

                        </div>

                      </div>

                      {index <
                        routeStops.length -
                          1 && (
                        <div className="rewardMonitorRouteArrow">
                          →
                        </div>
                      )}

                    </div>
                  )
                )}

              </div>
            ) : (
              <div className="rewardMonitorRouteLoading">
                ルート情報を確認できませんでした
              </div>
            )}

          </section>

          {/* ========================================
              DIAGNOSIS
          ======================================== */}

          <div className="rewardMonitorDiagnosis">

            <span>
              YOUR POKIPO TYPE
            </span>

            <p>
              あなたのスタンプラリータイプは...
            </p>

            <strong>
              「{routeType}」
            </strong>

          </div>

          <div className="rewardMonitorExchangeWaiting">

            <span />

            特典交換を確認しています...

          </div>

        </section>
      )}

      {/* ========================================
          COMPLETED
      ======================================== */}

      {currentState ===
        "completed" && (
        <section
          key={
            monitorState?.updated_at
          }
          className="rewardMonitorCompleted"
        >

          <div className="rewardMonitorConfetti confetti1">
            ✦
          </div>

          <div className="rewardMonitorConfetti confetti2">
            ●
          </div>

          <div className="rewardMonitorConfetti confetti3">
            ★
          </div>

          <div className="rewardMonitorConfetti confetti4">
            ✦
          </div>

          <div className="rewardMonitorConfetti confetti5">
            ●
          </div>

          <span>
            THANK YOU!
          </span>

          <h1>
            {nickname}

            <small>
              さん
            </small>
          </h1>

          <h2>
            POKIPOに参加してくれて
            <br />
            ありがとう！！
          </h2>

          <p>
            これからもポッキーと一緒に
            <br />
            SHARE HAPPINESS!
          </p>

          <div className="rewardMonitorCountdown">
            {remainingSeconds}
          </div>

        </section>
      )}

    </main>
  );
}