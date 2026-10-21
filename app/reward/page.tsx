
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";

import { supabase } from "../../lib/supabase-client";
import MaintenanceGate from "../../components/MaintenanceGate";
import { PokipoRewardQrPanel } from "../../components/PokipoRewardShared";

/* ========================================
   KNOWLEDGE
======================================== */

const knowledgeItems = [
  {
    id: "knowledge1",
    number: 1,
    title: "10年ぶりの大改良！素材から見直した「究極の品質」",
  },
  {
    id: "knowledge2",
    number: 2,
    title: "名前にも込められたポッキーらしさ",
  },
  {
    id: "knowledge3",
    number: 3,
    title: "心の距離をぐっと縮める「コミュニケーションツール」",
  },
  {
    id: "knowledge4",
    number: 4,
    title: "誰も取り残さない「シェアハピネス」の精神",
  },
  {
    id: "knowledge5",
    number: 5,
    title: "獨協生の誇り！5年連続日本一を支える「圧倒的な団結力」",
  },
];

/* ========================================
   TYPES
======================================== */

type RewardStatusRow = {
  confirmation_code: string;
  exchange_token: string;
  status: string;
  exchanged_at: string | null;
};

type CompletionRow = {
  completed_at: string;
  achievement_rank: number | null;
};

type IssuedRewardRow = {
  exchange_token: string;
  confirmation_code: string;
};

/* ========================================
   PAGE
======================================== */

export default function RewardPage() {
  const router = useRouter();

  const certificateRef = useRef<HTMLDivElement | null>(null);
  const issuingRef = useRef(false);
  const rewardStatusCheckingRef = useRef(false);
  const rewardExchangedRef = useRef(false);

  /* USER */
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [department, setDepartment] = useState("");
  const [participantId, setParticipantId] = useState("");

  /* PROGRESS */
  const [progress, setProgress] = useState(0);

  /* SURVEY */
  const [postSurveyCompleted, setPostSurveyCompleted] =
    useState(false);
  const [loadingPostSurvey, setLoadingPostSurvey] =
    useState(true);

  /* REWARD */
  const [rewardExchanged, setRewardExchanged] =
    useState(false);
  const [rewardExchangedAt, setRewardExchangedAt] =
    useState("");
  const [confirmationCode, setConfirmationCode] =
    useState("");
  const [rewardToken, setRewardToken] = useState("");
  const [rewardQrIssued, setRewardQrIssued] =
    useState(false);
  const [issuingRewardQr, setIssuingRewardQr] =
    useState(false);
  const [loadingRewardStatus, setLoadingRewardStatus] =
    useState(true);

  /* COMPLETION */
  const [completedAt, setCompletedAt] = useState("");
  const [achievementRank, setAchievementRank] =
    useState<number | null>(null);
  const [loadingCompletion, setLoadingCompletion] =
    useState(true);

  /* SECRET */
  const [secretStamp, setSecretStamp] = useState(false);

  /* CERTIFICATE */
  const [showNickname, setShowNickname] = useState(true);
  const [showGrade, setShowGrade] = useState(false);
  const [showDepartment, setShowDepartment] =
    useState(false);
  const [selectedKnowledgeId, setSelectedKnowledgeId] =
    useState("knowledge1");
  const [creatingImage, setCreatingImage] = useState(false);

  /* MESSAGE */
  const [message, setMessage] = useState("");

  /* ========================================
     HELPERS
  ======================================== */

  function getCurrentParticipantId() {
    return (
      localStorage.getItem("pokipo_participant_id") ??
      localStorage.getItem("pokipo_user_id") ??
      ""
    );
  }

  function formatDateTime(value: string) {
    const date = new Date(value);

    return (
      `${date.getFullYear()}/` +
      `${String(date.getMonth() + 1).padStart(2, "0")}/` +
      `${String(date.getDate()).padStart(2, "0")} ` +
      `${String(date.getHours()).padStart(2, "0")}:` +
      `${String(date.getMinutes()).padStart(2, "0")}`
    );
  }

  /* ========================================
     LOCAL DATA
  ======================================== */

  useEffect(() => {
    const savedNickname =
      localStorage.getItem("pokipo_nickname") ?? "";

    const savedGrade =
      localStorage.getItem("pokipo_grade") ?? "";

    const savedDepartment =
      localStorage.getItem("pokipo_department") ?? "";

    const savedParticipantId = getCurrentParticipantId();

    const savedProgress = Number(
      localStorage.getItem("pokipo_progress") ?? "0"
    );

    const savedCompletedAt =
      localStorage.getItem("pokipo_completed_at") ?? "";

    const savedRank =
      localStorage.getItem("pokipo_achievement_rank");

    const savedSecret =
      localStorage.getItem("pokipo_secret_yuhisai") ===
      "true";

    const savedKnowledge =
      localStorage.getItem("pokipo_certificate_knowledge");

    const savedPostSurvey =
      localStorage.getItem(
        "pokipo_post_survey_completed"
      ) === "true";

    const savedConfirmationCode =
      localStorage.getItem(
        "pokipo_reward_confirmation_code"
      ) ?? "";

    const savedRewardToken =
      localStorage.getItem("pokipo_reward_token") ?? "";

    setNickname(savedNickname);
    setGrade(savedGrade);
    setDepartment(savedDepartment);
    setParticipantId(savedParticipantId);

    setProgress(
      Math.min(
        Math.max(
          Number.isFinite(savedProgress)
            ? savedProgress
            : 0,
          0
        ),
        5
      )
    );

    // 交換済みかどうかはSupabaseの状態を優先する
    rewardExchangedRef.current = false;
    setRewardExchanged(false);
    setRewardExchangedAt("");

    setCompletedAt(savedCompletedAt);
    setSecretStamp(savedSecret);
    setPostSurveyCompleted(savedPostSurvey);
    setConfirmationCode(savedConfirmationCode);
    setRewardToken(savedRewardToken);

    setRewardQrIssued(
      Boolean(savedConfirmationCode && savedRewardToken)
    );

    if (savedRank !== null) {
      const parsedRank = Number(savedRank);

      if (Number.isFinite(parsedRank)) {
        setAchievementRank(parsedRank);
      }
    }

    if (
      savedKnowledge &&
      knowledgeItems.some(
        (item) => item.id === savedKnowledge
      )
    ) {
      setSelectedKnowledgeId(savedKnowledge);
    }

    // 旧仕様の学籍番号データは削除
    localStorage.removeItem(
      "pokipo_reward_student_number"
    );
  }, []);

  /* ========================================
     LOAD STAMP PROGRESS
  ======================================== */

  useEffect(() => {
    const currentParticipantId = getCurrentParticipantId();

    if (!currentParticipantId) return;

    async function loadProgress() {
      const { data, error } = await supabase.rpc(
        "get_pokipo_stamps",
        {
          p_participant_id: currentParticipantId,
        }
      );

      if (error) {
        console.error(
          "特典画面スタンプ取得エラー:",
          error.message
        );
        return;
      }

      const stampCount = Math.min(
        Array.isArray(data) ? data.length : 0,
        5
      );

      setProgress(stampCount);

      localStorage.setItem(
        "pokipo_progress",
        String(stampCount)
      );

      localStorage.setItem(
        "pokipo_completed",
        stampCount >= 5 ? "true" : "false"
      );
    }

    void loadProgress();
  }, []);

  /* ========================================
     LOAD POST SURVEY STATUS
  ======================================== */

  useEffect(() => {
    const currentParticipantId = getCurrentParticipantId();

    if (!currentParticipantId) {
      setLoadingPostSurvey(false);
      return;
    }

    async function loadPostSurveyStatus() {
      setLoadingPostSurvey(true);

      try {
        const { data, error } = await supabase.rpc(
          "has_completed_pokipo_post_survey",
          {
            p_participant_id: currentParticipantId,
          }
        );

        if (error) {
          console.error(
            "参加後アンケート確認エラー:",
            error
          );
          return;
        }

        const completedSurvey = data === true;

        setPostSurveyCompleted(completedSurvey);

        localStorage.setItem(
          "pokipo_post_survey_completed",
          completedSurvey ? "true" : "false"
        );
      } finally {
        setLoadingPostSurvey(false);
      }
    }

    void loadPostSurveyStatus();

    function handleFocus() {
      void loadPostSurveyStatus();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /* ========================================
     LOAD COMPLETION
  ======================================== */

  useEffect(() => {
    const currentParticipantId = getCurrentParticipantId();

    if (!currentParticipantId) {
      setLoadingCompletion(false);
      return;
    }

    async function loadCompletion() {
      setLoadingCompletion(true);

      try {
        const { data, error } = await supabase.rpc(
          "get_pokipo_completion",
          {
            p_participant_id: currentParticipantId,
          }
        );

        if (error) {
          console.error(
            "完走情報取得エラー:",
            error.message
          );
          return;
        }

        if (data && data.length > 0) {
          const completion = data[0] as CompletionRow;

          if (completion.completed_at) {
            const formatted = formatDateTime(
              completion.completed_at
            );

            setCompletedAt(formatted);

            localStorage.setItem(
              "pokipo_completed_at",
              formatted
            );
          }

          if (
            completion.achievement_rank !== null &&
            completion.achievement_rank !== undefined
          ) {
            const rank = Number(
              completion.achievement_rank
            );

            setAchievementRank(rank);

            localStorage.setItem(
              "pokipo_achievement_rank",
              String(rank)
            );
          }
        }
      } catch (error) {
        console.error(
          "完走情報通信エラー:",
          error
        );
      } finally {
        setLoadingCompletion(false);
      }
    }

    void loadCompletion();
  }, []);

  /* ========================================
     CHECK REWARD STATUS

     issued    → 未交換
     exchanged → 交換済み

     交換取消にも対応
  ======================================== */

  async function checkRewardStatus(
    showLoading = false
  ) {
    const currentParticipantId = getCurrentParticipantId();

    if (!currentParticipantId) {
      if (showLoading) {
        setLoadingRewardStatus(false);
      }

      return false;
    }

    if (rewardStatusCheckingRef.current) {
      return false;
    }

    rewardStatusCheckingRef.current = true;

    if (showLoading) {
      setLoadingRewardStatus(true);
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_reward_exchange_status",
        {
          p_participant_id: currentParticipantId,
        }
      );

      if (error) {
        console.error(
          "特典交換状態取得エラー:",
          error
        );
        return false;
      }

      // 交換記録が存在しない場合
      if (!Array.isArray(data) || data.length === 0) {
        rewardExchangedRef.current = false;

        setRewardExchanged(false);
        setRewardExchangedAt("");
        setRewardQrIssued(false);
        setRewardToken("");
        setConfirmationCode("");

        localStorage.removeItem(
          "pokipo_reward_exchanged"
        );

        localStorage.removeItem(
          "pokipo_reward_exchanged_at"
        );

        localStorage.removeItem(
          "pokipo_reward_token"
        );

        localStorage.removeItem(
          "pokipo_reward_confirmation_code"
        );

        return false;
      }

      const reward = data[0] as RewardStatusRow;

      if (
        !reward.exchange_token ||
        !reward.confirmation_code
      ) {
        console.error(
          "特典交換情報が不完全です。"
        );
        return false;
      }

      // 発行済みQRは交換状態にかかわらず保持
      setConfirmationCode(reward.confirmation_code);
      setRewardToken(reward.exchange_token);
      setRewardQrIssued(true);

      localStorage.setItem(
        "pokipo_reward_confirmation_code",
        reward.confirmation_code
      );

      localStorage.setItem(
        "pokipo_reward_token",
        reward.exchange_token
      );

      const isExchanged = reward.status === "exchanged";
      const wasExchanged = rewardExchangedRef.current;

      rewardExchangedRef.current = isExchanged;
      setRewardExchanged(isExchanged);

      localStorage.setItem(
        "pokipo_reward_exchanged",
        isExchanged ? "true" : "false"
      );

      if (isExchanged) {
        if (reward.exchanged_at) {
          const formatted = formatDateTime(
            reward.exchanged_at
          );

          setRewardExchangedAt(formatted);

          localStorage.setItem(
            "pokipo_reward_exchanged_at",
            formatted
          );
        } else {
          setRewardExchangedAt("");

          localStorage.removeItem(
            "pokipo_reward_exchanged_at"
          );
        }

        if (!wasExchanged) {
          setMessage(
            "景品交換が完了しました！"
          );
        }
      } else {
        // スタッフが交換を取り消した場合にも対応
        setRewardExchangedAt("");

        localStorage.removeItem(
          "pokipo_reward_exchanged_at"
        );

        if (wasExchanged) {
          setMessage(
            "景品交換の取消が反映されました。交換用QRを再び使用できます。"
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        "特典交換状態の通信エラー:",
        error
      );
      return false;
    } finally {
      rewardStatusCheckingRef.current = false;

      if (showLoading) {
        setLoadingRewardStatus(false);
      }
    }
  }

  /* ========================================
     INITIAL REWARD STATUS
  ======================================== */

  useEffect(() => {
    void checkRewardStatus(true);
  }, []);

  /* ========================================
     STATUS POLLING

     2.5秒ごとに確認
     画面復帰時も確認
  ======================================== */

  useEffect(() => {
    const currentParticipantId = getCurrentParticipantId();

    if (!currentParticipantId) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkRewardStatus();
      }
    }, 2500);

    function handleFocus() {
      void checkRewardStatus();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkRewardStatus();
      }
    }

    window.addEventListener("focus", handleFocus);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  /* ========================================
     STATUS
  ======================================== */

  const completed = progress >= 5;

  const selectedKnowledge =
    knowledgeItems.find(
      (item) => item.id === selectedKnowledgeId
    ) ?? knowledgeItems[0];

  /* ========================================
     ISSUE REWARD QR

     既存の本番RPCを維持
  ======================================== */

  async function issueRewardQr() {
    if (issuingRef.current) {
      return;
    }

    if (!completed || !postSurveyCompleted) {
      return;
    }

    const currentParticipantId =
      participantId || getCurrentParticipantId();

    if (!currentParticipantId) {
      setMessage(
        "参加者情報を確認できませんでした。"
      );
      return;
    }

    issuingRef.current = true;
    setIssuingRewardQr(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "issue_reward_qr",
        {
          p_participant_id: currentParticipantId,
        }
      );

      if (error) {
        console.error(
          "特典QR発行エラー:",
          error
        );

        setMessage(
          "交換用QRを発行できませんでした。画面を再読み込みしてもう一度お試しください。"
        );
        return;
      }

      if (!data || data.length === 0) {
        setMessage(
          "交換用QR情報を取得できませんでした。"
        );
        return;
      }

      const issued = data[0] as IssuedRewardRow;

      if (
        !issued.exchange_token ||
        !issued.confirmation_code
      ) {
        setMessage(
          "交換用QR情報を取得できませんでした。"
        );
        return;
      }

      setRewardToken(issued.exchange_token);
      setConfirmationCode(
        issued.confirmation_code
      );
      setRewardQrIssued(true);

      localStorage.setItem(
        "pokipo_reward_token",
        issued.exchange_token
      );

      localStorage.setItem(
        "pokipo_reward_confirmation_code",
        issued.confirmation_code
      );
    } catch (error) {
      console.error(
        "特典QR発行通信エラー:",
        error
      );

      setMessage(
        "交換用QRの発行中に通信エラーが発生しました。"
      );
    } finally {
      issuingRef.current = false;
      setIssuingRewardQr(false);
    }
  }

  /* ========================================
     AUTO ISSUE

     5スタンプ＋参加後アンケート
  ======================================== */

  useEffect(() => {
    if (
      loadingRewardStatus ||
      loadingPostSurvey
    ) {
      return;
    }

    if (
      !completed ||
      !postSurveyCompleted ||
      rewardQrIssued ||
      rewardExchanged
    ) {
      return;
    }

    void issueRewardQr();
  }, [
    completed,
    postSurveyCompleted,
    rewardQrIssued,
    rewardExchanged,
    loadingRewardStatus,
    loadingPostSurvey,
    participantId,
  ]);

  /* ========================================
     CERTIFICATE OPTIONS
  ======================================== */

  function toggleProfile(
    type: "nickname" | "grade" | "department"
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

    // 最低1つは表示する
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

    setShowNickname(nextNickname);
    setShowGrade(nextGrade);
    setShowDepartment(nextDepartment);
  }

  function selectKnowledge(id: string) {
    setSelectedKnowledgeId(id);

    localStorage.setItem(
      "pokipo_certificate_knowledge",
      id
    );
  }

  /* ========================================
     CERTIFICATE IMAGE
  ======================================== */

  async function createCertificateImage() {
    if (!certificateRef.current) {
      return null;
    }

    try {
      setCreatingImage(true);

      return await toPng(
        certificateRef.current,
        {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#fff8eb",
        }
      );
    } finally {
      setCreatingImage(false);
    }
  }

  async function downloadCertificate() {
    const dataUrl = await createCertificateImage();

    if (!dataUrl) return;

    const link = document.createElement("a");

    link.download = "POKIPO_certificate.png";
    link.href = dataUrl;
    link.click();
  }

  async function shareCertificate() {
    const dataUrl = await createCertificateImage();

    if (!dataUrl) return;

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const file = new File(
      [blob],
      "POKIPO_certificate.png",
      {
        type: "image/png",
      }
    );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [file],
      })
    ) {
      try {
        await navigator.share({
          title: "POKIPO 達成証",
          text: "POKIPOスタンプラリーをコンプリートしました！",
          files: [file],
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "達成証共有エラー:",
          error
        );

        setMessage(
          "共有できませんでした。画像を保存してお試しください。"
        );
      }
    } else {
      setMessage(
        "この端末では直接共有できません。画像を保存してSNSから投稿してください。"
      );
    }
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <MaintenanceGate page="reward">
      <main className="shell">
        <section className="rewardPage">

          {/* HEADER */}
          <header className="rewardHeader">
            <button
              type="button"
              className="backButton"
              onClick={() => router.push("/home")}
            >
              ←
            </button>

            <div>
              <p>COMPLETE REWARD</p>
              <h1>コンプリート特典</h1>
            </div>
          </header>

          {/* HERO */}
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
                ? "5つすべてのスタンプを集めました。"
                : `現在 ${progress}/5。あと${Math.max(
                    0,
                    5 - progress
                  )}個で完成です。`}
            </p>
          </section>

          {/* COMPLETION RECORD */}
          {completed && (
            <section className="rewardCompletionInfo">
              <div className="rewardSectionTitle">
                <span>COMPLETION RECORD</span>
                <h2>達成記録</h2>
              </div>

              <div className="rewardCompletionStats">
                <div>
                  <span>COMPLETED AT</span>
                  <strong>
                    {loadingCompletion
                      ? "読み込み中..."
                      : completedAt || "記録確認中"}
                  </strong>
                </div>

                <div>
                  <span>RANK</span>
                  <strong>
                    {loadingCompletion
                      ? "—"
                      : achievementRank !== null
                      ? `${achievementRank}番目`
                      : "—"}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* EXCHANGE DATE */}
          {completed && (
            <section className="rewardExchangeDateNotice">
              <span>REWARD EXCHANGE DAY</span>

              <h2>
                特典交換日は10月27日（火）です
              </h2>

              <p>
                当日はこの画面に表示されるQRコードと
                確認番号をスタッフに提示してください。
              </p>
            </section>
          )}

          {/* POST SURVEY */}
          {completed && !rewardExchanged && (
            <section
              className={
                postSurveyCompleted
                  ? "rewardSurveyGate completed"
                  : "rewardSurveyGate"
              }
            >
              <span>AFTER SURVEY</span>

              {loadingPostSurvey ? (
                <h2>
                  アンケート回答状況を確認中...
                </h2>
              ) : postSurveyCompleted ? (
                <>
                  <div className="rewardSurveyCheck">
                    ✓
                  </div>

                  <h2>
                    参加後アンケート回答済み
                  </h2>

                  <p>
                    ご協力ありがとうございます。
                    特典交換用QRを自動で発行します。
                  </p>
                </>
              ) : (
                <>
                  <h2>
                    特典交換まであと1ステップ！
                  </h2>

                  <p>
                    POKIPO参加前後の変化を確認するため、
                    参加後アンケートへの回答をお願いします。
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/survey/after")
                    }
                  >
                    参加後アンケートに回答する
                    <strong>→</strong>
                  </button>
                </>
              )}
            </section>
          )}

          {/* =================================
              REWARD EXCHANGE

              QR・交換済み表示を共通化
          ================================= */}

          <section className="rewardExchangeSection">
            <div className="rewardSectionTitle">
              <span>REWARD EXCHANGE</span>
              <h2>景品交換</h2>
            </div>

            {loadingRewardStatus ? (
              <div className="rewardExchangeCard">
                <h3>
                  交換情報を確認中...
                </h3>
              </div>
            ) : rewardExchanged ? (
              <PokipoRewardQrPanel
                mode="production"
                status="exchanged"
                token={rewardToken || null}
                confirmationCode={
                  confirmationCode || null
                }
                exchangedAt={
                  rewardExchangedAt || null
                }
              />
            ) : !completed ? (
              <div className="rewardExchangeCard">
                <h3>
                  まだ交換できません
                </h3>

                <p>
                  5つのスタンプを集めると交換できます。
                </p>
              </div>
            ) : !postSurveyCompleted ? (
              <div className="rewardExchangeCard locked">
                <div className="rewardExchangeIcon">
                  🔒
                </div>

                <span>SURVEY REQUIRED</span>

                <h3>
                  アンケート回答後にQRを表示します
                </h3>

                <p>
                  上の「参加後アンケートに回答する」から
                  回答してください。
                </p>
              </div>
            ) : issuingRewardQr ? (
              <div className="rewardExchangeCard">
                <div className="rewardExchangeIcon">
                  QR
                </div>

                <span>ISSUING</span>

                <h3>
                  交換用QRを発行しています...
                </h3>

                <p>
                  そのまま少しお待ちください。
                </p>
              </div>
            ) : rewardQrIssued && rewardToken ? (
              <PokipoRewardQrPanel
                mode="production"
                status="issued"
                token={rewardToken}
                confirmationCode={
                  confirmationCode || null
                }
              />
            ) : (
              <div className="rewardExchangeCard">
                <h3>
                  QRコードを準備中です
                </h3>

                <p>
                  画面を再読み込みしても表示されない場合は、
                  スタッフまでお声がけください。
                </p>
              </div>
            )}
          </section>

          {/* =================================
              CERTIFICATE
          ================================= */}

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

              {/* PROFILE SETTINGS */}
              <div className="certificateSettingCard">
                <div className="certificateSettingTitle">
                  <strong>
                    掲載する達成者情報
                  </strong>
                </div>

                <div className="certificateProfileSelect">
                  <button
                    type="button"
                    className={
                      showNickname ? "active" : ""
                    }
                    onClick={() =>
                      toggleProfile("nickname")
                    }
                  >
                    ニックネーム
                  </button>

                  <button
                    type="button"
                    className={
                      showGrade ? "active" : ""
                    }
                    onClick={() =>
                      toggleProfile("grade")
                    }
                  >
                    学年
                  </button>

                  <button
                    type="button"
                    className={
                      showDepartment ? "active" : ""
                    }
                    onClick={() =>
                      toggleProfile("department")
                    }
                  >
                    学科
                  </button>
                </div>
              </div>

              {/* KNOWLEDGE SETTINGS */}
              <div className="certificateSettingCard">
                <div className="certificateSettingTitle">
                  <strong>
                    一番「へぇ！」となった豆知識
                  </strong>
                </div>

                <div className="certificateKnowledgeSelect">
                  {knowledgeItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        item.id === selectedKnowledgeId
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        selectKnowledge(item.id)
                      }
                    >
                      <span>{item.number}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* CERTIFICATE CARD */}
              <div
                ref={certificateRef}
                className="certificateCard"
              >
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
                </div>

                <div className="certificateStats">
                  <div className="certificateStatCard">
                    <span>
                      ACHIEVED AT
                    </span>

                    <strong>
                      {completedAt}
                    </strong>
                  </div>

                  <div className="certificateStatCard rank">
                    <span>
                      RANK
                    </span>

                    <strong>
                      {achievementRank ?? "—"}
                      番目
                    </strong>
                  </div>
                </div>

                <div className="certificateProfileBlock">
                  {showNickname && (
                    <div className="certificateProfileItem">
                      <span>
                        NICKNAME
                      </span>

                      <strong>
                        {nickname}
                      </strong>
                    </div>
                  )}

                  {showGrade && (
                    <div className="certificateProfileItem">
                      <span>
                        GRADE
                      </span>

                      <strong>
                        {grade}
                      </strong>
                    </div>
                  )}

                  {showDepartment && (
                    <div className="certificateProfileItem">
                      <span>
                        DEPARTMENT
                      </span>

                      <strong>
                        {department}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="certificateKnowledgeBlock">
                  <span>
                    FAVORITE KNOWLEDGE
                  </span>

                  <strong>
                    {selectedKnowledge.title}
                  </strong>
                </div>

                <div className="certificateFooter">
                  <span>
                    高安ゼミ LiPost × POCKY
                  </span>

                  <strong>
                    SHARE HAPPINESS!
                  </strong>
                </div>
              </div>

              {/* CERTIFICATE ACTIONS */}
              <div className="certificateActions">
                <button
                  type="button"
                  onClick={() =>
                    void downloadCertificate()
                  }
                  disabled={creatingImage}
                >
                  {creatingImage
                    ? "作成中..."
                    : "達成証を保存"}
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    void shareCertificate()
                  }
                  disabled={creatingImage}
                >
                  SNSで共有
                </button>
              </div>
            </section>
          )}

          {/* SECRET */}
          {secretStamp && (
            <section className="rewardSecretUnlocked">
              <span>
                SECRET MODE
              </span>

              <h2>
                🎆 雄飛祭モード解放済み
              </h2>
            </section>
          )}

          {/* MESSAGE */}
          {message && (
            <p className="rewardMessage">
              {message}
            </p>
          )}

          {/* BACK HOME */}
          <button
            type="button"
            className="rewardBackHomeButton"
            onClick={() =>
              router.push("/home")
            }
          >
            トップへ戻る
          </button>

        </section>
      </main>
    </MaintenanceGate>
  );
}
