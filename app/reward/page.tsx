"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";

/* ========================================
   DEMO
======================================== */

const DEMO_MODE = true;

/* ========================================
   KNOWLEDGE
======================================== */

const knowledgeItems = [
  {
    id: "knowledge1",
    number: 1,
    title:
      "10年ぶりの大改良！素材から見直した「究極の品質」",
  },
  {
    id: "knowledge2",
    number: 2,
    title:
      "「ショートニング不使用」への挑戦と安心",
  },
  {
    id: "knowledge3",
    number: 3,
    title:
      "心の距離をぐっと縮める「コミュニケーションツール」",
  },
  {
    id: "knowledge4",
    number: 4,
    title:
      "誰も取り残さない「シェアハピネス」の精神",
  },
  {
    id: "knowledge5",
    number: 5,
    title:
      "獨協生の誇り！5年連続日本一を支える「圧倒的な団結力」",
  },
];

export default function RewardPage() {
  const router = useRouter();

  const certificateRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /* ========================================
     USER
  ======================================== */

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    grade,
    setGrade,
  ] = useState("");

  const [
    department,
    setDepartment,
  ] = useState("");

  /* ========================================
     PROGRESS
  ======================================== */

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    rewardExchanged,
    setRewardExchanged,
  ] = useState(false);

  const [
    secretStamp,
    setSecretStamp,
  ] = useState(false);

  /* ========================================
     CERTIFICATE
  ======================================== */

  const [
    completedAt,
    setCompletedAt,
  ] = useState("");

  const [
    achievementRank,
    setAchievementRank,
  ] = useState(128);

  const [
    showNickname,
    setShowNickname,
  ] = useState(true);

  const [
    showGrade,
    setShowGrade,
  ] = useState(false);

  const [
    showDepartment,
    setShowDepartment,
  ] = useState(false);

  const [
    selectedKnowledgeId,
    setSelectedKnowledgeId,
  ] = useState(
    "knowledge1"
  );

  const [
    creatingImage,
    setCreatingImage,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    const savedNickname =
      localStorage.getItem(
        "pokipo_nickname"
      ) ?? "";

    const savedGrade =
      localStorage.getItem(
        "pokipo_grade"
      ) ?? "";

    const savedDepartment =
      localStorage.getItem(
        "pokipo_department"
      ) ?? "";

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

    const savedCompletedAt =
      localStorage.getItem(
        "pokipo_completed_at"
      ) ?? "";

    const savedRank =
      Number(
        localStorage.getItem(
          "pokipo_achievement_rank"
        ) ?? "128"
      );

    const savedSecret =
      localStorage.getItem(
        "pokipo_secret_yuhisai"
      ) === "true";

    const savedKnowledge =
      localStorage.getItem(
        "pokipo_certificate_knowledge"
      );

    setNickname(
      savedNickname
    );

    setGrade(
      savedGrade
    );

    setDepartment(
      savedDepartment
    );

    setProgress(
      savedProgress
    );

    setRewardExchanged(
      savedReward
    );

    setCompletedAt(
      savedCompletedAt
    );

    setAchievementRank(
      Number.isFinite(
        savedRank
      )
        ? savedRank
        : 128
    );

    setSecretStamp(
      savedSecret
    );

    if (
      savedKnowledge &&
      knowledgeItems.some(
        (item) =>
          item.id ===
          savedKnowledge
      )
    ) {
      setSelectedKnowledgeId(
        savedKnowledge
      );
    }
  }, []);

  /* ========================================
     STATUS
  ======================================== */

  const completed =
    progress >= 5;

  const selectedKnowledge =
    knowledgeItems.find(
      (item) =>
        item.id ===
        selectedKnowledgeId
    ) ?? knowledgeItems[0];

  /* ========================================
     PROFILE SELECT
  ======================================== */

  function toggleProfile(
    type:
      | "nickname"
      | "grade"
      | "department"
  ) {
    const nextNickname =
      type === "nickname"
        ? !showNickname
        : showNickname;

    const nextGrade =
      type === "grade"
        ? !showGrade
        : showGrade;

    const nextDepartment =
      type === "department"
        ? !showDepartment
        : showDepartment;

    if (
      !nextNickname &&
      !nextGrade &&
      !nextDepartment
    ) {
      setMessage(
        "達成証にはニックネーム・学年・学科から最低1つ選んでください。"
      );

      return;
    }

    setMessage("");

    setShowNickname(
      nextNickname
    );

    setShowGrade(
      nextGrade
    );

    setShowDepartment(
      nextDepartment
    );
  }

  /* ========================================
     KNOWLEDGE
  ======================================== */

  function selectKnowledge(
    id: string
  ) {
    setSelectedKnowledgeId(
      id
    );

    localStorage.setItem(
      "pokipo_certificate_knowledge",
      id
    );
  }

  /* ========================================
     REWARD COMPLETE
  ======================================== */

  function completeRewardExchange() {
    if (!completed) {
      setMessage(
        "5つのスタンプをすべて集めると交換できます。"
      );

      return;
    }

    const now =
      new Date();

    const formatted =
      `${now.getFullYear()}/` +
      `${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        now.getDate()
      ).padStart(2, "0")} ` +
      `${String(
        now.getHours()
      ).padStart(2, "0")}:` +
      `${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

    localStorage.setItem(
      "pokipo_reward_exchanged",
      "true"
    );

    localStorage.setItem(
      "pokipo_completed_at",
      formatted
    );

    localStorage.setItem(
      "pokipo_achievement_rank",
      String(
        achievementRank
      )
    );

    setRewardExchanged(
      true
    );

    setCompletedAt(
      formatted
    );

    setMessage(
      "景品交換が完了しました！"
    );
  }

  /* ========================================
     IMAGE
  ======================================== */

  async function createCertificateImage() {
    if (
      !certificateRef.current
    ) {
      return null;
    }

    try {
      setCreatingImage(true);

      return await toPng(
        certificateRef.current,
        {
          cacheBust:
            true,

          pixelRatio:
            2,

          backgroundColor:
            "#fff8eb",
        }
      );
    } catch (error) {
      console.error(
        "達成証生成エラー:",
        error
      );

      return null;
    } finally {
      setCreatingImage(false);
    }
  }

  async function downloadCertificate() {
    const dataUrl =
      await createCertificateImage();

    if (!dataUrl) {
      setMessage(
        "達成証画像を作成できませんでした。"
      );

      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.download =
      "POKIPO_certificate.png";

    link.href =
      dataUrl;

    link.click();
  }

  async function shareCertificate() {
    const dataUrl =
      await createCertificateImage();

    if (!dataUrl) {
      setMessage(
        "共有画像を作成できませんでした。"
      );

      return;
    }

    try {
      const response =
        await fetch(
          dataUrl
        );

      const blob =
        await response.blob();

      const file =
        new File(
          [blob],
          "POKIPO_certificate.png",
          {
            type:
              "image/png",
          }
        );

      if (
        navigator.share &&
        navigator.canShare?.({
          files: [
            file,
          ],
        })
      ) {
        await navigator.share({
          title:
            "POKIPO 達成証",

          text:
            "POKIPOスタンプラリーをコンプリートしました！",

          files: [
            file,
          ],
        });

        return;
      }

      setMessage(
        "この端末では直接共有できません。画像を保存してLINE・X・Instagramから投稿してください。"
      );
    } catch (error) {
      console.error(
        "共有エラー:",
        error
      );
    }
  }

  /* ========================================
     DEMO COMPLETE
  ======================================== */

  function demoCompleteReward() {
    const now =
      new Date();

    const formatted =
      `${now.getFullYear()}/` +
      `${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        now.getDate()
      ).padStart(2, "0")} ` +
      `${String(
        now.getHours()
      ).padStart(2, "0")}:` +
      `${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

    localStorage.setItem(
      "pokipo_progress",
      "5"
    );

    localStorage.setItem(
      "pokipo_reward_exchanged",
      "true"
    );

    localStorage.setItem(
      "pokipo_completed_at",
      formatted
    );

    localStorage.setItem(
      "pokipo_achievement_rank",
      "128"
    );

    setProgress(5);

    setRewardExchanged(
      true
    );

    setCompletedAt(
      formatted
    );

    setAchievementRank(
      128
    );

    setMessage(
      "デモ：景品交換完了状態にしました。"
    );
  }

  /* ========================================
     DEMO RESET REWARD
  ======================================== */

  function demoResetReward() {
    localStorage.removeItem(
      "pokipo_reward_exchanged"
    );

    localStorage.removeItem(
      "pokipo_completed_at"
    );

    localStorage.removeItem(
      "pokipo_achievement_rank"
    );

    setRewardExchanged(
      false
    );

    setCompletedAt("");

    setAchievementRank(
      128
    );

    setMessage(
      "デモ：景品交換状態をリセットしました。"
    );
  }

  /* ========================================
     DEMO RESET STAMPS
  ======================================== */

  function demoResetStamps() {
    localStorage.removeItem(
      "pokipo_scans"
    );

    localStorage.removeItem(
      "pokipo_knowledge"
    );

    localStorage.setItem(
      "pokipo_progress",
      "0"
    );

    setProgress(0);

    setMessage(
      "デモ：通常スタンプをリセットしました。"
    );
  }

  /* ========================================
     DEMO RESET SECRET
  ======================================== */

  function demoResetSecretStamp() {
    localStorage.removeItem(
      "pokipo_secret_yuhisai"
    );

    localStorage.removeItem(
      "pokipo_secret_yuhisai_at"
    );

    localStorage.removeItem(
      "pokipo_yuhisai_pocky_skin"
    );

    setSecretStamp(
      false
    );

    setMessage(
      "デモ：雄飛祭スタンプを削除しました。"
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="rewardPage">

        {/* ==================================
            HEADER
        ================================== */}

        <header className="rewardHeader">

          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push(
                "/home"
              )
            }
          >
            ←
          </button>

          <div>

            <p>
              COMPLETE REWARD
            </p>

            <h1>
              コンプリート特典
            </h1>

          </div>

        </header>

        {/* ==================================
            HERO
        ================================== */}

        <section
          className={
            completed
              ? "rewardHero complete"
              : "rewardHero"
          }
        >

          <span className="rewardHeroMini">
            POCKY COMPLETE
          </span>

          <div className="rewardHeroIcon">
            ★
          </div>

          <h2>

            {completed
              ? "ポッキー完成！"
              : "スタンプラリー挑戦中"}

          </h2>

          <p>

            {completed
              ? "5つすべてのスタンプを集めました。コンプリート特典をチェックしよう！"
              : `現在 ${progress}/5。あと${Math.max(
                  0,
                  5 - progress
                )}個で完成です。`}

          </p>

        </section>

        {/* ==================================
            SPECIAL
        ================================== */}

        <section className="rewardSpecialSection">

          <div className="rewardSectionTitle">

            <span>
              COMPLETE BONUS
            </span>

            <h2>
              コンプリート特典
            </h2>

          </div>

          {/* SPECIAL 01 */}

          <article className="rewardSpecialCard rewardSpecial01">

            <div className="rewardSpecialTop">

              <span className="rewardSpecialNumber">
                SPECIAL 01
              </span>

              <span className="rewardSpecialMark">
                ★
              </span>

            </div>

            <div className="rewardSpecialBody">

              <div className="rewardSpecialIcon">
                🎁
              </div>

              <div>

                <h3>
                  コンプリート特典
                </h3>

                <p>
                  5つすべてのスタンプを集めた人限定の
                  POKIPOコンプリート特典です。
                </p>

              </div>

            </div>

            <div className="rewardSpecialFooter">
              全5スタンプ達成者限定
            </div>

          </article>

          {/* SPECIAL 02 */}

          <article className="rewardSpecialCard rewardSpecial02">

            <div className="rewardSpecialTop">

              <span className="rewardSpecialNumber">
                SPECIAL 02
              </span>

              <span className="rewardSpecialMark">
                ✦
              </span>

            </div>

            <div className="rewardSpecialBody">

              <div className="rewardSpecialIcon">
                🎆
              </div>

              <div>

                <h3>
                  雄飛祭サプライズ演出
                </h3>

                <p>
                  11/7・8の雄飛祭で、
                  高安ゼミ LiPostの販売ブースにある
                  QRコードを読み込むと
                  POKIPOが変化するかも・・・。
                </p>

              </div>

            </div>

            <div className="rewardSpecialFooter">
              5スタンプ達成者限定シークレット
            </div>

          </article>

        </section>

        {/* ==================================
            EXCHANGE
        ================================== */}

        <section className="rewardExchangeSection">

          <div className="rewardSectionTitle">

            <span>
              REWARD EXCHANGE
            </span>

            <h2>
              景品交換
            </h2>

          </div>

          {!rewardExchanged ? (
            <div className="rewardExchangeCard">

              <div className="rewardExchangeIcon">
                🎁
              </div>

              <span>
                COMPLETE REWARD
              </span>

              <h3>

                {completed
                  ? "景品を受け取ろう！"
                  : "まだ交換できません"}

              </h3>

              <p>

                {completed
                  ? "スタッフにこの画面を見せて、景品を受け取ってください。"
                  : "5つのスタンプを集めると景品交換できます。"}

              </p>

              <button
                type="button"
                className="rewardExchangeButton"
                disabled={
                  !completed
                }
                onClick={
                  completeRewardExchange
                }
              >
                景品交換を完了する
              </button>

            </div>
          ) : (
            <div className="rewardExchangeComplete">

              <div className="rewardCompleteCheck">
                ✓
              </div>

              <span>
                REWARD EXCHANGED
              </span>

              <h3>
                景品交換完了！
              </h3>

              <p>
                POKIPOコンプリートおめでとうございます！
              </p>

            </div>
          )}

        </section>

        {/* ==================================
            CERTIFICATE
        ================================== */}

        {rewardExchanged && (
          <section className="certificateSection">

            <div className="rewardSectionTitle">

              <span>
                COMPLETION CERTIFICATE
              </span>

              <h2>
                達成証をつくる
              </h2>

            </div>

            <p className="certificateGuide">
              達成時間・達成順位は必ず表示されます。
              ニックネーム・学年・学科から最低1つ選んでください。
            </p>

            {/* =================================
                PROFILE SETTING
            ================================= */}

            <div className="certificateSettingCard">

              <div className="certificateSettingTitle">

                <span>
                  PARTICIPANT
                </span>

                <strong>
                  掲載する達成者情報
                </strong>

              </div>

              <div className="certificateProfileSelect">

                <button
                  type="button"
                  className={
                    showNickname
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    toggleProfile(
                      "nickname"
                    )
                  }
                >
                  <span>
                    {showNickname
                      ? "✓"
                      : ""}
                  </span>

                  ニックネーム
                </button>

                <button
                  type="button"
                  className={
                    showGrade
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    toggleProfile(
                      "grade"
                    )
                  }
                >
                  <span>
                    {showGrade
                      ? "✓"
                      : ""}
                  </span>

                  学年
                </button>

                <button
                  type="button"
                  className={
                    showDepartment
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    toggleProfile(
                      "department"
                    )
                  }
                >
                  <span>
                    {showDepartment
                      ? "✓"
                      : ""}
                  </span>

                  学科
                </button>

              </div>

            </div>

            {/* =================================
                KNOWLEDGE
            ================================= */}

            <div className="certificateSettingCard">

              <div className="certificateSettingTitle">

                <span>
                  FAVORITE KNOWLEDGE
                </span>

                <strong>
                  一番「へぇ！」となった豆知識
                </strong>

              </div>

              <div className="certificateKnowledgeSelect">

                {knowledgeItems.map(
                  (item) => {
                    const active =
                      item.id ===
                      selectedKnowledgeId;

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        className={
                          active
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          selectKnowledge(
                            item.id
                          )
                        }
                      >

                        <span>
                          {item.number}
                        </span>

                        <strong>
                          {item.title}
                        </strong>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* =================================
                CERTIFICATE CARD
            ================================= */}

            <div
              ref={
                certificateRef
              }
              className="certificateCard"
            >

              {/* 背景 */}

              <div className="certificateBuilding">

                <div className="certificateBuildingRoof" />

                <div className="certificateBuildingBody">

                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />

                </div>

              </div>

              <div className="certificateOverlay" />

              {/* TOP */}

              <div className="certificateTop">

                <span>
                  DOKKYO UNIVERSITY
                </span>

                <h2>
                  POKIPO
                </h2>

                <strong>
                  COMPLETION CERTIFICATE
                </strong>

                <p>
                  スタンプラリー達成証
                </p>

              </div>

              {/* POCKY */}

              <div className="certificatePockyVisual">

                <div className="certificatePocky certificatePockyLeft">

                  <div className="certificatePockyCoating" />

                  <div className="certificatePockyBiscuit" />

                </div>

                <div className="certificatePocky certificatePockyCenter">

                  <div className="certificatePockyCoating" />

                  <div className="certificatePockyBiscuit" />

                </div>

                <div className="certificatePocky certificatePockyRight">

                  <div className="certificatePockyCoating" />

                  <div className="certificatePockyBiscuit" />

                </div>

              </div>

              {/* MUST INFO */}

              <div className="certificateStats">

                <div className="certificateStatCard">

                  <span className="certificateStatLabel">
                    ACHIEVED AT
                  </span>

                  <small>
                    達成時間
                  </small>

                  <strong>
                    {completedAt ||
                      "----/--/-- --:--"}
                  </strong>

                </div>

                <div className="certificateStatCard rank">

                  <span className="certificateStatLabel">
                    RANK
                  </span>

                  <small>
                    達成順位
                  </small>

                  <div className="certificateRankNumber">

                    <strong>
                      {achievementRank}
                    </strong>

                    <span>
                      番目
                    </span>

                  </div>

                  <p>
                    に達成！
                  </p>

                </div>

              </div>

              {/* PARTICIPANT */}

              <div className="certificateProfileBlock">

                <div className="certificateProfileTitle">

                  <span>
                    PARTICIPANT
                  </span>

                  <strong>
                    達成者
                  </strong>

                </div>

                <div className="certificateProfileItems">

                  {showNickname && (
                    <div className="certificateProfileItem">

                      <span>
                        NICKNAME
                      </span>

                      <strong>
                        {nickname ||
                          "未設定"}
                      </strong>

                    </div>
                  )}

                  {showGrade && (
                    <div className="certificateProfileItem">

                      <span>
                        GRADE
                      </span>

                      <strong>
                        {grade ||
                          "未設定"}
                      </strong>

                    </div>
                  )}

                  {showDepartment && (
                    <div className="certificateProfileItem">

                      <span>
                        DEPARTMENT
                      </span>

                      <strong>
                        {department ||
                          "未設定"}
                      </strong>

                    </div>
                  )}

                </div>

              </div>

              {/* KNOWLEDGE */}

              <div className="certificateKnowledgeBlock">

                <div className="certificateKnowledgeTitle">

                  <span>
                    FAVORITE KNOWLEDGE
                  </span>

                  <strong>
                    一番「へぇ！」となった豆知識
                  </strong>

                </div>

                <div className="certificateKnowledgeContent">

                  <span className="certificateKnowledgeNumber">
                    {selectedKnowledge.number}
                  </span>

                  <strong>
                    {selectedKnowledge.title}
                  </strong>

                </div>

              </div>

              {/* FOOTER */}

              <div className="certificateFooter">

                <span>
                  高安ゼミ LiPost × POCKY
                </span>

                <strong>
                  SHARE HAPPINESS!
                </strong>

              </div>

            </div>

            {/* =================================
                ACTION
            ================================= */}

            <div className="certificateActions">

              <button
                type="button"
                onClick={
                  downloadCertificate
                }
                disabled={
                  creatingImage
                }
              >
                {creatingImage
                  ? "画像を作成中..."
                  : "達成証を保存"}
              </button>

              <button
                type="button"
                className="primary"
                onClick={
                  shareCertificate
                }
                disabled={
                  creatingImage
                }
              >
                SNSで共有
              </button>

            </div>

          </section>
        )}

        {/* ==================================
            SECRET MODE
        ================================== */}

        {secretStamp && (
          <section className="rewardSecretUnlocked">

            <span>
              SECRET MODE
            </span>

            <h2>
              🎆 雄飛祭モード解放済み
            </h2>

            <p>
              ポッキーの着せ替えや
              雄飛祭限定フォトフレームを楽しめます。
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/yuhisai"
                )
              }
            >
              雄飛祭モードへ →
            </button>

          </section>
        )}

        {/* ==================================
            MESSAGE
        ================================== */}

        {message && (
          <p className="rewardMessage">
            {message}
          </p>
        )}

        {/* ==================================
            DEMO ONLY
        ================================== */}

        {DEMO_MODE && (
          <section className="rewardDemoSection">

            <span>
              DEMO ONLY
            </span>

            <h2>
              デモ操作
            </h2>

            <div className="rewardDemoButtons">

              <button
                type="button"
                onClick={
                  demoCompleteReward
                }
              >
                デモ：景品交換完了
              </button>

              <button
                type="button"
                onClick={
                  demoResetReward
                }
              >
                デモ：景品交換状態をリセット
              </button>

              <button
                type="button"
                onClick={
                  demoResetStamps
                }
              >
                デモ：通常スタンプをリセット
              </button>

              <button
                type="button"
                onClick={
                  demoResetSecretStamp
                }
              >
                デモ：雄飛祭スタンプを削除
              </button>

            </div>

          </section>
        )}

        {/* ==================================
            HOME
        ================================== */}

        <button
          type="button"
          className="rewardBackHomeButton"
          onClick={() =>
            router.push(
              "/home"
            )
          }
        >
          トップへ戻る
        </button>

      </section>

    </main>
  );
}