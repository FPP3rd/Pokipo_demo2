
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

import { pokipoSpots } from "../../../data/pokipo-data";

import PokipoStampScreen from "../../../../components/PokipoStampScreen";
import PokipoStampGetModal from "../../../../components/PokipoStampGetModal";

import {
  getPokipoTestSession,
  getPokipoTestStamps,
  recordPokipoTestStamp,
  recordPokipoTestKnowledge,
  recordPokipoTestCompletion,
} from "../../../../lib/pokipo-test-data";

type Spot = (typeof pokipoSpots)[number];

function normalizeQr(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u200B|\r|\n/g, "")
    .trim()
    .toLowerCase();
}

function normalizeAnswer(value: string): string {
  return value
    .replace(/[！-～]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/　|\s/g, "")
    .trim()
    .toLowerCase();
}

export default function StaffTestStampPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const [scans, setScans] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const scannerRunRef = useRef(0);

  const [activeSpot, setActiveSpot] = useState<Spot | null>(
    null
  );
  const [showGetEffect, setShowGetEffect] = useState(false);
  const [triviaReady, setTriviaReady] = useState(false);
  const [quizInput, setQuizInput] = useState("");
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizError, setQuizError] = useState(false);

  const triviaTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        // スタッフ権限と検証セッションを必ず確認
        await getPokipoTestSession();

        const stamps = await getPokipoTestStamps();

        if (!active) return;

        setScans([
          ...new Set(stamps.map((item) => item.spot_id)),
        ]);
        setReady(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "検証セッションを確認できませんでした。"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (triviaTimerRef.current) {
        clearTimeout(triviaTimerRef.current);
      }
    };
  }, []);

  /* ========================================
     CAMERA
  ======================================== */

  async function stopScannerInstance(
    scanner: Html5Qrcode
  ): Promise<void> {
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn("検証カメラ停止:", error);
    }

    try {
      scanner.clear();
    } catch {
      // すでに終了している場合
    }

    if (scannerRef.current === scanner) {
      scannerRef.current = null;
    }
  }

  async function stopScanner(): Promise<void> {
    scannerRunRef.current += 1;
    setCameraOpen(false);

    const scanner = scannerRef.current;

    if (scanner) {
      await stopScannerInstance(scanner);
    }
  }

  function startCamera(): void {
    if (
      !ready ||
      cameraOpen ||
      scannerRef.current ||
      saving ||
      showGetEffect
    ) {
      return;
    }

    setCameraError("");
    setMessage("");
    processingRef.current = false;
    setCameraOpen(true);
  }

  useEffect(() => {
    if (!cameraOpen || !ready) return;

    const runId = ++scannerRunRef.current;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    async function initializeCamera() {
      const element = document.getElementById(
        "pokipo-test-qr-reader"
      );

      if (!element) {
        setCameraError(
          "QR読み取りエリアを準備できませんでした。"
        );
        setCameraOpen(false);
        return;
      }

      const instance = new Html5Qrcode(
        "pokipo-test-qr-reader"
      );

      scanner = instance;
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (
              cancelled ||
              scannerRunRef.current !== runId ||
              processingRef.current
            ) {
              return;
            }

            processingRef.current = true;

            try {
              const value = normalizeQr(decodedText);

              const spot = pokipoSpots.find(
                (item) =>
                  normalizeQr(item.id) === value
              );

              if (!spot) {
                setMessage(
                  "このQRはPOKIPOの5スポット用QRではありません。"
                );
                return;
              }

              await stopScanner();
              await scanSpot(spot);
            } catch (error) {
              console.error(
                "検証用QR読み取りエラー:",
                error
              );

              setMessage(
                error instanceof Error
                  ? error.message
                  : "QRの処理に失敗しました。"
              );
            } finally {
              processingRef.current = false;
            }
          },
          () => {
            // QR探索中のエラーは表示しない
          }
        );

        if (cancelled) {
          await stopScannerInstance(instance);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "検証用カメラ起動エラー:",
            error
          );

          setCameraError(
            "カメラを起動できませんでした。カメラ権限を確認してください。"
          );
          setCameraOpen(false);
        }

        await stopScannerInstance(instance);
      }
    }

    void initializeCamera();

    return () => {
      cancelled = true;
      scannerRunRef.current += 1;

      if (scanner) {
        void stopScannerInstance(scanner);
      }
    };
  }, [cameraOpen, ready]);

  /* ========================================
     SAVE TEST STAMP
  ======================================== */

  async function scanSpot(spot: Spot): Promise<void> {
    setSaving(true);
    setMessage("");

    try {
      // 保存直前に検証専用セッションを再確認
      await getPokipoTestSession();

      const previous = await getPokipoTestStamps();

      if (
        previous.some(
          (item) => item.spot_id === spot.id
        )
      ) {
        setScans([
          ...new Set(
            previous.map((item) => item.spot_id)
          ),
        ]);

        setMessage(
          `${spot.spotName}のスタンプは取得済みです。`
        );
        return;
      }

      // 本番用RPCは呼ばず検証テーブルに保存
      await recordPokipoTestStamp(spot.id);

      const stamps = await getPokipoTestStamps();

      const updatedScans = [
        ...new Set(
          stamps.map((item) => item.spot_id)
        ),
      ];

      setScans(updatedScans);

      if (updatedScans.length >= 5) {
        try {
          await recordPokipoTestCompletion();
        } catch (error) {
          console.error(
            "検証用完走記録保存エラー:",
            error
          );

          setMessage(
            "スタンプは保存しましたが、検証用完走記録の更新に失敗しました。"
          );
        }
      }

      setActiveSpot(spot);
      setQuizInput("");
      setQuizCorrect(false);
      setQuizError(false);
      setTriviaReady(false);

      if (triviaTimerRef.current) {
        clearTimeout(triviaTimerRef.current);
      }

      triviaTimerRef.current = setTimeout(() => {
        setTriviaReady(true);
      }, 650);

      setShowGetEffect(true);
    } catch (error) {
      console.error("検証スタンプ保存エラー:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "検証用スタンプを保存できませんでした。"
      );
    } finally {
      setSaving(false);
    }
  }

  /* ========================================
     QUIZ
  ======================================== */

  async function checkQuiz(): Promise<void> {
    if (
      !activeSpot ||
      !quizInput.trim() ||
      saving ||
      quizCorrect
    ) {
      return;
    }

    if (
      normalizeAnswer(quizInput) !==
      normalizeAnswer(activeSpot.quizAnswer)
    ) {
      setQuizError(true);
      return;
    }

    setSaving(true);
    setQuizError(false);

    try {
      // 本番の豆知識保存RPCは使わない
      await recordPokipoTestKnowledge(
        activeSpot.knowledgeId
      );

      setQuizCorrect(true);
      setMessage("");
    } catch (error) {
      console.error("検証豆知識保存エラー:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "検証用の豆知識を保存できませんでした。"
      );
    } finally {
      setSaving(false);
    }
  }

  function closeGetEffect(): void {
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
    setMessage("");
  }

  /* ========================================
     DISPLAY
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

  if (!ready) {
    return (
      <main className="shell">
        <section
          style={{
            maxWidth: 720,
            padding: 24,
            margin: "20px auto",
            borderRadius: 16,
            background: "#fff4e9",
          }}
        >
          <h1>動作確認を開始できません</h1>

          <p role="alert">
            {message ||
              "スタッフ認証を確認できませんでした。"}
          </p>

          <button
            type="button"
            onClick={() => router.push("/staff/test")}
          >
            動作確認メニューへ戻る
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <PokipoStampScreen
        scans={scans}
        cameraOpen={cameraOpen}
        cameraError={cameraError}
        message={message}
        cameraReaderId="pokipo-test-qr-reader"
        onStartCamera={startCamera}
        onStopCamera={stopScanner}
        onBack={() => router.push("/staff/test")}
        testMode={true}
        disabled={saving || showGetEffect}
      />

      {/* 共通のスタンプ獲得演出 */}
      {showGetEffect && activeSpot && (
        <PokipoStampGetModal
          spotName={activeSpot.spotName}
          stampCount={scans.length}
          triviaReady={triviaReady}
          quizQuestion={activeSpot.quizQuestion}
          quizHint={activeSpot.quizHint}
          quizInput={quizInput}
          quizCorrect={quizCorrect}
          quizError={quizError}
          saving={saving}
          knowledgeTitle={activeSpot.knowledgeTitle}
          knowledgeText={activeSpot.knowledgeText}
          onQuizInputChange={(value) => {
            setQuizInput(value);
            setQuizError(false);
          }}
          onQuizSubmit={() => void checkQuiz()}
          onClose={closeGetEffect}
        />
      )}
    </main>
  );
}
