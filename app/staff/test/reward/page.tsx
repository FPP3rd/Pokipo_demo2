
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { supabase } from "../../../../lib/supabase-client";
import {
  getPokipoTestSession,
  getPokipoTestStamps,
  getVerifiedTestStaffId,
} from "../../../../lib/pokipo-test-data";

type RewardStatus =
  | "not_issued"
  | "issued"
  | "exchanged";

type RewardData = {
  token: string | null;
  confirmationCode: string | null;
  status: RewardStatus;
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

const TEST_QR_PREFIX = "POKIPO_TEST_REWARD:";

export default function StaffTestRewardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [ready, setReady] = useState(false);

  const [stampCount, setStampCount] = useState(0);
  const [surveyCompleted, setSurveyCompleted] =
    useState(false);

  const [reward, setReward] = useState<RewardData>({
    token: null,
    confirmationCode: null,
    status: "not_issued",
  });

  const [qrImage, setQrImage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* ========================================
     LOAD DATA
  ======================================== */

  const loadRewardData = useCallback(async () => {
    // スタッフ認証・検証セッションを確認
    const session = await getPokipoTestSession();

    const stamps = await getPokipoTestStamps();

    const count = new Set(
      stamps.map((stamp) => stamp.spot_id)
    ).size;

    setStampCount(count);
    setSurveyCompleted(Boolean(session.post_survey));

    const validStatus: RewardStatus =
      session.reward_status === "issued" ||
      session.reward_status === "exchanged"
        ? session.reward_status
        : "not_issued";

    setReward({
      token: session.reward_token,
      confirmationCode:
        session.reward_confirmation_code,
      status: validStatus,
    });

    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await loadRewardData();
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "検証用特典データを取得できませんでした。"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadRewardData]);

  /* ========================================
     CREATE QR IMAGE
  ======================================== */

  useEffect(() => {
    let active = true;

    async function generateQr() {
      if (!reward.token) {
        setQrImage("");
        return;
      }

      try {
        const image = await QRCode.toDataURL(
          `${TEST_QR_PREFIX}${reward.token}`,
          {
            width: 340,
            margin: 3,
            errorCorrectionLevel: "H",
            color: {
              dark: "#161616",
              light: "#ffffff",
            },
          }
        );

        if (active) setQrImage(image);
      } catch (error) {
        if (active) {
          setErrorMessage(
            "QR画像を生成できませんでした。"
          );
        }
      }
    }

    void generateQr();

    return () => {
      active = false;
    };
  }, [reward.token]);

  /* ========================================
     ISSUE TEST REWARD QR
  ======================================== */

  async function issueTestReward() {
    if (issuing || !ready) return;

    setIssuing(true);
    setErrorMessage("");

    try {
      const staffId = await getVerifiedTestStaffId();
      const session = await getPokipoTestSession();
      const stamps = await getPokipoTestStamps();

      if (staffId !== session.staff_user_id) {
        throw new Error(
          "スタッフ情報が一致しません。"
        );
      }

      const count = new Set(
        stamps.map((stamp) => stamp.spot_id)
      ).size;

      // 発行直前にも検証専用データを再確認する
      if (
        count !== 5 ||
        !session.completed_at ||
        !session.post_survey
      ) {
        throw new Error(
          "特典QRの発行には5か所達成と参加後アンケートの回答が必要です。"
        );
      }

      if (session.reward_status === "exchanged") {
        throw new Error(
          "この検証用特典は交換済みです。再確認する場合は動作確認データをリセットしてください。"
        );
      }

      // 発行済みなら同じQRを再表示する
      if (session.reward_token) {
        await loadRewardData();
        return;
      }

      // 検証用トークンと確認コードを生成する
      const token = crypto.randomUUID();
      const confirmationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // 本番 reward_exchanges は一切操作しない
      const { data, error } = await supabase
        .from("pokipo_test_sessions")
        .update({
          reward_token: token,
          reward_confirmation_code:
            confirmationCode,
          reward_status: "issued",
          updated_at: new Date().toISOString(),
        })
        .eq("staff_user_id", staffId)
        .eq("reward_status", "not_issued")
        .is("reward_token", null)
        .select("staff_user_id");

      if (error) {
        throw new Error(
          `検証用特典QRの発行に失敗しました: ${error.message}`
        );
      }

      // 別の端末などで同時発行された場合は
      // 既存の状態を読み直す
      if (!data || data.length === 0) {
        const latest = await getPokipoTestSession();

        if (!latest.reward_token) {
          throw new Error(
            "特典QRを発行できませんでした。"
          );
        }
      }

      await loadRewardData();
    } catch (error) {
      console.error(
        "検証用特典QR発行エラー:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "検証用特典QRを発行できませんでした。"
      );
    } finally {
      setIssuing(false);
    }
  }

  /* ========================================
     VIEW
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section style={{ padding: 30 }}>
          検証用特典データを読み込み中...
        </section>
      </main>
    );
  }

  const eligible =
    ready && stampCount === 5 && surveyCompleted;

  const issued =
    reward.status === "issued" &&
    Boolean(reward.token);

  const exchanged =
    reward.status === "exchanged";

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
            特典交換の動作確認
          </h1>

          <p style={{ lineHeight: 1.8 }}>
            検証専用の特典QRコードを発行します。
          </p>
        </header>

        {/* NOTICE */}
        <section
          style={{
            ...cardStyle,
            background: "#fff4e9",
            borderColor: "#efc89b",
          }}
        >
          <strong>検証用QRコード</strong>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.8,
            }}
          >
            ここで発行するQRは本番の景品交換には
            使用できません。
            本番の交換記録や会場モニターにも
            反映されません。
          </p>
        </section>

        {/* STATUS */}
        {ready && (
          <section style={cardStyle}>
            <span
              style={{
                fontSize: 12,
                color: "#777",
                fontWeight: 800,
              }}
            >
              TEST REWARD STATUS
            </span>

            <h2
              style={{
                fontSize: 20,
                margin: "12px 0",
              }}
            >
              特典交換条件
            </h2>

            <p>
              スタンプ：
              <strong>{stampCount} / 5</strong>
            </p>

            <p>
              参加後アンケート：
              <strong>
                {surveyCompleted
                  ? "回答済み"
                  : "未回答"}
              </strong>
            </p>

            <p style={{ marginBottom: 0 }}>
              特典QR：
              <strong>
                {exchanged
                  ? "交換済み"
                  : issued
                  ? "発行済み"
                  : "未発行"}
              </strong>
            </p>
          </section>
        )}

        {/* ERROR */}
        {errorMessage && (
          <section
            role="alert"
            style={{
              ...cardStyle,
              borderColor: "#d84949",
              color: "#a52a2a",
            }}
          >
            {errorMessage}
          </section>
        )}

        {/* ISSUE BUTTON */}
        {ready &&
          !reward.token &&
          !exchanged && (
            <section style={cardStyle}>
              <h2 style={{ fontSize: 20 }}>
                特典QRコードを発行する
              </h2>

              {!eligible && (
                <p style={{ lineHeight: 1.8 }}>
                  5か所のスタンプ取得と
                  参加後アンケートの回答が
                  完了すると発行できます。
                </p>
              )}

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  opacity: eligible ? 1 : 0.45,
                  cursor: eligible
                    ? "pointer"
                    : "not-allowed",
                }}
                disabled={!eligible || issuing}
                onClick={() =>
                  void issueTestReward()
                }
              >
                {issuing
                  ? "発行中..."
                  : "検証用特典QRを発行する"}
              </button>
            </section>
          )}

        {/* GENERATED QR */}
        {issued && (
          <section
            style={{
              ...cardStyle,
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: "#19764b",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              TEST REWARD QR ISSUED
            </span>

            <h2 style={{ fontSize: 22 }}>
              特典交換QRコード
            </h2>

            <p style={{ color: "#bd2838" }}>
              動作確認専用・本番交換不可
            </p>

            {qrImage ? (
              <img
                src={qrImage}
                alt="検証専用特典交換QRコード"
                style={{
                  width: "min(100%, 300px)",
                  height: "auto",
                  display: "block",
                  margin: "20px auto",
                  background: "#ffffff",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #eeeeee",
                }}
              />
            ) : (
              <p>QRコードを生成しています...</p>
            )}

            <p
              style={{
                fontSize: 12,
                color: "#777",
              }}
            >
              確認コード
            </p>

            <strong
              style={{
                fontSize: 32,
                letterSpacing: "0.2em",
              }}
            >
              {reward.confirmationCode ?? "------"}
            </strong>

            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              このQRをスタッフ用の
              検証読み取り画面でスキャンして、
              景品交換の動作を確認します。
            </p>

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: "#ffffff",
                color: "#333",
                border: "1px solid #ded8d1",
              }}
              onClick={() =>
                void loadRewardData().catch(
                  (error: unknown) =>
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "更新できませんでした。"
                    )
                )
              }
            >
              交換状態を更新
            </button>
          </section>
        )}

        {/* EXCHANGED */}
        {exchanged && (
          <section
            style={{
              ...cardStyle,
              textAlign: "center",
              borderColor: "#8ac6a6",
            }}
          >
            <div style={{ fontSize: 42 }}>✓</div>

            <h2>交換完了（検証用）</h2>

            <p style={{ lineHeight: 1.8 }}>
              検証専用の特典交換処理が完了しています。
              最初からやり直す場合は
              動作確認メニューからリセットしてください。
            </p>
          </section>
        )}

        {/* BACK */}
        <button
          type="button"
          style={{
            ...buttonStyle,
            background: "#ffffff",
            color: "#333333",
            border: "1px solid #ded8d1",
            marginTop: 10,
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
