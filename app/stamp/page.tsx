"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

import { pokipoSpots } from "../data/pokipo-data";

/* ========================================
   SECRET QR
======================================== */

const SECRET_QR_VALUE =
  "pokipo-yuhisai-lipost-2026";

/* ========================================
   CAMPUS MAP PINS
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
     LOAD
  ======================================== */

  useEffect(() => {
    const savedScans =
      localStorage.getItem(
        "pokipo_scans"
      );

    if (savedScans) {
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
     CAMERA
  ======================================== */

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    let cancelled =
      false;

    async function startCamera() {
      const readerElement =
        document.getElementById(
          "pokipo-qr-reader"
        );

      if (!readerElement) {
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
                230,

              height:
                230,
            },
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

            const qrValue =
              decodedText.trim();

            /* SECRET */

            if (
              qrValue ===
              SECRET_QR_VALUE
            ) {
              processingQrRef.current =
                true;

              await stopQrScanner();

              scanSecretSpot();

              return;
            }

            /* NORMAL */

            const spotExists =
              pokipoSpots.some(
                (spot) =>
                  spot.id ===
                  qrValue
              );

            if (!spotExists) {
              setMessage(
                "このQRコードはPOKIPOのQRではありません。"
              );

              return;
            }

            processingQrRef.current =
              true;

            await stopQrScanner();

            scanSpot(
              qrValue
            );
          },

          () => {}
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

    startCamera();

    return () => {
      cancelled =
        true;
    };
  }, [cameraOpen]);

  /* ========================================
     COMPLETE
  ======================================== */

  const completed =
    scans.length >= 5;

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
     QR START
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
     QR STOP
  ======================================== */

  async function stopQrScanner() {
    const scanner =
      scannerRef.current;

    scannerRef.current =
      null;

    if (!scanner) {
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
     SCAN SPOT
  ======================================== */

  function scanSpot(
    spotId: string
  ) {
    const targetSpot =
      pokipoSpots.find(
        (spot) =>
          spot.id ===
          spotId
      );

    if (!targetSpot) {
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

    /* COMPLETE */

    if (
      updatedScans.length >=
      5
    ) {
      localStorage.setItem(
        "pokipo_completed",
        "true"
      );

      const existingCompletedAt =
        localStorage.getItem(
          "pokipo_completed_at"
        );

      if (!existingCompletedAt) {
        const now =
          new Date();

        const formatted =
          `${now.getFullYear()}/` +
          `${String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}/` +
          `${String(
            now.getDate()
          ).padStart(
            2,
            "0"
          )} ` +
          `${String(
            now.getHours()
          ).padStart(
            2,
            "0"
          )}:` +
          `${String(
            now.getMinutes()
          ).padStart(
            2,
            "0"
          )}`;

        localStorage.setItem(
          "pokipo_completed_at",
          formatted
        );
      }
    }

    /* KNOWLEDGE */

    setNewKnowledge(
      targetSpot.knowledgeText
    );

    setNewKnowledgeTitle(
      targetSpot.knowledgeTitle
    );

    setPendingKnowledgeId(
      targetSpot.knowledgeId
    );

    /* QUIZ */

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

    /* EFFECT */

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

    processingQrRef.current =
      false;
  }

  /* ========================================
     NORMALIZE ANSWER
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

  function checkTriviaAnswer() {
    if (
      !quizInput.trim()
    ) {
      return;
    }

    const normalizedInput =
      normalizeAnswer(
        quizInput
      );

    const normalizedCorrectAnswer =
      normalizeAnswer(
        quizAnswer
      );

    if (
      normalizedInput ===
      normalizedCorrectAnswer
    ) {
      setQuizCorrect(
        true
      );

      setQuizError(
        false
      );

      /* 図鑑保存 */

      if (
        pendingKnowledgeId
      ) {
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

      return;
    }

    setQuizCorrect(
      false
    );

    setQuizError(
      true
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
     SECRET STAMP
  ======================================== */

  function scanSecretSpot() {
    if (
      scans.length < 5
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

  /* ========================================
     SECRET CLOSE
  ======================================== */

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
        (spot) =>
          spot.id ===
          spotId
      );

    if (!targetSpot) {
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
              {scans.length * 20}%
            </strong>

          </div>

          <div className="progressBar">

            <div
              className="progressBarFill"
              style={{
                width:
                  `${scans.length * 20}%`,
              }}
            />

          </div>

        </section>

        {/* QR */}

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
                どのスポットからでも読み取れます。
              </p>

            </div>
          )}

          {cameraError && (
            <p className="error">
              {cameraError}
            </p>
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
                (pin) => {
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
            (spot) => {
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
                  ]
                    .filter(Boolean)
                    .join(" ")}
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

        {/* RESULT */}

        {message && (
          <section className="scanResultCard">

            <strong>
              {message}
            </strong>

          </section>
        )}

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

      {/* NORMAL GET */}

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

            {/* POCKY STEP */}

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

            {/* TRIVIA */}

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
                            checkTriviaAnswer();
                          }
                        }}
                        placeholder="答えを入力"
                        className="triviaQuizInput"
                      />

                      <button
                        type="button"
                        className="triviaQuizCheckButton"
                        onClick={
                          checkTriviaAnswer
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

      {/* SECRET GET */}

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
  );
}