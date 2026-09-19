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
} from "@/lib/supabase-client";

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
   HOME PAGE
======================================== */

export default function HomePage() {
  const router = useRouter();

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
    let active = true;

    /* --------------------------------
       端末側POKIPOデータ削除
    -------------------------------- */

    function clearParticipantData() {
      const keysToRemove = [
        "pokipo_participant_id",
        "pokipo_user_id",
        "pokipo_nickname",
        "pokipo_grade",
        "pokipo_department",

        "pokipo_scans",
        "pokipo_progress",
        "pokipo_knowledge",

        "pokipo_completed",
        "pokipo_completed_at",
        "pokipo_achievement_rank",

        "pokipo_reward_exchanged",
        "pokipo_reward_exchanged_at",
        "pokipo_reward_student_number",
        "pokipo_reward_token",

        "pokipo_pre_survey_completed",
        "pokipo_post_survey_completed",

        "pokipo_tutorial_completed",

        "pokipo_secret_yuhisai",
        "pokipo_yuhisai_pocky_skin",

        /* 動画イントロも初回状態へ */
        "pokipo_intro_seen",
      ];

      keysToRemove.forEach(
        (key) => {
          localStorage.removeItem(
            key
          );
        }
      );
    }

    /* --------------------------------
       PARTICIPANT VALIDATION

       participantsから削除されていたら
       完全初期化して動画からやり直す
    -------------------------------- */

    async function validateParticipant() {
      const participantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      /* IDがない = 未登録 */
      if (!participantId) {
        localStorage.removeItem(
          "pokipo_intro_seen"
        );

        router.replace("/");

        return false;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("participants")
          .select("id")
          .eq(
            "id",
            participantId
          )
          .maybeSingle();

      /* 通信エラーでは削除しない */
      if (error) {
        console.error(
          "参加者確認エラー:",
          error
        );

        return true;
      }

      /* DBに存在する */
      if (data) {
        return true;
      }

      /* DBから削除済み */
      clearParticipantData();

      router.replace("/");

      return false;
    }

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

      if (!savedNickname) {
        clearParticipantData();

        router.replace("/");

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

      /* FIRST TUTORIAL */

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

      if (error) {
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
            if (active) {
              setParticipantCountUpdating(
                false
              );
            }
          },
          650
        );
      }

      previousParticipantCount.current =
        newCount;

      if (active) {
        setTotalParticipants(
          newCount
        );
      }
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

      if (error) {
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
            if (active) {
              setCompletedCountUpdating(
                false
              );
            }
          },
          650
        );
      }

      previousCompletedCount.current =
        newCount;

      if (active) {
        setCompletedParticipants(
          newCount
        );
      }
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

      if (!participantId) {
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

      if (error) {
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

        if (active) {
          setProgress(
            Math.min(
              Math.max(
                localProgress,
                0
              ),
              5
            )
          );
        }

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

      if (active) {
        setProgress(
          stampCount
        );
      }

      localStorage.setItem(
        "pokipo_progress",
        String(
          stampCount
        )
      );

      localStorage.setItem(
        "pokipo_completed",
        stampCount >= 5
          ? "true"
          : "false"
      );

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

      if (error) {
        console.error(
          "お知らせ取得エラー:",
          error
        );

        return;
      }

      if (active) {
        setAnnouncements(
          (
            data ?? []
          ) as Announcement[]
        );
      }
    }

    /* ========================================
       INITIAL LOAD
    ======================================== */

    async function initialLoad() {
      const valid =
        await validateParticipant();

      if (
        !valid ||
        !active
      ) {
        return;
      }

      loadLocalData();

      await Promise.all([
        loadParticipantCount(),
        loadCompletedParticipantCount(),
        loadStampProgress(),
        loadAnnouncements(),
      ]);
    }

    void initialLoad();

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
            event: "*",
            schema: "public",
            table: "participants",
          },
          async () => {
            const valid =
              await validateParticipant();

            if (!valid) {
              return;
            }

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
            event: "*",
            schema: "public",
            table:
              "participant_stamps",
          },
          () => {
            void loadCompletedParticipantCount();
          }
        )
        .subscribe();

    /* ========================================
       自分のSTAMP REALTIME
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
              event: "*",
              schema: "public",
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
            event: "*",
            schema: "public",
            table:
              "lipost_announcements",
          },
          () => {
            void loadAnnouncements();
          }
        )
        .subscribe();

    /* ========================================
       FOCUS
    ======================================== */

    async function handleFocus() {
      const valid =
        await validateParticipant();

      if (
        !valid ||
        !active
      ) {
        return;
      }

      loadLocalData();

      void loadParticipantCount();

      void loadCompletedParticipantCount();

      void loadStampProgress();

      void loadAnnouncements();
    }

    /* ========================================
       VISIBILITY
    ======================================== */

    async function handleVisibility() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      const valid =
        await validateParticipant();

      if (
        !valid ||
        !active
      ) {
        return;
      }

      loadLocalData();

      void loadParticipantCount();

      void loadCompletedParticipantCount();

      void loadStampProgress();

      void loadAnnouncements();
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
      active = false;

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

  /* ========================================
     PROCESS NAME
  ======================================== */

  function getProcessName() {
    switch (progress) {
      case 0:
        return "これからポッキーづくりスタート";

      case 1:
        return "材料をそろえる";

      case 2:
        return "生地をつくる";

      case 3:
        return "プレッツェルを焼く";

      case 4:
        return "チョコレートをまとわせる";

      default:
        return "ポッキー完成！";
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

          <div className="visualPockyScene">

            <span className="visualSpark visualSpark1">
              ✦
            </span>

            <span className="visualSpark visualSpark2">
              ✦
            </span>

            <span className="visualSpark visualSpark3">
              ✦
            </span>

            <div
              className={
                yuhisaiMode
                  ? `visualPocky yuhisaiPockySkin skin-${yuhisaiPockySkin}`
                  : "visualPocky"
              }
            >

              <div className="visualPockyCoating" />

              <div className="visualPockyBiscuit" />

            </div>

            {completed && (
              <>
                <div
                  className={
                    yuhisaiMode
                      ? `visualPocky visualPockySecond yuhisaiPockySkin skin-${yuhisaiPockySkin}`
                      : "visualPocky visualPockySecond"
                  }
                >
                  <div className="visualPockyCoating" />
                  <div className="visualPockyBiscuit" />
                </div>

                <div
                  className={
                    yuhisaiMode
                      ? `visualPocky visualPockyThird yuhisaiPockySkin skin-${yuhisaiPockySkin}`
                      : "visualPocky visualPockyThird"
                  }
                >
                  <div className="visualPockyCoating" />
                  <div className="visualPockyBiscuit" />
                </div>
              </>
            )}

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
              (number) => {
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
              {progress * 20}%
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
                    特典交換用QRを発行できます。
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
  );
}