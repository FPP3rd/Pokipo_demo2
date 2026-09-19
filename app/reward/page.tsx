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
  toPng,
} from "html-to-image";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  supabase,
} from "../../lib/supabase-client";

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
      "名前にも込められたポッキーらしさ",
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

/* ========================================
   TYPES
======================================== */

type RewardStatusRow = {
  student_number: string;
  exchange_token: string;
  status: string;
  exchanged_at: string | null;
};

type CompletionRow = {
  completed_at: string;
  achievement_rank:
    | number
    | null;
};

/* ========================================
   PAGE
======================================== */

export default function RewardPage() {
  const router =
    useRouter();

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

  const [
    participantId,
    setParticipantId,
  ] = useState("");

  /* ========================================
     PROGRESS
  ======================================== */

  const [
    progress,
    setProgress,
  ] = useState(0);

  /* ========================================
     SURVEY
  ======================================== */

  const [
    postSurveyCompleted,
    setPostSurveyCompleted,
  ] = useState(false);

  const [
    loadingPostSurvey,
    setLoadingPostSurvey,
  ] = useState(true);

  /* ========================================
     REWARD
  ======================================== */

  const [
    rewardExchanged,
    setRewardExchanged,
  ] = useState(false);

  const [
    rewardExchangedAt,
    setRewardExchangedAt,
  ] = useState("");

  const [
    studentNumber,
    setStudentNumber,
  ] = useState("");

  const [
    rewardToken,
    setRewardToken,
  ] = useState("");

  const [
    rewardQrIssued,
    setRewardQrIssued,
  ] = useState(false);

  const [
    issuingRewardQr,
    setIssuingRewardQr,
  ] = useState(false);

  const [
    loadingRewardStatus,
    setLoadingRewardStatus,
  ] = useState(true);

  /* ========================================
     COMPLETION
  ======================================== */

  const [
    completedAt,
    setCompletedAt,
  ] = useState("");

  const [
    achievementRank,
    setAchievementRank,
  ] = useState<number | null>(
    null
  );

  const [
    loadingCompletion,
    setLoadingCompletion,
  ] = useState(true);

  /* ========================================
     SECRET
  ======================================== */

  const [
    secretStamp,
    setSecretStamp,
  ] = useState(false);

  /* ========================================
     CERTIFICATE
  ======================================== */

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

  /* ========================================
     MESSAGE
  ======================================== */

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     HELPERS
  ======================================== */

  function getCurrentParticipantId() {
    return (
      localStorage.getItem(
        "pokipo_participant_id"
      ) ??
      localStorage.getItem(
        "pokipo_user_id"
      ) ??
      ""
    );
  }

  function formatDateTime(
    value: string
  ) {
    const date =
      new Date(value);

    return (
      `${date.getFullYear()}/` +
      `${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/` +
      `${String(
        date.getDate()
      ).padStart(2, "0")} ` +
      `${String(
        date.getHours()
      ).padStart(2, "0")}:` +
      `${String(
        date.getMinutes()
      ).padStart(2, "0")}`
    );
  }

  /* ========================================
     LOCAL DATA
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

    const savedParticipantId =
      getCurrentParticipantId();

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

    const savedRewardExchangedAt =
      localStorage.getItem(
        "pokipo_reward_exchanged_at"
      ) ?? "";

    const savedCompletedAt =
      localStorage.getItem(
        "pokipo_completed_at"
      ) ?? "";

    const savedRank =
      localStorage.getItem(
        "pokipo_achievement_rank"
      );

    const savedSecret =
      localStorage.getItem(
        "pokipo_secret_yuhisai"
      ) === "true";

    const savedKnowledge =
      localStorage.getItem(
        "pokipo_certificate_knowledge"
      );

    const savedPostSurvey =
      localStorage.getItem(
        "pokipo_post_survey_completed"
      ) === "true";

    setNickname(
      savedNickname
    );

    setGrade(
      savedGrade
    );

    setDepartment(
      savedDepartment
    );

    setParticipantId(
      savedParticipantId
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

    setRewardExchangedAt(
      savedRewardExchangedAt
    );

    setCompletedAt(
      savedCompletedAt
    );

    setSecretStamp(
      savedSecret
    );

    setPostSurveyCompleted(
      savedPostSurvey
    );

    if (
      savedRank !== null
    ) {
      const parsedRank =
        Number(
          savedRank
        );

      if (
        Number.isFinite(
          parsedRank
        )
      ) {
        setAchievementRank(
          parsedRank
        );
      }
    }

    if (
      savedKnowledge &&
      knowledgeItems.some(
        (
          item
        ) =>
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
     LOAD STAMP PROGRESS
  ======================================== */

  useEffect(() => {
    const currentParticipantId =
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      return;
    }

    async function loadProgress() {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_pokipo_stamps",
          {
            p_participant_id:
              currentParticipantId,
          }
        );

      if (
        error
      ) {
        console.error(
          "特典画面スタンプ取得エラー:",
          error.message
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
      }
    }

    void loadProgress();
  }, []);

  /* ========================================
     LOAD POST SURVEY STATUS
  ======================================== */

  useEffect(() => {
    const currentParticipantId =
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      setLoadingPostSurvey(
        false
      );

      return;
    }

    async function loadPostSurveyStatus() {
      setLoadingPostSurvey(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "has_completed_pokipo_post_survey",
            {
              p_participant_id:
                currentParticipantId,
            }
          );

        if (
          error
        ) {
          console.error(
            "参加後アンケート確認エラー:",
            error
          );

          return;
        }

        const completedSurvey =
          data === true;

        setPostSurveyCompleted(
          completedSurvey
        );

        localStorage.setItem(
          "pokipo_post_survey_completed",
          completedSurvey
            ? "true"
            : "false"
        );
      } finally {
        setLoadingPostSurvey(
          false
        );
      }
    }

    void loadPostSurveyStatus();

    function handleFocus() {
      void loadPostSurveyStatus();
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  /* ========================================
     LOAD COMPLETION
  ======================================== */

  useEffect(() => {
    const currentParticipantId =
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      setLoadingCompletion(
        false
      );

      return;
    }

    async function loadCompletion() {
      setLoadingCompletion(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_pokipo_completion",
            {
              p_participant_id:
                currentParticipantId,
            }
          );

        if (
          error
        ) {
          console.error(
            "完走情報取得エラー:",
            error.message
          );

          return;
        }

        if (
          data &&
          data.length >
            0
        ) {
          const completion =
            data[0] as CompletionRow;

          if (
            completion.completed_at
          ) {
            const formatted =
              formatDateTime(
                completion.completed_at
              );

            setCompletedAt(
              formatted
            );

            localStorage.setItem(
              "pokipo_completed_at",
              formatted
            );
          }

          if (
            completion.achievement_rank !==
              null &&
            completion.achievement_rank !==
              undefined
          ) {
            const rank =
              Number(
                completion.achievement_rank
              );

            setAchievementRank(
              rank
            );

            localStorage.setItem(
              "pokipo_achievement_rank",
              String(
                rank
              )
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "完走情報通信エラー:",
          error
        );
      } finally {
        setLoadingCompletion(
          false
        );
      }
    }

    void loadCompletion();
  }, []);

  /* ========================================
     CHECK REWARD STATUS
  ======================================== */

  async function checkRewardStatus(
    showLoading = false
  ) {
    const currentParticipantId =
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      if (
        showLoading
      ) {
        setLoadingRewardStatus(
          false
        );
      }

      return;
    }

    if (
      showLoading
    ) {
      setLoadingRewardStatus(
        true
      );
    }

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_reward_exchange_status",
          {
            p_participant_id:
              currentParticipantId,
          }
        );

      if (
        error
      ) {
        console.error(
          "特典交換状態取得エラー:",
          error
        );

        return;
      }

      if (
        !data ||
        data.length ===
          0
      ) {
        return;
      }

      const reward =
        data[0] as RewardStatusRow;

      setStudentNumber(
        reward.student_number
      );

      setRewardToken(
        reward.exchange_token
      );

      setRewardQrIssued(
        true
      );

      localStorage.setItem(
        "pokipo_reward_student_number",
        reward.student_number
      );

      localStorage.setItem(
        "pokipo_reward_token",
        reward.exchange_token
      );

      if (
        reward.status ===
        "exchanged"
      ) {
        const wasExchanged =
          rewardExchanged;

        setRewardExchanged(
          true
        );

        localStorage.setItem(
          "pokipo_reward_exchanged",
          "true"
        );

        if (
          reward.exchanged_at
        ) {
          const formatted =
            formatDateTime(
              reward.exchanged_at
            );

          setRewardExchangedAt(
            formatted
          );

          localStorage.setItem(
            "pokipo_reward_exchanged_at",
            formatted
          );
        }

        if (
          !wasExchanged
        ) {
          setMessage(
            "景品交換が完了しました！"
          );
        }
      }
    } finally {
      if (
        showLoading
      ) {
        setLoadingRewardStatus(
          false
        );
      }
    }
  }

  useEffect(() => {
    void checkRewardStatus(
      true
    );
  }, []);

  useEffect(() => {
    const currentParticipantId =
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void checkRewardStatus();
        },
        2500
      );

    function handleFocus() {
      void checkRewardStatus();
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.clearInterval(
        timer
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    rewardExchanged,
  ]);

  /* ========================================
     STATUS
  ======================================== */

  const completed =
    progress >= 5;

  const selectedKnowledge =
    knowledgeItems.find(
      (
        item
      ) =>
        item.id ===
        selectedKnowledgeId
    ) ??
    knowledgeItems[0];

  /* ========================================
     STUDENT NUMBER
  ======================================== */

  function changeStudentNumber(
    value: string
  ) {
    const onlyNumbers =
      value.replace(
        /\D/g,
        ""
      );

    setStudentNumber(
      onlyNumbers.slice(
        0,
        8
      )
    );

    if (
      message
    ) {
      setMessage("");
    }
  }

  /* ========================================
     ISSUE REWARD QR
  ======================================== */

  async function issueRewardQr() {
    if (
      !completed
    ) {
      setMessage(
        "5つのスタンプをすべて集めると交換できます。"
      );

      return;
    }

    if (
      !postSurveyCompleted
    ) {
      setMessage(
        "参加後アンケートに回答してから交換用QRを発行してください。"
      );

      return;
    }

    const normalizedStudentNumber =
      studentNumber.trim();

    if (
      !/^[0-9]{8}$/.test(
        normalizedStudentNumber
      )
    ) {
      setMessage(
        "学籍番号は数字8桁で入力してください。"
      );

      return;
    }

    const currentParticipantId =
      participantId ||
      getCurrentParticipantId();

    if (
      !currentParticipantId
    ) {
      setMessage(
        "参加者情報を確認できませんでした。"
      );

      return;
    }

    setIssuingRewardQr(
      true
    );

    setMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "issue_reward_qr",
          {
            p_participant_id:
              currentParticipantId,

            p_student_number:
              normalizedStudentNumber,
          }
        );

      if (
        error
      ) {
        console.error(
          "特典QR発行エラー:",
          error
        );

        setMessage(
          `交換用QRを発行できませんでした。${error.message}`
        );

        return;
      }

      const issuedToken =
        data?.[0]?.exchange_token;

      if (
        !issuedToken
      ) {
        setMessage(
          "交換用QR情報を取得できませんでした。"
        );

        return;
      }

      setStudentNumber(
        normalizedStudentNumber
      );

      setRewardToken(
        issuedToken
      );

      setRewardQrIssued(
        true
      );

      localStorage.setItem(
        "pokipo_reward_student_number",
        normalizedStudentNumber
      );

      localStorage.setItem(
        "pokipo_reward_token",
        issuedToken
      );
    } finally {
      setIssuingRewardQr(
        false
      );
    }
  }

  /* ========================================
     CERTIFICATE
  ======================================== */

  function toggleProfile(
    type:
      | "nickname"
      | "grade"
      | "department"
  ) {
    const nextNickname =
      type ===
      "nickname"
        ? !showNickname
        : showNickname;

    const nextGrade =
      type ===
      "grade"
        ? !showGrade
        : showGrade;

    const nextDepartment =
      type ===
      "department"
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

  async function createCertificateImage() {
    if (
      !certificateRef.current
    ) {
      return null;
    }

    try {
      setCreatingImage(
        true
      );

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
    } finally {
      setCreatingImage(
        false
      );
    }
  }

  async function downloadCertificate() {
    const dataUrl =
      await createCertificateImage();

    if (
      !dataUrl
    ) {
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

    if (
      !dataUrl
    ) {
      return;
    }

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
        files: [file],
      })
    ) {
      await navigator.share({
        title:
          "POKIPO 達成証",

        text:
          "POKIPOスタンプラリーをコンプリートしました！",

        files: [file],
      });
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
    <main className="shell">

      <section className="rewardPage">

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

        {/* =================================
            COMPLETION RECORD
        ================================= */}

        {completed && (
          <section className="rewardCompletionInfo">

            <div className="rewardSectionTitle">

              <span>
                COMPLETION RECORD
              </span>

              <h2>
                達成記録
              </h2>

            </div>

            <div className="rewardCompletionStats">

              <div>

                <span>
                  COMPLETED AT
                </span>

                <strong>
                  {loadingCompletion
                    ? "読み込み中..."
                    : completedAt ||
                      "記録確認中"}
                </strong>

              </div>

              <div>

                <span>
                  RANK
                </span>

                <strong>
                  {loadingCompletion
                    ? "—"
                    : achievementRank !==
                      null
                    ? `${achievementRank}番目`
                    : "—"}
                </strong>

              </div>

            </div>

          </section>
        )}

        {/* =================================
            EXCHANGE DATE
        ================================= */}

        {completed && (
          <section className="rewardExchangeDateNotice">

            <span>
              REWARD EXCHANGE DAY
            </span>

            <h2>
              特典交換日は10月27日（火）です
            </h2>

            <p>
              当日はこの画面に表示される交換用QRをスタッフに提示してください。
            </p>

          </section>
        )}

        {/* =================================
            POST SURVEY
        ================================= */}

        {completed &&
          !rewardExchanged && (
          <section
            className={
              postSurveyCompleted
                ? "rewardSurveyGate completed"
                : "rewardSurveyGate"
            }
          >

            <span>
              AFTER SURVEY
            </span>

            {loadingPostSurvey ? (
              <>

                <h2>
                  アンケート回答状況を確認中...
                </h2>

              </>
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
                  特典交換用QRを発行できます。
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
                    router.push(
                      "/survey/after"
                    )
                  }
                >
                  参加後アンケートに回答する
                  <strong>
                    →
                  </strong>
                </button>

              </>
            )}

          </section>
        )}

        {/* =================================
            REWARD EXCHANGE
        ================================= */}

        <section className="rewardExchangeSection">

          <div className="rewardSectionTitle">

            <span>
              REWARD EXCHANGE
            </span>

            <h2>
              景品交換
            </h2>

          </div>

          {loadingRewardStatus ? (
            <div className="rewardExchangeCard">

              <h3>
                交換情報を確認中...
              </h3>

            </div>
          ) : rewardExchanged ? (
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

              {rewardExchangedAt && (
                <p>
                  交換日時：
                  {rewardExchangedAt}
                </p>
              )}

            </div>
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

              <span>
                SURVEY REQUIRED
              </span>

              <h3>
                アンケート回答後にQRを発行できます
              </h3>

              <p>
                上の「参加後アンケートに回答する」から回答してください。
              </p>

            </div>
          ) : !rewardQrIssued ? (
            <div className="rewardExchangeCard">

              <div className="rewardExchangeIcon">
                🎁
              </div>

              <span>
                COMPLETE REWARD
              </span>

              <h3>
                交換用QRを発行しよう
              </h3>

              <p>
                学籍番号を数字8桁で入力してください。
              </p>

              <div className="rewardStudentNumberField">

                <label htmlFor="studentNumber">
                  学籍番号
                </label>

                <input
                  id="studentNumber"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={
                    studentNumber
                  }
                  onChange={(
                    event
                  ) =>
                    changeStudentNumber(
                      event.target.value
                    )
                  }
                  placeholder="数字8桁"
                />

              </div>

              <button
                type="button"
                className="rewardExchangeButton"
                onClick={
                  issueRewardQr
                }
                disabled={
                  issuingRewardQr ||
                  studentNumber.length !==
                    8
                }
              >

                {issuingRewardQr
                  ? "QRを発行中..."
                  : "交換用QRを発行する"}

              </button>

            </div>
          ) : (
            <div className="rewardExchangeCard rewardQrCard">

              <div className="rewardQrStatus">
                READY TO EXCHANGE
              </div>

              <h3>
                スタッフにQRを見せてください
              </h3>

              <div className="rewardQrBox">

                <QRCodeSVG
                  value={`POKIPO_REWARD:${rewardToken}`}
                  size={190}
                  level="H"
                  includeMargin
                />

              </div>

              <div className="rewardStudentNumberMasked">

                <span>
                  学籍番号
                </span>

                <strong>
                  ****
                  {studentNumber.slice(
                    -4
                  )}
                </strong>

              </div>

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
                  学科
                </button>

              </div>

            </div>

            <div className="certificateSettingCard">

              <div className="certificateSettingTitle">

                <strong>
                  一番「へぇ！」となった豆知識
                </strong>

              </div>

              <div className="certificateKnowledgeSelect">

                {knowledgeItems.map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      className={
                        item.id ===
                        selectedKnowledgeId
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
                  )
                )}

              </div>

            </div>

            <div
              ref={
                certificateRef
              }
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
                    {achievementRank ??
                      "—"}
                    番目
                  </strong>

                </div>

              </div>

              <div className="certificateProfileBlock">

                {showNickname && (
                  <div className="certificateProfileItem">
                    <span>NICKNAME</span>
                    <strong>{nickname}</strong>
                  </div>
                )}

                {showGrade && (
                  <div className="certificateProfileItem">
                    <span>GRADE</span>
                    <strong>{grade}</strong>
                  </div>
                )}

                {showDepartment && (
                  <div className="certificateProfileItem">
                    <span>DEPARTMENT</span>
                    <strong>{department}</strong>
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

            <div className="certificateActions">

              <button
                type="button"
                onClick={
                  downloadCertificate
                }
              >
                達成証を保存
              </button>

              <button
                type="button"
                className="primary"
                onClick={
                  shareCertificate
                }
              >
                SNSで共有
              </button>

            </div>

          </section>
        )}

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

        {message && (
          <p className="rewardMessage">
            {message}
          </p>
        )}

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