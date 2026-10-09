
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";
import SupportQrScanner from "../../../../components/SupportQrScanner";

/* ========================================
   TYPES
======================================== */

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

/* ========================================
   HELPERS
======================================== */

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

/* ========================================
   PAGE
======================================== */

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

  /* ========================================
     SEARCH
  ======================================== */

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
    if (!selectedExchange || !participant || !activeToken) {
      return;
    }

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
        console.error(
          "取消後の再取得エラー:",
          refreshError
        );

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
          <p className="supportAuthError">
            {errorMessage || "ログインが必要です。"}
          </p>
          <button
            type="button"
            className="supportAuthBack"
            onClick={() => router.push("/staff/reward")}
          >
            ログイン画面へ
          </button>
          <style jsx>{`
            .supportAuthError {
              padding: 16px;
              border-radius: 14px;
              background: #fff0ee;
              color: #91212f;
              font-size: 13px;
            }
            .supportAuthBack {
              padding: 14px 20px;
              margin-top: 15px;
              border: 1px solid #e9e3df;
              border-radius: 12px;
              background: white;
              color: #302b2a;
              font-weight: 800;
              cursor: pointer;
            }
          `}</style>
        </section>
      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">
      <section className="supportRewardPage">

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
            ↺
          </div>

          <h1>景品交換の取消・復旧</h1>

          <p>
            問い合わせQRから交換記録を照会し、
            誤って交換済みになった状態を確認・修正します。
          </p>

          <div className="supportHeroNotice">
            <span className="supportHeroNoticeIcon">!</span>
            <div>
              <strong>本番データの操作画面です</strong>
              <small>
                取消は実際の景品交換状態に反映されます。
                操作前に必ず参加者と交換状況を確認してください。
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
            <span className="supportPanelNumber">01</span>
            <div>
              <span className="supportSectionEyebrow">
                PARTICIPANT LOOKUP
              </span>
              <h2>問い合わせ番号で検索</h2>
            </div>
          </div>

          <p className="supportDescription">
            お問い合わせ専用QRを読み取るか、
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
              className="supportFieldLabel"
            >
              問い合わせ番号
            </label>

            <input
              id="rewardSupportToken"
              className="supportInput"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
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
          <div
            role="alert"
            className="supportAlert error"
          >
            <strong>操作を確認してください</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="supportAlert success"
          >
            <strong>処理が完了しました</strong>
            <p>{successMessage}</p>
          </div>
        )}

        {participant && (
          <>
            {/* PARTICIPANT */}
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
                    {
                      new Set(
                        participant.stamps.map(
                          (stamp) => stamp.spot_id
                        )
                      ).size
                    }
                    <small> / 5</small>
                  </strong>
                </div>
              </div>
            </section>

            {/* REWARD RECORDS */}
            <section className="supportPanel">
              <div className="supportSectionHeading">
                <span className="supportSectionEyebrow">
                  REWARD STATUS
                </span>
                <h2>景品交換状況</h2>
              </div>

              {rewards.length === 0 ? (
                <div className="supportEmpty">
                  <span>—</span>
                  <strong>交換用QRは未発行です</strong>
                  <p>
                    この参加者の景品交換記録は
                    まだありません。
                  </p>
                </div>
              ) : (
                <div className="supportRecords">
                  {rewards.map((reward) => {
                    const exchanged =
                      reward.status === "exchanged";

                    return (
                      <article
                        key={reward.exchange_id}
                        className="supportRecordCard"
                      >
                        <div className="supportRecordHeader">
                          <div>
                            <span className="supportRecordEyebrow">
                              CURRENT STATUS
                            </span>
                            <h3>
                              {getStatusLabel(reward.status)}
                            </h3>
                          </div>

                          <span
                            className={
                              exchanged
                                ? "supportStatus exchanged"
                                : "supportStatus"
                            }
                          >
                            {exchanged
                              ? "EXCHANGED"
                              : reward.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="supportConfirmation">
                          <span>
                            CONFIRMATION NUMBER
                          </span>
                          <small>確認コード</small>
                          <strong>
                            {reward.confirmation_code}
                          </strong>
                        </div>

                        <div className="supportRecordInfo">
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
                          <div className="supportDangerArea">
                            <p>
                              交換を取り消す場合は、
                              景品がまだ手渡されていないことを
                              必ず確認してください。
                            </p>
                            <button
                              type="button"
                              className="supportDangerButton"
                              disabled={saving}
                              onClick={() =>
                                selectRollback(reward)
                              }
                            >
                              この景品交換を取り消す
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* CANCELLATION REASON */}
            {selectedExchange && (
              <section className="supportPanel supportRollbackPanel">
                <div className="supportSectionHeading">
                  <span className="supportSectionEyebrow">
                    REWARD ROLLBACK
                  </span>
                  <h2>交換取消の理由</h2>
                </div>

                <div className="supportWarningBox">
                  <strong>取消前に確認してください</strong>
                  <p>
                    景品が未交付であることを確認してから
                    取り消してください。処理後は同じ交換用QRを
                    再び使用できる状態に戻します。
                  </p>
                </div>

                <label
                  htmlFor="rewardRollbackReason"
                  className="supportFieldLabel"
                >
                  取消理由（必須・5文字以上）
                </label>

                <textarea
                  id="rewardRollbackReason"
                  className="supportInput supportTextarea"
                  rows={4}
                  maxLength={500}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="例：QR読取後に端末エラーが発生し、景品を渡せていなかったため"
                />

                <div className="supportCharacterCount">
                  {reason.length} / 500
                </div>

                <div className="supportButtonRow">
                  <button
                    type="button"
                    className="supportPrimaryButton"
                    disabled={saving}
                    onClick={prepareRollback}
                  >
                    取消内容を確認
                  </button>

                  <button
                    type="button"
                    className="supportSecondaryButton"
                    disabled={saving}
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
            <section className="supportPanel">
              <div className="supportSectionHeading">
                <span className="supportSectionEyebrow">
                  ROLLBACK HISTORY
                </span>
                <h2>景品交換の取消履歴</h2>
              </div>

              {logs.length === 0 ? (
                <div className="supportEmpty">
                  <span>✓</span>
                  <strong>取消履歴はありません</strong>
                  <p>
                    過去の取消操作はありません。
                  </p>
                </div>
              ) : (
                <div className="supportHistoryList">
                  {logs.map((log) => (
                    <article
                      key={log.id}
                      className="supportHistoryItem"
                    >
                      <div className="supportHistoryHeading">
                        <span className="supportHistoryIcon">
                          ↺
                        </span>
                        <div>
                          <small>REWARD ROLLBACK</small>
                          <strong>景品交換の取消</strong>
                        </div>
                      </div>

                      <div className="supportHistoryReason">
                        {log.reason}
                      </div>

                      <div className="supportHistoryMeta">
                        <div>
                          <span>元の交換日時</span>
                          <strong>
                            {formatDate(
                              log.original_exchanged_at
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>取消担当者</span>
                          <strong>{log.staff_name}</strong>
                        </div>

                        <div>
                          <span>取消日時</span>
                          <strong>
                            {formatDate(log.created_at)}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="supportFooter">
          POKIPO / STAFF SUPPORT
          <p>
            この画面では景品交換の取消を行います。
            参加者への景品の交付状況を必ず確認してください。
          </p>
        </footer>

        {/* FINAL CONFIRMATION */}
        {confirmOpen && participant && selectedExchange && (
          <div className="supportOverlay">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="rollback-confirm-title"
              className="supportModal"
            >
              <span className="supportSectionEyebrow">
                FINAL CONFIRMATION
              </span>

              <h2 id="rollback-confirm-title">
                景品交換取消の最終確認
              </h2>

              <p className="supportModalLead">
                以下の内容を確認してください。
              </p>

              <div className="supportModalDetails">
                <div>
                  <span>参加者</span>
                  <strong>
                    {participant.nickname}さん
                  </strong>
                </div>

                <div>
                  <span>確認コード</span>
                  <strong>
                    {selectedExchange.confirmation_code}
                  </strong>
                </div>

                <div>
                  <span>変更内容</span>
                  <strong className="supportModalChange">
                    交換済み → 未交換
                  </strong>
                </div>

                <div>
                  <span>取消理由</span>
                  <strong className="supportModalReason">
                    {reason.trim()}
                  </strong>
                </div>
              </div>

              <div className="supportModalWarning">
                <strong>重要な確認事項</strong>
                <p>
                  景品がすでに手渡されている場合は、
                  二重交換防止のため取り消さないでください。
                </p>
              </div>

              <div className="supportModalButtons">
                <button
                  type="button"
                  className="supportDangerButton solid"
                  disabled={saving}
                  onClick={() => void executeRollback()}
                >
                  {saving
                    ? "取消処理中..."
                    : "確定して交換を取り消す"}
                </button>

                <button
                  type="button"
                  className="supportSecondaryButton"
                  disabled={saving}
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

      {/* ========================================
          PAGE-SCOPED CSS
      ======================================== */}

      <style jsx>{`
        .supportRewardPage {
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

        .supportRewardPage * {
          box-sizing: border-box;
        }

        .supportHero {
          padding: 28px 26px;
          border-radius: 22px;
          color: #fff;
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
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: white;
          font-size: 30px;
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
          background: rgba(255, 255, 255, 0.12);
          border-radius: 13px;
        }

        .supportHeroNoticeIcon {
          flex: 0 0 25px;
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          background: #fff;
          color: var(--support-red);
          border-radius: 50%;
          font-size: 14px;
          font-weight: 900;
        }

        .supportHeroNotice strong {
          display: block;
          color: #fff;
          font-size: 12px;
        }

        .supportHeroNotice small {
          display: block;
          margin-top: 5px;
          color: #ffe9e7;
          line-height: 1.8;
          font-size: 11px;
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

        .supportCameraButton,
        .supportPrimaryButton,
        .supportSecondaryButton,
        .supportDangerButton {
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

        .supportPrimaryButton {
          border: 1px solid var(--support-red);
          background: var(--support-red);
          color: white;
        }

        .supportPrimaryButton:hover:not(:disabled) {
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

        .supportDangerButton {
          width: 100%;
          border: 1px solid #ce7378;
          background: #fff;
          color: #a42b37;
        }

        .supportDangerButton:hover:not(:disabled) {
          background: #fff0f0;
        }

        .supportDangerButton.solid {
          border-color: #a42b37;
          background: #a42b37;
          color: white;
        }

        .supportDangerButton.solid:hover:not(:disabled) {
          background: #831b27;
        }

        .supportCameraButton:disabled,
        .supportPrimaryButton:disabled,
        .supportSecondaryButton:disabled,
        .supportDangerButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .supportAlert {
          padding: 17px 18px;
          border-radius: 14px;
          border: 1px solid;
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
          flex: 0 0 45px;
          display: grid;
          place-items: center;
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

        .supportParticipantName span,
        .supportRecordEyebrow {
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
          padding: 15px 13px;
          border: 1px solid #efebe7;
          border-radius: 12px;
          background: #fff;
          min-width: 0;
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

        .supportRecords,
        .supportHistoryList {
          display: grid;
          gap: 12px;
        }

        .supportRecordCard {
          padding: 18px;
          background: #fffdfa;
          border: 1px solid #eee7e0;
          border-radius: 15px;
        }

        .supportRecordHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .supportRecordHeader h3 {
          font-size: 21px;
          margin: 4px 0 0;
        }

        .supportStatus {
          padding: 7px 11px;
          border-radius: 999px;
          background: #f3eeeb;
          color: #806b61;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.03em;
        }

        .supportStatus.exchanged {
          background: #e1f3e7;
          color: #1d774d;
        }

        .supportConfirmation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 18px;
          background: #fff3f2;
          border: 1px solid #f0d4d0;
          border-radius: 14px;
          text-align: center;
        }

        .supportConfirmation > span {
          color: #ac6465;
          font-size: 10px;
          letter-spacing: 0.12em;
          font-weight: 850;
        }

        .supportConfirmation small {
          color: #796766;
          font-size: 11px;
        }

        .supportConfirmation strong {
          color: var(--support-red);
          font-size: clamp(23px, 5vw, 30px);
          font-weight: 900;
          letter-spacing: 0.08em;
          overflow-wrap: anywhere;
        }

        .supportRecordInfo {
          display: grid;
          gap: 0;
          margin-top: 14px;
        }

        .supportRecordInfo > div {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid #f0eae6;
        }

        .supportRecordInfo > div:last-child {
          border-bottom: 0;
        }

        .supportRecordInfo span {
          flex: 0 0 auto;
          color: var(--support-muted);
          font-size: 11px;
        }

        .supportRecordInfo strong {
          min-width: 0;
          font-size: 12px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .supportDangerArea {
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #f0d4d0;
          background: #fff8f6;
          border-radius: 13px;
        }

        .supportDangerArea p {
          color: #8a5455;
          font-size: 11px;
          line-height: 1.85;
          margin: 0 0 12px;
        }

        .supportEmpty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 35px 15px;
          background: #fbf8f5;
          border: 1px dashed #e3d9d3;
          border-radius: 14px;
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
          font-size: 12px;
          color: var(--support-muted);
          line-height: 1.8;
          margin: 0;
        }

        .supportRollbackPanel {
          border-color: #eac7c6;
          background: #fffcfa;
        }

        .supportWarningBox {
          padding: 15px;
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
          text-align: right;
          font-size: 11px;
          color: var(--support-muted);
          margin-top: 6px;
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
          width: 37px;
          height: 37px;
          border-radius: 11px;
          background: #fcebed;
          color: var(--support-red);
          font-size: 22px;
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

        .supportHistoryReason {
          padding: 13px;
          margin: 14px 0;
          border-radius: 10px;
          background: #fff;
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
          background: #fff;
          color: var(--support-text);
          box-shadow: 0 20px 65px rgba(0, 0, 0, 0.2);
        }

        .supportModal h2 {
          font-size: 20px;
          line-height: 1.4;
          margin: 11px 0;
        }

        .supportModalLead {
          font-size: 12px;
          color: var(--support-muted);
          line-height: 1.8;
        }

        .supportModalDetails {
          border: 1px solid #efebe7;
          border-radius: 13px;
          padding: 0 15px;
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
          border-radius: 13px;
          background: #fff5e9;
          border: 1px solid #efd2b2;
          color: #875029;
          margin: 16px 0;
        }

        .supportModalWarning strong {
          font-size: 12px;
        }

        .supportModalWarning p {
          font-size: 12px;
          line-height: 1.85;
          margin: 6px 0 0;
        }

        .supportModalButtons {
          display: grid;
          gap: 10px;
        }

        @media (max-width: 560px) {
          .supportRewardPage {
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

          .supportRecordCard {
            padding: 15px;
          }

          .supportRecordInfo > div,
          .supportHistoryMeta > div {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .supportRecordInfo strong,
          .supportHistoryMeta strong {
            text-align: left;
          }

          .supportModal {
            padding: 20px 17px;
            border-radius: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .supportRewardPage *,
          .supportRewardPage *::before,
          .supportRewardPage *::after {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
