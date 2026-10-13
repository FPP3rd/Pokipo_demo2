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
  const scansRef = useRef<string[]>([]);

  const [message, setMessage] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const scannerRunRef = useRef(0);

  const [activeSpot, setActiveSpot] =
    useState<Spot | null>(null);

  const [showGetEffect, setShowGetEffect] =
    useState(false);

  const [triviaReady, setTriviaReady] =
    useState(false);

  const [quizInput, setQuizInput] = useState("");
  const [quizCorrect, setQuizCorrect] =
    useState(false);

  const [quizError, setQuizError] =
    useState(false);

  const [stampConfirmed, setStampConfirmed] =
    useState(false);

  const triviaTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateStamps(ids: string[]): void {
    const unique = [...new Set(ids)];

    scansRef.current = unique;
    setScans(unique);
  }

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        // スタッフ権限と検証セッションを確認
        await getPokipoTestSession();

        const stamps = await getPokipoTestStamps();

        if (!active) return;

        updateStamps(
          stamps.map((item) => item.spot_id)
        );

        setReady(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "検証セッションを確認できませんでした。"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
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
      // 終了済みの場合は無視
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
      savingRef.current ||
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
            qrbox: {
              width: 240,
              height: 240,
            },
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
     OPEN SPOT
     QR読み取りだけでは保存しない
  ======================================== */

  async function scanSpot(spot: Spot): Promise<void> {
    setMessage("");

    try {
      // 検証用のスタッフセッションを確認
      await getPokipoTestSession();

      // 最新のスタンプを取得
      const previous = await getPokipoTestStamps();

      const existingIds = [
        ...new Set(
          previous.map((item) => item.spot_id)
        ),
      ];

      updateStamps(existingIds);

      if (existingIds.includes(spot.id)) {
        setMessage(
          `${spot.spotName}のスタンプは取得済みです。`
        );
        return;
      }

      // ここではスタンプを保存しない
      setActiveSpot(spot);
      setQuizInput("");
      setQuizCorrect(false);
      setQuizError(false);
      setStampConfirmed(false);
      setTriviaReady(false);

      if (triviaTimerRef.current) {
        clearTimeout(triviaTimerRef.current);
      }

      triviaTimerRef.current = setTimeout(() => {
        setTriviaReady(true);
      }, 650);

      setShowGetEffect(true);
    } catch (error) {
      console.error(
        "検証スポット準備エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "検証スポットを準備できませんでした。"
      );
    }
  }

  /* ========================================
     QUIZ
     正解時は豆知識のみ保存
  ======================================== */

  async function checkQuiz(): Promise<void> {
    if (
      !activeSpot ||
      !quizInput.trim() ||
      savingRef.current ||
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

    savingRef.current = true;
    setSaving(true);
    setQuizError(false);

    try {
      // 本番用RPCは使用しない
      await recordPokipoTestKnowledge(
        activeSpot.knowledgeId
      );

      // クイズ正解と豆知識解放のみ
      setQuizCorrect(true);
      setMessage("");
    } catch (error) {
      console.error(
        "検証豆知識保存エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "検証用の豆知識を保存できませんでした。"
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  /* ========================================
     LEARNING CONFIRM
     学習確認後に検証スタンプ保存
  ======================================== */

  async function confirmLearning(
    selectedAnswer: string
  ): Promise<void> {
    if (
      !activeSpot ||
      !quizCorrect ||
      stampConfirmed ||
      savingRef.current
    ) {
      return;
    }

    const spot = activeSpot;

    if (!selectedAnswer.trim()) {
      throw new Error(
        "意見を選択してください。"
      );
    }

    savingRef.current = true;
    setSaving(true);
    setMessage("");

    try {
      // スタッフ認証を再確認
      await getPokipoTestSession();

      const previous = await getPokipoTestStamps();

      const existingIds = [
        ...new Set(
          previous.map((item) => item.spot_id)
        ),
      ];

      if (existingIds.includes(spot.id)) {
        // 他の画面などで取得済みの場合も再保存しない
        updateStamps(existingIds);
        setStampConfirmed(true);
        return;
      }

      // 回答を検証用ブラウザー領域へ保存
      // 本番参加者テーブルには記録しない
      const storageKey =
        "pokipo_test_learning_answers";

      let savedAnswers: Record<string, string> = {};

      try {
        const existing = sessionStorage.getItem(
          storageKey
        );

        if (existing) {
          const parsed: unknown =
            JSON.parse(existing);

          if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
          ) {
            savedAnswers = parsed as Record<
              string,
              string
            >;
          }
        }
      } catch {
        savedAnswers = {};
      }

      savedAnswers[spot.id] =
        selectedAnswer;

      // この記録は画面確認用。
      // 他のスタッフの集計には含まれない。
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify(savedAnswers)
        );
      } catch {
        // ストレージが使用できなくても
        // 検証用スタンプの保存は続行
      }

      // 学習画面を確認した後、初めて保存
      await recordPokipoTestStamp(spot.id);

      const stamps = await getPokipoTestStamps();

      const updatedScans = [
        ...new Set(
          stamps.map((item) => item.spot_id)
        ),
      ];

      if (!updatedScans.includes(spot.id)) {
        throw new Error(
          "検証用スタンプの保存を確認できませんでした。"
        );
      }

      updateStamps(updatedScans);
      setStampConfirmed(true);

      if (updatedScans.length >= 5) {
        try {
          await recordPokipoTestCompletion();
        } catch (error) {
          console.error(
            "検証用完走記録保存エラー:",
            error
          );

          setMessage(
            "スタンプは保存されましたが、検証用完走記録の更新に失敗しました。"
          );
        }
      }

      if (updatedScans.length < 5) {
        setMessage(
          `${spot.spotName}の検証用スタンプを獲得しました！`
        );
      }
    } catch (error) {
      console.error(
        "検証用学習・スタンプ保存エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "検証用スタンプを保存できませんでした。"
      );

      throw error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  /* ========================================
     CLOSE MODAL
  ======================================== */

  function closeGetEffect(): void {
    if (
      !quizCorrect ||
      !stampConfirmed ||
      savingRef.current
    ) {
      return;
    }

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
    setStampConfirmed(false);
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
            onClick={() =>
              router.push("/staff/test")
            }
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
        onBack={() =>
          router.push("/staff/test")
        }
        testMode={true}
        disabled={saving || showGetEffect}
      />

      {/* 検証専用のスタンプ・学習画面 */}
      {showGetEffect && activeSpot && (
        <PokipoStampGetModal
          spotId={activeSpot.id}
          spotName={activeSpot.spotName}
          stampCount={
            stampConfirmed
              ? scans.length
              : scans.length + 1
          }
          stampConfirmed={stampConfirmed}
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
          onQuizSubmit={() =>
            void checkQuiz()
          }
          onLearningConfirm={confirmLearning}
          onClose={closeGetEffect}
        />
      )}
    </main>
  );
}