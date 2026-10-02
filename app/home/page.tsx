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
} from "../../lib/supabase-client";

import MaintenanceGate
  from "../../components/MaintenanceGate";

/* ========================================
   雄飛祭ポッキースキン
======================================== */

type PockySkin =
  | "chocolate"
  | "strawberry"
  | "matcha"
  | "white";

/* ========================================
   ANNOUNCEMENT
======================================== */

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
};

/* ========================================
   PROMOTION BANNER
======================================== */

type BannerPromotion = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  updated_at: string;
};

/* ========================================
   HOME PAGE
======================================== */

export default function HomePage() {
  const router =
    useRouter();

  /* ========================================
     BASIC
  ======================================== */

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    rewardExchanged,
    setRewardExchanged,
  ] = useState(false);

  /* ========================================
     PARTICIPANTS
  ======================================== */

  const [
    totalParticipants,
    setTotalParticipants,
  ] = useState<number | null>(
    null
  );

  const [
    completedParticipants,
    setCompletedParticipants,
  ] = useState<number | null>(
    null
  );

  const [
    participantCountUpdating,
    setParticipantCountUpdating,
  ] = useState(false);

  const [
    completedCountUpdating,
    setCompletedCountUpdating,
  ] = useState(false);

  const previousParticipantCount =
    useRef<number | null>(
      null
    );

  const previousCompletedCount =
    useRef<number | null>(
      null
    );

  /* ========================================
     ANNOUNCEMENTS
  ======================================== */

  const [
    announcements,
    setAnnouncements,
  ] = useState<Announcement[]>(
    []
  );

  /* ========================================
     PROMOTION BANNER
  ======================================== */

  const [
    bannerPromotion,
    setBannerPromotion,
  ] =
    useState<BannerPromotion | null>(
      null
    );

  const [
    bannerLoading,
    setBannerLoading,
  ] = useState(true);

  /* ========================================
     雄飛祭 MODE
  ======================================== */

  const [
    yuhisaiMode,
    setYuhisaiMode,
  ] = useState(false);

  const [
    yuhisaiPockySkin,
    setYuhisaiPockySkin,
  ] = useState<PockySkin>(
    "chocolate"
  );

  /* ========================================
     FIRST TUTORIAL
  ======================================== */

  const [
    showTutorial,
    setShowTutorial,
  ] = useState(false);

  const [
    tutorialStep,
    setTutorialStep,
  ] = useState(1);

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    /* --------------------------------
       LOCAL DATA
    -------------------------------- */

    function loadLocalData() {
      const savedNickname =
        localStorage.getItem(
          "pokipo_nickname"
        );

      const savedReward =
        localStorage.getItem(
          "pokipo_reward_exchanged"
        ) === "true";

      const savedYuhisai =
        localStorage.getItem(
          "pokipo_secret_yuhisai"
        ) === "true";

      const savedSkin =
        (
          localStorage.getItem(
            "pokipo_yuhisai_pocky_skin"
          ) ??
          "chocolate"
        ) as PockySkin;

      if (
        !savedNickname
      ) {
        router.replace(
          "/"
        );

        return;
      }

      setNickname(
        savedNickname
      );

      setRewardExchanged(
        savedReward
      );

      setYuhisaiMode(
        savedYuhisai
      );

      if (
        [
          "chocolate",
          "strawberry",
          "matcha",
          "white",
        ].includes(
          savedSkin
        )
      ) {
        setYuhisaiPockySkin(
          savedSkin
        );
      } else {
        setYuhisaiPockySkin(
          "chocolate"
        );
      }

      /* =========================
         FIRST TUTORIAL
      ========================= */

      const tutorialCompleted =
        localStorage.getItem(
          "pokipo_tutorial_completed"
        ) === "true";

      if (
        !tutorialCompleted
      ) {
        setShowTutorial(
          true
        );

        setTutorialStep(
          1
        );
      }
    }

    /* --------------------------------
       参加者数取得
    -------------------------------- */

    async function loadParticipantCount() {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_participant_count"
        );

      if (
        error
      ) {
        console.error(
          "参加者数取得エラー:",
          error
        );

        return;
      }

      const newCount =
        Number(
          data ?? 0
        );

      if (
        previousParticipantCount.current !==
          null &&
        previousParticipantCount.current !==
          newCount
      ) {
        setParticipantCountUpdating(
          true
        );

        window.setTimeout(
          () => {
            setParticipantCountUpdating(
              false
            );
          },
          650
        );
      }

      previousParticipantCount.current =
        newCount;

      setTotalParticipants(
        newCount
      );
    }

    /* --------------------------------
       5/5達成者数取得
    -------------------------------- */

    async function loadCompletedParticipantCount() {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_completed_participant_count"
        );

      if (
        error
      ) {
        console.error(
          "5/5達成者数取得エラー:",
          error
        );

        return;
      }

      const newCount =
        Number(
          data ?? 0
        );

      if (
        previousCompletedCount.current !==
          null &&
        previousCompletedCount.current !==
          newCount
      ) {
        setCompletedCountUpdating(
          true
        );

        window.setTimeout(
          () => {
            setCompletedCountUpdating(
              false
            );
          },
          650
        );
      }

      previousCompletedCount.current =
        newCount;

      setCompletedParticipants(
        newCount
      );
    }

    /* --------------------------------
       スタンプ進捗取得
    -------------------------------- */

    async function loadStampProgress() {
      const participantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      if (
        !participantId
      ) {
        const localProgress =
          Number(
            localStorage.getItem(
              "pokipo_progress"
            ) ?? "0"
          );

        setProgress(
          Math.min(
            Math.max(
              localProgress,
              0
            ),
            5
          )
        );

        return;
      }

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
          "スタンプ進捗取得エラー:",
          error
        );

        const localProgress =
          Number(
            localStorage.getItem(
              "pokipo_progress"
            ) ?? "0"
          );

        setProgress(
          Math.min(
            Math.max(
              localProgress,
              0
            ),
            5
          )
        );

        return;
      }

      const stampCount =
        Math.min(
          Array.isArray(
            data
          )
            ? data.length
            : 0,
          5
        );

      setProgress(
        stampCount
      );

      localStorage.setItem(
        "pokipo_progress",
        String(
          stampCount
        )
      );

      if (
        stampCount >= 5
      ) {
        localStorage.setItem(
          "pokipo_completed",
          "true"
        );
      } else {
        localStorage.setItem(
          "pokipo_completed",
          "false"
        );
      }

      const serverScans =
        (
          data ?? []
        ).map(
          (
            item: {
              spot_id: string;
            }
          ) =>
            item.spot_id
        );

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(
          serverScans
        )
      );
    }

    /* --------------------------------
       LiPost お知らせ取得
    -------------------------------- */

    async function loadAnnouncements() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "lipost_announcements"
          )
          .select(
            "id, title, body, published_at"
          )
          .eq(
            "is_published",
            true
          )
          .order(
            "published_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            3
          );

      if (
        error
      ) {
        console.error(
          "お知らせ取得エラー:",
          error
        );

        return;
      }

      setAnnouncements(
        (
          data ?? []
        ) as Announcement[]
      );
    }

    /* --------------------------------
       PROMOTION BANNER取得
    -------------------------------- */

    async function loadBannerPromotion() {
      setBannerLoading(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .select(
              "id, title, body, image_url, updated_at"
            )
            .eq(
              "placement",
              "banner"
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "トップバナー取得エラー:",
            error
          );

          setBannerPromotion(
            null
          );

          return;
        }

        if (
          !data
        ) {
          setBannerPromotion(
            null
          );

          return;
        }

        setBannerPromotion(
          data as BannerPromotion
        );
      } catch (
        error
      ) {
        console.error(
          "トップバナー通信エラー:",
          error
        );

        setBannerPromotion(
          null
        );
      } finally {
        setBannerLoading(
          false
        );
      }
    }

    /* ========================================
       INITIAL LOAD
    ======================================== */

    loadLocalData();

    void loadParticipantCount();

    void loadCompletedParticipantCount();

    void loadStampProgress();

    void loadAnnouncements();

    void loadBannerPromotion();

    /* ========================================
       PARTICIPANTS REALTIME
    ======================================== */

    const participantChannel =
      supabase
        .channel(
          "participants-live-count"
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
            void loadParticipantCount();
          }
        )
        .subscribe();

    /* ========================================
       GLOBAL STAMP REALTIME
    ======================================== */

    const completedChannel =
      supabase
        .channel(
          "completed-participants-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "participant_stamps",
          },
          () => {
            void loadCompletedParticipantCount();
          }
        )
        .subscribe();

    /* ========================================
       STAMP REALTIME
    ======================================== */

    const currentParticipantId =
      localStorage.getItem(
        "pokipo_participant_id"
      ) ??
      localStorage.getItem(
        "pokipo_user_id"
      );

    let stampChannel:
      ReturnType<
        typeof supabase.channel
      > | null =
      null;

    if (
      currentParticipantId
    ) {
      stampChannel =
        supabase
          .channel(
            `participant-stamps-${currentParticipantId}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "INSERT",

              schema:
                "public",

              table:
                "participant_stamps",

              filter:
                `participant_id=eq.${currentParticipantId}`,
            },
            () => {
              void loadStampProgress();

              void loadCompletedParticipantCount();
            }
          )
          .subscribe();
    }

    /* ========================================
       ANNOUNCEMENT REALTIME
    ======================================== */

    const announcementChannel =
      supabase
        .channel(
          "lipost-announcements-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "lipost_announcements",
          },
          () => {
            void loadAnnouncements();
          }
        )
        .subscribe();

    /* ========================================
       PROMOTION REALTIME
    ======================================== */

    const promotionChannel =
      supabase
        .channel(
          "pokipo-promotions-banner-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "pokipo_promotions",
          },
          () => {
            void loadBannerPromotion();
          }
        )
        .subscribe();

    /* ========================================
       WINDOW FOCUS
    ======================================== */

    function handleFocus() {
      loadLocalData();

      void loadParticipantCount();

      void loadCompletedParticipantCount();

      void loadStampProgress();

      void loadAnnouncements();

      void loadBannerPromotion();
    }

    /* ========================================
       TAB VISIBILITY
    ======================================== */

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadLocalData();

        void loadParticipantCount();

        void loadCompletedParticipantCount();

        void loadStampProgress();

        void loadAnnouncements();

        void loadBannerPromotion();
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

    /* ========================================
       CLEANUP
    ======================================== */

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      supabase.removeChannel(
        participantChannel
      );

      supabase.removeChannel(
        completedChannel
      );

      if (
        stampChannel
      ) {
        supabase.removeChannel(
          stampChannel
        );
      }

      supabase.removeChannel(
        announcementChannel
      );

      supabase.removeChannel(
        promotionChannel
      );
    };
  }, [
    router,
  ]);

  /* ========================================
     STATUS
  ======================================== */

  const completed =
    progress >= 5;

  const remaining =
    Math.max(
      0,
      5 - progress
    );

  const progressPercent =
    Math.min(
      Math.max(
        progress,
        0
      ),
      5
    ) * 20;

  const progressPockyImage =
    progressPercent > 0
      ? `/images/pocky/pocky-${progressPercent}.png`
      : "";

  /* ========================================
     PROCESS NAME
  ======================================== */

  function getProcessName() {
    switch (
      progress
    ) {
      case 0:
        return "POKIPOをはじめよう！";

      case 1:
        return "1つ目のスタンプを獲得！";

      case 2:
        return "2つ目のスタンプを獲得！";

      case 3:
        return "3つ目のスタンプを獲得！";

      case 4:
        return "あと1つでコンプリート！";

      default:
        return "5つのスタンプをコンプリート！";
    }
  }

  /* ========================================
     雄飛祭スキン名
  ======================================== */

  function getSkinName() {
    switch (
      yuhisaiPockySkin
    ) {
      case "strawberry":
        return "いちご";

      case "matcha":
        return "抹茶";

      case "white":
        return "ホワイト";

      default:
        return "チョコ";
    }
  }

  /* ========================================
     ANNOUNCEMENT DATE
  ======================================== */

  function formatAnnouncementDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleDateString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        month:
          "numeric",

        day:
          "numeric",
      }
    );
  }

  /* ========================================
     TUTORIAL COMPLETE
  ======================================== */

  function completeTutorial() {
    localStorage.setItem(
      "pokipo_tutorial_completed",
      "true"
    );

    setShowTutorial(
      false
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <MaintenanceGate page="home">

      <main
        className={
          yuhisaiMode
            ? "shell yuhisaiMode"
            : "shell"
        }
        style={
          yuhisaiMode
            ? {
                minHeight:
                  "100vh",

                background:
                  "linear-gradient(180deg, #63bdf5 0%, #9bd7fa 36%, #dff3ff 70%, #fff1d7 100%)",
              }
            : undefined
        }
      >

        <section className="visualHomePage">

          {/* ==================================
              HEADER
          ================================== */}

          <header className="visualHomeHeader">

            <div>

              <p className="visualHomeMini">
                高安ゼミ LiPost × POCKY
              </p>

              <h1 className="visualHomeLogo">
                POKIPO
              </h1>

            </div>

            <div className="visualHomeUserName">

              {nickname
                ? `${nickname}さん`
                : "ゲストさん"}

            </div>

          </header>

          {/* ==================================
              PROMOTION BANNER
          ================================== */}

          {!bannerLoading &&
            bannerPromotion && (
            <section className="homePromotionBanner">

              {bannerPromotion.image_url && (
                <div className="homePromotionBannerImage">

                  <img
                    src={
                      bannerPromotion.image_url
                    }
                    alt=""
                  />

                </div>
              )}

              <div className="homePromotionBannerContent">

                <span>
                  LiPost EVENT
                </span>

                <h2>
                  {bannerPromotion.title}
                </h2>

                {bannerPromotion.body && (
                  <p>
                    {bannerPromotion.body}
                  </p>
                )}

              </div>

            </section>
          )}

          {/* ==================================
              雄飛祭バナー
          ================================== */}

          {yuhisaiMode && (
            <section className="yuhisaiFestivalBanner">

              <span>
                SECRET MODE UNLOCKED
              </span>

              <h2>
                🎆 雄飛祭モード！ 🎆
              </h2>

              <p>
                シークレットスタンプ
                「雄飛祭 LiPostブース」を獲得！
                POKIPOが雄飛祭仕様に変化しました。
              </p>

              <div className="yuhisaiFestivalCurrentSkin">

                <span>
                  CURRENT STYLE
                </span>

                <strong>
                  {getSkinName()}
                  POKIPO
                </strong>

              </div>

              <button
                type="button"
                className="yuhisaiCustomizeButton"
                onClick={() =>
                  router.push(
                    "/yuhisai"
                  )
                }
              >
                ポッキーを着せ替える →
              </button>

            </section>
          )}

          {/* ==================================
              POCKY HERO
          ================================== */}

          <section
            className={
              `visualPockyHero visualStage-${progress}`
            }
          >

            <div className="visualHeroDecoration visualDecoOne" />

            <div className="visualHeroDecoration visualDecoTwo" />

            {yuhisaiMode && (
              <>

                <span className="yuhisaiHeroDeco yuhisaiHeroDeco1">
                  🏮
                </span>

                <span className="yuhisaiHeroDeco yuhisaiHeroDeco2">
                  ✦
                </span>

                <span className="yuhisaiHeroDeco yuhisaiHeroDeco3">
                  🎪
                </span>

              </>
            )}

            <div className="visualStepBadge">

              {yuhisaiMode
                ? "YUHISAI MODE"
                : `STEP ${progress}`}

            </div>

            <div className="visualPockyScene approvedPockyScene">

              <span className="visualSpark visualSpark1">
                ✦
              </span>

              <span className="visualSpark visualSpark2">
                ✦
              </span>

              <span className="visualSpark visualSpark3">
                ✦
              </span>

              {yuhisaiMode ? (
                <div
                  className={
                    `visualPocky yuhisaiPockySkin skin-${yuhisaiPockySkin}`
                  }
                >

                  <div className="visualPockyCoating" />

                  <div className="visualPockyBiscuit" />

                </div>
              ) : progressPercent > 0 ? (
                <img
                  key={
                    progressPercent
                  }
                  src={
                    progressPockyImage
                  }
                  alt={
                    `ポッキー進捗 ${progressPercent}%`
                  }
                  className="approvedPockyProgressImage"
                  draggable={
                    false
                  }
                />
              ) : (
                <div className="approvedPockyZeroState">

                  <span>
                    まだスタンプはありません
                  </span>

                </div>
              )}

            </div>

            {/* ==================================
                PROGRESS BAR
            ================================== */}

            <div className="approvedPockyProgressPanel">

              <div className="approvedPockyProgressTop">

                <span>
                  POCKY PROGRESS
                </span>

                <strong>
                  {progressPercent}%
                </strong>

              </div>

              <div
                className="approvedPockyProgressBar"
                role="progressbar"
                aria-label="POKIPO進捗"
                aria-valuemin={
                  0
                }
                aria-valuemax={
                  100
                }
                aria-valuenow={
                  progressPercent
                }
              >

                <div
                  className="approvedPockyProgressBarFill"
                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>

              <div className="approvedPockyProgressBottom">

                <span>
                  {progress} / 5 STEP
                </span>

                <span>

                  {completed
                    ? "COMPLETE"
                    : `あと${remaining}つ`}

                </span>

              </div>

            </div>

            <div className="visualHeroBottom">

              <strong>

                {yuhisaiMode
                  ? "SECRET GET!"
                  : completed
                  ? "COMPLETE!"
                  : `${progress} / 5`}

              </strong>

              <span>

                {yuhisaiMode
                  ? `${getSkinName()} POKIPO`
                  : completed
                  ? "POCKY COMPLETE"
                  : "POCKY PROGRESS"}

              </span>

            </div>

          </section>

          {/* ==================================
              PROCESS
          ================================== */}

          <div className="visualProcessLabel">

            <span>

              {yuhisaiMode
                ? `${getSkinName()}POKIPOで雄飛祭を楽しもう！`
                : getProcessName()}

            </span>

          </div>

          {/* ==================================
              STAMPS
          ================================== */}

          <section className="visualStampSection">

            <div className="visualStampHeader">

              <span>
                STAMPS
              </span>

              <strong>
                {progress}/5
              </strong>

            </div>

            <div className="visualStampTrack">

              {[1, 2, 3, 4, 5].map(
                (
                  number
                ) => {
                  const active =
                    number <=
                    progress;

                  return (
                    <div
                      key={
                        number
                      }
                      className={
                        active
                          ? "visualStamp active"
                          : "visualStamp"
                      }
                    >

                      {active
                        ? "✓"
                        : number}

                    </div>
                  );
                }
              )}

            </div>

            {yuhisaiMode && (
              <div className="homeSecretStamp">

                <div className="homeSecretStampCircle">
                  6
                </div>

                <div>

                  <span>
                    SECRET STAMP GET!
                  </span>

                  <strong>
                    雄飛祭 LiPostブース
                  </strong>

                </div>

              </div>
            )}

          </section>

          {/* ==================================
              COMPLETE REWARD
          ================================== */}

          {completed && (
            <button
              type="button"
              className="visualNextSpot complete"
              onClick={() =>
                router.push(
                  "/reward"
                )
              }
            >

              <div className="visualNextIcon">
                ★
              </div>

              <div className="visualNextText">

                <span>
                  COMPLETE
                </span>

                <strong>
                  特典をチェック
                </strong>

              </div>

              <div className="visualNextArrow">
                →
              </div>

            </button>
          )}

          {/* ==================================
              QR
          ================================== */}

          <button
            type="button"
            className="visualQrButton"
            onClick={() =>
              router.push(
                "/stamp"
              )
            }
          >

            <span className="visualQrIcon">
              QR
            </span>

            <strong>
              QRを読み取る
            </strong>

            <span>
              →
            </span>

          </button>

          {/* ==================================
              雄飛祭
          ================================== */}

          {yuhisaiMode && (
            <button
              type="button"
              className="yuhisaiHomeSpecialButton"
              onClick={() =>
                router.push(
                  "/yuhisai"
                )
              }
            >

              <div className="yuhisaiHomeSpecialIcon">
                🎆
              </div>

              <div>

                <span>
                  YUHISAI SPECIAL
                </span>

                <strong>
                  着せ替え＆限定フォト
                </strong>

                <p>
                  自分だけのPOKIPOで
                  雄飛祭限定フォトを作ろう
                </p>

              </div>

              <span className="yuhisaiHomeSpecialArrow">
                →
              </span>

            </button>
          )}

          {/* ==================================
              MENU
          ================================== */}

          <section className="visualMenuGrid">

            <button
              type="button"
              className="visualMenuCard"
              onClick={() =>
                router.push(
                  "/knowledge"
                )
              }
            >

              <div className="visualMenuIcon bookIcon">
                ?
              </div>

              <strong>
                豆知識
              </strong>

              <span>
                {progress}/5
              </span>

            </button>

            <button
              type="button"
              className="visualMenuCard"
              onClick={() =>
                router.push(
                  "/progress"
                )
              }
            >

              <div className="visualMenuIcon routeIcon">
                ✓
              </div>

              <strong>
                進捗
              </strong>

              <span>
                {progressPercent}%
              </span>

            </button>

            <button
              type="button"
              className={
                completed &&
                !rewardExchanged
                  ? "visualMenuCard rewardMenu unlocked"
                  : "visualMenuCard rewardMenu"
              }
              onClick={() =>
                router.push(
                  "/reward"
                )
              }
            >

              <div className="visualMenuIcon rewardMenuIcon">

                {rewardExchanged
                  ? "✓"
                  : completed
                  ? "★"
                  : "🎁"}

              </div>

              <strong>
                特典
              </strong>

              <span>

                {rewardExchanged
                  ? "交換済"
                  : completed
                  ? "交換OK"
                  : `あと${remaining}`}

              </span>

            </button>

          </section>

          {/* ==================================
              PARTICIPANTS
          ================================== */}

          <section className="participantStatsSection">

            <div className="participantStatsTitle">

              <div>

                <span className="participantStatsEnglish">
                  POKIPO LIVE
                </span>

                <h2>
                  みんなの参加状況
                </h2>

              </div>

              <div className="participantLiveBadge">

                <span className="participantLiveDot" />

                LIVE

              </div>

            </div>

            <div
              className={
                participantCountUpdating ||
                completedCountUpdating
                  ? "participantTotalCard participantLiveRefreshing"
                  : "participantTotalCard"
              }
            >

              <div className="participantLiveStat">

                <span className="participantTotalLabel">
                  現在の参加者
                </span>

                <div
                  className={
                    participantCountUpdating
                      ? "participantTotalNumber participantNumberUpdating"
                      : "participantTotalNumber"
                  }
                >

                  <strong>

                    {totalParticipants ===
                    null
                      ? "—"
                      : totalParticipants}

                  </strong>

                  <span>
                    人
                  </span>

                </div>

                <p>

                  {totalParticipants ===
                  null
                    ? "参加状況を読み込み中..."
                    : "POKIPOに参加している学生"}

                </p>

              </div>

              <div className="participantLiveDivider" />

              <div className="participantLiveStat complete">

                <span className="participantTotalLabel">
                  コンプリートした参加者
                </span>

                <div
                  className={
                    completedCountUpdating
                      ? "participantTotalNumber participantNumberUpdating"
                      : "participantTotalNumber"
                  }
                >

                  <strong>

                    {completedParticipants ===
                    null
                      ? "—"
                      : completedParticipants}

                  </strong>

                  <span>
                    人
                  </span>

                </div>

                <p>

                  {completedParticipants ===
                  null
                    ? "達成状況を読み込み中..."
                    : "POKIPOをコンプリート！"}

                </p>

              </div>

            </div>

          </section>

          {/* ==================================
              LiPost ANNOUNCEMENTS
          ================================== */}

          <section className="homeAnnouncementSection">

            <div className="homeAnnouncementHeader">

              <div>

                <span>
                  LiPost NEWS
                </span>

                <h2>
                  LiPostからのお知らせ
                </h2>

              </div>

              <div className="homeAnnouncementMark">
                i
              </div>

            </div>

            {announcements.length ===
            0 ? (
              <div className="homeAnnouncementEmpty">

                <p>
                  現在お知らせはありません。
                </p>

              </div>
            ) : (
              <div className="homeAnnouncementList">

                {announcements.map(
                  (
                    announcement
                  ) => (
                    <article
                      key={
                        announcement.id
                      }
                      className="homeAnnouncementCard"
                    >

                      <div className="homeAnnouncementDate">

                        {formatAnnouncementDate(
                          announcement.published_at
                        )}

                      </div>

                      <div className="homeAnnouncementContent">

                        <h3>
                          {announcement.title}
                        </h3>

                        <p>
                          {announcement.body}
                        </p>

                      </div>

                    </article>
                  )
                )}

              </div>
            )}

          </section>

          {/* ==================================
              FIRST TUTORIAL
          ================================== */}

          {showTutorial && (
            <div className="pokipoTutorialOverlay">

              <div className="pokipoTutorialCard">

                <div className="pokipoTutorialStep">
                  {tutorialStep} / 2
                </div>

                {tutorialStep ===
                1 ? (
                  <>

                    <span className="pokipoTutorialLabel">
                      HOW TO PLAY
                    </span>

                    <h2>
                      QRコードを読み取ろう
                    </h2>

                    <p>
                      学内のスポットにあるQRコードを見つけたら、
                      ホーム画面の
                      <strong>
                        「QRを読み取る」
                      </strong>
                      を押してください。
                    </p>

                    <p>
                      カメラを起動してQRコードを読み取ると、
                      クイズに挑戦できます。
                      正解するとスタンプと豆知識を獲得できます。
                    </p>

                    <div className="pokipoTutorialDemo">

                      <div className="pokipoTutorialQrIcon">
                        QR
                      </div>

                      <div>

                        <span>
                          STEP 1
                        </span>

                        <strong>
                          QRを読み取る
                        </strong>

                      </div>

                    </div>

                    <button
                      type="button"
                      className="pokipoTutorialNext"
                      onClick={() =>
                        setTutorialStep(
                          2
                        )
                      }
                    >
                      次へ

                      <strong>
                        →
                      </strong>
                    </button>

                  </>
                ) : (
                  <>

                    <span className="pokipoTutorialLabel">
                      REWARD
                    </span>

                    <h2>
                      特典を確認しよう
                    </h2>

                    <p>
                      ホーム画面の
                      <strong>
                        「特典」
                      </strong>
                      を押すと、
                      現在の特典交換状況を確認できます。
                    </p>

                    <p>
                      5つのスタンプをすべて集めたら、
                      参加後アンケートに回答し、
                      特典交換用QRが表示されます。
                    </p>

                    <div className="pokipoTutorialDemo reward">

                      <div className="pokipoTutorialRewardIcon">
                        ★
                      </div>

                      <div>

                        <span>
                          STEP 2
                        </span>

                        <strong>
                          特典をチェック
                        </strong>

                      </div>

                    </div>

                    <button
                      type="button"
                      className="pokipoTutorialNext"
                      onClick={
                        completeTutorial
                      }
                    >
                      POKIPOをはじめる

                      <strong>
                        →
                      </strong>
                    </button>

                  </>
                )}

                <button
                  type="button"
                  className="pokipoTutorialSkip"
                  onClick={
                    completeTutorial
                  }
                >
                  スキップ
                </button>

              </div>

            </div>
          )}

        </section>

      </main>

    </MaintenanceGate>
  );
}