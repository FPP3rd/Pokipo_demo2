
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import type { CSSProperties } from "react";

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

function formatDate(value?: string | null) {
  if (!value) return "未取得";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "日時不明";
  return date.toLocaleString("ja-JP", DATE_OPTIONS);
}

function getStampInfo(stamps: Stamp[]) {
  const earliest = new Map<string, number>();

  for (const stamp of stamps) {
    if (!/^spot[1-5]$/.test(stamp.spot_id)) continue;

    const time = Date.parse(stamp.acquired_at);
    if (!Number.isFinite(time)) continue;

    const previous = earliest.get(stamp.spot_id);
    if (previous === undefined || time < previous) {
      earliest.set(stamp.spot_id, time);
    }
  }

  const times = [...earliest.values()];

  const seconds =
    earliest.size === 5
      ? Math.round(
          (Math.max(...times) - Math.min(...times)) / 1000
        )
      : null;

  return {
    count: earliest.size,
    seconds,
  };
}

const cellStyle: CSSProperties = {
  padding: "11px 10px",
  borderBottom: "1px solid #e7e7e7",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const buttonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#333333",
  padding: "9px 13px",
  border: "1px solid #cccccc",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  border: "1px solid #cccccc",
  borderRadius: 8,
  padding: "10px",
  maxWidth: "100%",
};

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

  async function loadParticipants() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setParticipants([]);
        setErrorMessage(
          "管理者ログインが必要です。先にスタッフ画面からログインしてください。"
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("staff_profiles")
          .select("admin_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

      if (
        profileError ||
        profile?.admin_id !== "lipost-furuya"
      ) {
        setParticipants([]);
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
        setErrorMessage(
          "参加者一覧を取得できませんでした。SupabaseのSQL関数と権限を確認してください。"
        );
        return;
      }

      if (!Array.isArray(data)) {
        setParticipants([]);
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
    } catch (error) {
      console.error("参加者一覧通信エラー:", error);
      setParticipants([]);
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

  const visible = useMemo(() => {
    return participants.filter((participant) => {
      const search = keyword.trim().toLowerCase();

      const matches = [
        participant.nickname,
        participant.grade,
        participant.department,
        participant.id,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(search)
      );

      const info = getStampInfo(participant.stamps);

      const flagged =
        info.seconds !== null &&
        info.seconds <= threshold;

      return matches && (!onlyFlagged || flagged);
    });
  }, [participants, keyword, onlyFlagged, threshold]);

  const flaggedCount = participants.filter((participant) => {
    const info = getStampInfo(participant.stamps);

    return (
      info.seconds !== null &&
      info.seconds <= threshold
    );
  }).length;

  const selectedParticipant = participants.find(
    (participant) => participant.id === selectedId
  );

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
          color: "#242424",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                color: "#b91c1c",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              POKIPO STAFF / PRIVATE
            </div>

            <h1
              style={{
                fontSize: 25,
                margin: "8px 0",
              }}
            >
              参加者一覧・読み取り履歴
            </h1>

            <p style={{ color: "#666", fontSize: 13 }}>
              lipost-furuya 限定・閲覧専用
            </p>
          </div>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => router.push("/staff")}
          >
            スタッフメニューへ戻る
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: 10,
              padding: 16,
              color: "#991b1b",
              marginBottom: 20,
            }}
          >
            {errorMessage}
          </div>
        )}

        {loading ? (
          <p>参加者情報を読み込み中...</p>
        ) : !errorMessage ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(150px,1fr))",
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
                  value: participants.filter(
                    (p) => getStampInfo(p.stamps).count === 5
                  ).length,
                },
                {
                  label: "短時間取得・要確認",
                  value: flaggedCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#fff",
                    padding: 18,
                    borderRadius: 12,
                    border: "1px solid #e5e5e5",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#777",
                    }}
                  >
                    {item.label}
                  </div>

                  <strong style={{ fontSize: 26 }}>
                    {item.value}
                  </strong>
                  <span style={{ fontSize: 12 }}> 人</span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 16,
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                marginBottom: 20,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                aria-label="参加者検索"
                style={inputStyle}
                placeholder="ニックネーム・学年・学科を検索"
                value={keyword}
                onChange={(event) =>
                  setKeyword(event.target.value)
                }
              />

              <label style={{ fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={onlyFlagged}
                  onChange={(event) =>
                    setOnlyFlagged(event.target.checked)
                  }
                />
                要確認のみ
              </label>

              <label style={{ fontSize: 14 }}>
                判定基準：
                <select
                  style={inputStyle}
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(Number(event.target.value))
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
                style={buttonStyle}
                type="button"
                onClick={() => void loadParticipants()}
              >
                更新
              </button>
            </div>

            <div
              style={{
                padding: 16,
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
              }}
            >
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                表示：{visible.length}人
              </p>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
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

                      return (
                        <tr
                          key={participant.id}
                          style={{
                            background: flagged
                              ? "#fff7ed"
                              : "#ffffff",
                          }}
                        >
                          <td style={cellStyle}>
                            {participant.nickname || "未設定"}
                          </td>

                          <td style={cellStyle}>
                            {participant.grade || "—"}
                          </td>

                          <td style={cellStyle}>
                            {participant.department || "—"}
                          </td>

                          <td style={cellStyle}>
                            {formatDate(participant.created_at)}
                          </td>

                          <td style={cellStyle}>
                            {info.count}/5
                          </td>

                          <td style={cellStyle}>
                            {info.seconds === null
                              ? "—"
                              : `${info.seconds}秒`}

                            {flagged && (
                              <div
                                style={{
                                  color: "#b45309",
                                  fontWeight: 700,
                                  fontSize: 11,
                                }}
                              >
                                要確認
                              </div>
                            )}
                          </td>

                          <td style={cellStyle}>
                            <button
                              type="button"
                              style={buttonStyle}
                              onClick={() =>
                                setSelectedId(
                                  selectedId === participant.id
                                    ? null
                                    : participant.id
                                )
                              }
                            >
                              履歴
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {visible.length === 0 && (
                  <p style={{ padding: 16 }}>
                    該当する参加者はいません。
                  </p>
                )}
              </div>
            </div>

            {selectedParticipant && (
              <section
                style={{
                  marginTop: 20,
                  padding: 20,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                }}
              >
                <h2 style={{ fontSize: 19 }}>
                  スタンプ取得履歴
                </h2>

                <p>
                  参加者：
                  <strong>
                    {selectedParticipant.nickname || "未設定"}
                  </strong>
                </p>

                <p
                  style={{
                    fontSize: 11,
                    overflowWrap: "anywhere",
                    color: "#666",
                  }}
                >
                  参加者ID：{selectedParticipant.id}
                </p>

                <div style={{ marginTop: 18 }}>
                  {Object.entries(SPOTS).map(
                    ([spotId, spotName]) => {
                      const record =
                        selectedParticipant.stamps
                          .filter(
                            (stamp) =>
                              stamp.spot_id === spotId
                          )
                          .sort(
                            (a, b) =>
                              Date.parse(a.acquired_at) -
                              Date.parse(b.acquired_at)
                          )[0];

                      return (
                        <div
                          key={spotId}
                          style={{
                            borderBottom: "1px solid #eee",
                            padding: "12px 0",
                          }}
                        >
                          <strong>{spotName}</strong>

                          <div
                            style={{
                              color: record ? "#333" : "#999",
                              marginTop: 5,
                              fontSize: 13,
                            }}
                          >
                            {record
                              ? formatDate(record.acquired_at)
                              : "未取得"}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    marginTop: 18,
                  }}
                  onClick={() => setSelectedId(null)}
                >
                  詳細を閉じる
                </button>
              </section>
            )}

            <p
              style={{
                color: "#666",
                fontSize: 12,
                lineHeight: 1.8,
                marginTop: 20,
              }}
            >
              ※「要確認」は5か所の取得時刻の差が
              設定基準以下だった参加者を示します。
              QRコードの写真共有や不正利用を
              断定するものではありません。
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
