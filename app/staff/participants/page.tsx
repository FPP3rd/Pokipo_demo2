
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

const spotNames: Record<string, string> = {
  spot1: "学生センター／雄飛ホール",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン前掲示板",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
);

function dateText(value?: string) {
  return value
    ? new Date(value).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      })
    : "未取得";
}

function elapsedSeconds(stamps: Stamp[]) {
  const normal = stamps.filter((stamp) =>
    /^spot[1-5]$/.test(stamp.spot_id)
  );

  const unique = new Map<string, number>();

  for (const stamp of normal) {
    const t = Date.parse(stamp.acquired_at);

    if (Number.isFinite(t)) {
      unique.set(
        stamp.spot_id,
        Math.min(t, unique.get(stamp.spot_id) ?? t)
      );
    }
  }

  if (unique.size < 5) return null;

  const times = [...unique.values()];

  return Math.round(
    (Math.max(...times) - Math.min(...times)) / 1000
  );
}

export default function ParticipantsPage() {
  const [rows, setRows] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(60);

  async function load() {
    setLoading(true);
    setError("");

    const { data: userData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !userData.user) {
      setRows([]);
      setError(
        "管理者としてログインしてください。先に /staff からログインしてください。"
      );
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "pokipo_furuya_participant_list"
    );

    if (rpcError) {
      setRows([]);
      setError(
        "閲覧権限がないか、取得に失敗しました。lipost-furuya でログインしているか確認してください。"
      );
    } else {
      setRows(
        Array.isArray(data) ? (data as Participant[]) : []
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      rows.filter((p) => {
        const matches = [
          p.nickname,
          p.grade,
          p.department,
          p.id,
        ].some((v) =>
          (v ?? "")
            .toLowerCase()
            .includes(keyword.toLowerCase())
        );

        const seconds = elapsedSeconds(p.stamps);

        return (
          matches &&
          (!onlyFlagged ||
            (seconds !== null && seconds <= threshold))
        );
      }),
    [rows, keyword, onlyFlagged, threshold]
  );

  const flaggedCount = rows.filter((p) => {
    const seconds = elapsedSeconds(p.stamps);
    return seconds !== null && seconds <= threshold;
  }).length;

  const selectedParticipant = visible.find(
    (p) => p.id === selected
  );

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "0 auto",
        padding: "28px 16px",
        color: "#262626",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        POKIPO 参加者一覧
      </h1>

      <p style={{ color: "#666", fontSize: 13 }}>
        管理責任者専用・閲覧のみ
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          margin: "20px 0",
        }}
      >
        <button
          onClick={() => void load()}
          disabled={loading}
          style={buttonStyle}
        >
          再読み込み
        </button>

        <input
          aria-label="参加者検索"
          placeholder="ニックネーム・学年・学科で検索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={inputStyle}
        />

        <label style={{ fontSize: 14 }}>
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) =>
              setOnlyFlagged(e.target.checked)
            }
          />
          要確認のみ
        </label>

        <label style={{ fontSize: 14 }}>
          基準{" "}
          <select
            value={threshold}
            onChange={(e) =>
              setThreshold(Number(e.target.value))
            }
            style={inputStyle}
          >
            <option value={30}>30秒以内</option>
            <option value={60}>60秒以内</option>
            <option value={120}>2分以内</option>
            <option value={300}>5分以内</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        !error && (
          <>
            <p style={{ fontSize: 14 }}>
              登録者 {rows.length}人 / 表示{" "}
              {visible.length}人 / 要確認{" "}
              {flaggedCount}人
            </p>

            <p style={{ fontSize: 12, color: "#666" }}>
              「要確認」は5か所の取得時刻の差で判定しています。
              不正取得を証明するものではありません。
            </p>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ background: "#f4f4f4" }}>
                    <th style={cell}>ニックネーム</th>
                    <th style={cell}>学年・学科</th>
                    <th style={cell}>登録日時</th>
                    <th style={cell}>取得数</th>
                    <th style={cell}>所要時間</th>
                    <th style={cell}>確認</th>
                  </tr>
                </thead>

                <tbody>
                  {visible.map((p) => {
                    const seconds = elapsedSeconds(p.stamps);

                    const count = new Set(
                      p.stamps
                        .filter((s) =>
                          /^spot[1-5]$/.test(s.spot_id)
                        )
                        .map((s) => s.spot_id)
                    ).size;

                    const flagged =
                      seconds !== null &&
                      seconds <= threshold;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          background: flagged
                            ? "#fff7ed"
                            : "white",
                        }}
                      >
                        <td style={cell}>
                          {p.nickname || "（未設定）"}
                        </td>

                        <td style={cell}>
                          {p.grade || "—"} /{" "}
                          {p.department || "—"}
                        </td>

                        <td style={cell}>
                          {dateText(p.created_at)}
                        </td>

                        <td style={cell}>
                          {count}/5
                        </td>

                        <td style={cell}>
                          {seconds === null
                            ? "—"
                            : `${seconds}秒`}{" "}
                          {flagged && (
                            <strong
                              style={{ color: "#a16207" }}
                            >
                              要確認
                            </strong>
                          )}
                        </td>

                        <td style={cell}>
                          <button
                            style={buttonStyle}
                            onClick={() =>
                              setSelected(
                                selected === p.id
                                  ? null
                                  : p.id
                              )
                            }
                          >
                            {selected === p.id
                              ? "閉じる"
                              : "履歴"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedParticipant && (
              <section
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <h2 style={{ fontSize: 18 }}>
                  スタンプ取得履歴
                </h2>

                <p
                  style={{
                    fontSize: 12,
                    overflowWrap: "anywhere",
                  }}
                >
                  参加者ID: {selectedParticipant.id}
                </p>

                {selectedParticipant.stamps.length === 0 ? (
                  <p>履歴なし</p>
                ) : (
                  <ol>
                    {selectedParticipant.stamps.map(
                      (stamp, i) => (
                        <li
                          key={`${stamp.spot_id}-${i}`}
                        >
                          {spotNames[stamp.spot_id] ||
                            stamp.spot_id}
                          ：{dateText(stamp.acquired_at)}
                        </li>
                      )
                    )}
                  </ol>
                )}
              </section>
            )}
          </>
        )
      )}
    </main>
  );
}

const cell: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #e5e5e5",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const buttonStyle: CSSProperties = {
  border: "1px solid #bbb",
  borderRadius: 6,
  padding: "7px 12px",
  background: "white",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  border: "1px solid #bbb",
  borderRadius: 6,
  padding: "7px",
  maxWidth: "100%",
};
