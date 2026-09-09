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
} from "../../lib/supabase-client";

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

      setTotalParticipants(
        Number(
          data ?? 0
        )
      );
    }

    /* --------------------------------
       スタンプ進捗取得
       Supabase優先
    -------------------------------- */

    async function loadStampProgress() {
      const participantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      /* =========================
         IDなし
         localStorage使用
      ========================= */

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

      /* =========================
         SUPABASE
      ========================= */

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

      /* =========================
         ERROR
         localStorageへ
      ========================= */

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

      /* =========================
         STAMP COUNT
      ========================= */

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

      /* =========================
         localStorage同期
      ========================= */

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

    /* ========================================
       INITIAL LOAD
    ======================================== */

    loadLocalData();

    void loadParticipantCount();

    void loadStampProgress();

    void loadAnnouncements();

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
       WINDOW FOCUS
    ======================================== */

    function handleFocus() {
      loadLocalData();

      void loadParticipantCount();

      void loadStampProgress();

      void loadAnnouncements();
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

        void loadStampProgress();

        void loadAnnouncements();
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
    switch (
      progress
    ) {
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

          <div className="visualHomeAvatar">

            {nickname
              ? nickname.slice(
                  0,
                  1
                )
              : "P"}

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

          {/* =================================
              POCKY
          ================================= */}

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

          {/* =================================
              HERO BOTTOM
          ================================= */}

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

          <div className="participantTotalCard">

            <span className="participantTotalLabel">
              現在の参加者
            </span>

            <div className="participantTotalNumber">

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

      </section>

    </main>
  );
}