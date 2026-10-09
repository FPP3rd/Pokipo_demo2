
"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../../../../lib/supabase-client";

import {
  getPokipoTestSession,
  getPokipoTestStamps,
  getVerifiedTestStaffId,
} from "../../../../../lib/pokipo-test-data";

/* ========================================
   CONFIG
======================================== */

const TEST_QR_PREFIX = "POKIPO_TEST_REWARD:";

type TestReward = {
  staffId: string;
  nickname: string;
  token: string;
  confirmationCode: string;
  status: "issued" | "exchanged";
};

const cardStyle: CSSProperties = {
  padding: 22,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid #e6e1db",
  marginBottom: 16,
};

const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "16px 20px",
  borderRadius: 12,
  border: "none",
  background: "#bd2838",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

/* ========================================
   PAGE
======================================== */

export default function StaffTestRewardScanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [reward, setReward] =
    useState<TestReward | null>(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const scanRunRef = useRef(0);

  /* ========================================
     STAFF AUTH
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await getPokipoTestSession();

        if (active) {
          setReady(true);
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "スタッフ認証に失敗しました。"
          );
        }
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

  /* ========================================
     STOP CAMERA
  ======================================== */

  async function stopCamera(
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
    } catch (error) {
      console.warn("検証カメラ終了:", error);
    }

    if (scannerRef.current === scanner) {
      scannerRef.current = null;
    }
  }

  /* ========================================
     QR VALIDATION
  ======================================== */

  async function validateTestQr(
    qrText: string
  ): Promise<void> {
    setMessage("");
    setReward(null);
    setSuccess(false);

    const scanned = qrText.trim();

    // 本番QRの誤認識を防ぐ
    if (!scanned.startsWith(TEST_QR_PREFIX)) {
      throw new Error(
        "検証専用QRではありません。本番用QRはこの画面では使用できません。"
      );
    }

    const token = scanned.slice(
      TEST_QR_PREFIX.length
    );

    // QRの形式が正しいことを確認
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(token)) {
      throw new Error(
        "検証専用QRの形式が正しくありません。"
      );
    }

    const staffId = await getVerifiedTestStaffId();
    const session = await getPokipoTestSession();

    // 自分の検証専用セッションのQRだけを扱う
    if (session.staff_user_id !== staffId) {
      throw new Error(
        "検証セッションが一致しません。"
      );
    }

    if (
      !session.reward_token ||
      session.reward_token.toLowerCase() !==
        token.toLowerCase()
    ) {
      throw new Error(
        "現在の検証セッションで発行されたQRではありません。"
      );
    }

    if (!session.reward_confirmation_code) {
      throw new Error(
        "検証用の確認コードがありません。"
      );
    }

    if (
      session.reward_status !== "issued" &&
      session.reward_status !== "exchanged"
    ) {
      throw new Error(
        "この検証用QRは発行されていません。"
      );
    }

    const stamps = await getPokipoTestStamps();
    const count = new Set(
      stamps.map((item) => item.spot_id)
    ).size;

    if (
      count !== 5 ||
      !session.completed_at ||
      !session.post_survey
    ) {
      throw new Error(
        "検証用の特典交換条件を満たしていません。"
      );
    }

    setReward({
      staffId,
      nickname: session.nickname,
      token: session.reward_token,
      confirmationCode:
        session.reward_confirmation_code,
      status: session.reward_status,
    });
  }

  /* ========================================
     CAMERA
  ======================================== */

  useEffect(() => {
    if (!cameraOpen || !ready) return;

    const runId = ++scanRunRef.current;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    async function startCamera() {
      const element = document.getElementById(
        "pokipo-test-reward-reader"
      );

      if (!element) {
        setMessage(
          "QR読み取りエリアを準備できませんでした。"
        );
        setCameraOpen(false);
        return;
      }

      const instance = new Html5Qrcode(
        "pokipo-test-reward-reader"
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
          },
          (decodedText) => {
            if (
              cancelled ||
              scanRunRef.current !== runId ||
              processingRef.current
            ) {
              return;
            }

            processingRef.current = true;
            setProcessing(true);

            // カメラ画面を閉じてからQRを検証する
            setCameraOpen(false);

            void (async () => {
              try {
                await stopCamera(instance);
                await validateTestQr(decodedText);
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "QRの確認に失敗しました。"
                );
              } finally {
                processingRef.current = false;
                setProcessing(false);
              }
            })();
          },
          () => {
            // QR探索中のエラーは表示しない
          }
        );

        if (cancelled) {
          await stopCamera(instance);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            "カメラを起動できませんでした。カメラの使用許可をご確認ください。"
          );
          setCameraOpen(false);
        }

        await stopCamera(instance);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      scanRunRef.current += 1;

      if (scanner) {
        void stopCamera(scanner);
      }
    };
  }, [cameraOpen, ready]);

  /* ========================================
     CONFIRM EXCHANGE
  ======================================== */

  async function confirmExchange() {
    if (
      !reward ||
      reward.status !== "issued" ||
      confirming
    ) {
      return;
    }

    const approved = window.confirm(
      "この検証用特典を交換済みにしますか？\n\n" +
        "本番の景品交換記録や会場モニターは変更しません。"
    );

    if (!approved) return;

    setConfirming(true);
    setMessage("");

    try {
      // 保存直前にスタッフ認証を再確認
      const staffId = await getVerifiedTestStaffId();

      if (staffId !== reward.staffId) {
        throw new Error(
          "ログイン中のスタッフが変更されました。"
        );
      }

      const session = await getPokipoTestSession();
      const stamps = await getPokipoTestStamps();

      if (
        session.reward_status !== "issued" ||
        session.reward_token !== reward.token ||
        !session.post_survey ||
        !session.completed_at ||
        new Set(
          stamps.map((item) => item.spot_id)
        ).size !== 5
      ) {
        throw new Error(
          "交換条件が変更されました。QRを読み直してください。"
        );
      }

      // 検証専用テーブルだけを更新
      // 本番reward_exchangesやreward_monitor_stateは触らない
      const { data, error } = await supabase
        .from("pokipo_test_sessions")
        .update({
          reward_status: "exchanged",
          reward_exchanged_at:
            new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("staff_user_id", staffId)
        .eq("reward_token", reward.token)
        .eq("reward_status", "issued")
        .select("staff_user_id");

      if (error) {
        throw new Error(
          `交換確定エラー: ${error.message}`
        );
      }

      if (!data || data.length !== 1) {
        throw new Error(
          "交換状態が更新されませんでした。二重交換の可能性があります。"
        );
      }

      setReward({
        ...reward,
        status: "exchanged",
      });

      setSuccess(true);
    } catch (error) {
      console.error(
        "検証用景品交換エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "交換確定に失敗しました。"
      );
    } finally {
      setConfirming(false);
    }
  }

  /* ========================================
     VIEW
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <div style={{ padding: 30 }}>
          スタッフ認証を確認中...
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "24px 0 60px",
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#bd2838",
            }}
          >
            POKIPO STAFF TEST
          </span>

          <h1>特典QRの読み取り確認</h1>

          <p style={{ lineHeight: 1.8 }}>
            検証専用QRを読み取り、
            特典交換を確定する操作を確認します。
          </p>
        </header>

        <section
          style={{
            ...cardStyle,
            background: "#fff4e9",
            borderColor: "#efc89b",
          }}
        >
          <strong>検証モード</strong>

          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            本番の特典QRは受け付けません。
            この画面から行う交換処理は、
            検証専用データにのみ記録されます。
          </p>
        </section>

        {message && (
          <section
            role="alert"
            style={{
              ...cardStyle,
              borderColor: "#e5a5a5",
              color: "#a52a2a",
            }}
          >
            {message}
          </section>
        )}

        {!ready && (
          <section style={cardStyle}>
            スタッフ認証が必要です。
          </section>
        )}

        {ready && !reward && (
          <section style={cardStyle}>
            <h2 style={{ fontSize: 20 }}>
              QRコードをスキャン
            </h2>

            {!cameraOpen ? (
              <button
                type="button"
                style={buttonStyle}
                disabled={processing}
                onClick={() => {
                  setMessage("");
                  setSuccess(false);
                  setCameraOpen(true);
                }}
              >
                {processing
                  ? "読み取り処理中..."
                  : "検証用QRカメラを起動"}
              </button>
            ) : (
              <>
                <div
                  id="pokipo-test-reward-reader"
                  style={{
                    width: "100%",
                    minHeight: 260,
                  }}
                />

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    background: "#555555",
                    marginTop: 14,
                  }}
                  onClick={() =>
                    setCameraOpen(false)
                  }
                >
                  カメラを閉じる
                </button>
              </>
            )}
          </section>
        )}

        {reward && (
          <section style={cardStyle}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#bd2838",
              }}
            >
              VERIFIED TEST REWARD
            </span>

            <h2 style={{ marginTop: 12 }}>
              検証用特典の確認
            </h2>

            <p>
              対象：
              <strong>{reward.nickname}</strong>
            </p>

            <p>
              状態：
              <strong>
                {reward.status === "exchanged"
                  ? "交換済み"
                  : "未交換（発行済み）"}
              </strong>
            </p>

            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: "#f4f1eb",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#777777",
                }}
              >
                確認コード
              </span>

              <div
                style={{
                  fontSize: 32,
                  letterSpacing: "0.2em",
                  fontWeight: 900,
                  marginTop: 8,
                }}
              >
                {reward.confirmationCode}
              </div>
            </div>

            {reward.status === "issued" && (
              <button
                type="button"
                style={buttonStyle}
                disabled={confirming}
                onClick={() =>
                  void confirmExchange()
                }
              >
                {confirming
                  ? "交換処理中..."
                  : "交換を確定する"}
              </button>
            )}

            {reward.status === "exchanged" && (
              <div
                role="status"
                style={{
                  padding: 18,
                  borderRadius: 12,
                  color: "#176a46",
                  background: "#e7f5ec",
                  textAlign: "center",
                  fontWeight: 800,
                }}
              >
                {success
                  ? "検証用の景品交換が完了しました！"
                  : "このQRはすでに交換済みです。"}
              </div>
            )}

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: "#ffffff",
                color: "#333333",
                border: "1px solid #ded8d1",
                marginTop: 14,
              }}
              onClick={() => {
                setReward(null);
                setMessage("");
                setSuccess(false);
                setCameraOpen(false);
              }}
            >
              別のQRを読み取る
            </button>
          </section>
        )}

        <button
          type="button"
          style={{
            ...buttonStyle,
            background: "#ffffff",
            color: "#333333",
            border: "1px solid #ded8d1",
            marginTop: 12,
          }}
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
