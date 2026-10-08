
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";
import SupportQrScanner from "../../../../components/SupportQrScanner";

type RewardRecord = {
  exchange_id: string;
  status: string;
  created_at: string;
  exchanged_at: string | null;
  confirmation_code: string;
  exchanged_by_name: string | null;
};

type RollbackLog = {
  id: string;
  exchange_id: string;
  reason: string;
  created_at: string;
  original_exchanged_at: string | null;
  staff_name: string;
};

type Participant = {
  participant_id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
  stamps: {
    spot_id: string;
    acquired_at: string;
  }[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractToken(text: string): string | null {
  const value = text.trim();
  const token = value.startsWith("POKIPO_SUPPORT:")
    ? value.slice("POKIPO_SUPPORT:".length).trim()
    : value;

  return UUID_PATTERN.test(token) ? token : null;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusLabel(value: string) {
  if (value === "issued") return "未交換";
  if (value === "exchanged") return "交換済み";
  return value;
}

export default function StaffSupportRewardPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [input, setInput] = useState("");
  const [activeToken, setActiveToken] = useState("");

  const [participant, setParticipant] =
    useState<Participant | null>(null);

  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [logs, setLogs] = useState<RollbackLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedExchange, setSelectedExchange] =
    useState<RewardRecord | null>(null);

  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ========================================
     ADMIN AUTH
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !data.session) {
          router.replace("/staff/reward");
          return;
        }

        const { data: staff, error: staffError } =
          await supabase
            .from("staff_profiles")
            .select("user_id")
            .eq("user_id", data.session.user.id)
            .maybeSingle();

        if (!mounted) return;

        if (staffError || !staff) {
          setAuthorized(false);
          setErrorMessage(
            "スタッフ権限を確認できませんでした。"
          );
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("認証確認エラー:", error);

        if (mounted) {
          setErrorMessage("認証確認に失敗しました。");
        }
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    void checkAuth();

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;

          if (!session) {
            setAuthorized(false);
            router.replace("/staff/reward");
          }
        }
      );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  /* ========================================
     LOAD SUPPORT DATA
  ======================================== */

  async function fetchSupportData(token: string) {
    const [
      participantResult,
      rewardResult,
      logResult,
    ] = await Promise.all([
      supabase.rpc("lookup_pokipo_support_participant", {
        p_support_token: token,
      }),
      supabase.rpc("staff_get_support_reward_status", {
        p_support_token: token,
      }),
      supabase.rpc("staff_get_reward_rollback_logs", {
        p_support_token: token,
      }),
    ]);

    if (participantResult.error) {
      throw participantResult.error;
    }

    if (rewardResult.error) {
      throw rewardResult.error;
    }

    if (logResult.error) {
      throw logResult.error;
    }

    const target =
      participantResult.data as Participant | null;

    if (!target || !target.participant_id) {
      throw new Error("該当する参加者が見つかりません。");
    }

    return {
      participant: target,
      rewards: Array.isArray(rewardResult.data)
        ? (rewardResult.data as RewardRecord[])
        : [],
      logs: Array.isArray(logResult.data)
        ? (logResult.data as RollbackLog[])
        : [],
    };
  }

  async function searchParticipant(rawInput?: string) {
    if (loading || saving || !authorized) return;

    setErrorMessage("");
    setSuccessMessage("");
    setParticipant(null);
    setRewards([]);
    setLogs([]);
    setActiveToken("");
    setSelectedExchange(null);
    setReason("");
    setConfirmOpen(false);

    const token = extractToken(rawInput ?? input);

    if (!token) {
      setErrorMessage(
        "正しい問い合わせ番号を入力してください。"
      );
      return;
    }

    setLoading(true);

    try {
      const result = await fetchSupportData(token);

      setParticipant(result.participant);
      setRewards(result.rewards);
      setLogs(result.logs);
      setActiveToken(token);
    } catch (error) {
      console.error("景品交換照会エラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "参加者情報の取得に失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleQrDetected(token: string) {
    setScannerOpen(false);
    setInput(token);
    void searchParticipant(token);
  }

  function clearSearch() {
    if (saving || loading) return;

    setInput("");
    setActiveToken("");
    setParticipant(null);
    setRewards([]);
    setLogs([]);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedExchange(null);
    setReason("");
    setConfirmOpen(false);
  }

  /* ========================================
     REWARD ROLLBACK
  ======================================== */

  function selectRollback(reward: RewardRecord) {
    if (saving || reward.status !== "exchanged") return;

    setSelectedExchange(reward);
    setReason("");
    setErrorMessage("");
    setSuccessMessage("");
    setConfirmOpen(false);
  }

  function prepareRollback() {
    if (!selectedExchange || !participant || !activeToken) return;

    if (reason.trim().length < 5 || reason.trim().length > 500) {
      setErrorMessage(
        "取消理由を5〜500文字で入力してください。"
      );
      return;
    }

    setErrorMessage("");
    setConfirmOpen(true);
  }

  async function executeRollback() {
    if (
      saving ||
      !selectedExchange ||
      !activeToken ||
      !authorized
    ) {
      return;
    }

    const exchangeId = selectedExchange.exchange_id;
    const token = activeToken;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "staff_rollback_reward_exchange",
        {
          p_support_token: token,
          p_exchange_id: exchangeId,
          p_reason: reason.trim(),
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error("取消処理を完了できませんでした。");
      }

      setConfirmOpen(false);
      setSelectedExchange(null);
      setReason("");

      setSuccessMessage(
        "景品交換を取り消しました。交換状態は「未交換」に戻りました。"
      );

      try {
        const refreshed = await fetchSupportData(token);

        setParticipant(refreshed.participant);
        setRewards(refreshed.rewards);
        setLogs(refreshed.logs);
      } catch (refreshError) {
        console.error("取消後の再取得エラー:", refreshError);

        setParticipant(null);
        setRewards([]);
        setLogs([]);
        setActiveToken("");

        setErrorMessage(
          "取消処理は成功しましたが最新情報を取得できませんでした。再検索して確認してください。"
        );
      }
    } catch (error) {
      console.error("景品交換取消エラー:", error);

      setConfirmOpen(false);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "景品交換の取消に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  /* ========================================
     AUTH LOADING
  ======================================== */

  if (checkingAuth) {
    return (
      <main className="shell">
        <section className="staffMenuPage">
          <div className="staffLoadingCard">
            管理者情報を確認中...
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="shell">
        <section className="staffMenuPage">
          <p style={styles.error}>
            {errorMessage || "ログインが必要です。"}
          </p>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => router.push("/staff/reward")}
          >
            ログイン画面へ
          </button>
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
        className="staffMenuPage"
        style={{ maxWidth: 850, margin: "0 auto" }}
      >
        <button
          type="button"
          style={styles.backButton}
          onClick={() => router.push("/staff")}
        >
          ← スタッフメニューに戻る
        </button>

        <header style={{ margin: "18px 0 24px" }}>
          <span className="staffMenuEyebrow">
            POKIPO REWARD SUPPORT
          </span>

          <h1 style={{ margin: "8px 0" }}>
            景品交換の取消・復旧
          </h1>

          <p style={styles.description}>
            問い合わせQRから景品交換状況を照会し、
            誤って交換済みになった記録を未交換に戻します。
          </p>
        </header>

        {/* ========================================
            SEARCH
        ======================================== */}
        <section style={styles.card}>
          <h2 style={styles.heading}>
            問い合わせ番号で検索
          </h2>

          <p style={styles.description}>
            お問い合わせ専用QRをカメラで読み取るか、
            問い合わせ番号を手入力してください。
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void searchParticipant();
            }}
          >
            <label
              htmlFor="rewardSupportToken"
              style={styles.label}
            >
              問い合わせ番号
            </label>

            <input
              id="rewardSupportToken"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
              style={styles.input}
            />

            <button
              type="button"
              disabled={loading || saving}
              onClick={() => setScannerOpen(true)}
              style={styles.cameraButton}
            >
              <span aria-hidden="true">📷</span>
              カメラで問い合わせQRを読み取る
            </button>

            <div style={styles.buttonRow}>
              <button
                type="submit"
                disabled={loading || saving}
                style={styles.primaryButton}
              >
                {loading ? "検索中..." : "参加者を検索"}
              </button>

              <button
                type="button"
                disabled={loading || saving}
                onClick={clearSearch}
                style={styles.secondaryButton}
              >
                クリア
              </button>
            </div>
          </form>
        </section>

        {errorMessage && (
          <div role="alert" style={styles.error}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div role="status" style={styles.success}>
            {successMessage}
          </div>
        )}

        {participant && (
          <>
            {/* PARTICIPANT */}
            <section style={styles.card}>
              <span style={styles.eyebrow}>
                PARTICIPANT
              </span>

              <h2 style={{ margin: "8px 0 16px" }}>
                {participant.nickname}さん
              </h2>

              <div style={styles.infoGrid}>
                <div>
                  <span style={styles.muted}>学年</span>
                  <p style={styles.infoValue}>
                    {participant.grade ?? "未登録"}
                  </p>
                </div>

                <div>
                  <span style={styles.muted}>学科</span>
                  <p style={styles.infoValue}>
                    {participant.department ?? "未登録"}
                  </p>
                </div>

                <div>
                  <span style={styles.muted}>スタンプ</span>
                  <p style={styles.infoValue}>
                    {new Set(
                      participant.stamps.map(
                        (stamp) => stamp.spot_id
                      )
                    ).size}{" "}
                    / 5
                  </p>
                </div>
              </div>
            </section>

            {/* REWARD RECORDS */}
            <section style={styles.card}>
              <h2 style={styles.heading}>
                景品交換状況
              </h2>

              {rewards.length === 0 ? (
                <p style={styles.description}>
                  この参加者の景品交換用QRは
                  まだ発行されていません。
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {rewards.map((reward) => {
                    const exchanged =
                      reward.status === "exchanged";

                    return (
                      <article
                        key={reward.exchange_id}
                        style={styles.recordCard}
                      >
                        <div style={styles.recordHeader}>
                          <strong>
                            {getStatusLabel(reward.status)}
                          </strong>

                          <span
                            style={{
                              ...styles.status,
                              background: exchanged
                                ? "#e9f6ed"
                                : "#f5eee9",
                              color: exchanged
                                ? "#20743c"
                                : "#846e60",
                            }}
                          >
                            {exchanged
                              ? "EXCHANGED"
                              : reward.status.toUpperCase()}
                          </span>
                        </div>

                        <div style={styles.recordInfo}>
                          <div>
                            <span>確認コード</span>
                            <strong>
                              {reward.confirmation_code}
                            </strong>
                          </div>

                          <div>
                            <span>QR発行日時</span>
                            <strong>
                              {formatDate(reward.created_at)}
                            </strong>
                          </div>

                          <div>
                            <span>景品交換日時</span>
                            <strong>
                              {formatDate(reward.exchanged_at)}
                            </strong>
                          </div>

                          <div>
                            <span>交換担当者</span>
                            <strong>
                              {reward.exchanged_by_name ?? "—"}
                            </strong>
                          </div>
                        </div>

                        {exchanged && (
                          <button
                            type="button"
                            disabled={saving}
                            style={styles.dangerButton}
                            onClick={() =>
                              selectRollback(reward)
                            }
                          >
                            この景品交換を取り消す
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* CANCELLATION REASON */}
            {selectedExchange && (
              <section style={styles.card}>
                <span style={styles.eyebrow}>
                  REWARD ROLLBACK
                </span>

                <h2 style={styles.heading}>
                  交換取消の理由
                </h2>

                <p style={styles.description}>
                  景品が未交付であることを確認してから
                  取り消してください。処理後は同じ特典交換QRを
                  再び使用できる状態に戻します。
                </p>

                <label
                  htmlFor="rewardRollbackReason"
                  style={styles.label}
                >
                  取消理由（必須・5文字以上）
                </label>

                <textarea
                  id="rewardRollbackReason"
                  rows={4}
                  maxLength={500}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="例：QR読取後に端末エラーが発生し、景品を渡せていなかったため"
                  style={{
                    ...styles.input,
                    resize: "vertical",
                  }}
                />

                <div style={styles.buttonRow}>
                  <button
                    type="button"
                    disabled={saving}
                    style={styles.primaryButton}
                    onClick={prepareRollback}
                  >
                    取消内容を確認
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    style={styles.secondaryButton}
                    onClick={() => {
                      setSelectedExchange(null);
                      setReason("");
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </section>
            )}

            {/* ROLLBACK HISTORY */}
            <section style={styles.card}>
              <h2 style={styles.heading}>
                景品交換の取消履歴
              </h2>

              {logs.length === 0 ? (
                <p style={styles.description}>
                  取消履歴はありません。
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {logs.map((log) => (
                    <article
                      key={log.id}
                      style={styles.logCard}
                    >
                      <span style={styles.eyebrow}>
                        REWARD ROLLBACK
                      </span>

                      <strong
                        style={{
                          display: "block",
                          marginTop: 7,
                        }}
                      >
                        景品交換を取消
                      </strong>

                      <p style={styles.description}>
                        {log.reason}
                      </p>

                      <div style={styles.logMeta}>
                        <span>
                          元の交換日時：
                          {formatDate(
                            log.original_exchanged_at
                          )}
                        </span>
                        <span>
                          取消担当：{log.staff_name}
                        </span>
                        <span>
                          取消日時：
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* FINAL CONFIRMATION */}
        {confirmOpen && participant && selectedExchange && (
          <div style={styles.overlay}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="rollback-confirm-title"
              style={styles.modal}
            >
              <span style={styles.eyebrow}>
                FINAL CONFIRMATION
              </span>

              <h2 id="rollback-confirm-title">
                景品交換取消の最終確認
              </h2>

              <p style={styles.description}>
                参加者：{participant.nickname}さん
              </p>

              <p style={styles.description}>
                確認コード：
                {selectedExchange.confirmation_code}
              </p>

              <p style={styles.description}>
                変更内容：
                <strong>
                  交換済み → 未交換
                </strong>
              </p>

              <p style={styles.description}>
                取消理由：{reason.trim()}
              </p>

              <p style={styles.warning}>
                景品がすでに手渡されている場合は、
                二重交換防止のため取り消さないでください。
              </p>

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  disabled={saving}
                  style={styles.dangerButton}
                  onClick={() => void executeRollback()}
                >
                  {saving
                    ? "取消処理中..."
                    : "確定して交換を取り消す"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  style={styles.secondaryButton}
                  onClick={() => setConfirmOpen(false)}
                >
                  戻る
                </button>
              </div>
            </section>
          </div>
        )}
      </section>

      <SupportQrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleQrDetected}
      />
    </main>
  );
}

/* ========================================
   PAGE STYLES
======================================== */

const styles: Record<string, CSSProperties> = {
  card: {
    padding: 22,
    background: "#fff",
    border: "1px solid #e8ded8",
    borderRadius: 18,
    marginBottom: 20,
  },
  backButton: {
    border: 0,
    background: "transparent",
    color: "#8a1822",
    fontWeight: 800,
    cursor: "pointer",
    padding: "8px 0",
  },
  heading: {
    fontSize: 19,
    fontWeight: 900,
    margin: "0 0 13px",
  },
  description: {
    color: "#746a65",
    fontSize: 12,
    lineHeight: 1.8,
  },
  eyebrow: {
    color: "#9a2730",
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: "0.1em",
  },
  label: {
    display: "block",
    margin: "15px 0 6px",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    padding: 13,
    border: "1px solid #d6c9c2",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  cameraButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: "100%",
    marginTop: 13,
    padding: "13px 15px",
    border: "1px solid #b93e4a",
    borderRadius: 10,
    background: "#fff2f2",
    color: "#96232d",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15,
  },
  primaryButton: {
    flex: 1,
    minWidth: 130,
    padding: "13px 18px",
    border: 0,
    borderRadius: 10,
    background: "#8a1822",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "13px 18px",
    border: "1px solid #ddd2cc",
    borderRadius: 10,
    background: "#fff",
    color: "#5c514b",
    cursor: "pointer",
  },
  dangerButton: {
    padding: "12px 17px",
    border: "1px solid #b63843",
    borderRadius: 10,
    background: "#fff2f2",
    color: "#98232f",
    fontWeight: 800,
    cursor: "pointer",
  },
  error: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 12,
    color: "#8a1822",
    background: "#fff0ee",
    fontSize: 13,
    lineHeight: 1.8,
  },
  success: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 12,
    color: "#206b39",
    background: "#eef8ef",
    fontSize: 13,
    lineHeight: 1.8,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
  },
  muted: {
    color: "#837773",
    fontSize: 11,
  },
  infoValue: {
    margin: "5px 0",
    fontWeight: 800,
  },
  recordCard: {
    padding: 17,
    background: "#f8f6f3",
    borderRadius: 13,
  },
  recordHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  status: {
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
  },
  recordInfo: {
    display: "grid",
    gap: 12,
    marginBottom: 14,
  },
  logCard: {
    padding: 15,
    background: "#f8f6f3",
    borderRadius: 12,
  },
  logMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    color: "#776e68",
    fontSize: 11,
  },
  warning: {
    padding: 13,
    borderRadius: 10,
    background: "#fff1e6",
    color: "#885024",
    fontSize: 12,
    lineHeight: 1.8,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "rgba(22, 14, 14, 0.75)",
  },
  modal: {
    width: "min(100%, 460px)",
    maxHeight: "90dvh",
    overflowY: "auto",
    padding: 24,
    borderRadius: 18,
    background: "#fff",
    color: "#312725",
    boxSizing: "border-box",
  },
};
