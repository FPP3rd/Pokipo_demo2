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
  Html5Qrcode,
} from "html5-qrcode";

import {
  supabase,
} from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type RewardExchange = {
  id: string;
  participant_id: string;
  confirmation_code: string;
  exchange_token: string;
  status: string;
  created_at: string;
  exchanged_at: string | null;
  exchanged_by: string | null;
};

type Participant = {
  id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
  created_at: string;
};

type MonitorProfile = {
  achievementRank: number | null;
  routeTitle: string;
};

type DeviceMode =
  | "scanner"
  | "monitor"
  | null;

/* ========================================
   SETTINGS
======================================== */

const MONITOR_STATION_ID =
  "main";

const DEVICE_MODE_KEY =
  "pokipo_staff_reward_device_mode";

/* ========================================
   PAGE
======================================== */

export default function StaffRewardPage() {
  const router =
    useRouter();

  /* ========================================
     LOGIN
  ======================================== */

  const [
    adminId,
    setAdminId,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  /* ========================================
     DEVICE MODE
  ======================================== */

  const [
    deviceMode,
    setDeviceMode,
  ] =
    useState<DeviceMode>(
      null
    );

  const [
    deviceModeLoaded,
    setDeviceModeLoaded,
  ] = useState(false);

  /* ========================================
     CAMERA
  ======================================== */

  const [
    cameraOpen,
    setCameraOpen,
  ] = useState(false);

  const [
    cameraError,
    setCameraError,
  ] = useState("");

  const scannerRef =
    useRef<Html5Qrcode | null>(
      null
    );

  const scanningRef =
    useRef(false);

  const processingRef =
    useRef(false);

  /* ========================================
     MONITOR CONTROL
  ======================================== */

  const monitorPresentationActiveRef =
    useRef(false);

  /* ========================================
     REWARD
  ======================================== */

  const [
    reward,
    setReward,
  ] =
    useState<RewardExchange | null>(
      null
    );

  const [
    participant,
    setParticipant,
  ] =
    useState<Participant | null>(
      null
    );

  const [
    monitorProfile,
    setMonitorProfile,
  ] =
    useState<MonitorProfile | null>(
      null
    );

  const [
    loadingReward,
    setLoadingReward,
  ] = useState(false);

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

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
          error
        ) {
          console.error(
            "管理者認証確認エラー:",
            error
          );

          setAuthenticated(
            false
          );

          return;
        }

        setAuthenticated(
          Boolean(
            data.session
          )
        );
      } finally {
        setAuthLoading(
          false
        );
      }
    }

    void checkSession();

    const {
      data:
        authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          setAuthenticated(
            Boolean(
              session
            )
          );

          if (
            !session
          ) {
            setDeviceMode(
              null
            );

            setDeviceModeLoaded(
              false
            );
          }
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ========================================
     DEVICE MODE LOAD
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      setDeviceMode(
        null
      );

      setDeviceModeLoaded(
        false
      );

      return;
    }

    const savedMode =
      sessionStorage.getItem(
        DEVICE_MODE_KEY
      );

    if (
      savedMode ===
      "scanner"
    ) {
      setDeviceMode(
        "scanner"
      );
    } else if (
      savedMode ===
      "monitor"
    ) {
      setDeviceMode(
        "monitor"
      );

      router.replace(
        "/staff/reward/monitor"
      );
    } else {
      setDeviceMode(
        null
      );
    }

    setDeviceModeLoaded(
      true
    );
  }, [
    authenticated,
    router,
  ]);

  /* ========================================
     PAGE LEAVE SAFETY
  ======================================== */

  useEffect(() => {
    function handlePageHide() {
      if (
        monitorPresentationActiveRef.current
      ) {
        void setMonitorIdle();
      }
    }

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        handlePageHide
      );

      if (
        monitorPresentationActiveRef.current
      ) {
        void setMonitorIdle();
      }
    };
  }, []);

  /* ========================================
     LOGIN
  ======================================== */

  async function loginStaff() {
    const normalizedAdminId =
      adminId
        .trim()
        .toLowerCase();

    if (
      !normalizedAdminId ||
      !password
    ) {
      setMessage(
        "管理IDとパスワードを入力してください。"
      );

      return;
    }

    const loginEmail =
      `${normalizedAdminId}@pokipo.staff`;

    setLoginLoading(
      true
    );

    setMessage("");

    try {
      const {
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            loginEmail,

          password,
        });

      if (
        error
      ) {
        console.error(
          "管理者ログインエラー:",
          error
        );

        setMessage(
          "管理IDまたはパスワードが正しくありません。"
        );

        return;
      }

      setAuthenticated(
        true
      );

      setPassword("");
    } catch (
      error
    ) {
      console.error(
        "管理者ログイン通信エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setLoginLoading(
        false
      );
    }
  }

  /* ========================================
     LOGOUT
  ======================================== */

  async function logoutStaff() {
    await stopQrScanner();

    await clearPendingMonitorPresentation();

    sessionStorage.removeItem(
      DEVICE_MODE_KEY
    );

    await supabase.auth.signOut();

    setAuthenticated(
      false
    );

    setDeviceMode(
      null
    );

    setDeviceModeLoaded(
      false
    );

    setReward(
      null
    );

    setParticipant(
      null
    );

    setMonitorProfile(
      null
    );

    setMessage("");

    router.replace(
      "/staff/reward"
    );
  }

  /* ========================================
     SELECT SCANNER MODE
  ======================================== */

  function selectScannerMode() {
    sessionStorage.setItem(
      DEVICE_MODE_KEY,
      "scanner"
    );

    setDeviceMode(
      "scanner"
    );

    setMessage("");
  }

  /* ========================================
     SELECT MONITOR MODE
  ======================================== */

  async function selectMonitorMode() {
    sessionStorage.setItem(
      DEVICE_MODE_KEY,
      "monitor"
    );

    setDeviceMode(
      "monitor"
    );

    try {
      if (
        !document.fullscreenElement
      ) {
        await document.documentElement.requestFullscreen();
      }
    } catch (
      error
    ) {
      console.warn(
        "全画面表示を開始できませんでした:",
        error
      );
    }

    router.push(
      "/staff/reward/monitor"
    );
  }

  /* ========================================
     CHANGE DEVICE MODE
  ======================================== */

  async function changeDeviceMode() {
    await stopQrScanner();

    await clearPendingMonitorPresentation();

    sessionStorage.removeItem(
      DEVICE_MODE_KEY
    );

    setDeviceMode(
      null
    );

    setReward(
      null
    );

    setParticipant(
      null
    );

    setMonitorProfile(
      null
    );

    setMessage("");

    setCameraError("");
  }

  /* ========================================
     GO STAFF MENU
  ======================================== */

  async function goStaffMenu() {
    await stopQrScanner();

    await clearPendingMonitorPresentation();

    router.push(
      "/staff"
    );
  }

  /* ========================================
     MONITOR IDLE
  ======================================== */

  async function setMonitorIdle() {
    monitorPresentationActiveRef.current =
      false;

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "reward_monitor_state"
          )
          .upsert(
            {
              station_id:
                MONITOR_STATION_ID,

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
            },
            {
              onConflict:
                "station_id",
            }
          );

      if (
        error
      ) {
        console.error(
          "モニター待機状態更新エラー:",
          error
        );
      }
    } catch (
      error
    ) {
      console.error(
        "モニター待機状態通信エラー:",
        error
      );
    }
  }

  /* ========================================
     CLEAR PENDING PRESENTATION
  ======================================== */

  async function clearPendingMonitorPresentation() {
    if (
      !monitorPresentationActiveRef.current
    ) {
      return;
    }

    await setMonitorIdle();
  }

  /* ========================================
     MONITOR PRESENTED
  ======================================== */

  async function sendPresentedToMonitor(
    participantData: Participant
  ) {
    let achievementRank:
      number | null =
      null;

    let routeTitle =
      "自由気まま型";

    /* --------------------------------
       ACHIEVEMENT RANK
    -------------------------------- */

    try {
      const {
        data:
          completionData,
        error:
          completionError,
      } =
        await supabase
          .from(
            "participant_completions"
          )
          .select(
            "achievement_rank"
          )
          .eq(
            "participant_id",
            participantData.id
          )
          .maybeSingle();

      if (
        completionError
      ) {
        console.error(
          "達成順位取得エラー:",
          completionError
        );
      } else if (
        completionData
      ) {
        const rank =
          Number(
            completionData.achievement_rank
          );

        if (
          Number.isFinite(
            rank
          )
        ) {
          achievementRank =
            rank;
        }
      }
    } catch (
      error
    ) {
      console.error(
        "達成順位通信エラー:",
        error
      );
    }

    /* --------------------------------
       ROUTE TYPE
    -------------------------------- */

    try {
      const {
        data:
          routeData,
        error:
          routeError,
      } =
        await supabase.rpc(
          "get_pokipo_route_type",
          {
            p_participant_id:
              participantData.id,
          }
        );

      if (
        routeError
      ) {
        console.error(
          "ルート診断取得エラー:",
          routeError
        );
      } else if (
        Array.isArray(
          routeData
        ) &&
        routeData.length >
          0
      ) {
        const firstRoute =
          routeData[0] as {
            route_title?:
              string;
          };

        if (
          firstRoute.route_title
        ) {
          routeTitle =
            firstRoute.route_title;
        }
      }
    } catch (
      error
    ) {
      console.error(
        "ルート診断通信エラー:",
        error
      );
    }

    /* --------------------------------
       SEND
    -------------------------------- */

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "reward_monitor_state"
          )
          .upsert(
            {
              station_id:
                MONITOR_STATION_ID,

              state:
                "presented",

              participant_id:
                participantData.id,

              nickname:
                participantData.nickname,

              achievement_rank:
                achievementRank,

              route_type:
                routeTitle,

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "station_id",
            }
          );

      if (
        error
      ) {
        console.error(
          "モニター表示送信エラー:",
          error
        );

        setMonitorProfile(
          null
        );

        monitorPresentationActiveRef.current =
          false;

        return;
      }

      /*
       * DB更新に成功してから
       * 「モニターに送信済み」を表示する
       */

      monitorPresentationActiveRef.current =
        true;

      setMonitorProfile({
        achievementRank,
        routeTitle,
      });
    } catch (
      error
    ) {
      console.error(
        "モニター表示通信エラー:",
        error
      );

      setMonitorProfile(
        null
      );

      monitorPresentationActiveRef.current =
        false;
    }
  }

  /* ========================================
     MONITOR COMPLETED
  ======================================== */

  async function sendCompletedToMonitor() {
    if (
      !participant
    ) {
      return;
    }

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "reward_monitor_state"
          )
          .upsert(
            {
              station_id:
                MONITOR_STATION_ID,

              state:
                "completed",

              participant_id:
                participant.id,

              nickname:
                participant.nickname,

              achievement_rank:
                monitorProfile?.achievementRank ??
                null,

              route_type:
                monitorProfile?.routeTitle ??
                "自由気まま型",

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "station_id",
            }
          );

      if (
        error
      ) {
        console.error(
          "モニター完了表示送信エラー:",
          error
        );

        return;
      }

      /*
       * 交換完了後は
       * QR端末がidleへ戻さない。
       *
       * モニター側で10秒後に
       * 自動的にidleへ戻す。
       */

      monitorPresentationActiveRef.current =
        false;
    } catch (
      error
    ) {
      console.error(
        "モニター完了表示通信エラー:",
        error
      );
    }
  }

  /* ========================================
     CAMERA START
  ======================================== */

  useEffect(() => {
    if (
      !cameraOpen ||
      !authenticated ||
      deviceMode !==
        "scanner"
    ) {
      return;
    }

    let cancelled =
      false;

    async function startCamera() {
      const readerElement =
        document.getElementById(
          "staff-reward-qr-reader"
        );

      if (
        !readerElement
      ) {
        setCameraError(
          "QR読み取りエリアを表示できませんでした。"
        );

        setCameraOpen(
          false
        );

        return;
      }

      try {
        const scanner =
          new Html5Qrcode(
            "staff-reward-qr-reader"
          );

        scannerRef.current =
          scanner;

        scanningRef.current =
          true;

        processingRef.current =
          false;

        await scanner.start(
          {
            facingMode:
              "environment",
          },

          {
            fps:
              10,

            qrbox: {
              width:
                240,

              height:
                240,
            },
          },

          async (
            decodedText
          ) => {
            if (
              cancelled ||
              processingRef.current
            ) {
              return;
            }

            processingRef.current =
              true;

            const qrValue =
              decodedText.trim();

            await stopQrScanner();

            await readRewardQr(
              qrValue
            );
          },

          () => {
            // QR探索中のエラーは無視
          }
        );
      } catch (
        error
      ) {
        console.error(
          "管理者QRカメラエラー:",
          error
        );

        scannerRef.current =
          null;

        scanningRef.current =
          false;

        processingRef.current =
          false;

        setCameraOpen(
          false
        );

        setCameraError(
          "カメラを起動できませんでした。ブラウザのカメラ使用を許可してください。"
        );
      }
    }

    void startCamera();

    return () => {
      cancelled =
        true;
    };
  }, [
    cameraOpen,
    authenticated,
    deviceMode,
  ]);

  /* ========================================
     START SCANNER
  ======================================== */

  function startQrScanner() {
    setReward(
      null
    );

    setParticipant(
      null
    );

    setMonitorProfile(
      null
    );

    setMessage("");

    setCameraError("");

    processingRef.current =
      false;

    setCameraOpen(
      true
    );
  }

  /* ========================================
     STOP SCANNER
  ======================================== */

  async function stopQrScanner() {
    const scanner =
      scannerRef.current;

    scannerRef.current =
      null;

    if (
      !scanner
    ) {
      scanningRef.current =
        false;

      setCameraOpen(
        false
      );

      return;
    }

    try {
      if (
        scanningRef.current
      ) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (
      error
    ) {
      console.error(
        "管理者QR停止エラー:",
        error
      );
    } finally {
      scanningRef.current =
        false;

      processingRef.current =
        false;

      setCameraOpen(
        false
      );
    }
  }

  /* ========================================
     READ QR
  ======================================== */

  async function readRewardQr(
    qrValue: string
  ) {
    const prefix =
      "POKIPO_REWARD:";

    if (
      !qrValue.startsWith(
        prefix
      )
    ) {
      setMessage(
        "POKIPOの特典交換QRではありません。"
      );

      return;
    }

    const token =
      qrValue.slice(
        prefix.length
      );

    if (
      !token
    ) {
      setMessage(
        "QRコードの情報を確認できませんでした。"
      );

      return;
    }

    setLoadingReward(
      true
    );

    setMessage("");

    try {
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
            `
              id,
              participant_id,
              confirmation_code,
              exchange_token,
              status,
              created_at,
              exchanged_at,
              exchanged_by
            `
          )
          .eq(
            "exchange_token",
            token
          )
          .single();

      if (
        rewardError ||
        !rewardData
      ) {
        console.error(
          "交換QR検索エラー:",
          rewardError
        );

        setMessage(
          "この交換用QRを確認できませんでした。"
        );

        return;
      }

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
            `
              id,
              nickname,
              grade,
              department,
              created_at
            `
          )
          .eq(
            "id",
            rewardData.participant_id
          )
          .single();

      if (
        participantError ||
        !participantData
      ) {
        console.error(
          "参加者検索エラー:",
          participantError
        );

        setMessage(
          "参加者情報を確認できませんでした。"
        );

        return;
      }

      const typedReward =
        rewardData as RewardExchange;

      const typedParticipant =
        participantData as Participant;

      setReward(
        typedReward
      );

      setParticipant(
        typedParticipant
      );

      if (
        typedReward.status !==
        "exchanged"
      ) {
        await sendPresentedToMonitor(
          typedParticipant
        );
      }
    } catch (
      error
    ) {
      console.error(
        "QR確認エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setLoadingReward(
        false
      );
    }
  }

  /* ========================================
     CONFIRM
  ======================================== */

  function confirmExchange() {
    if (
      !reward ||
      !participant
    ) {
      return;
    }

    if (
      reward.status ===
      "exchanged"
    ) {
      setMessage(
        "このQRはすでに景品交換済みです。"
      );

      return;
    }

    void performExchange();
  }

  /* ========================================
     EXCHANGE
  ======================================== */

  async function performExchange() {
    if (
      !reward ||
      !participant
    ) {
      return;
    }

    if (
      reward.status ===
      "exchanged"
    ) {
      setMessage(
        "このQRはすでに景品交換済みです。"
      );

      return;
    }

    setConfirming(
      true
    );

    setMessage("");

    try {
      const {
        data:
          userData,
      } =
        await supabase.auth.getUser();

      const adminUserId =
        userData.user?.id ??
        null;

      const exchangedAt =
        new Date().toISOString();

      const {
        data:
          updatedData,
        error,
      } =
        await supabase
          .from(
            "reward_exchanges"
          )
          .update({
            status:
              "exchanged",

            exchanged_at:
              exchangedAt,

            exchanged_by:
              adminUserId,
          })
          .eq(
            "id",
            reward.id
          )
          .eq(
            "status",
            "issued"
          )
          .select(
            "id"
          );

      if (
        error
      ) {
        console.error(
          "景品交換更新エラー:",
          error
        );

        setMessage(
          "景品交換を記録できませんでした。"
        );

        return;
      }

      if (
        !updatedData ||
        updatedData.length ===
          0
      ) {
        setMessage(
          "このQRはすでに交換処理されています。"
        );

        setReward({
          ...reward,

          status:
            "exchanged",
        });

        return;
      }

      setReward({
        ...reward,

        status:
          "exchanged",

        exchanged_at:
          exchangedAt,

        exchanged_by:
          adminUserId,
      });

      await sendCompletedToMonitor();

      setMessage(
        `${participant.nickname}さんの景品交換を記録しました。`
      );
    } catch (
      error
    ) {
      console.error(
        "景品交換エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setConfirming(
        false
      );
    }
  }

  /* ========================================
     RESET SCANNER
  ======================================== */

  async function resetScanner() {
    /*
     * 未交換状態なら
     * presented → idle
     *
     * 交換済みなら
     * completedを維持し、
     * モニター側の10秒タイマーに任せる
     */

    if (
      reward?.status !==
      "exchanged"
    ) {
      await clearPendingMonitorPresentation();
    }

    setReward(
      null
    );

    setParticipant(
      null
    );

    setMonitorProfile(
      null
    );

    setMessage("");

    setCameraError("");

    startQrScanner();
  }

  /* ========================================
     DATE FORMAT
  ======================================== */

  function formatExchangeDate(
    value: string | null
  ) {
    if (
      !value
    ) {
      return "交換日時不明";
    }

    return new Date(
      value
    ).toLocaleString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

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
     LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoadingCard">
            管理者情報を確認中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     LOGIN VIEW
  ======================================== */

  if (
    !authenticated
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoginCard">

            <span>
              POKIPO STAFF
            </span>

            <h1>
              管理者ログイン
            </h1>

            <p>
              POKIPO運営管理者専用ページです。
            </p>

            <div className="staffLoginField">

              <label htmlFor="adminId">
                管理ID
              </label>

              <input
                id="adminId"
                type="text"
                value={
                  adminId
                }
                onChange={(
                  event
                ) =>
                  setAdminId(
                    event.target.value
                  )
                }
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={
                  false
                }
                placeholder="管理IDを入力"
              />

            </div>

            <div className="staffLoginField">

              <label htmlFor="staffPassword">
                パスワード
              </label>

              <input
                id="staffPassword"
                type="password"
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                placeholder="パスワードを入力"
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void loginStaff();
                  }
                }}
              />

            </div>

            <button
              type="button"
              className="staffLoginButton"
              onClick={
                loginStaff
              }
              disabled={
                loginLoading
              }
            >

              {loginLoading
                ? "ログイン中..."
                : "管理者ログイン"}

            </button>

            {message && (
              <p className="staffError">
                {message}
              </p>
            )}

          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     DEVICE MODE LOADING
  ======================================== */

  if (
    authenticated &&
    !deviceModeLoaded
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoadingCard">
            端末設定を確認中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     DEVICE MODE SELECT
  ======================================== */

  if (
    authenticated &&
    !deviceMode
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffDeviceModePage">

            <header className="staffDeviceModeHeader">

              <span>
                POKIPO REWARD STATION
              </span>

              <h1>
                この端末の役割を
                <br />
                選択してください
              </h1>

              <p>
                特典交換会で使用する端末ごとに、
                QR読み取り用またはモニター用を設定します。
              </p>

            </header>

            <div className="staffDeviceModeGrid">

              <button
                type="button"
                className="staffDeviceModeCard scanner"
                onClick={
                  selectScannerMode
                }
              >

                <div className="staffDeviceModeIcon">
                  QR
                </div>

                <div className="staffDeviceModeBody">

                  <span>
                    SCANNER
                  </span>

                  <h2>
                    QR読み取り端末
                  </h2>

                  <p>
                    参加者の特典交換QRを読み取り、
                    確認番号の確認と景品交換処理を行います。
                  </p>

                  <div className="staffDeviceModeFeature">

                    <span>
                      ✓ QR読み取り
                    </span>

                    <span>
                      ✓ 参加者確認
                    </span>

                    <span>
                      ✓ 景品交換確定
                    </span>

                  </div>

                </div>

                <div className="staffDeviceModeArrow">
                  →
                </div>

              </button>

              <button
                type="button"
                className="staffDeviceModeCard monitor"
                onClick={() =>
                  void selectMonitorMode()
                }
              >

                <div className="staffDeviceModeIcon">
                  TV
                </div>

                <div className="staffDeviceModeBody">

                  <span>
                    MONITOR
                  </span>

                  <h2>
                    モニター端末
                  </h2>

                  <p>
                    QR読み取り端末と連携し、
                    ゴール順位・回った順番・
                    POKIPOタイプ・お礼画面を表示します。
                  </p>

                  <div className="staffDeviceModeFeature">

                    <span>
                      ✓ 待機画面
                    </span>

                    <span>
                      ✓ ゴール演出
                    </span>

                    <span>
                      ✓ YOUR ROUTE
                    </span>

                    <span>
                      ✓ THANK YOU画面
                    </span>

                  </div>

                </div>

                <div className="staffDeviceModeArrow">
                  →
                </div>

              </button>

            </div>

            <section className="staffDeviceModeNote">

              <strong>
                複数端末で使用できます
              </strong>

              <p>
                スマートフォンをQR読み取り端末、
                テレビに接続したPCをモニター端末として
                同時に使用できます。
              </p>

            </section>

            <button
              type="button"
              className="staffDeviceModeBack"
              onClick={() =>
                router.push(
                  "/staff"
                )
              }
            >
              スタッフメニューへ戻る
            </button>

          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     MONITOR TRANSITION
  ======================================== */

  if (
    deviceMode ===
    "monitor"
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoadingCard">
            モニターモードへ移動中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     SCANNER VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="staffRewardPage">

        <header className="staffRewardHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              景品交換
            </h1>

          </div>

          <div className="staffRewardHeaderActions">

            <button
              type="button"
              onClick={() =>
                void changeDeviceMode()
              }
            >
              端末設定
            </button>

            <button
              type="button"
              onClick={() =>
                void goStaffMenu()
              }
            >
              メニュー
            </button>

            <button
              type="button"
              onClick={() =>
                void logoutStaff()
              }
            >
              ログアウト
            </button>

          </div>

        </header>

        <section className="staffRewardQuickNav">

          <button
            type="button"
            onClick={async () => {
              await clearPendingMonitorPresentation();

              router.push(
                "/staff/dashboard"
              );
            }}
          >

            <span>
              LIVE
            </span>

            <strong>
              管理ダッシュボード
            </strong>

          </button>

          <button
            type="button"
            onClick={async () => {
              await clearPendingMonitorPresentation();

              router.push(
                "/staff/reward/history"
              );
            }}
          >

            <span>
              LOG
            </span>

            <strong>
              交換履歴
            </strong>

          </button>

        </section>

        {!reward &&
          !participant && (
            <section className="staffScannerCard">

              <div className="staffScannerIcon">
                QR
              </div>

              <span>
                REWARD SCANNER
              </span>

              <h2>
                参加者のQRを読み取る
              </h2>

              <p>
                参加者の特典交換画面に表示されている
                QRコードを読み取ってください。
              </p>

              {!cameraOpen ? (
                <button
                  type="button"
                  className="staffScannerButton"
                  onClick={
                    startQrScanner
                  }
                >
                  QRカメラを起動
                </button>
              ) : (
                <>

                  <div
                    id="staff-reward-qr-reader"
                    className="staffQrReader"
                  />

                  <button
                    type="button"
                    className="staffScannerCancel"
                    onClick={
                      stopQrScanner
                    }
                  >
                    カメラを閉じる
                  </button>

                </>
              )}

              {cameraError && (
                <p className="staffError">
                  {cameraError}
                </p>
              )}

              {message && (
                <p className="staffError">
                  {message}
                </p>
              )}

              {loadingReward && (
                <p className="staffLoadingText">
                  QR情報を確認中...
                </p>
              )}

            </section>
          )}

        {reward &&
          participant && (
            <section className="staffParticipantCard">

              <div
                className={
                  reward.status ===
                  "exchanged"
                    ? "staffExchangeStatus exchanged"
                    : "staffExchangeStatus ready"
                }
              >

                {reward.status ===
                "exchanged"
                  ? "交換済み"
                  : "交換可能"}

              </div>

              <span className="staffParticipantEyebrow">
                PARTICIPANT
              </span>

              <h2>
                {participant.nickname}

                <small>
                  さん
                </small>
              </h2>

              {monitorProfile &&
                reward.status !==
                  "exchanged" && (
                <div className="staffMonitorInfo">

                  <span>
                    MONITOR DISPLAY
                  </span>

                  <p>
                    モニターに送信済み
                  </p>

                  <strong>

                    {monitorProfile.achievementRank !==
                    null
                      ? `${monitorProfile.achievementRank}番目のゴール`
                      : "達成順位確認中"}

                  </strong>

                  <strong>
                    {monitorProfile.routeTitle}
                  </strong>

                </div>
              )}

              <div className="staffConfirmationCode">

                <span>
                  CONFIRMATION NUMBER
                </span>

                <small>
                  確認番号
                </small>

                <strong>
                  {reward.confirmation_code}
                </strong>

              </div>

              <div className="staffParticipantInfo">

                <div>

                  <span>
                    学年
                  </span>

                  <strong>
                    {participant.grade ??
                      "未設定"}
                  </strong>

                </div>

                <div>

                  <span>
                    学科
                  </span>

                  <strong>
                    {participant.department ??
                      "未設定"}
                  </strong>

                </div>

              </div>

              {reward.status ===
              "exchanged" ? (
                <div className="staffAlreadyExchanged">

                  <div>
                    ✓
                  </div>

                  <span>
                    REWARD EXCHANGED
                  </span>

                  <h3>
                    このQRは交換済みです
                  </h3>

                  {reward.exchanged_at && (
                    <p>
                      交換日時：
                      {formatExchangeDate(
                        reward.exchanged_at
                      )}
                    </p>
                  )}

                </div>
              ) : (
                <div className="staffExchangeConfirm">

                  <p>
                    参加者画面に表示されている
                    確認番号と一致していることを確認し、
                    景品を渡す直前に交換を確定してください。
                  </p>

                  <button
                    type="button"
                    onClick={
                      confirmExchange
                    }
                    disabled={
                      confirming
                    }
                  >

                    {confirming
                      ? "交換を記録中..."
                      : "景品交換を確定する"}

                  </button>

                </div>
              )}

              <button
                type="button"
                className="staffNextScanButton"
                onClick={() =>
                  void resetScanner()
                }
              >
                次のQRを読み取る
              </button>

              {message && (
                <p className="staffMessage">
                  {message}
                </p>
              )}

            </section>
          )}

      </section>

    </main>
  );
}