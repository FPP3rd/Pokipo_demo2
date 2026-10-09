
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

import { pokipoSpots } from "../data/pokipo-data";
import { supabase } from "../../lib/supabase-client";
import MaintenanceGate from "../../components/MaintenanceGate";
import PokipoStampScreen from "../../components/PokipoStampScreen";
import PokipoStampGetModal from "../../components/PokipoStampGetModal";

const SECRET_QR_VALUE = "pokipo-yuhisai-lipost-2026";
const TEST_STAFF_QR_VALUE = "test-staff-qr";

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

function getParticipantId(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("pokipo_participant_id") ??
    localStorage.getItem("pokipo_user_id") ??
    ""
  );
}

function formatDateTime(value: string): string {
  const d = new Date(value);

  return (
    `${d.getFullYear()}/` +
    `${String(d.getMonth() + 1).padStart(2, "0")}/` +
    `${String(d.getDate()).padStart(2, "0")} ` +
    `${String(d.getHours()).padStart(2, "0")}:` +
    `${String(d.getMinutes()).padStart(2, "0")}`
  );
}

function isStaffTestQr(value: string): boolean {
  const normalized = normalizeQr(value);

  if (normalized === TEST_STAFF_QR_VALUE) {
    return true;
  }

  try {
    const decoded = decodeURIComponent(normalized);

    return (
      decoded === TEST_STAFF_QR_VALUE ||
      decoded.includes(`code=${TEST_STAFF_QR_VALUE}`) ||
      decoded.endsWith(`#${TEST_STAFF_QR_VALUE}`)
    );
  } catch {
    return false;
  }
}

export default function StampPage() {
  const router = useRouter();

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
  const [quizSaving, setQuizSaving] = useState(false);

  const triviaTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [secretStamp, setSecretStamp] = useState(false);
  const [secretGetEffect, setSecretGetEffect] =
    useState(false);

  const [showTestWarning, setShowTestWarning] =
    useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [staffChecking, setStaffChecking] = useState(false);
  const [testModeError, setTestModeError] = useState("");

  /* ========================================
     INITIAL DATA
  ======================================== */

  useEffect(() => {
    let active = true;

    async function loadStamps() {
      const participantId = getParticipantId();

      if (!participantId) {
        const saved = localStorage.getItem("pokipo_scans");

        if (saved && active) {
          try {
            const parsed: unknown = JSON.parse(saved);

            if (Array.isArray(parsed)) {
              setScans(
                parsed.filter(
                  (id): id is string =>
                    typeof id === "string"
                )
              );
            }
          } catch {
            setScans([]);
          }
        }

        return;
      }

      const { data, error } = await supabase.rpc(
        "get_pokipo_stamps",
        { p_participant_id: participantId }
      );

      if (!active) return;

      if (error) {
        console.error("スタンプ取得エラー:", error);
        return;
      }

      const ids = [
        ...new Set(
          ((data ?? []) as { spot_id: string }[]).map(
            (item) => item.spot_id
          )
        ),
      ];

      setScans(ids);

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(ids)
      );
      localStorage.setItem(
        "pokipo_progress",
        String(Math.min(ids.length, 5))
      );
      localStorage.setItem(
        "pokipo_completed",
        ids.length >= 5 ? "true" : "false"
      );
    }

    void loadStamps();

    setSecretStamp(
      localStorage.getItem("pokipo_secret_yuhisai") ===
        "true"
    );

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
      console.warn("カメラ停止エラー:", error);
    }

    try {
      scanner.clear();
    } catch {
      // 停止済みの場合は無視
    }

    if (scannerRef.current === scanner) {
      scannerRef.current = null;
    }
  }

  async function stopQrScanner(): Promise<void> {
    scannerRunRef.current += 1;
    setCameraOpen(false);

    const scanner = scannerRef.current;

    if (scanner) {
      await stopScannerInstance(scanner);
    }
  }

  function startQrScanner(): void {
    if (
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
    if (!cameraOpen) return;

    const runId = ++scannerRunRef.current;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    async function startCamera() {
      const element = document.getElementById(
        "pokipo-qr-reader"
      );

      if (!element) {
        setCameraError("QR読み取りエリアがありません。");
        setCameraOpen(false);
        return;
      }

      const instance = new Html5Qrcode("pokipo-qr-reader");

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

              if (isStaffTestQr(decodedText)) {
                await stopQrScanner();
                setShowTestWarning(true);
                return;
              }

              if (value === normalizeQr(SECRET_QR_VALUE)) {
                await stopQrScanner();
                scanSecretSpot();
                return;
              }

              const spot = pokipoSpots.find(
                (item) => normalizeQr(item.id) === value
              );

              if (!spot) {
                setMessage(
                  "このQRコードはPOKIPOのQRではありません。"
                );
                return;
              }

              await stopQrScanner();
              await scanSpot(spot);
            } catch (error) {
              console.error("QR処理エラー:", error);
              setMessage(
                "QR読み取り中にエラーが発生しました。"
              );
            } finally {
              processingRef.current = false;
            }
          },
          () => {
            // 読み取り待機中のエラーは表示しない
          }
        );

        if (cancelled) {
          await stopScannerInstance(instance);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("カメラ起動エラー:", error);
          setCameraError(
            "カメラを起動できませんでした。使用許可を確認してください。"
          );
          setCameraOpen(false);
        }

        await stopScannerInstance(instance);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      scannerRunRef.current += 1;

      if (scanner) {
        void stopScannerInstance(scanner);
      }
    };
  }, [cameraOpen]);

  /* ========================================
     COMPLETION
  ======================================== */

  async function saveCompletion(
    participantId: string
  ): Promise<void> {
    try {
      const { data, error } = await supabase.rpc(
        "record_pokipo_completion",
        { p_participant_id: participantId }
      );

      if (error) {
        console.error("完走記録エラー:", error);
        return;
      }

      if (data && data.length > 0) {
        const record = data[0];

        if (record.completed_at) {
          localStorage.setItem(
            "pokipo_completed_at",
            formatDateTime(record.completed_at)
          );
        }

        if (
          record.achievement_rank !== null &&
          record.achievement_rank !== undefined
        ) {
          localStorage.setItem(
            "pokipo_achievement_rank",
            String(record.achievement_rank)
          );
        }
      }
    } catch (error) {
      console.error("完走保存通信エラー:", error);
    }
  }

  /* ========================================
     SAVE STAMP
  ======================================== */

  async function scanSpot(spot: Spot): Promise<void> {
    const spotId = spot.id;

    if (scans.includes(spotId)) {
      setMessage(
        `${spot.spotName}のスタンプは取得済みです。`
      );
      return;
    }

    const participantId = getParticipantId();

    if (!participantId) {
      setMessage(
        "参加者情報がありません。トップ画面から参加登録してください。"
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        "record_pokipo_stamp",
        {
          p_participant_id: participantId,
          p_spot_id: spotId,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const { data, error: loadError } = await supabase.rpc(
        "get_pokipo_stamps",
        { p_participant_id: participantId }
      );

      const updatedScans = loadError
        ? [...new Set([...scans, spotId])]
        : [
            ...new Set(
              ((data ?? []) as { spot_id: string }[]).map(
                (item) => item.spot_id
              )
            ),
          ];

      setScans(updatedScans);

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify(updatedScans)
      );
      localStorage.setItem(
        "pokipo_progress",
        String(Math.min(updatedScans.length, 5))
      );

      if (updatedScans.length >= 5) {
        localStorage.setItem("pokipo_completed", "true");
        await saveCompletion(participantId);
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
      setMessage(
        `${spot.spotName}のスタンプを獲得しました！`
      );
    } catch (error) {
      console.error("スタンプ保存エラー:", error);
      setMessage(
        "スタンプを保存できませんでした。通信環境を確認してもう一度お試しください。"
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
      quizSaving ||
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

    const participantId = getParticipantId();

    if (!participantId) {
      setMessage("参加者情報を確認できませんでした。");
      return;
    }

    setQuizSaving(true);
    setQuizError(false);

    try {
      const { error } = await supabase.rpc(
        "record_pokipo_knowledge",
        {
          p_participant_id: participantId,
          p_knowledge_id: activeSpot.knowledgeId,
        }
      );

      if (error) throw new Error(error.message);

      const saved =
        localStorage.getItem("pokipo_knowledge");

      let knowledge: string[] = [];

      if (saved) {
        try {
          const parsed: unknown = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            knowledge = parsed.filter(
              (id): id is string =>
                typeof id === "string"
            );
          }
        } catch {
          knowledge = [];
        }
      }

      if (!knowledge.includes(activeSpot.knowledgeId)) {
        knowledge.push(activeSpot.knowledgeId);
      }

      localStorage.setItem(
        "pokipo_knowledge",
        JSON.stringify(knowledge)
      );

      setQuizCorrect(true);
      setMessage("");
    } catch (error) {
      console.error("豆知識保存エラー:", error);
      setMessage(
        "豆知識を保存できませんでした。もう一度お試しください。"
      );
    } finally {
      setQuizSaving(false);
    }
  }

  function closeGetEffect(): void {
    if (!quizCorrect || quizSaving) return;

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
     SECRET STAMP
  ======================================== */

  function scanSecretSpot(): void {
    if (scans.length < 5) {
      setMessage(
        "シークレットスタンプは通常5か所を達成すると取得できます。"
      );
      return;
    }

    if (secretStamp) {
      setMessage(
        "雄飛祭シークレットスタンプは取得済みです。"
      );
      return;
    }

    localStorage.setItem(
      "pokipo_secret_yuhisai",
      "true"
    );
    localStorage.setItem(
      "pokipo_secret_yuhisai_at",
      new Date().toISOString()
    );

    setSecretStamp(true);
    setSecretGetEffect(true);
    setMessage(
      "雄飛祭 LiPostブースのシークレットスタンプを獲得しました！"
    );
  }

  function closeSecretEffect(): void {
    setSecretGetEffect(false);
    router.push("/home");
  }

  /* ========================================
     STAFF TEST QR
     本番のスタンプ一括書き込みは行わない
  ======================================== */

  async function openSafeStaffTest(): Promise<void> {
    if (staffChecking) return;

    setStaffChecking(true);
    setTestModeError("");

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        throw new Error("スタッフログインが必要です。");
      }

      const { data: staff, error: staffError } =
        await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (staffError || !staff) {
        throw new Error("スタッフ権限がありません。");
      }

      router.push("/staff/test");
    } catch (error) {
      setTestModeError(
        error instanceof Error
          ? error.message
          : "スタッフ認証に失敗しました。"
      );
    } finally {
      setStaffChecking(false);
    }
  }

  const completed = new Set(scans).size >= 5;

  /* ========================================
     DISPLAY
  ======================================== */

  return (
    <MaintenanceGate page="stamp">
      <main className="shell">
        <PokipoStampScreen
          scans={scans}
          cameraOpen={cameraOpen}
          cameraError={cameraError}
          message={message}
          cameraReaderId="pokipo-qr-reader"
          onStartCamera={startQrScanner}
          onStopCamera={stopQrScanner}
          onBack={() => router.push("/home")}
          disabled={saving || showGetEffect}
        />

        {/* STAFF TEST QR WARNING */}
        {showTestWarning && (
          <div className="staffTestOverlay">
            <section className="staffTestWarningCard">
              <div className="staffTestWarningIcon">
                !
              </div>

              <span>STAFF TEST</span>
              <h2>スタッフテスト用QRです</h2>

              <p>
                本番参加者の記録には書き込まず、
                検証専用メニューを開きます。
              </p>

              <div className="staffTestWarningActions">
                <button
                  type="button"
                  className="cancel"
                  onClick={() =>
                    setShowTestWarning(false)
                  }
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="continue"
                  onClick={() => {
                    setShowTestWarning(false);
                    setShowTestPanel(true);
                  }}
                >
                  続ける
                </button>
              </div>
            </section>
          </div>
        )}

        {/* STAFF TEST PANEL */}
        {showTestPanel && (
          <div className="staffTestOverlay">
            <section className="staffTestPanel">
              <div className="staffTestPanelHeader">
                <div>
                  <span>STAFF TEST MODE</span>
                  <h2>POKIPOテスト確認</h2>
                  <p>
                    スポットのクイズと豆知識を
                    一覧で確認できます。
                  </p>
                </div>

                <button
                  type="button"
                  disabled={staffChecking}
                  onClick={() =>
                    setShowTestPanel(false)
                  }
                >
                  ×
                </button>
              </div>

              <div className="staffTestQuizList">
                {pokipoSpots.map((spot) => (
                  <article
                    key={spot.id}
                    className="staffTestQuizCard"
                  >
                    <div className="staffTestQuizTop">
                      <span>
                        SPOT {spot.number}
                      </span>
                      <strong>{spot.spotName}</strong>
                    </div>

                    <div className="staffTestQuizSection">
                      <span>QUESTION</span>
                      <p>{spot.quizQuestion}</p>
                    </div>

                    <div className="staffTestQuizSection answer">
                      <span>ANSWER</span>
                      <strong>{spot.quizAnswer}</strong>
                    </div>

                    <div className="staffTestQuizSection">
                      <span>HINT</span>
                      <p>{spot.quizHint}</p>
                    </div>

                    <div className="staffTestQuizSection knowledge">
                      <span>解説・豆知識</span>
                      <h3>{spot.knowledgeTitle}</h3>
                      <p>{spot.knowledgeText}</p>
                    </div>
                  </article>
                ))}
              </div>

              {testModeError && (
                <p className="staffTestError" role="alert">
                  {testModeError}
                </p>
              )}

              <div className="staffTestFinalNotice">
                <strong>検証専用メニュー</strong>
                <p>
                  スタンプ・アンケート・特典交換を
                  本番データと分離して確認できます。
                </p>
              </div>

              <div className="staffTestPanelActions">
                <button
                  type="button"
                  className="cancel"
                  disabled={staffChecking}
                  onClick={() =>
                    setShowTestPanel(false)
                  }
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="apply"
                  disabled={staffChecking}
                  onClick={() =>
                    void openSafeStaffTest()
                  }
                >
                  {staffChecking
                    ? "認証確認中..."
                    : "動作確認メニューを開く"}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* SHARED STAMP GET EFFECT */}
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
            saving={quizSaving}
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

        {/* SECRET STAMP EFFECT */}
        {secretGetEffect && (
          <div className="stampGetOverlay">
            <section className="stampGetModal">
              <div className="stampGetCircle">6</div>
              <p className="stampGetLabel">
                SECRET STAMP GET!
              </p>
              <h2>雄飛祭スタンプ獲得！</h2>
              <p className="stampGetPlace">
                雄飛祭 LiPostブース
              </p>

              <div className="stampGetStep">
                <span>SECRET MODE</span>
                <strong>POKIPOが変化しました！</strong>
                <p className="stampGetStepDescription">
                  トップ画面で雄飛祭限定の
                  POKIPOを確認してみよう。
                </p>
              </div>

              <button
                type="button"
                className="stampGetCloseButton"
                onClick={closeSecretEffect}
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
