
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import SupportQrScanner from "../../../components/SupportQrScanner";

/* ========================================
   TYPES
======================================== */

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

/* ========================================
   CONFIG
======================================== */

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

/* ========================================
   PAGE
======================================== */

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

  /* ========================================
     STATUS
  ======================================== */

  const acquiredSpotIds = new Set(
    participant?.stamps.map((stamp) => stamp.spot_id) ?? []
  );

  const stampCount = SPOTS.filter((spot) =>
    acquiredSpotIds.has(spot.id)
  ).length;

  const progressPercent = (stampCount / SPOTS.length) * 100;

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
          <p className="staffError">
            {errorMessage || "管理者ログインが必要です。"}
          </p>

          <button
            type="button"
            className="staffDeviceModeBack"
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
      <section className="supportPage">

        {/* HEADER */}
        <header className="supportHero">
          <div className="supportHeroTop">
            <span className="supportEyebrow">
              POKIPO / PARTICIPANT SUPPORT
            </span>

            <span className="supportStaffTag">
              STAFF ONLY
            </span>
          </div>

          <div className="supportHeroIcon" aria-hidden="true">
            ✓
          </div>

          <h1>スタンプ修正・参加者照会</h1>

          <p>
            問い合わせ番号から参加者を検索し、
            スタンプの取得状況と修正履歴を確認できます。
          </p>

          <div className="supportHeroNotice">
            <span className="supportHeroNoticeIcon">!</span>

            <div>
              <strong>本番データの操作画面です</strong>
              <small>
                手動付与・削除は実際の参加者データに反映されます。
                修正対象を必ず確認してください。
              </small>
            </div>
          </div>
        </header>

        <button
          type="button"
          className="supportBackLink"
          onClick={() => router.push("/staff")}
        >
          <span aria-hidden="true">←</span>
          スタッフメニューに戻る
        </button>

        {/* SEARCH */}
        <section className="supportPanel">
          <div className="supportPanelHeading">
            <span className="supportPanelNumber">
              01
            </span>

            <div>
              <span className="supportSectionEyebrow">
                PARTICIPANT LOOKUP
              </span>
              <h2>参加者を検索</h2>
            </div>
          </div>

          <p className="supportDescription">
            お問い合わせ専用QRを読み取るか、
            Googleフォームに添付された問い合わせ番号を
            入力してください。
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void searchParticipant();
            }}
          >
            <label
              htmlFor="supportToken"
              className="supportFieldLabel"
            >
              問い合わせ番号
            </label>

            <input
              id="supportToken"
              className="supportInput"
              type="text"
              value={supportInput}
              onChange={(event) =>
                setSupportInput(event.target.value)
              }
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />

            <button
              type="button"
              className="supportCameraButton"
              disabled={loading || saving}
              onClick={() => setScannerOpen(true)}
            >
              <span aria-hidden="true">▣</span>
              カメラで問い合わせQRを読み取る
              <span aria-hidden="true">→</span>
            </button>

            <div className="supportButtonRow">
              <button
                type="submit"
                className="supportPrimaryButton"
                disabled={loading || saving}
              >
                {loading ? "検索中..." : "参加者を検索"}
              </button>

              <button
                type="button"
                className="supportSecondaryButton"
                disabled={loading || saving}
                onClick={clearSearch}
              >
                クリア
              </button>
            </div>
          </form>
        </section>

        {/* MESSAGES */}
        {errorMessage && (
          <div className="supportAlert error" role="alert">
            <strong>操作を確認してください</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="supportAlert success" role="status">
            <strong>処理が完了しました</strong>
            <p>{successMessage}</p>
          </div>
        )}

        {/* PARTICIPANT DETAILS */}
        {participant && (
          <>
            <section className="supportPanel">
              <div className="supportSectionHeading">
                <span className="supportSectionEyebrow">
                  PARTICIPANT
                </span>
                <h2>参加者情報</h2>
              </div>

              <div className="supportParticipantCard">
                <div className="supportParticipantAvatar">
                  P
                </div>

                <div className="supportParticipantName">
                  <span>SEARCH RESULT</span>
                  <strong>
                    {participant.nickname}
                    <small> さん</small>
                  </strong>
                </div>
              </div>

              <div className="supportInfoGrid">
                <div className="supportInfoItem">
                  <span>学年</span>
                  <strong>
                    {participant.grade ?? "未登録"}
                  </strong>
                </div>

                <div className="supportInfoItem">
                  <span>学科</span>
                  <strong>
                    {participant.department ?? "未登録"}
                  </strong>
                </div>

                <div className="supportInfoItem">
                  <span>取得スタンプ</span>
                  <strong>
                    {stampCount}
                    <small> / 5</small>
                  </strong>
                </div>
              </div>
            </section>

            {/* STAMP PROGRESS AND CORRECTION */}
            <section className="supportPanel">
              <div className="supportProgressHeading">
                <div>
                  <span className="supportSectionEyebrow">
                    STAMP PROGRESS
                  </span>
                  <h2>スタンプ取得状況・修正</h2>
                </div>

                <span className="supportProgressNumber">
                  {stampCount}<small> / 5</small>
                </span>
              </div>

              <div
                className="supportProgressTrack"
                role="progressbar"
                aria-label="取得スタンプの進捗"
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={stampCount}
              >
                <div
                  className="supportProgressFill"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              <p className="supportDescription">
                未取得のスポットは「手動付与」、
                取得済みのスポットは「削除」できます。
                修正操作は履歴に記録されます。
              </p>

              <div className="supportStampList">
                {SPOTS.map((spot, index) => {
                  const stamp = participant.stamps.find(
                    (item) => item.spot_id === spot.id
                  );

                  const action: StampAction = stamp
                    ? "remove"
                    : "add";

                  const selected = selectedSpotId === spot.id;

                  return (
                    <article
                      key={spot.id}
                      className={[
                        "supportStampRow",
                        stamp ? "acquired" : "",
                        selected ? "selected" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <div className="supportStampNumber">
                        {stamp ? "✓" : index + 1}
                      </div>

                      <div className="supportStampContent">
                        <strong>{spot.name}</strong>

                        <span
                          className={
                            stamp
                              ? "supportStampDate acquired"
                              : "supportStampDate"
                          }
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
                        className={
                          stamp
                            ? "supportStampButton remove"
                            : "supportStampButton add"
                        }
                      >
                        {stamp ? "削除" : "手動付与"}
                      </button>
                    </article>
                  );
                })}
              </div>

              {/* CORRECTION FORM */}
              {selectedSpotId && (
                <div className="supportCorrectionPanel">
                  <span className="supportSectionEyebrow">
                    STAMP CORRECTION
                  </span>

                  <h3>
                    {getSpotName(selectedSpotId)}
                  </h3>

                  <span
                    className={
                      selectedAction === "add"
                        ? "supportCorrectionType add"
                        : "supportCorrectionType remove"
                    }
                  >
                    {selectedAction === "add"
                      ? "スタンプ手動付与"
                      : "スタンプ削除"}
                  </span>

                  <div className="supportWarningBox">
                    <strong>本番データが変更されます</strong>
                    <p>
                      この操作は参加者の実際のスタンプ記録を
                      変更します。修正理由と担当管理者は
                      操作履歴に記録されます。
                    </p>
                  </div>

                  <label
                    htmlFor="supportCorrectionReason"
                    className="supportFieldLabel"
                  >
                    修正理由（必須・5文字以上）
                  </label>

                  <textarea
                    id="supportCorrectionReason"
                    className="supportInput supportTextarea"
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="例：スポットQRを読み取ったが通信エラーでスタンプが反映されなかったため"
                    rows={4}
                    maxLength={500}
                  />

                  <div className="supportCharacterCount">
                    {reason.length} / 500
                  </div>

                  <div className="supportButtonRow">
                    <button
                      type="button"
                      className="supportPrimaryButton"
                      disabled={saving}
                      onClick={prepareCorrection}
                    >
                      修正内容を確認
                    </button>

                    <button
                      type="button"
                      className="supportSecondaryButton"
                      disabled={saving}
                      onClick={() => {
                        setSelectedSpotId("");
                        setReason("");
                        setShowConfirm(false);
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* OPERATION LOGS */}
            <section className="supportPanel">
              <div className="supportSectionHeading">
                <span className="supportSectionEyebrow">
                  OPERATION HISTORY
                </span>
                <h2>修正操作履歴</h2>
              </div>

              {logs.length === 0 ? (
                <div className="supportEmpty">
                  <span>✓</span>
                  <strong>修正履歴はありません</strong>
                  <p>
                    この参加者に対する修正操作は
                    まだ記録されていません。
                  </p>
                </div>
              ) : (
                <div className="supportHistoryList">
                  {logs.map((log) => {
                    const added =
                      log.action_type === "stamp_add";

                    return (
                      <article
                        key={log.id}
                        className="supportHistoryItem"
                      >
                        <div className="supportHistoryHeading">
                          <span
                            className={
                              added
                                ? "supportHistoryIcon added"
                                : "supportHistoryIcon removed"
                            }
                          >
                            {added ? "+" : "−"}
                          </span>

                          <div>
                            <small>
                              {added
                                ? "STAMP ADDED"
                                : "STAMP REMOVED"}
                            </small>
                            <strong>
                              {getSpotName(log.spot_id)}
                            </strong>
                          </div>
                        </div>

                        <div className="supportHistoryAction">
                          {added ? "手動付与" : "スタンプ削除"}
                          <span>
                            {log.before_count}個 →{" "}
                            {log.after_count}個
                          </span>
                        </div>

                        <div className="supportHistoryReason">
                          {log.reason}
                        </div>

                        <div className="supportHistoryMeta">
                          <div>
                            <span>操作担当者</span>
                            <strong>{log.staff_name}</strong>
                          </div>

                          <div>
                            <span>操作日時</span>
                            <strong>
                              {formatDate(log.created_at)}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="supportFooter">
          POKIPO / STAFF SUPPORT
          <p>
            参加者の問い合わせ対応専用ページです。
            手動付与・削除の前に対象者と修正理由を
            必ず確認してください。
          </p>
        </footer>

        {/* FINAL CONFIRMATION */}
        {showConfirm && participant && (
          <div className="supportOverlay">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="stamp-confirm-title"
              className="supportModal"
            >
              <span className="supportSectionEyebrow">
                FINAL CONFIRMATION
              </span>

              <h2 id="stamp-confirm-title">
                スタンプ修正の最終確認
              </h2>

              <p className="supportModalLead">
                以下の内容で本番データを変更します。
              </p>

              <div className="supportModalDetails">
                <div>
                  <span>対象者</span>
                  <strong>
                    {participant.nickname}さん
                  </strong>
                </div>

                <div>
                  <span>スポット</span>
                  <strong>
                    {getSpotName(selectedSpotId)}
                  </strong>
                </div>

                <div>
                  <span>操作</span>
                  <strong className="supportModalChange">
                    {selectedAction === "add"
                      ? "スタンプ手動付与"
                      : "スタンプ削除"}
                  </strong>
                </div>

                <div>
                  <span>修正理由</span>
                  <strong className="supportModalReason">
                    {reason.trim()}
                  </strong>
                </div>
              </div>

              <div className="supportModalWarning">
                <strong>実行前の確認</strong>
                <p>
                  この操作は本番のスタンプ記録を変更します。
                  対象者とスポットに間違いがないか、
                  再度確認してください。
                </p>
              </div>

              <div className="supportModalButtons">
                <button
                  type="button"
                  className={
                    selectedAction === "remove"
                      ? "supportConfirmButton danger"
                      : "supportConfirmButton"
                  }
                  disabled={saving}
                  onClick={() => void executeCorrection()}
                >
                  {saving
                    ? "修正中..."
                    : "確定して修正する"}
                </button>

                <button
                  type="button"
                  className="supportSecondaryButton"
                  disabled={saving}
                  onClick={() => setShowConfirm(false)}
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

      {/* ========================================
          PAGE-SCOPED CSS
          他ページには影響しない
      ======================================== */}

      <style jsx>{`
        .supportPage {
          --support-red: #b72838;
          --support-dark-red: #91212f;
          --support-text: #302b2a;
          --support-muted: #756e6b;
          --support-border: #e9e3df;

          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          padding: 22px 0 65px;
          color: var(--support-text);
        }

        .supportPage * {
          box-sizing: border-box;
        }

        /* HEADER */

        .supportHero {
          padding: 28px 26px;
          border-radius: 22px;
          color: white;
          background: linear-gradient(
            135deg,
            #ba2c3e 0%,
            #942333 100%
          );
          box-shadow: 0 8px 24px rgba(139, 26, 42, 0.13);
        }

        .supportHeroTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .supportEyebrow,
        .supportSectionEyebrow {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .supportEyebrow {
          color: #ffe3df;
        }

        .supportStaffTag {
          padding: 6px 11px;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.17);
          color: white;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.05em;
        }

        .supportHeroIcon {
          display: grid;
          place-items: center;
          width: 49px;
          height: 49px;
          margin-top: 21px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.16);
          color: white;
          font-size: 26px;
          font-weight: 900;
        }

        .supportHero h1 {
          color: white;
          margin: 15px 0 10px;
          font-size: clamp(23px, 5vw, 31px);
          line-height: 1.4;
          letter-spacing: -0.025em;
        }

        .supportHero > p {
          color: #fff0ed;
          font-size: 13px;
          line-height: 1.9;
          margin: 0;
        }

        .supportHeroNotice {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 23px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.12);
        }

        .supportHeroNoticeIcon {
          flex: 0 0 25px;
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #fff;
          color: var(--support-red);
          font-size: 14px;
          font-weight: 900;
        }

        .supportHeroNotice strong {
          display: block;
          color: white;
          font-size: 12px;
        }

        .supportHeroNotice small {
          display: block;
          margin-top: 5px;
          color: #ffe9e7;
          font-size: 11px;
          line-height: 1.8;
        }

        .supportBackLink {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 18px 0;
          padding: 9px 3px;
          border: 0;
          background: transparent;
          color: var(--support-dark-red);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .supportBackLink span {
          font-size: 18px;
        }

        /* PANELS */

        .supportPanel {
          padding: 23px;
          margin-bottom: 17px;
          border: 1px solid var(--support-border);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 3px 14px rgba(51, 37, 31, 0.025);
        }

        .supportPanelHeading {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .supportPanelNumber {
          display: grid;
          place-items: center;
          flex: 0 0 45px;
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #fbeaec;
          color: var(--support-red);
          font-size: 16px;
          font-weight: 900;
        }

        .supportSectionEyebrow {
          color: #a04b51;
        }

        .supportPanel h2 {
          font-size: 19px;
          margin: 7px 0 0;
          line-height: 1.45;
          letter-spacing: -0.025em;
        }

        .supportSectionHeading {
          padding-bottom: 17px;
          margin-bottom: 19px;
          border-bottom: 1px solid #f1ebe7;
        }

        .supportDescription {
          color: var(--support-muted);
          font-size: 12px;
          line-height: 1.9;
          margin: 16px 0;
        }

        /* INPUTS */

        .supportFieldLabel {
          display: block;
          margin: 19px 0 8px;
          color: #4c4240;
          font-size: 12px;
          font-weight: 850;
        }

        .supportInput {
          display: block;
          width: 100%;
          min-width: 0;
          padding: 15px 14px;
          border: 1px solid #dbd0cb;
          border-radius: 12px;
          background: #fffdfa;
          color: var(--support-text);
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .supportInput:focus {
          border-color: var(--support-red);
          box-shadow: 0 0 0 3px rgba(183, 40, 56, 0.09);
        }

        .supportTextarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.8;
        }

        /* BUTTONS */

        .supportCameraButton,
        .supportPrimaryButton,
        .supportSecondaryButton,
        .supportStampButton,
        .supportConfirmButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 50px;
          padding: 13px 16px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.5;
          text-align: center;
          cursor: pointer;
          transition: background 150ms ease;
        }

        .supportCameraButton {
          width: 100%;
          margin-top: 13px;
          border: 1px solid #dba7aa;
          background: #fff4f4;
          color: var(--support-red);
        }

        .supportCameraButton:hover:not(:disabled) {
          background: #fce8ea;
        }

        .supportCameraButton span:first-child {
          font-size: 21px;
        }

        .supportCameraButton span:last-child {
          margin-left: auto;
        }

        .supportButtonRow {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 11px;
          margin-top: 15px;
        }

        .supportPrimaryButton,
        .supportConfirmButton {
          border: 1px solid var(--support-red);
          background: var(--support-red);
          color: white;
        }

        .supportPrimaryButton:hover:not(:disabled),
        .supportConfirmButton:hover:not(:disabled) {
          background: var(--support-dark-red);
        }

        .supportSecondaryButton {
          border: 1px solid var(--support-border);
          background: white;
          color: #504642;
        }

        .supportSecondaryButton:hover:not(:disabled) {
          background: #f8f3ef;
        }

        .supportCameraButton:disabled,
        .supportPrimaryButton:disabled,
        .supportSecondaryButton:disabled,
        .supportStampButton:disabled,
        .supportConfirmButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* MESSAGES */

        .supportAlert {
          padding: 17px 18px;
          border: 1px solid;
          border-radius: 14px;
          margin-bottom: 17px;
          font-size: 12px;
          line-height: 1.8;
        }

        .supportAlert strong {
          display: block;
          font-size: 13px;
        }

        .supportAlert p {
          margin: 4px 0 0;
        }

        .supportAlert.error {
          border-color: #eab9b8;
          background: #fff4f3;
          color: #9b2929;
        }

        .supportAlert.success {
          border-color: #badcc8;
          background: #effaf3;
          color: #1c7047;
        }

        /* PARTICIPANT */

        .supportParticipantCard {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px;
          border-radius: 14px;
          background: #fff8f6;
          border: 1px solid #f1e7e2;
        }

        .supportParticipantAvatar {
          display: grid;
          place-items: center;
          flex: 0 0 45px;
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #fbeaec;
          color: var(--support-red);
          font-size: 22px;
          font-weight: 900;
        }

        .supportParticipantName {
          min-width: 0;
        }

        .supportParticipantName span {
          display: block;
          color: #9a7270;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .supportParticipantName strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          overflow-wrap: anywhere;
        }

        .supportParticipantName small {
          color: var(--support-muted);
          font-size: 12px;
        }

        .supportInfoGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
          margin-top: 14px;
        }

        .supportInfoItem {
          min-width: 0;
          padding: 15px 13px;
          border: 1px solid #efebe7;
          border-radius: 12px;
          background: white;
        }

        .supportInfoItem span {
          display: block;
          margin-bottom: 7px;
          color: var(--support-muted);
          font-size: 11px;
        }

        .supportInfoItem strong {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .supportInfoItem small {
          color: #99908b;
          font-size: 11px;
        }

        /* STAMP PROGRESS */

        .supportProgressHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .supportProgressNumber {
          color: var(--support-red);
          font-weight: 900;
          font-size: 34px;
          letter-spacing: -0.04em;
          white-space: nowrap;
        }

        .supportProgressNumber small {
          color: #a19a95;
          font-size: 15px;
        }

        .supportProgressTrack {
          height: 11px;
          margin-top: 23px;
          border-radius: 999px;
          background: #f0e8e5;
          overflow: hidden;
        }

        .supportProgressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #db4e5a,
            #b72838
          );
          transition: width 350ms ease;
        }

        /* STAMP ROWS */

        .supportStampList {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .supportStampRow {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 14px;
          border-radius: 14px;
          background: #f9f6f3;
          border: 1px solid #eee7e0;
          transition:
            border-color 150ms ease,
            background 150ms ease;
        }

        .supportStampRow.acquired {
          background: #f3faf5;
          border-color: #d6ebde;
        }

        .supportStampRow.selected {
          border-color: var(--support-red);
          box-shadow: 0 0 0 2px rgba(183, 40, 56, 0.08);
        }

        .supportStampNumber {
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #ece7e2;
          color: #857873;
          font-size: 17px;
          font-weight: 900;
        }

        .supportStampRow.acquired .supportStampNumber {
          background: #dff3e6;
          color: #20794b;
        }

        .supportStampContent {
          flex: 1;
          min-width: 0;
        }

        .supportStampContent strong {
          display: block;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .supportStampDate {
          display: block;
          margin-top: 5px;
          color: #817773;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .supportStampDate.acquired {
          color: #20794b;
        }

        .supportStampButton {
          min-height: 40px;
          flex: 0 0 auto;
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 12px;
          white-space: nowrap;
        }

        .supportStampButton.add {
          border: 1px solid var(--support-red);
          background: var(--support-red);
          color: white;
        }

        .supportStampButton.add:hover:not(:disabled) {
          background: var(--support-dark-red);
        }

        .supportStampButton.remove {
          border: 1px solid #dba7aa;
          background: white;
          color: #a42b37;
        }

        .supportStampButton.remove:hover:not(:disabled) {
          background: #fff0f0;
        }

        /* CORRECTION FORM */

        .supportCorrectionPanel {
          margin-top: 21px;
          padding: 19px;
          border: 1px solid #eac7c6;
          border-radius: 15px;
          background: #fffcfa;
        }

        .supportCorrectionPanel h3 {
          margin: 10px 0 8px;
          font-size: 18px;
          line-height: 1.5;
        }

        .supportCorrectionType {
          display: inline-block;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 850;
        }

        .supportCorrectionType.add {
          background: #e1f3e7;
          color: #1d774d;
        }

        .supportCorrectionType.remove {
          background: #fff0ef;
          color: #ac3440;
        }

        .supportWarningBox {
          padding: 15px;
          margin-top: 17px;
          border: 1px solid #efcba8;
          border-radius: 13px;
          background: #fff8ec;
          color: #855129;
        }

        .supportWarningBox strong {
          display: block;
          font-size: 13px;
        }

        .supportWarningBox p {
          font-size: 12px;
          line-height: 1.9;
          margin: 7px 0 0;
        }

        .supportCharacterCount {
          margin-top: 6px;
          color: var(--support-muted);
          text-align: right;
          font-size: 11px;
        }

        /* HISTORY */

        .supportHistoryList {
          display: grid;
          gap: 12px;
        }

        .supportHistoryItem {
          padding: 17px;
          border-radius: 14px;
          border: 1px solid #efebe7;
          background: #fdfbf9;
        }

        .supportHistoryHeading {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .supportHistoryIcon {
          display: grid;
          place-items: center;
          flex: 0 0 37px;
          width: 37px;
          height: 37px;
          border-radius: 11px;
          font-size: 22px;
          font-weight: 800;
        }

        .supportHistoryIcon.added {
          background: #e1f3e7;
          color: #1d774d;
        }

        .supportHistoryIcon.removed {
          background: #fcebed;
          color: #a42b37;
        }

        .supportHistoryHeading small {
          display: block;
          color: #a04b51;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .supportHistoryHeading strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
        }

        .supportHistoryAction {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 14px;
          font-size: 12px;
          font-weight: 800;
        }

        .supportHistoryAction span {
          color: var(--support-red);
          font-size: 13px;
          white-space: nowrap;
        }

        .supportHistoryReason {
          padding: 13px;
          margin: 12px 0;
          border-radius: 10px;
          background: white;
          border: 1px solid #f0ebe7;
          font-size: 12px;
          line-height: 1.85;
          overflow-wrap: anywhere;
        }

        .supportHistoryMeta {
          display: grid;
          gap: 9px;
        }

        .supportHistoryMeta > div {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }

        .supportHistoryMeta span {
          color: var(--support-muted);
          font-size: 11px;
        }

        .supportHistoryMeta strong {
          font-size: 11px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .supportEmpty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 35px 15px;
          border: 1px dashed #e3d9d3;
          border-radius: 14px;
          background: #fbf8f5;
          text-align: center;
        }

        .supportEmpty > span {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f0eae6;
          color: #8d8078;
          font-size: 20px;
        }

        .supportEmpty strong {
          font-size: 14px;
        }

        .supportEmpty p {
          margin: 0;
          color: var(--support-muted);
          font-size: 12px;
          line-height: 1.8;
        }

        /* FOOTER */

        .supportFooter {
          padding: 20px 5px;
          text-align: center;
          color: #9b8c86;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .supportFooter p {
          max-width: 500px;
          margin: 9px auto 0;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: normal;
          line-height: 1.8;
        }

        /* MODAL */

        .supportOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(22, 14, 14, 0.75);
        }

        .supportModal {
          width: min(100%, 480px);
          max-height: 90dvh;
          overflow-y: auto;
          padding: 25px;
          border-radius: 20px;
          background: white;
          color: var(--support-text);
          box-shadow: 0 20px 65px rgba(0, 0, 0, 0.2);
        }

        .supportModal h2 {
          margin: 11px 0;
          font-size: 20px;
          line-height: 1.4;
        }

        .supportModalLead {
          color: var(--support-muted);
          font-size: 12px;
          line-height: 1.8;
        }

        .supportModalDetails {
          padding: 0 15px;
          border: 1px solid #efebe7;
          border-radius: 13px;
        }

        .supportModalDetails > div {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #f1ebe7;
        }

        .supportModalDetails > div:last-child {
          border-bottom: 0;
        }

        .supportModalDetails span {
          color: var(--support-muted);
          font-size: 11px;
          flex: 0 0 auto;
        }

        .supportModalDetails strong {
          font-size: 12px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .supportModalDetails .supportModalChange {
          color: #a42b37;
        }

        .supportModalDetails .supportModalReason {
          max-width: 65%;
          line-height: 1.7;
        }

        .supportModalWarning {
          padding: 15px;
          margin: 16px 0;
          border: 1px solid #efd2b2;
          border-radius: 13px;
          background: #fff5e9;
          color: #875029;
        }

        .supportModalWarning strong {
          font-size: 12px;
        }

        .supportModalWarning p {
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.85;
        }

        .supportModalButtons {
          display: grid;
          gap: 10px;
        }

        .supportConfirmButton {
          width: 100%;
        }

        .supportConfirmButton.danger {
          border-color: #a42b37;
          background: #a42b37;
        }

        .supportConfirmButton.danger:hover:not(:disabled) {
          background: #831b27;
        }

        /* MOBILE */

        @media (max-width: 560px) {
          .supportPage {
            padding: 12px 0 50px;
          }

          .supportHero {
            padding: 23px 19px;
            border-radius: 17px;
          }

          .supportPanel {
            padding: 19px 16px;
            border-radius: 16px;
          }

          .supportInfoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .supportInfoItem:last-child {
            grid-column: 1 / -1;
          }

          .supportButtonRow {
            grid-template-columns: 1fr;
          }

          .supportStampRow {
            padding: 12px 10px;
            gap: 9px;
          }

          .supportStampNumber {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
            border-radius: 10px;
          }

          .supportStampButton {
            padding: 9px 11px;
            font-size: 11px;
          }

          .supportHistoryMeta > div {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .supportHistoryMeta strong {
            text-align: left;
          }

          .supportModal {
            padding: 20px 17px;
            border-radius: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .supportPage *,
          .supportPage *::before,
          .supportPage *::after {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
