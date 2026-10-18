
"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import type { CSSProperties } from "react";

/* ========================================
   TYPES
======================================== */

type Stamp = {
  spot_id: string;
  acquired_at: string;
};

type Participant = {
  id: string;
  nickname: string | null;
  grade: string | null;
  department: string | null;
  created_at: string;
  stamps: Stamp[];
};

/* ========================================
   CONFIG
======================================== */

const SPOTS: Record<string, string> = {
  spot1: "学生センター／雄飛ホール",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン前掲示板",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/* ========================================
   HELPERS
======================================== */

function formatDate(value?: string | null) {
  if (!value) return "未取得";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "日時不明";
  }

  return date.toLocaleString("ja-JP", DATE_OPTIONS);
}

function getStampInfo(stamps: Stamp[]) {
  const earliest = new Map<string, number>();

  for (const stamp of stamps) {
    if (!/^spot[1-5]$/.test(stamp.spot_id)) {
      continue;
    }

    const time = Date.parse(stamp.acquired_at);

    if (!Number.isFinite(time)) {
      continue;
    }

    const previous = earliest.get(stamp.spot_id);

    if (previous === undefined || time < previous) {
      earliest.set(stamp.spot_id, time);
    }
  }

  const times = [...earliest.values()];

  const seconds =
    earliest.size === 5
      ? Math.round(
          (Math.max(...times) -
            Math.min(...times)) / 1000
        )
      : null;

  return {
    count: earliest.size,
    seconds,
  };
}

/* ========================================
   STYLES
   スタッフトップの色合いに統一
======================================== */

const COLORS = {
  primary: "#8a1822",
  primaryDark: "#70131b",
  text: "#332d29",
  muted: "#786c64",
  border: "#e8dfd8",
  soft: "#fffaf6",
  white: "#ffffff",
};

const cellStyle: CSSProperties = {
  padding: "13px 12px",
  borderBottom: `1px solid ${COLORS.border}`,
  textAlign: "left",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

const buttonStyle: CSSProperties = {
  background: COLORS.white,
  color: COLORS.primary,
  padding: "10px 14px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const inputStyle: CSSProperties = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "11px 12px",
  maxWidth: "100%",
  color: COLORS.text,
  background: COLORS.white,
};

const cardStyle: CSSProperties = {
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 18,
  boxShadow: "0 8px 22px rgba(55, 35, 25, 0.055)",
};

/* ========================================
   PARTICIPANT HISTORY
   行の直下に展開する詳細
======================================== */

function ParticipantHistory({
  participant,
  onClose,
}: {
  participant: Participant;
  onClose: () => void;
}) {
  const info = getStampInfo(participant.stamps);

  const stamps = Object.entries(SPOTS).map(
    ([spotId, spotName], index) => {
      const records = participant.stamps
        .filter((stamp) => stamp.spot_id === spotId)
        .sort(
          (a, b) =>
            Date.parse(a.acquired_at) -
            Date.parse(b.acquired_at)
        );

      return {
        id: spotId,
        number: index + 1,
        name: spotName,
        record: records[0] ?? null,
        recordCount: records.length,
      };
    }
  );

  return (
    <div
      style={{
        padding: "20px",
        background: COLORS.soft,
        borderLeft: `3px solid ${COLORS.primary}`,
        animation: "pokipoParticipantOpen 0.24s ease-out",
      }}
    >
      {/* 詳細ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <span
            style={{
              color: COLORS.primary,
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: "0.1em",
            }}
          >
            PARTICIPANT HISTORY
          </span>

          <h3
            style={{
              margin: "6px 0",
              fontSize: 19,
              color: COLORS.text,
            }}
          >
            {participant.nickname || "未設定"}さんの
            スタンプ取得履歴
          </h3>

          <p
            style={{
              fontSize: 11,
              color: COLORS.muted,
              overflowWrap: "anywhere",
              margin: "6px 0 0",
            }}
          >
            参加者ID：{participant.id}
          </p>
        </div>

        <button
          type="button"
          style={buttonStyle}
          onClick={onClose}
          aria-label="履歴を閉じる"
        >
          × 閉じる
        </button>
      </div>

      {/* 概要 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            padding: 13,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: COLORS.muted,
            }}
          >
            取得スポット数
          </span>

          <div
            style={{
              marginTop: 5,
              color: COLORS.primary,
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {info.count}
            <small
              style={{
                fontSize: 12,
                color: COLORS.muted,
              }}
            >
              /5
            </small>
          </div>
        </div>

        <div
          style={{
            padding: 13,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: COLORS.muted,
            }}
          >
            5か所の取得所要時間
          </span>

          <div
            style={{
              marginTop: 5,
              color: COLORS.primary,
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {info.seconds === null
              ? "—"
              : `${info.seconds}秒`}
          </div>
        </div>

        <div
          style={{
            padding: 13,
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: COLORS.muted,
            }}
          >
            参加登録日時
          </span>

          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 800,
              color: COLORS.text,
            }}
          >
            {formatDate(participant.created_at)}
          </div>
        </div>
      </div>

      {/* スタンプ取得履歴 */}
      <div
        style={{
          ...cardStyle,
          padding: "5px 15px",
          boxShadow: "none",
        }}
      >
        {stamps.map((spot, index) => (
          <div
            key={spot.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              padding: "15px 0",
              borderBottom:
                index === stamps.length - 1
                  ? "none"
                  : `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  background: spot.record
                    ? COLORS.primary
                    : "#f1eae4",
                  color: spot.record
                    ? COLORS.white
                    : COLORS.muted,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {String(spot.number).padStart(2, "0")}
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    color: COLORS.text,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {spot.name}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: COLORS.muted,
                    fontSize: 11,
                  }}
                >
                  {spot.record
                    ? formatDate(spot.record.acquired_at)
                    : "未取得"}
                </span>
              </div>
            </div>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: spot.record
                  ? "#f6efea"
                  : "#f3efeb",
                color: spot.record
                  ? COLORS.primary
                  : COLORS.muted,
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              {spot.record ? "取得済み" : "未取得"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================
   MAIN PAGE
======================================== */

export default function ParticipantsPage() {
  const router = useRouter();

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [threshold, setThreshold] = useState(60);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  /* ========================================
     DATA LOADING
  ======================================== */

  async function loadParticipants() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        setParticipants([]);
        setSelectedId(null);
        setErrorMessage(
          "管理者ログインが必要です。先にスタッフ画面からログインしてください。"
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("staff_profiles")
        .select("admin_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (
        profileError ||
        profile?.admin_id !== "lipost-furuya"
      ) {
        setParticipants([]);
        setSelectedId(null);
        setErrorMessage(
          "このページは lipost-furuya 専用です。閲覧権限がありません。"
        );
        return;
      }

      const { data, error } = await supabase.rpc(
        "pokipo_furuya_participant_list"
      );

      if (error) {
        console.error("参加者一覧取得エラー:", error);
        setParticipants([]);
        setSelectedId(null);
        setErrorMessage(
          "参加者一覧を取得できませんでした。SupabaseのSQL関数と権限を確認してください。"
        );
        return;
      }

      if (!Array.isArray(data)) {
        setParticipants([]);
        setSelectedId(null);
        setErrorMessage(
          "取得データの形式が正しくありません。"
        );
        return;
      }

      const normalized: Participant[] = data.map(
        (row: Participant) => ({
          id: row.id,
          nickname: row.nickname,
          grade: row.grade,
          department: row.department,
          created_at: row.created_at,
          stamps: Array.isArray(row.stamps)
            ? row.stamps
            : [],
        })
      );

      setParticipants(normalized);

      // 更新後、対象者がいなければ開いた詳細を閉じる
      setSelectedId((previous) =>
        previous &&
        normalized.some((participant) =>
          participant.id === previous
        )
          ? previous
          : null
      );
    } catch (error) {
      console.error("参加者一覧通信エラー:", error);
      setParticipants([]);
      setSelectedId(null);
      setErrorMessage(
        "通信エラーが発生しました。再読み込みしてください。"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParticipants();
  }, []);

  /* ========================================
     FILTER
  ======================================== */

  const visible = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return participants.filter((participant) => {
      const matches = [
        participant.nickname,
        participant.grade,
        participant.department,
        participant.id,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search)
      );

      const info = getStampInfo(participant.stamps);

      const flagged =
        info.seconds !== null &&
        info.seconds <= threshold;

      return matches && (!onlyFlagged || flagged);
    });
  }, [
    participants,
    keyword,
    onlyFlagged,
    threshold,
  ]);

  const flaggedCount = participants.filter(
    (participant) => {
      const info = getStampInfo(participant.stamps);

      return (
        info.seconds !== null &&
        info.seconds <= threshold
      );
    }
  ).length;

  const completedCount = participants.filter(
    (participant) =>
      getStampInfo(participant.stamps).count === 5
  ).length;

  /* ========================================
     PAGE
  ======================================== */

  return (
    <main
      className="shell"
      style={{
        minHeight: "100vh",
        padding: "24px 12px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          color: COLORS.text,
        }}
      >
        {/* HEADER */}

        <div
          style={{
            ...cardStyle,
            padding: "21px",
            marginBottom: 20,
            background:
              "linear-gradient(135deg, #fffaf6, #ffffff)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div>
            <span
              style={{
                color: COLORS.primary,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.12em",
              }}
            >
              POKIPO STAFF / PRIVATE
            </span>

            <h1
              style={{
                color: COLORS.text,
                fontSize: 25,
                margin: "7px 0",
                fontWeight: 900,
              }}
            >
              参加者一覧・読み取り履歴
            </h1>

            <p
              style={{
                color: COLORS.muted,
                margin: 0,
                fontSize: 12,
              }}
            >
              lipost-furuya 限定・閲覧専用
            </p>
          </div>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => router.push("/staff")}
          >
            ← スタッフメニューに戻る
          </button>
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: 16,
              marginBottom: 18,
              background: "#fff1ee",
              border: "1px solid #ecc4bd",
              borderRadius: 13,
              color: "#9e322b",
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <p>参加者情報を読み込み中...</p>
        ) : !errorMessage ? (
          <>
            {/* SUMMARY */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "参加登録者",
                  value: participants.length,
                },
                {
                  label: "5か所達成者",
                  value: completedCount,
                },
                {
                  label: "短時間取得・要確認",
                  value: flaggedCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    ...cardStyle,
                    padding: 18,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: COLORS.muted,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </span>

                  <strong
                    style={{
                      color: COLORS.primary,
                      fontSize: 28,
                      fontWeight: 900,
                    }}
                  >
                    {item.value.toLocaleString()}
                  </strong>

                  <small
                    style={{
                      marginLeft: 5,
                      color: COLORS.muted,
                    }}
                  >
                    人
                  </small>
                </div>
              ))}
            </div>

            {/* SEARCH AND FILTER */}

            <div
              style={{
                ...cardStyle,
                padding: 16,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <input
                aria-label="参加者検索"
                style={{
                  ...inputStyle,
                  flex: "1 1 200px",
                }}
                placeholder="ニックネーム・学年・学科・IDを検索"
                value={keyword}
                onChange={(event) =>
                  setKeyword(event.target.value)
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  color: COLORS.text,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyFlagged}
                  onChange={(event) =>
                    setOnlyFlagged(event.target.checked)
                  }
                  style={{
                    accentColor: COLORS.primary,
                  }}
                />
                要確認のみ
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 7,
                  color: COLORS.text,
                  fontSize: 13,
                }}
              >
                判定基準：
                <select
                  style={inputStyle}
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(
                      Number(event.target.value)
                    )
                  }
                >
                  <option value={30}>30秒以内</option>
                  <option value={60}>60秒以内</option>
                  <option value={120}>2分以内</option>
                  <option value={300}>5分以内</option>
                  <option value={600}>10分以内</option>
                </select>
              </label>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => void loadParticipants()}
              >
                ↻ 更新
              </button>
            </div>

            {/* PARTICIPANT TABLE */}

            <div
              style={{
                ...cardStyle,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 13,
                }}
              >
                <strong
                  style={{
                    color: COLORS.text,
                    fontSize: 15,
                  }}
                >
                  参加者一覧
                </strong>

                <span
                  style={{
                    color: COLORS.muted,
                    fontSize: 12,
                  }}
                >
                  表示：{visible.length}人
                </span>
              </div>

              <p
                style={{
                  color: COLORS.muted,
                  fontSize: 11,
                  lineHeight: 1.7,
                  margin: "0 0 12px",
                }}
              >
                「履歴を見る」を押すと、その参加者の
                行の直下に詳細が展開されます。
              </p>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: 800,
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f6efea",
                      }}
                    >
                      <th style={cellStyle}>ニックネーム</th>
                      <th style={cellStyle}>学年</th>
                      <th style={cellStyle}>学科</th>
                      <th style={cellStyle}>登録日時</th>
                      <th style={cellStyle}>取得</th>
                      <th style={cellStyle}>所要時間</th>
                      <th style={cellStyle}>詳細</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visible.map((participant) => {
                      const info = getStampInfo(
                        participant.stamps
                      );

                      const flagged =
                        info.seconds !== null &&
                        info.seconds <= threshold;

                      const expanded =
                        selectedId === participant.id;

                      return (
                        <Fragment key={participant.id}>
                          {/* 参加者の基本情報行 */}

                          <tr
                            style={{
                              background: expanded
                                ? "#f6efea"
                                : flagged
                                ? "#fff8ed"
                                : COLORS.white,
                              transition:
                                "background 0.2s ease",
                            }}
                          >
                            <td style={cellStyle}>
                              <strong
                                style={{
                                  color: COLORS.text,
                                }}
                              >
                                {participant.nickname || "未設定"}
                              </strong>
                            </td>

                            <td style={cellStyle}>
                              {participant.grade || "—"}
                            </td>

                            <td style={cellStyle}>
                              {participant.department || "—"}
                            </td>

                            <td style={cellStyle}>
                              {formatDate(
                                participant.created_at
                              )}
                            </td>

                            <td style={cellStyle}>
                              <strong
                                style={{
                                  color: COLORS.primary,
                                }}
                              >
                                {info.count}/5
                              </strong>
                            </td>

                            <td style={cellStyle}>
                              {info.seconds === null
                                ? "—"
                                : `${info.seconds}秒`}

                              {flagged && (
                                <div
                                  style={{
                                    color: "#996325",
                                    fontWeight: 800,
                                    fontSize: 10,
                                    marginTop: 4,
                                  }}
                                >
                                  要確認
                                </div>
                              )}
                            </td>

                            <td style={cellStyle}>
                              <button
                                type="button"
                                aria-expanded={expanded}
                                aria-controls={
                                  `participant-history-${participant.id}`
                                }
                                style={{
                                  ...buttonStyle,
                                  background: expanded
                                    ? COLORS.primary
                                    : COLORS.white,
                                  color: expanded
                                    ? COLORS.white
                                    : COLORS.primary,
                                  borderColor: expanded
                                    ? COLORS.primary
                                    : COLORS.border,
                                  minWidth: 105,
                                }}
                                onClick={() =>
                                  setSelectedId(
                                    expanded
                                      ? null
                                      : participant.id
                                  )
                                }
                              >
                                {expanded
                                  ? "▲ 閉じる"
                                  : "▼ 履歴を見る"}
                              </button>
                            </td>
                          </tr>

                          {/* 開いている参加者の直下に詳細を表示 */}

                          {expanded && (
                            <tr
                              id={
                                `participant-history-${participant.id}`
                              }
                            >
                              <td
                                colSpan={7}
                                style={{
                                  padding: 0,
                                  borderBottom:
                                    `1px solid ${COLORS.border}`,
                                  whiteSpace: "normal",
                                }}
                              >
                                <ParticipantHistory
                                  participant={participant}
                                  onClose={() =>
                                    setSelectedId(null)
                                  }
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {visible.length === 0 && (
                  <p
                    style={{
                      padding: 16,
                      color: COLORS.muted,
                    }}
                  >
                    該当する参加者はいません。
                  </p>
                )}
              </div>
            </div>

            {/* FOOTNOTE */}

            <p
              style={{
                color: COLORS.muted,
                fontSize: 12,
                lineHeight: 1.9,
                marginTop: 20,
              }}
            >
              ※「要確認」は5か所のスタンプ取得時刻の
              差が設定基準以下だった参加者を示します。
              QRコードの写真共有や不正利用を
              断定するものではありません。
            </p>
          </>
        ) : null}
      </section>

      {/* 開閉アニメーション */}
      <style jsx global>{`
        @keyframes pokipoParticipantOpen {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [id^="participant-history-"] > td > div {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
