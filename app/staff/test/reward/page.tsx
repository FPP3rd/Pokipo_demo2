
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

/* ========================================
   TYPES
======================================== */

type TestStamp = {
  spot_id: string;
  acquired_at: string;
};

type RewardData = {
  token: string | null;
  confirmationCode: string | null;
  status: PokipoRewardStatus;
  exchangedAt: string | null;
};

/* ========================================
   STYLES
======================================== */

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
   HELPERS
======================================== */

function formatDate(
  value: string | null
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countUniqueStamps(
  stamps: TestStamp[]
): number {
  return new Set(
    stamps.map(
      (stamp: TestStamp) => stamp.spot_id
    )
  ).size;
}

/* ========================================
   PAGE
======================================== */

export default function StaffTestRewardPage() {
  const router = useRouter();

  /* LOADING */
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  /* ISSUING */
  const [issuing, setIssuing] = useState(false);
  const issuingRef = useRef(false);

  /* COMPLETION CONDITIONS */
  const [stampCount, setStampCount] =
    useState(0);

  const [surveyCompleted, setSurveyCompleted] =
    useState(false);

  const [completionRecorded, setCompletionRecorded] =
    useState(false);

  /* REWARD */
  const [reward, setReward] = useState<RewardData>({
    token: null,
    confirmationCode: null,
    status: "not_issued",
    exchangedAt: null,
  });

  /* ERROR */
  const [errorMessage, setErrorMessage] =
    useState("");

  /* ========================================
     LOAD TEST DATA

     検証専用データのみ読み込む
  ======================================== */

  const loadRewardData = useCallback(async () => {
    const session = await getPokipoTestSession();

    const stamps: TestStamp[] =
      await getPokipoTestStamps();

    const count = countUniqueStamps(stamps);

    setStampCount(count);

    setSurveyCompleted(
      Boolean(session.post_survey)
    );

    setCompletionRecorded(
      Boolean(session.completed_at)
    );

    const status: PokipoRewardStatus =
      session.reward_status === "issued" ||
      session.reward_status === "exchanged"
        ? session.reward_status
        : "not_issued";

    setReward({
      token: session.reward_token,
      confirmationCode:
        session.reward_confirmation_code,
      status,
      exchangedAt:
        session.reward_exchanged_at,
    });

    setReady(true);
  }, []);

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await loadRewardData();
      } catch (error) {
        console.error(
          "検証用特典データ取得エラー:",
          error
        );

        if (mounted) {
          setReady(false);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "検証用特典情報を取得できませんでした。"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadRewardData]);

  /* ========================================
     ISSUE TEST REWARD QR

     本番の特典発行RPCを呼ばない
  ======================================== */

  async function issueTestReward() {
    if (
      issuingRef.current ||
      !ready
    ) {
      return;
    }

    issuingRef.current = true;
    setIssuing(true);
    setErrorMessage("");

    try {
      // スタッフ権限を再確認
      const staffId =
        await getVerifiedTestStaffId();

      const session =
        await getPokipoTestSession();

      const stamps: TestStamp[] =
        await getPokipoTestStamps();

      if (
        session.staff_user_id !== staffId
      ) {
        throw new Error(
          "スタッフ情報が一致しません。"
        );
      }

      const count =
        countUniqueStamps(stamps);

      // 発行条件は保存直前にも確認
      if (
        count !== 5 ||
        !session.completed_at ||
        !session.post_survey
      ) {
        throw new Error(
          "特典QRの発行には、5か所のスタンプ達成と参加後アンケートの回答が必要です。"
        );
      }

      if (
        session.reward_status === "exchanged"
      ) {
        throw new Error(
          "この特典は交換済みです。再度検証する場合は、動作確認データをリセットしてください。"
        );
      }

      // 発行済みQRがあれば再利用
      if (
        session.reward_token &&
        session.reward_status === "issued"
      ) {
        await loadRewardData();
        return;
      }

      // 不整合な発行状態を防ぐ
      if (
        session.reward_token ||
        session.reward_status !== "not_issued"
      ) {
        throw new Error(
          "検証用QRの発行状態に不整合があります。データを確認してください。"
        );
      }

      // 暗号学的乱数で検証専用QRを作成
      const token = crypto.randomUUID();

      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);

      const confirmationCode = String(
        100000 + (randomValues[0] % 900000)
      );

      // pokipo_test_sessions のみ更新
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
          `検証用QR発行エラー: ${error.message}`
        );
      }

      if (
        !data ||
        data.length === 0
      ) {
        // 同時発行された場合は再読込
        const latest =
          await getPokipoTestSession();

        if (
          latest.reward_status !== "issued" ||
          !latest.reward_token
        ) {
          throw new Error(
            "検証用QRを発行できませんでした。"
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
          : "検証用の特典QRを発行できませんでした。"
      );
    } finally {
      issuingRef.current = false;
      setIssuing(false);
    }
  }

  /* ========================================
     REFRESH
  ======================================== */

  async function refreshReward() {
    setErrorMessage("");

    try {
      await loadRewardData();
    } catch (error) {
      console.error(
        "検証用特典状態更新エラー:",
        error
      );

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
    Boolean(reward.token) &&
    Boolean(reward.confirmationCode);

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
            本番と共通の特典交換画面を使って、
            動作を確認します。
          </p>
        </header>

        {/* TEST NOTICE */}
        <section
          style={{
            ...cardStyle,
            background: "#fff4e9",
            borderColor: "#efc89b",
          }}
        >
          <strong>検証専用モード</strong>

          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            この画面で発行するQRコードは、
            本番の景品交換には使用できません。
            本番の交換履歴や会場モニターには
            反映されません。
          </p>
        </section>

        {/* CONDITIONS */}
        {ready && (
          <section style={cardStyle}>
            <span
              style={{
                color: "#777777",
                fontSize: 12,
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
              <strong>
                {stampCount} / 5
              </strong>
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
              <h2
                style={{
                  fontSize: 20,
                }}
              >
                特典QRコードを発行する
              </h2>

              {!eligible && (
                <p style={{ lineHeight: 1.8 }}>
                  5か所のスタンプ取得と
                  参加後アンケートの回答、
                  完走記録が必要です。
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

        {/* SHARED REWARD QR */}
        {ready &&
          (issued || exchanged) && (
            <section>
              <PokipoRewardQrPanel
                mode="test"
                status={reward.status}
                token={reward.token}
                confirmationCode={
                  reward.confirmationCode
                }
                exchangedAt={formatDate(
                  reward.exchangedAt
                )}
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
                onClick={() =>
                  void refreshReward()
                }
                disabled={issuing}
              >
                交換状態を更新
              </button>
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
          }}
          onClick={() =>
            router.push("/staff/test")
          }
          disabled={issuing}
        >
          動作確認メニューへ戻る
        </button>
      </section>
    </main>
  );
}
