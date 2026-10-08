
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabase-client";
import MaintenanceGate from "../../components/MaintenanceGate";
import PromotionGate from "../../components/PromotionGate";

/* ========================================
   TYPES
======================================== */

type PockySkin = "chocolate" | "strawberry" | "matcha" | "white";

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
};

type BannerPromotion = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  updated_at: string;
};

type StampRecord = {
  spot_id: string;
};

/* ========================================
   HELPERS
======================================== */

function getParticipantId(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("pokipo_participant_id") ??
    localStorage.getItem("pokipo_user_id")
  );
}

function getSavedProgress(): number {
  const value = Number(
    localStorage.getItem("pokipo_progress") ?? "0"
  );

  return Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 5)
    : 0;
}

function formatAnnouncementDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });
}

/* ========================================
   HOME PAGE
======================================== */

export default function HomePage() {
  const router = useRouter();

  /* BASIC */
  const [nickname, setNickname] = useState("");
  const [progress, setProgress] = useState(0);
  const [rewardExchanged, setRewardExchanged] = useState(false);

  /* PARTICIPANT COUNTS */
  const [totalParticipants, setTotalParticipants] =
    useState<number | null>(null);

  const [completedParticipants, setCompletedParticipants] =
    useState<number | null>(null);

  const [participantCountUpdating, setParticipantCountUpdating] =
    useState(false);

  const [completedCountUpdating, setCompletedCountUpdating] =
    useState(false);

  const previousParticipantCount = useRef<number | null>(null);
  const previousCompletedCount = useRef<number | null>(null);

  /* ANNOUNCEMENTS */
  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  /* PROMOTION */
  const [bannerPromotion, setBannerPromotion] =
    useState<BannerPromotion | null>(null);

  /* YUHISAI */
  const [yuhisaiMode, setYuhisaiMode] = useState(false);
  const [yuhisaiPockySkin, setYuhisaiPockySkin] =
    useState<PockySkin>("chocolate");

  /* TUTORIAL */
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  /* SUPPORT QR */
  const [showSupportQr, setShowSupportQr] = useState(false);
  const [supportQrImage, setSupportQrImage] = useState("");
  const [supportCode, setSupportCode] = useState("");
  const [supportQrError, setSupportQrError] = useState("");
  const [supportQrLoading, setSupportQrLoading] = useState(false);

  const supportTapRef = useRef({
    count: 0,
    lastTappedAt: 0,
  });

  const supportRequestRef = useRef(0);

  /* ========================================
     SUPPORT QR
  ======================================== */

  async function openSupportQr() {
    const requestId = ++supportRequestRef.current;

    setShowSupportQr(true);
    setSupportQrLoading(true);
    setSupportQrError("");
    setSupportQrImage("");
    setSupportCode("");

    const participantId = getParticipantId();

    if (!participantId) {
      setSupportQrError("参加者情報が見つかりません。");
      setSupportQrLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_or_create_pokipo_support_token",
        {
          p_participant_id: participantId,
        }
      );

      if (error) throw error;

      if (typeof data !== "string" || !data) {
        throw new Error("問い合わせトークンを取得できませんでした。");
      }

      const image = await QRCode.toDataURL(
        `POKIPO_SUPPORT:${data}`,
        {
          errorCorrectionLevel: "H",
          width: 512,
          margin: 3,
          color: {
            dark: "#171717",
            light: "#ffffff",
          },
        }
      );

      if (requestId !== supportRequestRef.current) return;

      setSupportCode(data);
      setSupportQrImage(image);
    } catch (error) {
      console.error("問い合わせQR取得エラー:", error);

      if (requestId === supportRequestRef.current) {
        setSupportQrError(
          "QRコードを表示できませんでした。再試行してください。"
        );
      }
    } finally {
      if (requestId === supportRequestRef.current) {
        setSupportQrLoading(false);
      }
    }
  }

  function closeSupportQr() {
    supportRequestRef.current += 1;
    setShowSupportQr(false);
  }

  function handleSupportNameTap() {
    const now = Date.now();
    const previous = supportTapRef.current;

    const count =
      now - previous.lastTappedAt <= 2500
        ? previous.count + 1
        : 1;

    supportTapRef.current = {
      count,
      lastTappedAt: now,
    };

    if (count >= 5) {
      supportTapRef.current = {
        count: 0,
        lastTappedAt: 0,
      };

      void openSupportQr();
    }
  }

  /* ========================================
     DATA LOADING
  ======================================== */

  useEffect(() => {
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function loadLocalData() {
      const savedNickname = localStorage.getItem("pokipo_nickname");

      const savedReward =
        localStorage.getItem("pokipo_reward_exchanged") === "true";

      const savedYuhisai =
        localStorage.getItem("pokipo_secret_yuhisai") === "true";

      const savedSkin =
        localStorage.getItem("pokipo_yuhisai_pocky_skin") ??
        "chocolate";

      if (!savedNickname) {
        router.replace("/");
        return;
      }

      setNickname(savedNickname);
      setRewardExchanged(savedReward);
      setYuhisaiMode(savedYuhisai);

      if (
        savedSkin === "chocolate" ||
        savedSkin === "strawberry" ||
        savedSkin === "matcha" ||
        savedSkin === "white"
      ) {
        setYuhisaiPockySkin(savedSkin);
      } else {
        setYuhisaiPockySkin("chocolate");
      }

      const tutorialCompleted =
        localStorage.getItem("pokipo_tutorial_completed") === "true";

      if (!tutorialCompleted) {
        setShowTutorial(true);
        setTutorialStep(1);
      }
    }

    async function loadParticipantCount() {
      const { data, error } = await supabase.rpc(
        "get_participant_count"
      );

      if (!mounted) return;

      if (error) {
        console.error("参加者数取得エラー:", error);
        return;
      }

      const count = Number(data ?? 0);

      if (
        previousParticipantCount.current !== null &&
        previousParticipantCount.current !== count
      ) {
        setParticipantCountUpdating(true);

        const timer = setTimeout(() => {
          if (mounted) setParticipantCountUpdating(false);
        }, 650);

        timers.push(timer);
      }

      previousParticipantCount.current = count;
      setTotalParticipants(count);
    }

    async function loadCompletedParticipantCount() {
      const { data, error } = await supabase.rpc(
        "get_completed_participant_count"
      );

      if (!mounted) return;

      if (error) {
        console.error("達成者数取得エラー:", error);
        return;
      }

      const count = Number(data ?? 0);

      if (
        previousCompletedCount.current !== null &&
        previousCompletedCount.current !== count
      ) {
        setCompletedCountUpdating(true);

        const timer = setTimeout(() => {
          if (mounted) setCompletedCountUpdating(false);
        }, 650);

        timers.push(timer);
      }

      previousCompletedCount.current = count;
      setCompletedParticipants(count);
    }

    async function loadStampProgress() {
      const participantId = getParticipantId();

      if (!participantId) {
        if (mounted) setProgress(getSavedProgress());
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_pokipo_stamps",
        {
          p_participant_id: participantId,
        }
      );

      if (!mounted) return;

      if (error) {
        console.error("スタンプ進捗取得エラー:", error);
        setProgress(getSavedProgress());
        return;
      }

      const stamps: StampRecord[] = Array.isArray(data)
        ? (data as StampRecord[])
        : [];

      const stampCount = Math.min(
        new Set(stamps.map((stamp) => stamp.spot_id)).size,
        5
      );

      setProgress(stampCount);

      localStorage.setItem("pokipo_progress", String(stampCount));
      localStorage.setItem(
        "pokipo_completed",
        stampCount >= 5 ? "true" : "false"
      );

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(stamps.map((stamp) => stamp.spot_id))
      );
    }

    async function loadAnnouncements() {
      const { data, error } = await supabase
        .from("lipost_announcements")
        .select("id, title, body, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      if (!mounted) return;

      if (error) {
        console.error("お知らせ取得エラー:", error);
        return;
      }

      setAnnouncements((data ?? []) as Announcement[]);
    }

    async function loadBannerPromotion() {
      try {
        const { data, error } = await supabase
          .from("pokipo_promotions")
          .select("id, title, body, image_url, updated_at")
          .eq("placement", "banner")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("バナー取得エラー:", error);
          setBannerPromotion(null);
          return;
        }

        setBannerPromotion(
          data ? (data as BannerPromotion) : null
        );
      } catch (error) {
        if (!mounted) return;

        console.error("バナー通信エラー:", error);
        setBannerPromotion(null);
      }
    }

    function refreshAll() {
      loadLocalData();
      void loadParticipantCount();
      void loadCompletedParticipantCount();
      void loadStampProgress();
      void loadAnnouncements();
      void loadBannerPromotion();
    }

    refreshAll();

    /* REALTIME: PARTICIPANTS */
    const participantChannel = supabase
      .channel("participants-live-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
        },
        () => {
          void loadParticipantCount();
        }
      )
      .subscribe();

    /* REALTIME: COMPLETED */
    const completedChannel = supabase
      .channel("completed-participants-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participant_stamps",
        },
        () => {
          void loadCompletedParticipantCount();
        }
      )
      .subscribe();

    /* REALTIME: OWN STAMPS */
    const participantId = getParticipantId();

    let stampChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    if (participantId) {
      stampChannel = supabase
        .channel(`participant-stamps-${participantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "participant_stamps",
            filter: `participant_id=eq.${participantId}`,
          },
          () => {
            void loadStampProgress();
            void loadCompletedParticipantCount();
          }
        )
        .subscribe();
    }

    /* REALTIME: ANNOUNCEMENTS */
    const announcementChannel = supabase
      .channel("lipost-announcements-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lipost_announcements",
        },
        () => {
          void loadAnnouncements();
        }
      )
      .subscribe();

    /* REALTIME: PROMOTIONS */
    const promotionChannel = supabase
      .channel("pokipo-promotions-banner-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pokipo_promotions",
        },
        () => {
          void loadBannerPromotion();
        }
      )
      .subscribe();

    function handleFocus() {
      refreshAll();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      mounted = false;

      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      timers.forEach(clearTimeout);

      void supabase.removeChannel(participantChannel);
      void supabase.removeChannel(completedChannel);

      if (stampChannel) {
        void supabase.removeChannel(stampChannel);
      }

      void supabase.removeChannel(announcementChannel);
      void supabase.removeChannel(promotionChannel);
    };
  }, [router]);

  /* ========================================
     STATUS
  ======================================== */

  const completed = progress >= 5;
  const remaining = Math.max(0, 5 - progress);
  const progressPercent = Math.min(Math.max(progress, 0), 5) * 20;

  const progressPockyImage =
    progressPercent > 0
      ? `/images/pocky/pocky-${progressPercent}.png`
      : "";

  function getProcessName() {
    switch (progress) {
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

  function getSkinName() {
    switch (yuhisaiPockySkin) {
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

  function completeTutorial() {
    localStorage.setItem("pokipo_tutorial_completed", "true");
    setShowTutorial(false);
  }

  /* ========================================
     RENDER
  ======================================== */

  return (
    <MaintenanceGate page="home">
      <PromotionGate>
        <main
          className={yuhisaiMode ? "shell yuhisaiMode" : "shell"}
          style={
            yuhisaiMode
              ? {
                  minHeight: "100vh",
                  background:
                    "linear-gradient(180deg, #63bdf5 0%, #9bd7fa 36%, #dff3ff 70%, #fff1d7 100%)",
                }
              : undefined
          }
        >
          <section className="visualHomePage">

            {/* HEADER */}
            <header className="visualHomeHeader">
              <div>
                <p className="visualHomeMini">
                  高安ゼミ LiPost × POCKY
                </p>
                <h1 className="visualHomeLogo">POKIPO</h1>
              </div>

              <button
                type="button"
                className="visualHomeUserName pokipoSupportNameTrigger"
                onClick={handleSupportNameTap}
                aria-label="参加者名"
              >
                {nickname ? `${nickname}さん` : "ゲストさん"}
              </button>
            </header>

            {/* PROMOTION BANNER */}
            {bannerPromotion && (
              <section className="homePromotionBanner">
                {bannerPromotion.image_url && (
                  <div className="homePromotionBannerImage">
                    <img
                      src={bannerPromotion.image_url}
                      alt=""
                    />
                  </div>
                )}

                <div className="homePromotionBannerContent">
                  <span>LiPost information</span>
                  <h2>{bannerPromotion.title}</h2>

                  {bannerPromotion.body && (
                    <p>{bannerPromotion.body}</p>
                  )}
                </div>
              </section>
            )}

            {/* YUHISAI BANNER */}
            {yuhisaiMode && (
              <section className="yuhisaiFestivalBanner">
                <span>SECRET MODE UNLOCKED</span>

                <h2>🎆 雄飛祭モード！ 🎆</h2>

                <p>
                  シークレットスタンプ
                  「雄飛祭 LiPostブース」を獲得！
                  POKIPOが雄飛祭仕様に変化しました。
                </p>

                <div className="yuhisaiFestivalCurrentSkin">
                  <span>CURRENT STYLE</span>
                  <strong>{getSkinName()}POKIPO</strong>
                </div>

                <button
                  type="button"
                  className="yuhisaiCustomizeButton"
                  onClick={() => router.push("/yuhisai")}
                >
                  ポッキーを着せ替える →
                </button>
              </section>
            )}

            {/* POCKY HERO */}
            <section
              className={`visualPockyHero visualStage-${progress}`}
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
                <span className="visualSpark visualSpark1">✦</span>
                <span className="visualSpark visualSpark2">✦</span>
                <span className="visualSpark visualSpark3">✦</span>

                {yuhisaiMode ? (
                  <div
                    className={`visualPocky yuhisaiPockySkin skin-${yuhisaiPockySkin}`}
                  >
                    <div className="visualPockyCoating" />
                    <div className="visualPockyBiscuit" />
                  </div>
                ) : progressPercent > 0 ? (
                  <img
                    key={progressPercent}
                    src={progressPockyImage}
                    alt={`ポッキー進捗 ${progressPercent}%`}
                    className="approvedPockyProgressImage"
                    draggable={false}
                  />
                ) : (
                  <div className="approvedPockyZeroState">
                    <span>まだスタンプはありません</span>
                  </div>
                )}
              </div>

              {/* PROGRESS BAR */}
              <div className="approvedPockyProgressPanel">
                <div className="approvedPockyProgressTop">
                  <span>POCKY PROGRESS</span>
                  <strong>{progressPercent}%</strong>
                </div>

                <div
                  className="approvedPockyProgressBar"
                  role="progressbar"
                  aria-label="POKIPO進捗"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                >
                  <div
                    className="approvedPockyProgressBarFill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="approvedPockyProgressBottom">
                  <span>{progress} / 5 STEP</span>
                  <span>
                    {completed ? "COMPLETE" : `あと${remaining}つ`}
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

            {/* PROCESS */}
            <div className="visualProcessLabel">
              <span>
                {yuhisaiMode
                  ? `${getSkinName()}POKIPOで雄飛祭を楽しもう！`
                  : getProcessName()}
              </span>
            </div>

            {/* STAMPS */}
            <section className="visualStampSection">
              <div className="visualStampHeader">
                <span>STAMPS</span>
                <strong>{progress}/5</strong>
              </div>

              <div className="visualStampTrack">
                {[1, 2, 3, 4, 5].map((number) => {
                  const active = number <= progress;

                  return (
                    <div
                      key={number}
                      className={
                        active ? "visualStamp active" : "visualStamp"
                      }
                    >
                      {active ? "✓" : number}
                    </div>
                  );
                })}
              </div>

              {yuhisaiMode && (
                <div className="homeSecretStamp">
                  <div className="homeSecretStampCircle">6</div>

                  <div>
                    <span>SECRET STAMP GET!</span>
                    <strong>雄飛祭 LiPostブース</strong>
                  </div>
                </div>
              )}
            </section>

            {/* COMPLETE REWARD */}
            {completed && (
              <button
                type="button"
                className="visualNextSpot complete"
                onClick={() => router.push("/reward")}
              >
                <div className="visualNextIcon">★</div>

                <div className="visualNextText">
                  <span>COMPLETE</span>
                  <strong>特典をチェック</strong>
                </div>

                <div className="visualNextArrow">→</div>
              </button>
            )}

            {/* SCAN QR */}
            <button
              type="button"
              className="visualQrButton"
              onClick={() => router.push("/stamp")}
            >
              <span className="visualQrIcon">QR</span>
              <strong>QRを読み取る</strong>
              <span>→</span>
            </button>

            {/* YUHISAI SPECIAL */}
            {yuhisaiMode && (
              <button
                type="button"
                className="yuhisaiHomeSpecialButton"
                onClick={() => router.push("/yuhisai")}
              >
                <div className="yuhisaiHomeSpecialIcon">🎆</div>

                <div>
                  <span>YUHISAI SPECIAL</span>
                  <strong>着せ替え＆限定フォト</strong>
                  <p>
                    自分だけのPOKIPOで
                    雄飛祭限定フォトを作ろう
                  </p>
                </div>

                <span className="yuhisaiHomeSpecialArrow">→</span>
              </button>
            )}

            {/* MAIN MENU */}
            <section className="visualMenuGrid">
              <button
                type="button"
                className="visualMenuCard"
                onClick={() => router.push("/knowledge")}
              >
                <div className="visualMenuIcon bookIcon">?</div>
                <strong>豆知識</strong>
                <span>{progress}/5</span>
              </button>

              <button
                type="button"
                className="visualMenuCard"
                onClick={() => router.push("/progress")}
              >
                <div className="visualMenuIcon routeIcon">✓</div>
                <strong>進捗</strong>
                <span>{progressPercent}%</span>
              </button>

              <button
                type="button"
                className={
                  completed && !rewardExchanged
                    ? "visualMenuCard rewardMenu unlocked"
                    : "visualMenuCard rewardMenu"
                }
                onClick={() => router.push("/reward")}
              >
                <div className="visualMenuIcon rewardMenuIcon">
                  {rewardExchanged
                    ? "✓"
                    : completed
                    ? "★"
                    : "🎁"}
                </div>

                <strong>特典</strong>

                <span>
                  {rewardExchanged
                    ? "交換済"
                    : completed
                    ? "交換OK"
                    : `あと${remaining}`}
                </span>
              </button>
            </section>

            {/* LIVE PARTICIPANTS */}
            <section className="participantStatsSection">
              <div className="participantStatsTitle">
                <div>
                  <span className="participantStatsEnglish">
                    POKIPO LIVE
                  </span>
                  <h2>みんなの参加状況</h2>
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
                      {totalParticipants === null
                        ? "—"
                        : totalParticipants}
                    </strong>
                    <span>人</span>
                  </div>

                  <p>
                    {totalParticipants === null
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
                      {completedParticipants === null
                        ? "—"
                        : completedParticipants}
                    </strong>
                    <span>人</span>
                  </div>

                  <p>
                    {completedParticipants === null
                      ? "達成状況を読み込み中..."
                      : "POKIPOをコンプリート！"}
                  </p>
                </div>
              </div>
            </section>

            {/* LIPOST ANNOUNCEMENTS */}
            <section className="homeAnnouncementSection">
              <div className="homeAnnouncementHeader">
                <div>
                  <span>LiPost NEWS</span>
                  <h2>LiPostからのお知らせ</h2>
                </div>

                <div className="homeAnnouncementMark">i</div>
              </div>

              {announcements.length === 0 ? (
                <div className="homeAnnouncementEmpty">
                  <p>現在お知らせはありません。</p>
                </div>
              ) : (
                <div className="homeAnnouncementList">
                  {announcements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="homeAnnouncementCard"
                    >
                      <div className="homeAnnouncementDate">
                        {formatAnnouncementDate(
                          announcement.published_at
                        )}
                      </div>

                      <div className="homeAnnouncementContent">
                        <h3>{announcement.title}</h3>
                        <p>{announcement.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* SUPPORT QR MODAL */}
            {showSupportQr && (
              <div
                className="pokipoSupportOverlay"
                onClick={closeSupportQr}
              >
                <section
                  className="pokipoSupportModal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pokipo-support-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="pokipoSupportModalHeader">
                    <span>POKIPO SUPPORT</span>

                    <button
                      type="button"
                      onClick={closeSupportQr}
                      aria-label="閉じる"
                    >
                      ×
                    </button>
                  </div>

                  <h2 id="pokipo-support-title">
                    お問い合わせ用QR
                  </h2>

                  <p>
                    この画面のスクリーンショットを、
                    お知らせ欄で案内しているGoogleフォームから
                    送信してください。
                  </p>

                  {supportQrLoading ? (
                    <div className="pokipoSupportLoading">
                      QRを準備中...
                    </div>
                  ) : supportQrError ? (
                    <div className="pokipoSupportError">
                      <p>{supportQrError}</p>

                      <button
                        type="button"
                        onClick={() => void openSupportQr()}
                      >
                        再試行
                      </button>
                    </div>
                  ) : supportQrImage ? (
                    <>
                      <div className="pokipoSupportQrFrame">
                        <img
                          src={supportQrImage}
                          alt="お問い合わせ専用QRコード"
                          draggable={false}
                        />
                      </div>

                      <div className="pokipoSupportIdentity">
                        <span>ニックネーム</span>
                        <strong>{nickname}さん</strong>
                      </div>

                      <div className="pokipoSupportIdentity">
                        <span>問い合わせ番号</span>
                        <code>{supportCode}</code>
                      </div>
                    </>
                  ) : null}

                  <p className="pokipoSupportCaution">
                    このQRコードは特典交換には使用できません。
                    第三者に公開せず、お問い合わせ時のみ提出してください。
                  </p>
                </section>
              </div>
            )}

            {/* FIRST TUTORIAL */}
            {showTutorial && (
              <div className="pokipoTutorialOverlay">
                <div className="pokipoTutorialCard">
                  <div className="pokipoTutorialStep">
                    {tutorialStep} / 2
                  </div>

                  {tutorialStep === 1 ? (
                    <>
                      <span className="pokipoTutorialLabel">
                        HOW TO PLAY
                      </span>

                      <h2>QRコードを読み取ろう</h2>

                      <p>
                        学内のスポットにあるQRコードを見つけたら、
                        ホーム画面の
                        <strong>「QRを読み取る」</strong>
                        を押してください。
                      </p>

                      <p>
                        カメラを起動してQRコードを読み取ると、
                        クイズに挑戦できます。
                        正解するとスタンプと豆知識を獲得できます。
                      </p>

                      <div className="pokipoTutorialDemo">
                        <div className="pokipoTutorialQrIcon">QR</div>

                        <div>
                          <span>STEP 1</span>
                          <strong>QRを読み取る</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="pokipoTutorialNext"
                        onClick={() => setTutorialStep(2)}
                      >
                        次へ
                        <strong>→</strong>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="pokipoTutorialLabel">
                        REWARD
                      </span>

                      <h2>特典を確認しよう</h2>

                      <p>
                        ホーム画面の
                        <strong>「特典」</strong>
                        を押すと、
                        現在の特典交換状況を確認できます。
                      </p>

                      <p>
                        5つのスタンプをすべて集めたら、
                        参加後アンケートに回答し、
                        特典交換用QRが表示されます。
                      </p>

                      <div className="pokipoTutorialDemo reward">
                        <div className="pokipoTutorialRewardIcon">★</div>

                        <div>
                          <span>STEP 2</span>
                          <strong>特典をチェック</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="pokipoTutorialNext"
                        onClick={completeTutorial}
                      >
                        POKIPOをはじめる
                        <strong>→</strong>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="pokipoTutorialSkip"
                    onClick={completeTutorial}
                  >
                    スキップ
                  </button>
                </div>
              </div>
            )}

          </section>
        </main>
      </PromotionGate>
    </MaintenanceGate>
  );
}
