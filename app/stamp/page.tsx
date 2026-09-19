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
  pokipoSpots,
} from "../data/pokipo-data";

import {
  supabase,
} from "../../lib/supabase-client";

import MaintenanceGate
  from "../../components/MaintenanceGate";

/* ========================================
   SPECIAL QR
======================================== */

const SECRET_QR_VALUE =
  "pokipo-yuhisai-lipost-2026";

const TEST_STAFF_QR_VALUE =
  "test-staff-qr";

/* ========================================
   CAMPUS MAP
======================================== */

const mapPins = [
  {
    id: "spot1",
    number: 1,
    label: "学生センター 1F",
    top: "38%",
    left: "50%",
  },
  {
    id: "spot2",
    number: 2,
    label: "東棟 2F",
    top: "54%",
    left: "50%",
  },
  {
    id: "spot3",
    number: 3,
    label: "中央棟 1F",
    top: "52%",
    left: "36.5%",
  },
  {
    id: "spot4",
    number: 4,
    label: "西棟 3F",
    top: "56%",
    left: "18%",
  },
  {
    id: "spot5",
    number: 5,
    label: "35周年記念館 1F",
    top: "78%",
    left: "62.5%",
  },
];

/* ========================================
   PAGE
======================================== */

export default function StampPage() {
  const router =
    useRouter();

  /* ========================================
     STAMPS
  ======================================== */

  const [
    scans,
    setScans,
  ] = useState<string[]>([]);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     KNOWLEDGE
  ======================================== */

  const [
    newKnowledge,
    setNewKnowledge,
  ] = useState("");

  const [
    newKnowledgeTitle,
    setNewKnowledgeTitle,
  ] = useState("");

  /* ========================================
     GET EFFECT
  ======================================== */

  const [
    showGetEffect,
    setShowGetEffect,
  ] = useState(false);

  const [
    getSpotName,
    setGetSpotName,
  ] = useState("");

  /* ========================================
     POCKY STEP
  ======================================== */

  const [
    achievedStepCount,
    setAchievedStepCount,
  ] = useState(0);

  /* ========================================
     TRIVIA
  ======================================== */

  const [
    triviaReady,
    setTriviaReady,
  ] = useState(false);

  const [
    quizQuestion,
    setQuizQuestion,
  ] = useState("");

  const [
    quizAnswer,
    setQuizAnswer,
  ] = useState("");

  const [
    quizHint,
    setQuizHint,
  ] = useState("");

  const [
    quizInput,
    setQuizInput,
  ] = useState("");

  const [
    quizCorrect,
    setQuizCorrect,
  ] = useState(false);

  const [
    quizError,
    setQuizError,
  ] = useState(false);

  const [
    pendingKnowledgeId,
    setPendingKnowledgeId,
  ] = useState("");

  const triviaTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /* ========================================
     SECRET
  ======================================== */

  const [
    secretStamp,
    setSecretStamp,
  ] = useState(false);

  const [
    secretGetEffect,
    setSecretGetEffect,
  ] = useState(false);

  /* ========================================
     STAFF TEST
  ======================================== */

  const [
    showTestWarning,
    setShowTestWarning,
  ] = useState(false);

  const [
    showTestPanel,
    setShowTestPanel,
  ] = useState(false);

  const [
    applyingTestMode,
    setApplyingTestMode,
  ] = useState(false);

  const [
    testModeError,
    setTestModeError,
  ] = useState("");

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

  const processingQrRef =
    useRef(false);

  /* ========================================
     PARTICIPANT ID
  ======================================== */

  function getParticipantId() {
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

  /* ========================================
     FORMAT DATE
  ======================================== */

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
     QR NORMALIZE
  ======================================== */

  function normalizeQrValue(
    value: string
  ) {
    return value
      .normalize("NFKC")
      .replace(
        /\u200B/g,
        ""
      )
      .replace(
        /\r/g,
        ""
      )
      .replace(
        /\n/g,
        ""
      )
      .trim()
      .toLowerCase();
  }

  /* ========================================
     STAFF TEST QR CHECK
  ======================================== */

  function isStaffTestQr(
    value: string
  ) {
    const normalized =
      normalizeQrValue(
        value
      );

    if (
      normalized ===
      TEST_STAFF_QR_VALUE
    ) {
      return true;
    }

    try {
      const decoded =
        decodeURIComponent(
          normalized
        );

      if (
        decoded ===
        TEST_STAFF_QR_VALUE
      ) {
        return true;
      }

      if (
        decoded.includes(
          `code=${TEST_STAFF_QR_VALUE}`
        )
      ) {
        return true;
      }

      if (
        decoded.endsWith(
          `#${TEST_STAFF_QR_VALUE}`
        )
      ) {
        return true;
      }
    } catch {
      // decodeできない場合は無視
    }

    return false;
  }

  /* ========================================
     LOAD STAMPS
  ======================================== */

  useEffect(() => {
    async function loadStampData() {
      const participantId =
        getParticipantId();

      if (
        !participantId
      ) {
        const savedScans =
          localStorage.getItem(
            "pokipo_scans"
          );

        if (
          savedScans
        ) {
          try {
            const parsed =
              JSON.parse(
                savedScans
              );

            if (
              Array.isArray(
                parsed
              )
            ) {
              setScans(
                parsed
              );
            }
          } catch {
            setScans([]);
          }
        }

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
          "スタンプ履歴取得エラー:",
          error
        );

        return;
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

      setScans(
        serverScans
      );

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(
          serverScans
        )
      );

      localStorage.setItem(
        "pokipo_progress",
        String(
          Math.min(
            serverScans.length,
            5
          )
        )
      );

      localStorage.setItem(
        "pokipo_completed",
        serverScans.length >= 5
          ? "true"
          : "false"
      );
    }

    void loadStampData();

    const savedSecret =
      localStorage.getItem(
        "pokipo_secret_yuhisai"
      ) === "true";

    setSecretStamp(
      savedSecret
    );
  }, []);

  /* ========================================
     TIMER CLEANUP
  ======================================== */

  useEffect(() => {
    return () => {
      if (
        triviaTimerRef.current
      ) {
        clearTimeout(
          triviaTimerRef.current
        );
      }
    };
  }, []);

  /* ========================================
     QR DECODE HANDLER
  ======================================== */

  async function handleDecodedQr(
    decodedText: string
  ) {
    const qrValue =
      normalizeQrValue(
        decodedText
      );

    console.log(
      "POKIPO QR RAW:",
      JSON.stringify(
        decodedText
      )
    );

    console.log(
      "POKIPO QR NORMALIZED:",
      qrValue
    );

    /* =================================
       STAFF TEST
    ================================= */

    if (
      isStaffTestQr(
        decodedText
      )
    ) {
      processingQrRef.current =
        true;

      await stopQrScanner();

      setCameraError("");

      setMessage("");

      setTestModeError("");

      setShowTestPanel(
        false
      );

      setShowTestWarning(
        true
      );

      return;
    }

    /* =================================
       SECRET
    ================================= */

    if (
      qrValue ===
      normalizeQrValue(
        SECRET_QR_VALUE
      )
    ) {
      processingQrRef.current =
        true;

      await stopQrScanner();

      scanSecretSpot();

      return;
    }

    /* =================================
       NORMAL
    ================================= */

    const targetSpot =
      pokipoSpots.find(
        (
          spot
        ) =>
          normalizeQrValue(
            spot.id
          ) ===
          qrValue
      );

    if (
      !targetSpot
    ) {
      setMessage(
        "このQRコードはPOKIPOのQRではありません。"
      );

      processingQrRef.current =
        false;

      return;
    }

    processingQrRef.current =
      true;

    await stopQrScanner();

    await scanSpot(
      targetSpot.id
    );
  }

  /* ========================================
     CAMERA
  ======================================== */

  useEffect(() => {
    if (
      !cameraOpen
    ) {
      return;
    }

    let cancelled =
      false;

    async function startCamera() {
      const readerElement =
        document.getElementById(
          "pokipo-qr-reader"
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
            "pokipo-qr-reader"
          );

        scannerRef.current =
          scanner;

        scanningRef.current =
          true;

        processingQrRef.current =
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

            aspectRatio:
              1,
          },

          async (
            decodedText
          ) => {
            if (
              cancelled ||
              processingQrRef.current
            ) {
              return;
            }

            processingQrRef.current =
              true;

            await handleDecodedQr(
              decodedText
            );
          },

          () => {
            // 読み取り途中エラーは無視
          }
        );
      } catch (
        error
      ) {
        console.error(
          "QRカメラ起動エラー:",
          error
        );

        scannerRef.current =
          null;

        scanningRef.current =
          false;

        processingQrRef.current =
          false;

        setCameraError(
          "カメラを起動できませんでした。ブラウザのカメラ使用を許可してください。"
        );

        setCameraOpen(
          false
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
  ]);

  /* ========================================
     STATUS
  ======================================== */

  const completed =
    scans.length >=
    5;

  /* ========================================
     POCKY STEP
  ======================================== */

  function getPockyStep(
    stampCount: number
  ) {
    switch (
      stampCount
    ) {
      case 1:
        return {
          step:
            "STEP 1",
          title:
            "材料をそろえる",
          description:
            "ポッキーづくりがスタート！小麦粉など、プレッツェルやチョコレートにつながる材料をそろえました。",
        };

      case 2:
        return {
          step:
            "STEP 2",
          title:
            "生地をつくる",
          description:
            "材料を混ぜ合わせて、ポッキーのプレッツェル部分になる生地ができてきました。",
        };

      case 3:
        return {
          step:
            "STEP 3",
          title:
            "プレッツェルを焼く",
          description:
            "生地を焼き上げて、ポッキーの芯になるプレッツェルが完成しました。",
        };

      case 4:
        return {
          step:
            "STEP 4",
          title:
            "チョコレートをまとわせる",
          description:
            "焼き上がったプレッツェルにチョコレートをまとわせて、いよいよポッキーらしい姿に！",
        };

      case 5:
      default:
        return {
          step:
            "STEP 5",
          title:
            "ポッキー完成！",
          description:
            "プレッツェルとチョコレートがそろって、ついにポッキーが完成しました！",
        };
    }
  }

  const currentPockyStep =
    getPockyStep(
      Math.max(
        1,
        Math.min(
          achievedStepCount ||
            scans.length ||
            1,
          5
        )
      )
    );

  /* ========================================
     START QR
  ======================================== */

  function startQrScanner() {
    if (
      scanningRef.current
    ) {
      return;
    }

    setCameraError("");

    setMessage("");

    processingQrRef.current =
      false;

    setCameraOpen(
      true
    );
  }

  /* ========================================
     STOP QR
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
        "QRカメラ停止エラー:",
        error
      );
    } finally {
      scanningRef.current =
        false;

      setCameraOpen(
        false
      );
    }
  }

  /* ========================================
     TEST WARNING
  ======================================== */

  function cancelStaffTest() {
    setShowTestWarning(
      false
    );

    setShowTestPanel(
      false
    );

    setTestModeError("");

    processingQrRef.current =
      false;
  }

  function openStaffTestPanel() {
    setShowTestWarning(
      false
    );

    setShowTestPanel(
      true
    );

    setTestModeError("");
  }

  /* ========================================
     TEST APPLY
  ======================================== */

  async function completeStaffTest() {
    const participantId =
      getParticipantId();

    if (
      !participantId
    ) {
      setTestModeError(
        "参加者情報を確認できませんでした。トップ画面から参加登録を行ってください。"
      );

      return;
    }

    setApplyingTestMode(
      true
    );

    setTestModeError("");

    try {
      const {
        data:
          currentStampData,
        error:
          currentStampError,
      } =
        await supabase.rpc(
          "get_pokipo_stamps",
          {
            p_participant_id:
              participantId,
          }
        );

      if (
        currentStampError
      ) {
        console.error(
          "テスト用現在スタンプ取得エラー:",
          currentStampError
        );

        throw currentStampError;
      }

      const alreadyCollected =
        new Set(
          (
            currentStampData ??
            []
          ).map(
            (
              item: {
                spot_id: string;
              }
            ) =>
              item.spot_id
          )
        );

      for (
        const spot of pokipoSpots
      ) {
        if (
          alreadyCollected.has(
            spot.id
          )
        ) {
          continue;
        }

        const {
          error,
        } =
          await supabase.rpc(
            "record_pokipo_stamp",
            {
              p_participant_id:
                participantId,

              p_spot_id:
                spot.id,
            }
          );

        if (
          error
        ) {
          console.error(
            `テスト用スタンプ保存エラー ${spot.id}:`,
            error
          );

          throw error;
        }
      }

      for (
        const spot of pokipoSpots
      ) {
        try {
          const {
            error,
          } =
            await supabase.rpc(
              "record_pokipo_knowledge",
              {
                p_participant_id:
                  participantId,

                p_knowledge_id:
                  spot.knowledgeId,
              }
            );

          if (
            error
          ) {
            console.error(
              `テスト用豆知識保存エラー ${spot.knowledgeId}:`,
              error
            );
          }
        } catch (
          error
        ) {
          console.error(
            "テスト用豆知識保存通信エラー:",
            error
          );
        }
      }

      const {
        data:
          completionData,
        error:
          completionError,
      } =
        await supabase.rpc(
          "record_pokipo_completion",
          {
            p_participant_id:
              participantId,
          }
        );

      if (
        completionError
      ) {
        console.error(
          "テスト用完走記録保存エラー:",
          completionError
        );
      }

      if (
        completionData &&
        completionData.length >
          0
      ) {
        const completion =
          completionData[0];

        if (
          completion.completed_at
        ) {
          localStorage.setItem(
            "pokipo_completed_at",
            formatDateTime(
              completion.completed_at
            )
          );
        }

        if (
          completion.achievement_rank !==
            null &&
          completion.achievement_rank !==
            undefined
        ) {
          localStorage.setItem(
            "pokipo_achievement_rank",
            String(
              completion.achievement_rank
            )
          );
        }
      }

      const allSpotIds =
        pokipoSpots.map(
          (
            spot
          ) =>
            spot.id
        );

      const allKnowledgeIds =
        pokipoSpots.map(
          (
            spot
          ) =>
            spot.knowledgeId
        );

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(
          allSpotIds
        )
      );

      localStorage.setItem(
        "pokipo_progress",
        "5"
      );

      localStorage.setItem(
        "pokipo_completed",
        "true"
      );

      localStorage.setItem(
        "pokipo_knowledge",
        JSON.stringify(
          allKnowledgeIds
        )
      );

      setScans(
        allSpotIds
      );

      setAchievedStepCount(
        5
      );

      setShowTestPanel(
        false
      );

      setShowTestWarning(
        false
      );

      setMessage(
        "スタッフテストモード：5つのスタンプを取得済みにしました。"
      );

      processingQrRef.current =
        false;
    } catch (
      error
    ) {
      console.error(
        "スタッフテストモードエラー:",
        error
      );

      setTestModeError(
        "テスト状態を保存できませんでした。通信環境を確認してもう一度お試しください。"
      );
    } finally {
      setApplyingTestMode(
        false
      );
    }
  }

  /* ========================================
     NORMAL STAMP
  ======================================== */

  async function scanSpot(
    spotId: string
  ) {
    const targetSpot =
      pokipoSpots.find(
        (
          spot
        ) =>
          spot.id ===
          spotId
      );

    if (
      !targetSpot
    ) {
      setMessage(
        "このQRコードはPOKIPOのQRではありません。"
      );

      processingQrRef.current =
        false;

      return;
    }

    if (
      scans.includes(
        spotId
      )
    ) {
      setMessage(
        `${targetSpot.spotName}のスタンプは取得済みです。`
      );

      processingQrRef.current =
        false;

      return;
    }

    const participantId =
      getParticipantId();

    if (
      !participantId
    ) {
      setMessage(
        "参加者情報を確認できませんでした。トップ画面からもう一度お試しください。"
      );

      processingQrRef.current =
        false;

      return;
    }

    try {
      const {
        error:
          stampSaveError,
      } =
        await supabase.rpc(
          "record_pokipo_stamp",
          {
            p_participant_id:
              participantId,

            p_spot_id:
              spotId,
          }
        );

      if (
        stampSaveError
      ) {
        console.error(
          "スタンプSupabase保存エラー:",
          stampSaveError
        );

        setMessage(
          "スタンプ情報を保存できませんでした。通信環境を確認して、もう一度QRを読み取ってください。"
        );

        return;
      }

      const updatedScans = [
        ...scans,
        spotId,
      ];

      const nextCount =
        Math.min(
          updatedScans.length,
          5
        );

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(
          updatedScans
        )
      );

      localStorage.setItem(
        "pokipo_progress",
        String(
          nextCount
        )
      );

      setScans(
        updatedScans
      );

      setAchievedStepCount(
        nextCount
      );

      if (
        updatedScans.length >=
        5
      ) {
        localStorage.setItem(
          "pokipo_completed",
          "true"
        );

        try {
          const {
            data:
              completionData,
            error:
              completionError,
          } =
            await supabase.rpc(
              "record_pokipo_completion",
              {
                p_participant_id:
                  participantId,
              }
            );

          if (
            completionError
          ) {
            console.error(
              "完走記録保存エラー:",
              completionError
            );
          } else if (
            completionData &&
            completionData.length >
              0
          ) {
            const completion =
              completionData[0];

            if (
              completion.completed_at
            ) {
              localStorage.setItem(
                "pokipo_completed_at",
                formatDateTime(
                  completion.completed_at
                )
              );
            }

            if (
              completion.achievement_rank !==
                null &&
              completion.achievement_rank !==
                undefined
            ) {
              localStorage.setItem(
                "pokipo_achievement_rank",
                String(
                  completion.achievement_rank
                )
              );
            }
          }
        } catch (
          error
        ) {
          console.error(
            "完走記録通信エラー:",
            error
          );
        }
      }

      setNewKnowledge(
        targetSpot.knowledgeText
      );

      setNewKnowledgeTitle(
        targetSpot.knowledgeTitle
      );

      setPendingKnowledgeId(
        targetSpot.knowledgeId
      );

      setQuizQuestion(
        targetSpot.quizQuestion
      );

      setQuizAnswer(
        targetSpot.quizAnswer
      );

      setQuizHint(
        targetSpot.quizHint
      );

      setQuizInput("");

      setQuizCorrect(
        false
      );

      setQuizError(
        false
      );

      setGetSpotName(
        targetSpot.spotName
      );

      setMessage(
        `${targetSpot.spotName}のスタンプを獲得しました！`
      );

      setTriviaReady(
        false
      );

      if (
        triviaTimerRef.current
      ) {
        clearTimeout(
          triviaTimerRef.current
        );
      }

      triviaTimerRef.current =
        setTimeout(
          () => {
            setTriviaReady(
              true
            );
          },
          650
        );

      setShowGetEffect(
        true
      );
    } catch (
      error
    ) {
      console.error(
        "スタンプ保存エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      processingQrRef.current =
        false;
    }
  }

  /* ========================================
     ANSWER NORMALIZE
  ======================================== */

  function normalizeAnswer(
    value: string
  ) {
    return value
      .replace(
        /[！-～]/g,
        (
          character
        ) =>
          String.fromCharCode(
            character.charCodeAt(
              0
            ) -
              0xfee0
          )
      )
      .replace(
        /　/g,
        ""
      )
      .replace(
        /\s+/g,
        ""
      )
      .trim()
      .toLowerCase();
  }

  /* ========================================
     QUIZ CHECK
  ======================================== */

  async function checkTriviaAnswer() {
    if (
      !quizInput.trim()
    ) {
      return;
    }

    const normalizedInput =
      normalizeAnswer(
        quizInput
      );

    const normalizedCorrect =
      normalizeAnswer(
        quizAnswer
      );

    if (
      normalizedInput !==
      normalizedCorrect
    ) {
      setQuizCorrect(
        false
      );

      setQuizError(
        true
      );

      return;
    }

    setQuizCorrect(
      true
    );

    setQuizError(
      false
    );

    if (
      !pendingKnowledgeId
    ) {
      return;
    }

    const participantId =
      getParticipantId();

    if (
      participantId
    ) {
      try {
        const {
          error,
        } =
          await supabase.rpc(
            "record_pokipo_knowledge",
            {
              p_participant_id:
                participantId,

              p_knowledge_id:
                pendingKnowledgeId,
            }
          );

        if (
          error
        ) {
          console.error(
            "豆知識Supabase保存エラー:",
            error
          );
        }
      } catch (
        error
      ) {
        console.error(
          "豆知識保存通信エラー:",
          error
        );
      }
    }

    const savedKnowledge =
      localStorage.getItem(
        "pokipo_knowledge"
      );

    let knowledgeList:
      string[] = [];

    if (
      savedKnowledge
    ) {
      try {
        const parsed =
          JSON.parse(
            savedKnowledge
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          knowledgeList =
            parsed;
        }
      } catch {
        knowledgeList =
          [];
      }
    }

    if (
      !knowledgeList.includes(
        pendingKnowledgeId
      )
    ) {
      knowledgeList.push(
        pendingKnowledgeId
      );
    }

    localStorage.setItem(
      "pokipo_knowledge",
      JSON.stringify(
        knowledgeList
      )
    );
  }

  /* ========================================
     CLOSE GET
  ======================================== */

  function closeGetEffect() {
    if (
      !quizCorrect
    ) {
      return;
    }

    if (
      triviaTimerRef.current
    ) {
      clearTimeout(
        triviaTimerRef.current
      );

      triviaTimerRef.current =
        null;
    }

    setShowGetEffect(
      false
    );

    setMessage("");

    setNewKnowledge("");

    setNewKnowledgeTitle("");

    setPendingKnowledgeId("");

    setAchievedStepCount(
      0
    );

    setTriviaReady(
      false
    );

    setQuizQuestion("");

    setQuizAnswer("");

    setQuizHint("");

    setQuizInput("");

    setQuizCorrect(
      false
    );

    setQuizError(
      false
    );
  }

  /* ========================================
     SECRET
  ======================================== */

  function scanSecretSpot() {
    if (
      scans.length <
      5
    ) {
      setMessage(
        "雄飛祭シークレットスタンプは、通常5つのスタンプをすべて集めた人だけ獲得できます。"
      );

      processingQrRef.current =
        false;

      return;
    }

    if (
      secretStamp
    ) {
      setMessage(
        "雄飛祭 LiPostブースのシークレットスタンプは取得済みです。"
      );

      processingQrRef.current =
        false;

      return;
    }

    const now =
      new Date();

    localStorage.setItem(
      "pokipo_secret_yuhisai",
      "true"
    );

    localStorage.setItem(
      "pokipo_secret_yuhisai_at",
      now.toISOString()
    );

    setSecretStamp(
      true
    );

    setSecretGetEffect(
      true
    );

    setMessage(
      "雄飛祭 LiPostブースのシークレットスタンプを獲得しました！"
    );

    processingQrRef.current =
      false;
  }

  function closeSecretEffect() {
    setSecretGetEffect(
      false
    );

    router.push(
      "/home"
    );
  }

  /* ========================================
     MAP
  ======================================== */

  function showMapSpot(
    spotId: string
  ) {
    const targetSpot =
      pokipoSpots.find(
        (
          spot
        ) =>
          spot.id ===
          spotId
      );

    if (
      !targetSpot
    ) {
      return;
    }

    setMessage(
      `${targetSpot.number}番：${targetSpot.spotName}`
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <MaintenanceGate page="stamp">

      <main className="shell">

        <section className="card stampPage">

          {/* HEADER */}

          <header className="stampHeader">

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

              <p className="stampEyebrow">
                POCKY JOURNEY
              </p>

              <h1>
                スタンプラリー
              </h1>

            </div>

            <div className="stampCountBadge">
              {scans.length}/5
            </div>

          </header>

          {/* PROGRESS */}

          <section className="stampProgressCard">

            <div className="stampProgressTop">

              <div>

                <p>
                  現在の進捗
                </p>

                <h2>
                  {completed
                    ? "全スポット制覇！"
                    : `あと${5 - scans.length}か所`}
                </h2>

              </div>

              <strong>
                {Math.min(
                  scans.length,
                  5
                ) * 20}
                %
              </strong>

            </div>

            <div className="progressBar">

              <div
                className="progressBarFill"
                style={{
                  width:
                    `${Math.min(
                      scans.length,
                      5
                    ) * 20}%`,
                }}
              />

            </div>

          </section>

          {/* ========================================
              QR SCANNER
          ======================================== */}

          <section className="qrScannerSection">

            {!cameraOpen ? (
              <button
                type="button"
                className="qrCameraButton"
                onClick={
                  startQrScanner
                }
              >

                <span className="qrCameraIcon">
                  QR
                </span>

                <span>

                  <strong>
                    QRコードを読み取る
                  </strong>

                  <small>
                    5か所どこからでもOK
                  </small>

                </span>

                <span className="buttonArrow">
                  ›
                </span>

              </button>
            ) : (
              <div className="qrCameraPanel">

                <div className="qrCameraHeader">

                  <div>

                    <p>
                      QR SCANNER
                    </p>

                    <h2>
                      QRコードを枠内に合わせてください
                    </h2>

                  </div>

                  <button
                    type="button"
                    className="qrCloseButton"
                    onClick={
                      stopQrScanner
                    }
                  >
                    ×
                  </button>

                </div>

                <div
                  id="pokipo-qr-reader"
                  className="qrReader"
                />

                <p className="qrCameraHelp">
                  QRコード全体が枠内に入るようにしてください。
                </p>

              </div>
            )}

            {cameraError && (
              <div className="qrScanMessage errorMessage">

                <span className="qrScanMessageIcon">
                  !
                </span>

                <div>

                  <span>
                    CAMERA ERROR
                  </span>

                  <strong>
                    {cameraError}
                  </strong>

                </div>

              </div>
            )}

            {message && (
              <div className="qrScanMessage">

                <span className="qrScanMessageIcon">
                  !
                </span>

                <div>

                  <span>
                    QR MESSAGE
                  </span>

                  <strong>
                    {message}
                  </strong>

                </div>

              </div>
            )}

          </section>

          {/* MAP */}

          <section className="stampMapSection">

            <div className="stampMapHeader">

              <div>

                <p className="stampMapEyebrow">
                  CAMPUS MAP
                </p>

                <h2>
                  スポットマップ
                </h2>

              </div>

              <span className="stampMapNote">
                ①〜⑤の掲示場所
              </span>

            </div>

            <div className="stampMapCard">

              <div className="stampMapImageWrap">

                <img
                  src="/images/pokipo-campus-map.png"
                  alt="POKIPO スタンプラリーキャンパスマップ"
                  className="stampMapImage"
                />

                {mapPins.map(
                  (
                    pin
                  ) => {
                    const collected =
                      scans.includes(
                        pin.id
                      );

                    return (
                      <button
                        key={
                          pin.id
                        }
                        type="button"
                        className={
                          collected
                            ? "stampMapPin collected"
                            : "stampMapPin"
                        }
                        style={{
                          top:
                            pin.top,
                          left:
                            pin.left,
                        }}
                        onClick={() =>
                          showMapSpot(
                            pin.id
                          )
                        }
                      >

                        <span className="stampMapPinNumber">

                          <span>
                            {collected
                              ? "✓"
                              : pin.number}
                          </span>

                        </span>

                        <span className="stampMapPinLabel">
                          {pin.label}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

          </section>

          {/* SPOTS */}

          <section className="spotList">

            {pokipoSpots.map(
              (
                spot
              ) => {
                const collected =
                  scans.includes(
                    spot.id
                  );

                return (
                  <article
                    key={
                      spot.id
                    }
                    className={[
                      "spotCard",
                      collected
                        ? "collected"
                        : "available",
                    ].join(" ")}
                  >

                    <div className="spotTimeline">

                      <div className="spotCircle">

                        {collected
                          ? "✓"
                          : spot.number}

                      </div>

                      {spot.number <
                        5 && (
                        <div className="spotLine" />
                      )}

                    </div>

                    <div className="spotContent">

                      <p className="spotStatus">

                        {collected
                          ? "STAMP GET!"
                          : "AVAILABLE"}

                      </p>

                      <h2>
                        {spot.spotName}
                      </h2>

                      <p>

                        {collected
                          ? "このスポットはクリア済みです。"
                          : "この場所のQRコードを見つけて読み込もう！"}

                      </p>

                    </div>

                  </article>
                );
              }
            )}

          </section>

          {/* COMPLETE */}

          {completed && (
            <button
              type="button"
              className="mainActionButton"
              onClick={() =>
                router.push(
                  "/home"
                )
              }
            >

              <span>

                <strong>
                  コンプリート！
                </strong>

                <small>
                  トップ画面で特典を確認しよう
                </small>

              </span>

              <span className="buttonArrow">
                ›
              </span>

            </button>
          )}

        </section>

        {/* ========================================
            STAFF TEST WARNING
        ======================================== */}

        {showTestWarning && (
          <div className="staffTestOverlay">

            <section className="staffTestWarningCard">

              <div className="staffTestWarningIcon">
                !
              </div>

              <span>
                WARNING
              </span>

              <h2>
                スタッフテスト用QRです
              </h2>

              <p>
                このQRはPOKIPOの
                動作確認用テストQRです。
              </p>

              <p className="staffTestWarningImportant">
                続けると、
                全5スポットのクイズ・正解・ヒント・解説を表示します。
              </p>

              <p>
                最後に
                <strong>
                  「5スタンプ取得状態にする」
                </strong>
                を押すと、
                この参加者は5/5の状態になります。
              </p>

              <h3>
                テスト画面を表示します。
                続けますか？
              </h3>

              <div className="staffTestWarningActions">

                <button
                  type="button"
                  className="cancel"
                  onClick={
                    cancelStaffTest
                  }
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="continue"
                  onClick={
                    openStaffTestPanel
                  }
                >
                  続ける
                </button>

              </div>

            </section>

          </div>
        )}

        {/* ========================================
            STAFF TEST PANEL
        ======================================== */}

        {showTestPanel && (
          <div className="staffTestOverlay">

            <section className="staffTestPanel">

              <div className="staffTestPanelHeader">

                <div>

                  <span>
                    STAFF TEST MODE
                  </span>

                  <h2>
                    POKIPOテスト確認
                  </h2>

                  <p>
                    全スポットの内容を
                    一覧で確認できます。
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    cancelStaffTest
                  }
                  disabled={
                    applyingTestMode
                  }
                >
                  ×
                </button>

              </div>

              <div className="staffTestQuizList">

                {pokipoSpots.map(
                  (
                    spot
                  ) => (
                    <article
                      key={
                        spot.id
                      }
                      className="staffTestQuizCard"
                    >

                      <div className="staffTestQuizTop">

                        <span>
                          SPOT {spot.number}
                        </span>

                        <strong>
                          {spot.spotName}
                        </strong>

                      </div>

                      <div className="staffTestQuizSection">

                        <span>
                          QUESTION
                        </span>

                        <p>
                          {spot.quizQuestion}
                        </p>

                      </div>

                      <div className="staffTestQuizSection answer">

                        <span>
                          ANSWER
                        </span>

                        <strong>
                          {spot.quizAnswer}
                        </strong>

                      </div>

                      <div className="staffTestQuizSection">

                        <span>
                          HINT
                        </span>

                        <p>
                          {spot.quizHint}
                        </p>

                      </div>

                      <div className="staffTestQuizSection knowledge">

                        <span>
                          解説・豆知識
                        </span>

                        <h3>
                          {spot.knowledgeTitle}
                        </h3>

                        <p>
                          {spot.knowledgeText}
                        </p>

                      </div>

                    </article>
                  )
                )}

              </div>

              {testModeError && (
                <p className="staffTestError">
                  {testModeError}
                </p>
              )}

              <div className="staffTestFinalNotice">

                <strong>
                  テストを完了すると
                </strong>

                <p>
                  5スポットすべての
                  スタンプと豆知識を取得済みにして、
                  通常のコンプリート状態にします。
                </p>

              </div>

              <div className="staffTestPanelActions">

                <button
                  type="button"
                  className="cancel"
                  disabled={
                    applyingTestMode
                  }
                  onClick={
                    cancelStaffTest
                  }
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="apply"
                  disabled={
                    applyingTestMode
                  }
                  onClick={() =>
                    void completeStaffTest()
                  }
                >

                  {applyingTestMode
                    ? "保存中..."
                    : "5スタンプ取得状態にする"}

                </button>

              </div>

            </section>

          </div>
        )}

        {/* ========================================
            NORMAL STAMP GET
        ======================================== */}

        {showGetEffect && (
          <div className="stampGetOverlay">

            <div className="stampGetBurst burst1">
              ✦
            </div>

            <div className="stampGetBurst burst2">
              ✦
            </div>

            <div className="stampGetBurst burst3">
              ✦
            </div>

            <div className="stampGetBurst burst4">
              ✦
            </div>

            <section className="stampGetModal">

              <div className="stampGetCircle">
                ✓
              </div>

              <p className="stampGetLabel">
                STAMP GET!
              </p>

              <h2>
                スタンプ獲得！
              </h2>

              <p className="stampGetPlace">
                {getSpotName}
              </p>

              <div className="stampGetProgress">

                <span>
                  {scans.length} / 5
                </span>

                <div className="stampGetProgressBar">

                  <div
                    className="stampGetProgressFill"
                    style={{
                      width:
                        `${Math.min(
                          scans.length *
                            20,
                          100
                        )}%`,
                    }}
                  />

                </div>

              </div>

              <div className="stampGetStep">

                <span>
                  POCKY STEP
                </span>

                <small className="stampGetStepNumber">
                  {currentPockyStep.step}
                </small>

                <strong>
                  {currentPockyStep.title}
                </strong>

                <p className="stampGetStepDescription">
                  {currentPockyStep.description}
                </p>

              </div>

              <div
                className={
                  triviaReady
                    ? "stampGetKnowledge triviaShow"
                    : "stampGetKnowledge triviaWaiting"
                }
              >

                <div className="stampGetKnowledgeIcon">
                  !
                </div>

                <div className="stampGetKnowledgeBody">

                  <span>
                    TRIVIA CHALLENGE
                  </span>

                  {!triviaReady ? (
                    <div className="triviaLoading">

                      <span />
                      <span />
                      <span />

                      <strong>
                        トリビア問題を準備中...
                      </strong>

                    </div>
                  ) : !quizCorrect ? (
                    <>

                      <h3>
                        QRの下の説明から
                        答えを探そう！
                      </h3>

                      <div className="triviaQuizQuestion">

                        <span>
                          QUESTION
                        </span>

                        <strong>
                          {quizQuestion}
                        </strong>

                      </div>

                      <p className="triviaQuizHint">
                        🔍 {quizHint}
                      </p>

                      <div className="triviaQuizInputRow">

                        <input
                          type="text"
                          value={
                            quizInput
                          }
                          onChange={(
                            event
                          ) => {
                            setQuizInput(
                              event.target.value
                            );

                            if (
                              quizError
                            ) {
                              setQuizError(
                                false
                              );
                            }
                          }}
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              void checkTriviaAnswer();
                            }
                          }}
                          placeholder="答えを入力"
                          className="triviaQuizInput"
                        />

                        <button
                          type="button"
                          className="triviaQuizCheckButton"
                          onClick={() =>
                            void checkTriviaAnswer()
                          }
                          disabled={
                            !quizInput.trim()
                          }
                        >
                          答え合わせ
                        </button>

                      </div>

                      {quizError && (
                        <div className="triviaQuizWrong">

                          <strong>
                            惜しい！
                          </strong>

                          <span>
                            QRコードの下にある説明文を
                            もう一度探してみよう。
                          </span>

                        </div>
                      )}

                    </>
                  ) : (
                    <>

                      <div className="triviaQuizCorrect">

                        <span className="triviaCorrectMark">
                          ✓
                        </span>

                        <div>

                          <small>
                            CORRECT!
                          </small>

                          <strong>
                            正解！
                          </strong>

                        </div>

                      </div>

                      <div className="triviaUnlockedContent">

                        <span>
                          NEW KNOWLEDGE UNLOCKED
                        </span>

                        <h3>
                          {newKnowledgeTitle}
                        </h3>

                        <p className="triviaText">
                          {newKnowledge}
                        </p>

                      </div>

                    </>
                  )}

                </div>

              </div>

              {triviaReady &&
                quizCorrect && (
                  <button
                    type="button"
                    className="stampGetCloseButton"
                    onClick={
                      closeGetEffect
                    }
                  >

                    {scans.length >=
                    5
                      ? "コンプリート！"
                      : "次のスポットへ"}

                  </button>
                )}

            </section>

          </div>
        )}

        {/* ========================================
            SECRET
        ======================================== */}

        {secretGetEffect && (
          <div className="stampGetOverlay">

            <section className="stampGetModal">

              <div className="stampGetCircle">
                6
              </div>

              <p className="stampGetLabel">
                SECRET STAMP GET!
              </p>

              <h2>
                雄飛祭スタンプ獲得！
              </h2>

              <p className="stampGetPlace">
                雄飛祭 LiPostブース
              </p>

              <div className="stampGetStep">

                <span>
                  SECRET MODE
                </span>

                <strong>
                  POKIPOが変化しました！
                </strong>

                <p className="stampGetStepDescription">
                  トップ画面で雄飛祭限定の
                  POKIPOを確認してみよう。
                </p>

              </div>

              <button
                type="button"
                className="stampGetCloseButton"
                onClick={
                  closeSecretEffect
                }
              >
                雄飛祭モードを見る
              </button>

            </section>

          </div>
        )}

      </main>

    </MaintenanceGate>
  );
}