
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";

import {
  getPokipoTestSession,
  getPokipoTestStamps,
  getVerifiedTestStaffId,
} from "../../../../lib/pokipo-test-data";

import {
  PokipoRewardQrPanel,
  type PokipoRewardStatus,
} from "../../../../components/PokipoRewardShared";

type RewardData = {
  token: string | null;
  confirmationCode: string | null;
  status: PokipoRewardStatus;
  exchangedAt: string | null;
};

const cardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid #e6e1db",
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
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

function formatDate(value: string | null): string | null {
  if (!value) return null;

  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StaffTestRewardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const issuingRef = useRef(false);

  const [stampCount, setStampCount] = useState(0);
  const [surveyCompleted, setSurveyCompleted] =
    useState(false);
  const [completionRecorded, setCompletionRecorded] =
    useState(false);

  const [reward, setReward] = useState<RewardData>({
    token: null,
    confirmationCode: null,
    status: "not_issued",
    exchangedAt: null,
  });

  const [errorMessage, setErrorMessage] = useState("");

  /* ========================================
     LOAD TEST DATA
  ======================================== */

  const loadRewardData = useCallback(async () => {
    const session = await getPokipoTestSession();
    const stamps = await getPokipoTestStamps();

    const count = new Set(
      stamps.map((stamp) => stamp.spot_id)
    ).size;

    setStampCount(count);
    setSurveyCompleted(Boolean(session.post_survey));
    setCompletionRecorded(Boolean(session.completed_at));

    const status: PokipoRewardStatus =
      session.reward_status === "issued" ||
      session.reward_status === "exchanged"
        ? session.reward_status
        : "not_issued";

    setReward({
      token: session.reward_token,
      confirmationCode: session.reward_confirmation_code,
      status,
      exchangedAt: session.reward_exchanged_at,
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
          setReady(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "検証用特典情報を取得できませんでした。"
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
     ISSUE TEST QR
  ======================================== */

  async function issueTestReward() {
    if (issuingRef.current || !ready) return;

    issuingRef.current = true;
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

      if (
        count !== 5 ||
        !session.completed_at ||
        !session.post_survey
      ) {
        throw new Error(
          "特典QRの発行には5か所の達成と参加後アンケートの回答が必要です。"
        );
      }

      if (session.reward_status === "exchanged") {
        throw new Error(
          "交換済みです。やり直す場合は検証データをリセットしてください。"
        );
      }

      if (session.reward_token) {
        await loadRewardData();
        return;
      }

      // 本番では使用しない検証専用トークン
      const token = crypto.randomUUID();

      const randomNumber = new Uint32Array(1);
      crypto.getRandomValues(randomNumber);

      const confirmationCode = String(
        100000 + (randomNumber[0] % 900000)
      );

      // 更新するのは検証専用テーブルだけ
      const { data, error } = await supabase
        .from("pokipo_test_sessions")
        .update({
          reward_token: token,
          reward_confirmation_code: confirmationCode,
          reward_status: "issued",
          updated_at: new Date().toISOString(),
        })
        .eq("staff_user_id", staffId)
        .eq("reward_status", "not_issued")
        .is("reward_token", null)
        .select("staff_user_id");

      if (error) {
        throw new Error(
          `検証用QR発行エラー: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
        const latest = await getPokipoTestSession();

        if (!latest.reward_token) {
          throw new Error(
            "QRを発行できませんでした。"
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
      issuingRef.current = false;
      setIssuing(false);
    }
  }

  async function refreshReward() {
    setErrorMessage("");

    try {
      await loadRewardData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "交換状態を更新できませんでした。"
      );
    }
  }

  /* ========================================
     STATUS
  ======================================== */

  const eligible =
    ready &&
    stampCount === 5 &&
    surveyCompleted &&
    completionRecorded;

  const issued =
    reward.status === "issued" &&
    Boolean(reward.token);

  const exchanged =
    reward.status === "exchanged";

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
            本番と共通の特典交換画面を使って
            動作を確認します。
          </p>
        </header>

        <section
          style={{
            ...cardStyle,
            background: "#fff4e9",
            borderColor: "#efc89b",
          }}
        >
          <strong>検証専用モード</strong>

          <p style={{ lineHeight: 1.8, marginBottom: 0 }}>
            この画面のQRコードは本番の景品交換には
            使用できません。交換履歴や会場モニターにも
            反映されません。
          </p>
        </section>

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

            <h2 style={{ fontSize: 20 }}>
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

            <p>
              完走記録：
              <strong>
                {completionRecorded
                  ? "記録済み"
                  : "未記録"}
              </strong>
            </p>

            <p>
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

        {ready &&
          !reward.token &&
          !exchanged && (
            <section style={cardStyle}>
              <h2 style={{ fontSize: 20 }}>
                特典QRコードを発行する
              </h2>

              {!eligible && (
                <p style={{ lineHeight: 1.8 }}>
                  5か所のスタンプと参加後アンケートを
                  完了すると発行できます。
                </p>
              )}

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  opacity: eligible ? 1 : 0.45,
                }}
                disabled={!eligible || issuing}
                onClick={() => void issueTestReward()}
              >
                {issuing
                  ? "発行中..."
                  : "検証用特典QRを発行する"}
              </button>
            </section>
          )}

        {/* 本番と共通のQR・交換済み表示 */}
        {ready && (issued || exchanged) && (
          <section>
            <PokipoRewardQrPanel
              mode="test"
              status={reward.status}
              token={reward.token}
              confirmationCode={reward.confirmationCode}
              exchangedAt={formatDate(reward.exchangedAt)}
            />

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: "#ffffff",
                color: "#333333",
                border: "1px solid #ded8d1",
                marginBottom: 16,
              }}
              onClick={() => void refreshReward()}
              disabled={issuing}
            >
              交換状態を更新
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
          }}
          onClick={() => router.push("/staff/test")}
          disabled={issuing}
        >
          動作確認メニューへ戻る
        </button>
      </section>
    </main>
  );
}
