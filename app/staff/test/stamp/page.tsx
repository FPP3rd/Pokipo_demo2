
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { pokipoSpots } from "../../../data/pokipo-data";

import {
  getPokipoTestSession,
  getPokipoTestStamps,
  recordPokipoTestStamp,
  recordPokipoTestKnowledge,
  recordPokipoTestCompletion,
} from "../../../../lib/pokipo-test-data";

/* ========================================
   TYPES
======================================== */

type Spot = (typeof pokipoSpots)[number];

type PockyStep = {
  step: string;
  title: string;
  description: string;
};

/* ========================================
   POCKY STEPS
======================================== */

function getPockyStep(count: number): PockyStep {
  switch (count) {
    case 1:
      return {
        step: "STEP 1",
        title: "材料をそろえる",
        description:
          "ポッキーづくりがスタート！小麦粉など、プレッツェルやチョコレートにつながる材料をそろえました。",
      };
    case 2:
      return {
        step: "STEP 2",
        title: "生地をつくる",
        description:
          "材料を混ぜ合わせて、ポッキーのプレッツェル部分になる生地ができてきました。",
      };
    case 3:
      return {
        step: "STEP 3",
        title: "プレッツェルを焼く",
        description:
          "生地を焼き上げて、ポッキーの芯になるプレッツェルが完成しました。",
      };
    case 4:
      return {
        step: "STEP 4",
        title: "チョコレートをまとわせる",
        description:
          "焼き上がったプレッツェルにチョコレートをまとわせて、いよいよポッキーらしい姿に！",
      };
    default:
      return {
        step: "STEP 5",
        title: "ポッキー完成！",
        description:
          "プレッツェルとチョコレートがそろって、ついにポッキーが完成しました！",
      };
  }
}

/* ========================================
   HELPERS
======================================== */

function normalizeQrValue(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u200B/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim()
    .toLowerCase();
}

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

/* ========================================
   PAGE
======================================== */

export default function StaffTestStampPage() {
  const router = useRouter();

  /* AUTH / STAMPS */
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [scans, setScans] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  /* CAMERA */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);

  /* QUIZ / STAMP EFFECT */
  const [activeSpot, setActiveSpot] = useState<Spot | null>(
    null
  );
  const [showGetEffect, setShowGetEffect] = useState(false);
  const [triviaReady, setTriviaReady] = useState(false);
  const [quizInput, setQuizInput] = useState("");
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizError, setQuizError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [achievedCount, setAchievedCount] = useState(0);

  const triviaTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await getPokipoTestSession();

        const stamps = await getPokipoTestStamps();

        if (!mounted) return;

        setScans(
          [...new Set(stamps.map((stamp) => stamp.spot_id))]
        );
        setReady(true);
      } catch (error) {
        if (!mounted) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "検証データの取得に失敗しました。"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (triviaTimerRef.current) {
        clearTimeout(triviaTimerRef.current);
      }
    };
  }, []);

  /* ========================================
     CAMERA STOP
  ======================================== */

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      scanningRef.current = false;
      setCameraOpen(false);
      return;
    }

    try {
      if (scanningRef.current) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn("QRカメラ停止エラー:", error);
    }

    try {
      scanner.clear();
    } catch (error) {
      console.warn("QR表示終了エラー:", error);
    }

    scanningRef.current = false;
    setCameraOpen(false);
  }

  /* ========================================
     QR SCANNER
  ======================================== */

  useEffect(() => {
    if (!cameraOpen || !ready) return;

    let cancelled = false;

    async function startScanner() {
      const element = document.getElementById(
        "pokipo-test-qr-reader"
      );

      if (!element) {
        setCameraError(
          "QR読み取りエリアが見つかりません。"
        );
        setCameraOpen(false);
        return;
      }

      const scanner = new Html5Qrcode(
        "pokipo-test-qr-reader"
      );

      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (cancelled || processingRef.current) {
              return;
            }

            processingRef.current = true;

            const qrValue = normalizeQrValue(decodedText);
            const spot = pokipoSpots.find(
              (item) =>
                normalizeQrValue(item.id) === qrValue
            );

            if (!spot) {
              setMessage(
                "このQRはPOKIPOの5スポット用QRではありません。"
              );
              processingRef.current = false;
              return;
            }

            await stopScanner();

            if (scans.includes(spot.id)) {
              setMessage(
                `${spot.spotName}のスタンプは取得済みです。`
              );
              processingRef.current = false;
              return;
            }

            setSaving(true);
            setMessage("");

            try {
              // 検証専用テーブルへのみ保存する
              await recordPokipoTestStamp(spot.id);

              const stamps = await getPokipoTestStamps();
              const updatedScans = [
                ...new Set(
                  stamps.map((stamp) => stamp.spot_id)
                ),
              ];

              setScans(updatedScans);
              setAchievedCount(updatedScans.length);
              setActiveSpot(spot);

              setQuizInput("");
              setQuizCorrect(false);
              setQuizError(false);
              setTriviaReady(false);
              setShowGetEffect(true);

              if (triviaTimerRef.current) {
                clearTimeout(triviaTimerRef.current);
              }

              triviaTimerRef.current = setTimeout(() => {
                setTriviaReady(true);
              }, 650);

              if (updatedScans.length >= 5) {
                await recordPokipoTestCompletion();
              }

              setMessage(
                `${spot.spotName}の検証用スタンプを獲得しました！`
              );
            } catch (error) {
              console.error("検証スタンプ保存エラー:", error);

              setMessage(
                error instanceof Error
                  ? error.message
                  : "検証用スタンプを保存できませんでした。"
              );
            } finally {
              setSaving(false);
              processingRef.current = false;
            }
          },
          () => {
            // 読み取り途中のエラーは無視
          }
        );

        scanningRef.current = true;

        if (cancelled) {
          await stopScanner();
        }
      } catch (error) {
        console.error("QRカメラ起動エラー:", error);

        setCameraError(
          "カメラを起動できませんでした。カメラ権限を確認してください。"
        );

        await stopScanner();
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [cameraOpen, ready, scans]);

  /* ========================================
     QUIZ
  ======================================== */

  async function checkQuiz() {
    if (!activeSpot || !quizInput.trim() || saving) {
      return;
    }

    const input = normalizeAnswer(quizInput);
    const correct = normalizeAnswer(activeSpot.quizAnswer);

    if (input !== correct) {
      setQuizCorrect(false);
      setQuizError(true);
      return;
    }

    setSaving(true);
    setQuizError(false);

    try {
      // 通常用 record_pokipo_knowledge は使用しない
      await recordPokipoTestKnowledge(
        activeSpot.knowledgeId
      );

      setQuizCorrect(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "豆知識を保存できませんでした。"
      );
    } finally {
      setSaving(false);
    }
  }

  /* ========================================
     EFFECT CLOSE
  ======================================== */

  function closeGetEffect() {
    if (!quizCorrect || saving) return;

    if (triviaTimerRef.current) {
      clearTimeout(triviaTimerRef.current);
      triviaTimerRef.current = null;
    }

    setShowGetEffect(false);
    setActiveSpot(null);
    setTriviaReady(false);
    setQuizInput("");
    setQuizCorrect(false);
    setQuizError(false);
    setAchievedCount(0);
  }

  /* ========================================
     START CAMERA
  ======================================== */

  function startCamera() {
    if (!ready || saving || scanningRef.current) return;

    setCameraError("");
    setMessage("");
    processingRef.current = false;
    setCameraOpen(true);
  }

  const stampIds = new Set(scans);
  const completed = stampIds.size >= 5;

  const currentStep = getPockyStep(
    Math.max(1, Math.min(achievedCount || scans.length, 5))
  );

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section style={{ padding: 30 }}>
          検証専用データを確認しています...
        </section>
      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "24px 0 60px",
        }}
      >
        {/* HEADER */}
        <header style={{ marginBottom: 20 }}>
          <span
            style={{
              color: "#bd2838",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            POKIPO STAFF TEST
          </span>

          <h1 style={{ margin: "10px 0" }}>
            スタンプラリー動作確認
          </h1>

          <p style={{ lineHeight: 1.8 }}>
            本番と同じスポットQRを読み取り、
            スタンプ・クイズ・豆知識の動作を検証します。
          </p>
        </header>

        {/* TEST NOTICE */}
        <section
          style={{
            padding: 18,
            borderRadius: 14,
            background: "#fff4e9",
            border: "1px solid #efc89b",
            marginBottom: 16,
          }}
        >
          <strong>検証モード</strong>
          <p style={{ marginBottom: 0, lineHeight: 1.8 }}>
            スタンプと豆知識は検証専用データに保存します。
            本番参加者の記録は更新しません。
          </p>
        </section>

        {ready && (
          <>
            {/* PROGRESS */}
            <section className="stampProgressCard">
              <div className="stampProgressTop">
                <div>
                  <p>現在の進捗</p>
                  <h2>
                    {completed
                      ? "全スポット制覇！"
                      : `あと${5 - stampIds.size}か所`}
                  </h2>
                </div>
                <strong>{stampIds.size * 20}%</strong>
              </div>

              <div className="progressBar">
                <div
                  className="progressBarFill"
                  style={{
                    width: `${Math.min(
                      stampIds.size * 20,
                      100
                    )}%`,
                  }}
                />
              </div>
            </section>

            {/* SCANNER */}
            <section
              className="qrScannerSection"
              style={{ marginTop: 16 }}
            >
              {!cameraOpen ? (
                <button
                  type="button"
                  className="qrCameraButton"
                  onClick={startCamera}
                  disabled={saving}
                >
                  <span className="qrCameraIcon">QR</span>
                  <span>
                    <strong>QRコードを読み取る</strong>
                    <small>本番用QRで検証できます</small>
                  </span>
                  <span className="buttonArrow">›</span>
                </button>
              ) : (
                <div className="qrCameraPanel">
                  <div className="qrCameraHeader">
                    <div>
                      <p>QR SCANNER</p>
                      <h2>
                        QRを枠内に合わせてください
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="qrCloseButton"
                      onClick={() => void stopScanner()}
                    >
                      ×
                    </button>
                  </div>

                  <div id="pokipo-test-qr-reader" />
                </div>
              )}

              {cameraError && (
                <p className="qrScanMessage errorMessage">
                  {cameraError}
                </p>
              )}

              {message && (
                <p className="qrScanMessage">
                  {message}
                </p>
              )}
            </section>

            {/* SPOTS */}
            <section
              className="spotList"
              style={{ marginTop: 24 }}
            >
              {pokipoSpots.map((spot) => {
                const collected = stampIds.has(spot.id);

                return (
                  <article
                    key={spot.id}
                    className={[
                      "spotCard",
                      collected ? "collected" : "available",
                    ].join(" ")}
                  >
                    <div className="spotTimeline">
                      <div className="spotCircle">
                        {collected ? "✓" : spot.number}
                      </div>

                      {spot.number < 5 && (
                        <div className="spotLine" />
                      )}
                    </div>

                    <div className="spotContent">
                      <p className="spotStatus">
                        {collected
                          ? "STAMP GET!"
                          : "AVAILABLE"}
                      </p>
                      <h2>{spot.spotName}</h2>
                      <p>
                        {collected
                          ? "このスポットはクリア済みです。"
                          : "この場所のQRコードを見つけて読み込もう！"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {!ready && (
          <p role="alert">
            {message || "検証データを確認できませんでした。"}
          </p>
        )}

        <button
          type="button"
          className="rewardBackHomeButton"
          style={{ marginTop: 24 }}
          onClick={() => router.push("/staff/test")}
        >
          動作確認メニューへ戻る
        </button>
      </section>

      {/* ========================================
          STAMP GET EFFECT / QUIZ
      ======================================== */}

      {showGetEffect && activeSpot && (
        <div className="stampGetOverlay">
          <div className="stampGetBurst burst1">✦</div>
          <div className="stampGetBurst burst2">✦</div>
          <div className="stampGetBurst burst3">✦</div>
          <div className="stampGetBurst burst4">✦</div>

          <section className="stampGetModal">
            <div className="stampGetCircle">✓</div>

            <p className="stampGetLabel">STAMP GET!</p>

            <h2>スタンプ獲得！</h2>

            <p className="stampGetPlace">
              {activeSpot.spotName}
            </p>

            <div className="stampGetProgress">
              <span>{scans.length} / 5</span>
              <div className="stampGetProgressBar">
                <div
                  className="stampGetProgressFill"
                  style={{
                    width: `${Math.min(
                      scans.length * 20,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="stampGetStep">
              <span>POCKY STEP</span>
              <small className="stampGetStepNumber">
                {currentStep.step}
              </small>
              <strong>{currentStep.title}</strong>
              <p className="stampGetStepDescription">
                {currentStep.description}
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
                <span>TRIVIA CHALLENGE</span>

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
                      <span>QUESTION</span>
                      <strong>
                        {activeSpot.quizQuestion}
                      </strong>
                    </div>

                    <p className="triviaQuizHint">
                      🔍 {activeSpot.quizHint}
                    </p>

                    <div className="triviaQuizInputRow">
                      <input
                        type="text"
                        value={quizInput}
                        onChange={(event) => {
                          setQuizInput(
                            event.target.value
                          );
                          setQuizError(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void checkQuiz();
                          }
                        }}
                        placeholder="答えを入力"
                        className="triviaQuizInput"
                      />

                      <button
                        type="button"
                        className="triviaQuizCheckButton"
                        disabled={!quizInput.trim() || saving}
                        onClick={() => void checkQuiz()}
                      >
                        {saving
                          ? "保存中..."
                          : "答え合わせ"}
                      </button>
                    </div>

                    {quizError && (
                      <div className="triviaQuizWrong">
                        <strong>惜しい！</strong>
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
                        <small>CORRECT!</small>
                        <strong>正解！</strong>
                      </div>
                    </div>

                    <div className="triviaUnlockedContent">
                      <span>
                        NEW KNOWLEDGE UNLOCKED
                      </span>

                      <h3>
                        {activeSpot.knowledgeTitle}
                      </h3>

                      <p className="triviaText">
                        {activeSpot.knowledgeText}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {triviaReady && quizCorrect && (
              <button
                type="button"
                className="stampGetCloseButton"
                onClick={closeGetEffect}
              >
                {completed
                  ? "コンプリート！"
                  : "次のスポットへ"}
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
