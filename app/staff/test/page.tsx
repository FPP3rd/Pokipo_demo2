
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type TestSession = {
  staff_user_id: string;
  nickname: string;
  grade: string;
  department: string;
  pre_survey: unknown;
  post_survey: unknown;
  reward_status: string;
  completed_at: string | null;
};

type TestStamp = {
  spot_id: string;
  acquired_at: string;
};

/* ========================================
   SPOTS
======================================== */

const SPOTS = [
  { id: "spot1", label: "スポット 1" },
  { id: "spot2", label: "スポット 2" },
  { id: "spot3", label: "スポット 3" },
  { id: "spot4", label: "スポット 4" },
  { id: "spot5", label: "スポット 5" },
];

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
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #ded8d1",
  background: "#ffffff",
  color: "#242424",
  fontWeight: 700,
  cursor: "pointer",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#777777",
  fontWeight: 800,
};

/* ========================================
   PAGE
======================================== */

export default function StaffTestPage() {
  const router = useRouter();

  /* LOADING */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  /* STAFF */
  const [staffName, setStaffName] = useState("");

  /* TEST DATA */
  const [session, setSession] =
    useState<TestSession | null>(null);
  const [stamps, setStamps] = useState<TestStamp[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState(0);

  /* MESSAGES */
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* ========================================
     AUTH
  ======================================== */

  const verifyStaff = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error("スタッフログインが必要です。");
    }

    const { data: staff, error: staffError } =
      await supabase
        .from("staff_profiles")
        .select("display_name")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (staffError || !staff) {
      throw new Error("管理者権限がありません。");
    }

    return {
      staffId: data.user.id,
      name: staff.display_name ?? "LiPostスタッフ",
    };
  }, []);

  /* ========================================
     LOAD TEST DATA
  ======================================== */

  const loadTestData = useCallback(async () => {
    const { staffId, name } = await verifyStaff();

    setStaffName(name);

    const { data: existing, error: findError } =
      await supabase
        .from("pokipo_test_sessions")
        .select("staff_user_id")
        .eq("staff_user_id", staffId)
        .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    // 初回アクセス時だけ検証用セッションを作成
    if (!existing) {
      const { error: insertError } = await supabase
        .from("pokipo_test_sessions")
        .insert({
          staff_user_id: staffId,
          nickname: "LiPost動作確認",
          grade: "3年",
          department: "検証用",
        });

      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    }

    // 本番用テーブルは読み書きしない
    const [
      sessionResult,
      stampsResult,
      knowledgeResult,
    ] = await Promise.all([
      supabase
        .from("pokipo_test_sessions")
        .select(
          "staff_user_id,nickname,grade,department,pre_survey,post_survey,reward_status,completed_at"
        )
        .eq("staff_user_id", staffId)
        .single(),

      supabase
        .from("pokipo_test_stamps")
        .select("spot_id,acquired_at")
        .eq("staff_user_id", staffId)
        .order("acquired_at", { ascending: true }),

      supabase
        .from("pokipo_test_knowledge")
        .select("knowledge_id")
        .eq("staff_user_id", staffId),
    ]);

    if (sessionResult.error) {
      throw new Error(sessionResult.error.message);
    }

    if (stampsResult.error) {
      throw new Error(stampsResult.error.message);
    }

    if (knowledgeResult.error) {
      throw new Error(knowledgeResult.error.message);
    }

    setSession(sessionResult.data as TestSession);
    setStamps((stampsResult.data ?? []) as TestStamp[]);
    setKnowledgeCount(knowledgeResult.data?.length ?? 0);
  }, [verifyStaff]);

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await loadTestData();
      } catch (error) {
        console.error("動作確認初期化エラー:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "動作確認データを読み込めませんでした。"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadTestData]);

  /* ========================================
     REFRESH
  ======================================== */

  async function refresh() {
    if (refreshing || resetting) return;

    setRefreshing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await loadTestData();
      setSuccessMessage(
        "最新の検証データを取得しました。"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "データを更新できませんでした。"
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ========================================
     RESET TEST DATA
  ======================================== */

  async function resetTestData() {
    if (resetting || refreshing || !session) return;

    const confirmed = window.confirm(
      "動作確認データを初期化しますか？\n\n" +
        "以下の検証用データを削除・初期化します。\n" +
        "・スタンプ5か所\n" +
        "・取得した豆知識\n" +
        "・参加前・参加後アンケート\n" +
        "・完走記録\n" +
        "・検証用特典QRと交換状態\n\n" +
        "本番の参加者データには触れません。"
    );

    if (!confirmed) return;

    setResetting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // リセット直前にスタッフ権限を再確認
      const { staffId } = await verifyStaff();

      if (staffId !== session.staff_user_id) {
        throw new Error(
          "ログインしているスタッフが変更されました。"
        );
      }

      // 検証専用スタンプを削除
      const { error: stampError } = await supabase
        .from("pokipo_test_stamps")
        .delete()
        .eq("staff_user_id", staffId);

      if (stampError) {
        throw new Error(
          `スタンプ初期化エラー: ${stampError.message}`
        );
      }

      // 検証専用豆知識を削除
      const { error: knowledgeError } = await supabase
        .from("pokipo_test_knowledge")
        .delete()
        .eq("staff_user_id", staffId);

      if (knowledgeError) {
        throw new Error(
          `豆知識初期化エラー: ${knowledgeError.message}`
        );
      }

      // 検証用セッション情報を初期化
      const { data: updatedSession, error: sessionError } =
        await supabase
          .from("pokipo_test_sessions")
          .update({
            pre_survey: null,
            post_survey: null,
            reward_token: null,
            reward_confirmation_code: null,
            reward_status: "not_issued",
            reward_exchanged_at: null,
            completed_at: null,
            achievement_rank: null,
            secret_stamp: false,
            updated_at: new Date().toISOString(),
          })
          .eq("staff_user_id", staffId)
          .select("staff_user_id")
          .single();

      if (sessionError || !updatedSession) {
        throw new Error(
          `セッション初期化エラー: ${
            sessionError?.message ?? "更新対象がありません"
          }`
        );
      }

      await loadTestData();

      setSuccessMessage(
        "動作確認データを初期化しました。スタンプ0/5から再び検証できます。"
      );
    } catch (error) {
      console.error("動作確認リセットエラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "初期化に失敗しました。"
      );

      try {
        await loadTestData();
      } catch (refreshError) {
        console.error(
          "リセット後の再取得エラー:",
          refreshError
        );
      }
    } finally {
      setResetting(false);
    }
  }

  /* ========================================
     STATUS
  ======================================== */

  const stampIds = new Set(
    stamps.map((stamp) => stamp.spot_id)
  );

  const progress = Math.min(stampIds.size, 5);

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <section style={{ padding: "30px 0" }}>
          管理者認証と検証データを確認しています...
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
          maxWidth: 760,
          margin: "0 auto",
          padding: "26px 0 60px",
        }}
      >
        {/* HEADER */}
        <header style={{ marginBottom: 24 }}>
          <span
            style={{
              ...labelStyle,
              letterSpacing: "0.12em",
              color: "#a83b3b",
            }}
          >
            POKIPO STAFF TESTING
          </span>

          <h1
            style={{
              fontSize: "clamp(26px, 5vw, 36px)",
              margin: "8px 0 10px",
            }}
          >
            POKIPO動作確認
          </h1>

          <p style={{ lineHeight: 1.8 }}>
            LiPostメンバー専用の検証環境です。
            本番とは分離したデータで動作を確認します。
          </p>
        </header>

        {/* STAFF */}
        {session && (
          <section style={cardStyle}>
            <p style={{ ...labelStyle, margin: "0 0 6px" }}>
              LOGIN STAFF
            </p>

            <strong>{staffName}</strong>

            <span
              style={{
                display: "inline-block",
                marginLeft: 12,
                fontSize: 12,
                color: "#1b7653",
                fontWeight: 800,
              }}
            >
              検証専用
            </span>
          </section>
        )}

        {/* MESSAGES */}
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

        {successMessage && (
          <section
            role="status"
            style={{
              ...cardStyle,
              borderColor: "#89c9a8",
              color: "#176a46",
            }}
          >
            {successMessage}
          </section>
        )}

        {/* TEST DATA */}
        {session && (
          <>
            {/* PROFILE */}
            <section style={cardStyle}>
              <span style={labelStyle}>
                TEST PROFILE
              </span>

              <h2 style={{ margin: "10px 0" }}>
                {session.nickname}
              </h2>

              <p style={{ margin: 0 }}>
                {session.grade} / {session.department}
              </p>
            </section>

            {/* STAMP PROGRESS */}
            <section style={cardStyle}>
              <span style={labelStyle}>
                STAMP PROGRESS
              </span>

              <h2
                style={{
                  fontSize: 30,
                  margin: "8px 0 14px",
                }}
              >
                {progress} / 5
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(5, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {SPOTS.map((spot) => {
                  const collected =
                    stampIds.has(spot.id);

                  return (
                    <div
                      key={spot.id}
                      title={spot.label}
                      style={{
                        padding: "14px 4px",
                        borderRadius: 12,
                        textAlign: "center",
                        background: collected
                          ? "#dff4e8"
                          : "#f3f0eb",
                        border: collected
                          ? "1px solid #60b487"
                          : "1px solid #ddd7cf",
                        fontWeight: 800,
                      }}
                    >
                      {collected
                        ? "✓"
                        : spot.id.slice(-1)}
                    </div>
                  );
                })}
              </div>

              <p style={{ marginBottom: 0 }}>
                獲得した豆知識：
                {knowledgeCount} / 5
              </p>
            </section>

            {/* SURVEY / REWARD STATUS */}
            <section style={cardStyle}>
              <span style={labelStyle}>
                TEST STATUS
              </span>

              <div
                style={{
                  lineHeight: 2,
                  marginTop: 10,
                }}
              >
                <div>
                  参加前アンケート：
                  {session.pre_survey
                    ? "回答済み"
                    : "未回答"}
                </div>

                <div>
                  参加後アンケート：
                  {session.post_survey
                    ? "回答済み"
                    : "未回答"}
                </div>

                <div>
                  景品交換：
                  {session.reward_status ===
                  "exchanged"
                    ? "交換済み"
                    : session.reward_status ===
                      "issued"
                    ? "QR発行済み"
                    : "未発行"}
                </div>
              </div>
            </section>

            {/* ========================================
                SURVEY TEST MENU - STEP 12
            ======================================== */}
            <section style={cardStyle}>
              <span
                style={{
                  ...labelStyle,
                  color: "#a83b3b",
                }}
              >
                SURVEY TEST
              </span>

              <h2
                style={{
                  marginTop: 10,
                  fontSize: 19,
                }}
              >
                アンケート動作確認
              </h2>

              <p style={{ lineHeight: 1.8 }}>
                本番と同じ設問を使用して、
                参加前・参加後アンケートの入力と
                回答保存を確認できます。
                回答は検証専用データに保存されます。
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    background: "#bd2838",
                    color: "#ffffff",
                    border: "none",
                    padding: "16px 20px",
                  }}
                  disabled={resetting || refreshing}
                  onClick={() =>
                    router.push(
                      "/staff/test/survey/before"
                    )
                  }
                >
                  参加前アンケートを確認する →
                </button>

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    background: "#ffffff",
                    color: "#bd2838",
                    border: "1px solid #bd2838",
                    padding: "16px 20px",
                  }}
                  disabled={
                    resetting ||
                    refreshing ||
                    !session.pre_survey
                  }
                  onClick={() =>
                    router.push(
                      "/staff/test/survey/after"
                    )
                  }
                >
                  参加後アンケートを確認する →
                </button>
              </div>

              {!session.pre_survey && (
                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 0,
                    fontSize: 12,
                    color: "#777777",
                    lineHeight: 1.8,
                  }}
                >
                  ※ 参加後アンケートは、
                  参加前アンケートの回答を保存すると
                  開けるようになります。
                </p>
              )}
            </section>

            {/* ========================================
                QR TEST MENU
            ======================================== */}
            <section style={cardStyle}>
              <span
                style={{
                  ...labelStyle,
                  color: "#a83b3b",
                }}
              >
                TEST APPLICATION
              </span>

              <h2
                style={{
                  marginTop: 10,
                  fontSize: 19,
                }}
              >
                スタンプラリー動作確認
              </h2>

              <p style={{ lineHeight: 1.8 }}>
                本番と同じスポットQRで、
                スタンプ取得・クイズ・豆知識の
                動作を検証します。
              </p>

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  width: "100%",
                  background: "#bd2838",
                  color: "#ffffff",
                  border: "none",
                  padding: "16px 20px",
                }}
                disabled={resetting || refreshing}
                onClick={() =>
                  router.push(
                    "/staff/test/stamp"
                  )
                }
              >
                QR読み取りを動作確認する →
              </button>
            </section>

            {/* ========================================
                RESET TEST DATA
            ======================================== */}
            <section
              style={{
                ...cardStyle,
                borderColor: "#e9b4b4",
              }}
            >
              <span
                style={{
                  ...labelStyle,
                  color: "#ac3030",
                }}
              >
                TEST DATA RESET
              </span>

              <h2
                style={{
                  marginTop: 10,
                  fontSize: 19,
                }}
              >
                動作確認を最初からやり直す
              </h2>

              <p style={{ lineHeight: 1.8 }}>
                検証専用のスタンプ・豆知識・
                アンケート・完走記録・特典状態を
                初期化します。
              </p>

              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: "#a52a2a",
                }}
              >
                ※ 実行前に確認画面が表示されます。
                この操作は取り消せません。
                本番データは削除しません。
              </p>

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  width: "100%",
                  color: "#a52a2a",
                  border: "1px solid #d84949",
                  padding: "15px 20px",
                  background: "#fff8f8",
                }}
                disabled={resetting || refreshing}
                onClick={() =>
                  void resetTestData()
                }
              >
                {resetting
                  ? "検証データを初期化中..."
                  : "動作確認データをリセット"}
              </button>
            </section>
          </>
        )}

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <button
            type="button"
            style={buttonStyle}
            disabled={refreshing || resetting}
            onClick={() =>
              void refresh()
            }
          >
            {refreshing
              ? "更新中..."
              : "検証データを更新"}
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() =>
              router.push("/staff")
            }
          >
            管理画面へ戻る
          </button>
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            lineHeight: 1.8,
            color: "#777",
          }}
        >
          本画面が操作するのは検証専用の
          3テーブルのみです。
          本番の参加者・スタンプ・アンケート・
          景品交換記録は変更しません。
        </p>
      </section>
    </main>
  );
}
