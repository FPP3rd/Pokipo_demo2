"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

/* ========================================
   雄飛祭ポッキースキン
======================================== */

type PockySkin =
  | "chocolate"
  | "strawberry"
  | "matcha"
  | "white";

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
     参加状況
     現在はデモ
  ======================================== */

  const totalParticipants =
    128;

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    function loadHomeData() {
      const savedNickname =
        localStorage.getItem(
          "pokipo_nickname"
        );

      const savedProgress =
        Number(
          localStorage.getItem(
            "pokipo_progress"
          ) ?? "0"
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
        router.replace("/");
        return;
      }

      setNickname(
        savedNickname
      );

      setProgress(
        Math.min(
          Math.max(
            savedProgress,
            0
          ),
          5
        )
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

    loadHomeData();

    function handleFocus() {
      loadHomeData();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadHomeData();
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
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [router]);

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
            完成時だけ特典導線
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
            QR BUTTON
            通常のスタンプ導線はこれだけ
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
            雄飛祭限定コンテンツ
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
            合計参加者数だけ表示
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
                {totalParticipants}
              </strong>

              <span>
                人
              </span>

            </div>

            <p>
              POKIPOに参加している学生
            </p>

          </div>

        </section>

      </section>

    </main>
  );
}