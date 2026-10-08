
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import SupportQrScanner from "../../../components/SupportQrScanner";

type SupportStamp = {
  spot_id: string;
  acquired_at: string;
};

type SupportParticipant = {
  participant_id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
  stamps: SupportStamp[];
};

type SupportLog = {
  id: string;
  action_type: "stamp_add" | "stamp_remove";
  spot_id: string;
  reason: string;
  before_count: number;
  after_count: number;
  created_at: string;
  staff_name: string;
};

type StampAction = "add" | "remove";

const SPOTS = [
  { id: "spot1", name: "学生センター" },
  { id: "spot2", name: "東棟2階" },
  { id: "spot3", name: "ラーニングスクエア" },
  { id: "spot4", name: "ゆうちょ銀行ATM" },
  { id: "spot5", name: "セブンイレブン付近掲示板" },
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractSupportToken(value: string): string | null {
  const trimmed = value.trim();
  const token = trimmed.startsWith("POKIPO_SUPPORT:")
    ? trimmed.slice("POKIPO_SUPPORT:".length).trim()
    : trimmed;

  return UUID_PATTERN.test(token) ? token : null;
}

function formatDate(value: string) {
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

function getSpotName(spotId: string) {
  return SPOTS.find((spot) => spot.id === spotId)?.name ?? spotId;
}

export default function StaffSupportPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [supportInput, setSupportInput] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [participant, setParticipant] =
    useState<SupportParticipant | null>(null);
  const [logs, setLogs] = useState<SupportLog[]>([]);

  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [selectedAction, setSelectedAction] =
    useState<StampAction>("add");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  /* ========================================
     AUTH
  ======================================== */

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error || !data.session) {
          router.replace("/staff/reward");
          return;
        }

        const { data: staff, error: staffError } = await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();

        if (!active) return;

        if (staffError || !staff) {
          setAuthorized(false);
          setErrorMessage("管理者権限を確認できませんでした。");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("管理者認証エラー:", error);
        if (active) {
          setErrorMessage("管理者認証に失敗しました。");
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        if (!session) {
          setAuthorized(false);
          router.replace("/staff/reward");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  /* ========================================
     SEARCH
  ======================================== */

  async function fetchParticipant(token: string) {
    const { data, error } = await supabase.rpc(
      "lookup_pokipo_support_participant",
      { p_support_token: token }
    );

    if (error) throw error;
    if (!data) throw new Error("該当する参加者が見つかりません。");

    const result = data as SupportParticipant;

    if (!result.participant_id || !Array.isArray(result.stamps)) {
      throw new Error("参加者データが正しくありません。");
    }

    return result;
  }

  async function fetchLogs(token: string) {
    const { data, error } = await supabase.rpc(
      "staff_get_pokipo_support_logs",
      { p_support_token: token }
    );

    if (error) throw error;

    return Array.isArray(data) ? (data as SupportLog[]) : [];
  }

  async function searchParticipant(rawInput?: string) {
    if (loading || saving || !authorized) return;

    setErrorMessage("");
    setSuccessMessage("");
    setParticipant(null);
    setLogs([]);
    setActiveToken("");
    setSelectedSpotId("");
    setReason("");
    setShowConfirm(false);

    const token = extractSupportToken(rawInput ?? supportInput);

    if (!token) {
      setErrorMessage(
        "正しい問い合わせ番号、またはPOKIPO_SUPPORT:で始まる文字列を入力してください。"
      );
      return;
    }

    setLoading(true);

    try {
      const [target, history] = await Promise.all([
        fetchParticipant(token),
        fetchLogs(token),
      ]);

      setParticipant(target);
      setLogs(history);
      setActiveToken(token);
    } catch (error) {
      console.error("参加者照会エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "参加者を照会できませんでした。"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleQrDetected(token: string) {
    setScannerOpen(false);
    setSupportInput(token);
    void searchParticipant(token);
  }

  function clearSearch() {
    if (saving || loading) return;

    setSupportInput("");
    setActiveToken("");
    setParticipant(null);
    setLogs([]);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedSpotId("");
    setReason("");
    setShowConfirm(false);
  }

  /* ========================================
     STAMP CORRECTIONS
  ======================================== */

  function selectCorrection(spotId: string, action: StampAction) {
    setSelectedSpotId(spotId);
    setSelectedAction(action);
    setReason("");
    setErrorMessage("");
    setSuccessMessage("");
    setShowConfirm(false);
  }

  function prepareCorrection() {
    setErrorMessage("");

    if (!activeToken || !participant || !selectedSpotId) {
      setErrorMessage(
        "修正対象の参加者とスポットを選択してください。"
      );
      return;
    }

    if (reason.trim().length < 5 || reason.trim().length > 500) {
      setErrorMessage("修正理由を5〜500文字で入力してください。");
      return;
    }

    setShowConfirm(true);
  }

  async function executeCorrection() {
    if (saving || !authorized || !activeToken || !selectedSpotId) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const token = activeToken;
    const spot = selectedSpotId;
    const action = selectedAction;

    try {
      const { data, error } = await supabase.rpc(
        "staff_correct_pokipo_stamp",
        {
          p_support_token: token,
          p_spot_id: spot,
          p_action: action,
          p_reason: reason.trim(),
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error("スタンプ修正が完了しませんでした。");
      }

      setShowConfirm(false);
      setSelectedSpotId("");
      setReason("");

      setSuccessMessage(
        `${getSpotName(spot)}のスタンプを${
          action === "add" ? "手動付与" : "削除"
        }しました。`
      );

      try {
        const [target, history] = await Promise.all([
          fetchParticipant(token),
          fetchLogs(token),
        ]);

        setParticipant(target);
        setLogs(history);
      } catch (refreshError) {
        console.error("修正後の再取得エラー:", refreshError);
        setParticipant(null);
        setLogs([]);
        setActiveToken("");
        setErrorMessage(
          "修正は完了しましたが最新情報の取得に失敗しました。再検索して確認してください。"
        );
      }
    } catch (error) {
      console.error("スタンプ修正エラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "スタンプの修正に失敗しました。"
      );
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  const acquiredSpotIds = new Set(
    participant?.stamps.map((stamp) => stamp.spot_id) ?? []
  );

  const stampCount = SPOTS.filter((spot) =>
    acquiredSpotIds.has(spot.id)
  ).length;

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
            {errorMessage || "管理者ログインが必要です。"}
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
          onClick={() => router.push("/staff")}
          style={styles.backButton}
        >
          ← スタッフメニューに戻る
        </button>

        <header style={{ margin: "16px 0 24px" }}>
          <span className="staffMenuEyebrow">
            POKIPO PARTICIPANT SUPPORT
          </span>

          <h1 style={{ margin: "8px 0" }}>
            参加者サポート
          </h1>

          <p style={styles.description}>
            問い合わせQRから参加者を検索し、
            スタンプの手動付与・削除を行います。
          </p>
        </header>

        {/* ========================================
            SEARCH
        ======================================== */}
        <section style={styles.card}>
          <h2 style={styles.heading}>参加者を検索</h2>

          <p style={styles.description}>
            お問い合わせ専用QRをカメラで読み取るか、
            Googleフォームに添付された問い合わせ番号を入力してください。
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void searchParticipant();
            }}
          >
            <label htmlFor="supportToken" style={styles.label}>
              問い合わせ番号
            </label>

            <input
              id="supportToken"
              type="text"
              value={supportInput}
              onChange={(event) =>
                setSupportInput(event.target.value)
              }
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

        {/* ========================================
            PARTICIPANT DETAILS
        ======================================== */}
        {participant && (
          <>
            <section style={styles.card}>
              <span style={styles.eyebrow}>
                PARTICIPANT FOUND
              </span>

              <h2 style={{ margin: "10px 0 18px" }}>
                {participant.nickname}さん
              </h2>

              <div style={styles.infoGrid}>
                <div>
                  <span style={styles.mutedLabel}>学年</span>
                  <p style={styles.infoValue}>
                    {participant.grade ?? "未登録"}
                  </p>
                </div>

                <div>
                  <span style={styles.mutedLabel}>学科</span>
                  <p style={styles.infoValue}>
                    {participant.department ?? "未登録"}
                  </p>
                </div>

                <div>
                  <span style={styles.mutedLabel}>
                    スタンプ
                  </span>
                  <p style={styles.infoValue}>
                    {stampCount} / 5
                  </p>
                </div>
              </div>
            </section>

            {/* STAMPS */}
            <section style={styles.card}>
              <h2 style={styles.heading}>
                スタンプ取得状況・修正
              </h2>

              <p style={styles.description}>
                未取得のスポットは手動付与、
                取得済みのスポットは削除できます。
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                {SPOTS.map((spot) => {
                  const stamp = participant.stamps.find(
                    (item) => item.spot_id === spot.id
                  );

                  const action: StampAction = stamp
                    ? "remove"
                    : "add";

                  const selected = selectedSpotId === spot.id;

                  return (
                    <div
                      key={spot.id}
                      style={{
                        ...styles.stampRow,
                        background: stamp
                          ? "#f0f8f1"
                          : "#f7f5f3",
                        outline: selected
                          ? "2px solid #8a1822"
                          : "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 13 }}>
                          {spot.name}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            color: stamp
                              ? "#217340"
                              : "#817773",
                            fontSize: 11,
                            marginTop: 5,
                          }}
                        >
                          {stamp
                            ? `取得済み：${formatDate(
                                stamp.acquired_at
                              )}`
                            : "未取得"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          selectCorrection(spot.id, action)
                        }
                        style={{
                          ...styles.smallButton,
                          background: stamp
                            ? "#fff"
                            : "#8a1822",
                          color: stamp
                            ? "#a12b33"
                            : "#fff",
                          border: stamp
                            ? "1px solid #d6abb0"
                            : "1px solid #8a1822",
                        }}
                      >
                        {stamp ? "削除" : "手動付与"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedSpotId && (
                <div style={styles.correctionPanel}>
                  <span style={styles.eyebrow}>
                    STAMP CORRECTION
                  </span>

                  <h3 style={{ margin: "8px 0" }}>
                    {getSpotName(selectedSpotId)}：
                    {selectedAction === "add"
                      ? "手動付与"
                      : "スタンプ削除"}
                  </h3>

                  <p style={styles.description}>
                    この操作はデータベース上の取得記録を
                    変更します。修正理由と担当管理者は
                    操作履歴に記録されます。
                  </p>

                  <label
                    htmlFor="supportCorrectionReason"
                    style={styles.label}
                  >
                    修正理由（必須・5文字以上）
                  </label>

                  <textarea
                    id="supportCorrectionReason"
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="例：スポットのQRを読み取ったが通信エラーでスタンプが反映されなかったため"
                    rows={4}
                    maxLength={500}
                    style={{
                      ...styles.input,
                      resize: "vertical",
                    }}
                  />

                  <div style={styles.buttonRow}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={prepareCorrection}
                      style={styles.primaryButton}
                    >
                      修正内容を確認
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setSelectedSpotId("");
                        setReason("");
                        setShowConfirm(false);
                      }}
                      style={styles.secondaryButton}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* OPERATION LOGS */}
            <section style={styles.card}>
              <h2 style={styles.heading}>
                修正操作履歴
              </h2>

              {logs.length === 0 ? (
                <p style={styles.description}>
                  修正履歴はありません。
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {logs.map((log) => (
                    <article
                      key={log.id}
                      style={styles.logCard}
                    >
                      <span style={styles.eyebrow}>
                        {log.action_type === "stamp_add"
                          ? "STAMP ADDED"
                          : "STAMP REMOVED"}
                      </span>

                      <strong
                        style={{
                          display: "block",
                          marginTop: 6,
                        }}
                      >
                        {getSpotName(log.spot_id)}：
                        {log.action_type === "stamp_add"
                          ? "手動付与"
                          : "削除"}
                      </strong>

                      <p style={{ margin: "9px 0", fontSize: 13 }}>
                        {log.reason}
                      </p>

                      <div style={styles.logMeta}>
                        <span>
                          {log.before_count}個 → {log.after_count}個
                        </span>
                        <span>{log.staff_name}</span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* CONFIRMATION MODAL */}
        {showConfirm && participant && (
          <div style={styles.overlay}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="stamp-confirm-title"
              style={styles.modal}
            >
              <span style={styles.eyebrow}>
                CONFIRM CORRECTION
              </span>

              <h2 id="stamp-confirm-title">
                スタンプ修正の最終確認
              </h2>

              <p style={styles.description}>
                対象者：{participant.nickname}さん
              </p>

              <p style={styles.description}>
                スポット：{getSpotName(selectedSpotId)}
              </p>

              <p style={styles.description}>
                操作：
                <strong>
                  {selectedAction === "add"
                    ? "スタンプ手動付与"
                    : "スタンプ削除"}
                </strong>
              </p>

              <p style={styles.description}>
                修正理由：{reason.trim()}
              </p>

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void executeCorrection()}
                  style={styles.primaryButton}
                >
                  {saving
                    ? "修正中..."
                    : "確定して修正する"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowConfirm(false)}
                  style={styles.secondaryButton}
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
    padding: "8px 0",
    cursor: "pointer",
  },
  heading: {
    margin: "0 0 12px",
    fontSize: 19,
    fontWeight: 900,
  },
  description: {
    color: "#736965",
    fontSize: 12,
    lineHeight: 1.8,
  },
  label: {
    display: "block",
    margin: "15px 0 6px",
    fontWeight: 800,
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: 13,
    border: "1px solid #d6c9c2",
    borderRadius: 10,
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "inherit",
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
    border: 0,
    borderRadius: 10,
    padding: "13px 18px",
    background: "#8a1822",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #ddd2cc",
    borderRadius: 10,
    padding: "13px 15px",
    background: "#fff",
    color: "#5c514b",
    cursor: "pointer",
  },
  smallButton: {
    flexShrink: 0,
    padding: "9px 13px",
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  eyebrow: {
    color: "#9a2730",
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: "0.1em",
  },
  mutedLabel: {
    color: "#837773",
    fontSize: 11,
  },
  infoValue: {
    margin: "5px 0",
    fontWeight: 800,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
  },
  stampRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "13px 14px",
    borderRadius: 12,
  },
  correctionPanel: {
    marginTop: 18,
    padding: 17,
    background: "#fff8f4",
    border: "1px solid #ead6cb",
    borderRadius: 12,
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
  error: {
    marginBottom: 20,
    padding: 15,
    background: "#fff0ee",
    color: "#8a1822",
    borderRadius: 12,
    lineHeight: 1.7,
    fontSize: 13,
  },
  success: {
    marginBottom: 20,
    padding: 15,
    background: "#eef8ef",
    color: "#206b39",
    borderRadius: 12,
    lineHeight: 1.7,
    fontSize: 13,
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
    background: "#fff",
    color: "#312725",
    borderRadius: 18,
    boxSizing: "border-box",
  },
};
