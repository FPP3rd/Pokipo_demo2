
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

type RewardData = {
  token: string | null;
  confirmationCode: string | null;
  status: PokipoRewardStatus;
  exchangedAt: string | null;
};

const EMPTY_REWARD: RewardData = {
  token: null,
  confirmationCode: null,
  status: "not_issued",
  exchangedAt: null,
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

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#ffffff",
  color: "#333333",
  border: "1px solid #ded8d1",
};

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

/* ========================================
   PAGE
======================================== */

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

  const [reward, setReward] =
    useState<RewardData>(EMPTY_REWARD);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* ========================================
     LOAD TEST DATA
  ======================================== */

  const loadRewardData = useCallback(async () => {
    const staffId = await getVerifiedTestStaffId();

    const session = await getPokipoTestSession();
    const stamps = await getPokipoTestStamps();

    if (session.staff_user_id !== staffId) {
      throw new Error(
        "検証セッションとスタッフ情報が一致しません。"
      );
    }

    const uniqueSpotIds = new Set<string>();

    for (const stamp of stamps) {
      uniqueSpotIds.add(stamp.spot_id);
    }

    setStampCount(uniqueSpotIds.size);

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
      token: session.reward_token ?? null,
      confirmationCode:
        session.reward_confirmation_code ?? null,
      status,
      exchangedAt:
        session.reward_exchanged_at ?? null,
    });

    setReady(true);
  }, []);

  /* ========================================
     INITIALIZE
  ======================================== */

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await loadRewardData();
      } catch (error) {
        console.error(
          "検証用特典データ取得エラー:",
          error
        );

        if (active) {
          setReady(false);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "検証用特典情報を取得できませんでした。"
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
  }, [loadRewardData]);

  /* ========================================
     ISSUE TEST REWARD

     本番のテーブルやRPCには書き込まない
  ======================================== */

  async function issueTestReward() {
    if (!ready || issuingRef.current) {
      return;
    }

    issuingRef.current = true;
    setIssuing(true);
    setErrorMessage("");

    try {
      const staffId = await getVerifiedTestStaffId();

      const session = await getPokipoTestSession();
      const stamps = await getPokipoTestStamps();

      if (session.staff_user_id !== staffId) {
        throw new Error(
          "スタッフ情報が一致しません。"
        );
      }

      const uniqueSpotIds = new Set<string>();

      for (const stamp of stamps) {
        uniqueSpotIds.add(stamp.spot_id);
      }

      if (
        uniqueSpotIds.size !== 5 ||
        !session.completed_at ||
        !session.post_survey
      ) {
        throw new Error(
          "特典QRの発行には、5か所のスタンプ取得と参加後アンケートの回答が必要です。"
        );
      }

      if (session.reward_status === "exchanged") {
        throw new Error(
          "すでに交換済みです。再検証する場合は、検証データをリセットしてください。"
        );
      }

      if (
        session.reward_status === "issued" &&
        session.reward_token
      ) {
        await loadRewardData();
        return;
      }

      if (
        session.reward_status !== "not_issued" ||
        session.reward_token
      ) {
        throw new Error(
          "QRの発行状態を確認できません。検証データを確認してください。"
        );
      }

      // 検証専用トークン
      const token = crypto.randomUUID();

      const randomNumbers = new Uint32Array(1);

      crypto.getRandomValues(randomNumbers);

      const confirmationCode = String(
        100000 + (randomNumbers[0] % 900000)
      );

      // 検証専用テーブルだけを更新
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

      if (!data || data.length !== 1) {
        const latest = await getPokipoTestSession();

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
        "検証用QR発行エラー:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "検証用QRの発行に失敗しました。"
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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "交換状態を取得できませんでした。"
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
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section style={{ padding: 30 }}>
          検証用特典情報を確認中...
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

          <h1>特典交換の動作確認</h1>

          <p style={{ lineHeight: 1.8 }}>
            本番と共通の表示部品を使用して、
            特典QRの発行と交換状態を確認します。
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
            本番の景品交換では使用できません。
            本番の景品交換履歴や会場モニターにも
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
          reward.status === "not_issued" && (
            <section style={cardStyle}>
              <h2 style={{ fontSize: 20 }}>
                検証用QRコードを発行
              </h2>

              {!eligible && (
                <p style={{ lineHeight: 1.8 }}>
                  5か所のスタンプと参加後アンケート、
                  完走記録が必要です。
                </p>
              )}

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  opacity: eligible ? 1 : 0.45,
                }}
                disabled={!eligible || issuing}
                onClick={() =>
                  void issueTestReward()
                }
              >
                {issuing
                  ? "発行中..."
                  : "検証用QRを発行する"}
              </button>
            </section>
          )}

        {/* SHARED QR COMPONENT */}
        {ready && (issued || exchanged) && (
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
                ...secondaryButtonStyle,
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

        {/* TEST SCANNER */}
        {ready && issued && (
          <button
            type="button"
            style={{
              ...buttonStyle,
              marginBottom: 16,
            }}
            onClick={() =>
              router.push("/staff/test/reward/scan")
            }
          >
            検証用QR読み取り画面へ
          </button>
        )}

        {/* BACK */}
        <button
          type="button"
          style={secondaryButtonStyle}
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
