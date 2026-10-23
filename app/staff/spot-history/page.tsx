"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Stamp = { spot_id: string; acquired_at: string };
type Participant = { id: string; nickname: string; grade: string | null; department: string | null; stamps: Stamp[] };
type Row = { id: string; nickname: string; grade: string | null; department: string | null; at: string };
const SPOTS: Record<string, string> = {
  spot1: "学生センター", spot2: "東棟2階", spot3: "ゆうちょ銀行ATM付近掲示板",
  spot4: "ラーニングスクエア", spot5: "セブンイレブン付近掲示板",
};
function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SpotHistoryPage() {
  const params = useSearchParams();
  const [spot, setSpot] = useState("spot1");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = params.get("spot");
    if (requested && Object.prototype.hasOwnProperty.call(SPOTS, requested)) setSpot(requested);
  }, [params]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: loadError } = await supabase.rpc("pokipo_furuya_participant_list");
      if (!active) return;
      if (loadError || !Array.isArray(data)) {
        setError("履歴の取得に失敗しました。lipost-furuya の権限を確認してください。");
        setParticipants([]);
      } else {
        setError("");
        setParticipants(data as Participant[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const rows = useMemo<Row[]>(() => participants.flatMap((participant) =>
    (Array.isArray(participant.stamps) ? participant.stamps : [])
      .filter((stamp) => stamp.spot_id === spot)
      .map((stamp) => ({ id: participant.id, nickname: participant.nickname, grade: participant.grade, department: participant.department, at: stamp.acquired_at })),
  ).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()), [participants, spot]);

  return (
    <main style={{ margin: "0 auto", maxWidth: 980, padding: "24px 16px 80px", minWidth: 0, width: "100%", boxSizing: "border-box", color: "#302a26" }}>
      <p style={{ color: "#8a1822", fontSize: 11, fontWeight: 900 }}>POKIPO / PRIVATE SCAN HISTORY</p>
      <h1 style={{ fontSize: 24, color: "#302a26" }}>スポット別読み取り履歴</h1>
      <p style={{ fontSize: 12, color: "#796d69" }}>lipost-furuya 専用。参加者の情報を含むため、画面共有・撮影・外部提供にご注意ください。</p>
      <p><Link href="/staff/dashboard" style={{ color: "#8a1822" }}>← ダッシュボードへ戻る</Link></p>
      <label htmlFor="pokipo-history-spot" style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>表示するスポット</label>
      <select id="pokipo-history-spot" value={spot} onChange={(e) => setSpot(e.target.value)} style={{ width: "100%", maxWidth: 460, padding: 12, border: "1px solid #e6d7d2", borderRadius: 10, background: "white", color: "#302a26" }}>
        {Object.entries(SPOTS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      {loading ? <p>読み取り履歴を読み込み中…</p> : error ? <p role="alert" style={{ color: "#9c2431" }}>{error}</p> : (
        <>
          <p style={{ marginTop: 18, fontWeight: 800 }}>読み取り件数：{rows.length}件</p>
          <div style={{ overflowX: "auto", border: "1px solid #ecdfdb", borderRadius: 12, background: "#fff" }}>
            <table style={{ width: "100%", minWidth: 580, borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ background: "#fff3f0", color: "#8a1822" }}>
                <tr><th style={{ padding: 12, textAlign: "left" }}>読み取り日時</th><th style={{ padding: 12, textAlign: "left" }}>ニックネーム</th><th style={{ padding: 12, textAlign: "left" }}>学年・所属</th><th style={{ padding: 12, textAlign: "left" }}>学科</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => <tr key={`${row.id}:${row.at}`} style={{ borderTop: "1px solid #eee2dd" }}><td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(row.at)}</td><td style={{ padding: 12 }}>{row.nickname}</td><td style={{ padding: 12 }}>{row.grade || "—"}</td><td style={{ padding: 12 }}>{row.department || "—"}</td></tr>)}
              </tbody>
            </table>
            {rows.length === 0 && <p style={{ padding: 16 }}>このスポットの履歴はまだありません。</p>}
          </div>
        </>
      )}
    </main>
  );
}