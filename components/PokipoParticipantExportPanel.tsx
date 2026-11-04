"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";

type Stamp = { spot_id: string; acquired_at: string };
type Participant = {
  id: string;
  nickname: string | null;
  grade: string | null;
  department: string | null;
  created_at: string;
  pre_survey_answered: boolean;
  post_survey_answered: boolean;
  reward_exchanged: boolean;
  stamps: Stamp[];
};
type PreSurvey = {
  participant_id: string;
  created_at: string;
  gender: string | null;
  pocky_frequency: string | null;
  knew_renewal: boolean | null;
  has_shared_pocky: boolean | null;
  share_situation: string | null;
  interest_score: number | null;
  eat_intent_score: number | null;
  share_intent_score: number | null;
  pocky_value_understanding: number | null;
  cocoa_social_understanding: number | null;
};
type PostSurvey = {
  participant_id: string;
  created_at: string;
  interest_score: number | null;
  eat_intent_score: number | null;
  share_intent_score: number | null;
  renewal_understanding_score: number | null;
  memorable_point: string | null;
};
type ExportMode = "identified" | "survey";
const SPOTS = ["spot1", "spot2", "spot3", "spot4", "spot5"];
const field = (value: unknown) => value === null || value === undefined ? "" : String(value);
const yesNo = (value: boolean | null | undefined) => value == null ? "" : value ? "はい" : "いいえ";
const fmt = (value: string | null | undefined) => {
  if (!value) return "";
  const time = new Date(value);
  return Number.isFinite(time.getTime()) ? time.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "";
};
// Excel/Google Sheetsで入力文を数式とみなされないようにする。
function safeCell(value: unknown): string {
  const raw = field(value);
  const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = "\uFEFF" + rows.map(row => row.map(safeCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
// Supabaseの1,000件/回の上限に対応。制限に達したら途中データを出力しない。
async function readAll<T>(table: "pokipo_official_pre_surveys" | "pokipo_official_post_surveys", columns: string): Promise<T[]> {
  const output: T[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order("created_at", { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    const page = (data ?? []) as unknown as T[];
    output.push(...page);
    if (page.length < 1000) return output;
  }
  throw new Error(`${table}: 100,000件を超えたため出力を中止しました。`);
}
const panel: React.CSSProperties = { border: "1px solid #e8d8d4", borderRadius: 15, padding: 15, marginTop: 12, background: "#fffaf7" };
const optionLabel: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: "1px solid #e9dcd8", borderRadius: 11, marginTop: 9, background: "#fff", cursor: "pointer" };
const primaryButton: React.CSSProperties = { padding: "10px 17px", border: 0, borderRadius: 10, background: "#8a1822", color: "white", fontWeight: 800, cursor: "pointer" };

export default function PokipoParticipantExportPanel() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<ExportMode>("identified");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const currentOwner = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id || !auth.user.email) return null;
    const { data: profile, error } = await supabase.from("staff_profiles")
      .select("admin_id").eq("user_id", auth.user.id).maybeSingle();
    if (error || profile?.admin_id !== "lipost-furuya") return null;
    return { id: auth.user.id, email: auth.user.email };
  }, []);

  useEffect(() => {
    let active = true;
    void currentOwner().then(owner => {
      if (active) { setAllowed(Boolean(owner)); setChecking(false); }
    }).catch(() => {
      if (active) { setAllowed(false); setChecking(false); }
    });
    return () => { active = false; };
  }, [currentOwner]);

  async function exportParticipants() {
    if (busy || !opened || !password) return;
    setBusy(true);
    setMessage("");
    const chosenMode = mode;
    try {
      const before = await currentOwner();
      if (!before) throw new Error("lipost-furuya のログイン権限を確認できませんでした。");
      // CSVを押すたびにパスワードによる再認証。既存ユーザー以外への切替を拒否。
      const confirmation = await supabase.auth.signInWithPassword({ email: before.email, password });
      if (confirmation.error || confirmation.data.user?.id !== before.id) {
        throw new Error("再認証に失敗しました。lipost-furuyaのパスワードを確認してください。");
      }
      const after = await currentOwner();
      if (!after || after.id !== before.id) throw new Error("再認証後の管理者権限が一致しません。");
      setPassword("");

      const { data, error } = await supabase.rpc("pokipo_furuya_participant_list");
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("参加者一覧の取得形式が不正です。");
      const participants = data as Participant[];
      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const baseHeader = ["登録日時(JST)", "取得スポット数", "5か所達成", "参加前アンケート", "参加後アンケート", "特典交換", ...SPOTS.map((_, i) => `スポット${i+1}取得日時(JST)`), "初回取得日時(JST)", "5か所目取得日時(JST)"];
      const baseFields = (p: Participant) => {
        const times = SPOTS.map(id => p.stamps?.filter(s => s.spot_id === id).map(s => s.acquired_at).sort()[0] ?? null);
        const valid = times.filter((v): v is string => Boolean(v)).sort();
        const completed = times.every(Boolean);
        return [fmt(p.created_at), valid.length, completed ? "達成" : "未達成", p.pre_survey_answered ? "回答済み" : "未回答", p.post_survey_answered ? "回答済み" : "未回答", p.reward_exchanged ? "交換済み" : "未交換", ...times.map(fmt), fmt(valid[0]), completed ? fmt(valid[valid.length - 1]) : ""];
      };
      if (chosenMode === "identified") {
        const header = ["参加者ID", "ニックネーム", "学年", "学科", ...baseHeader];
        const rows = participants.map(p => [p.id, p.nickname ?? "", p.grade ?? "", p.department ?? "", ...baseFields(p)]);
        downloadCsv(`POKIPO_参加者一覧_回答非表示_${date}.csv`, [header, ...rows]);
      } else {
        const [pre, post] = await Promise.all([
          readAll<PreSurvey>("pokipo_official_pre_surveys", "participant_id,created_at,gender,pocky_frequency,knew_renewal,has_shared_pocky,share_situation,interest_score,eat_intent_score,share_intent_score,pocky_value_understanding,cocoa_social_understanding"),
          readAll<PostSurvey>("pokipo_official_post_surveys", "participant_id,created_at,interest_score,eat_intent_score,share_intent_score,renewal_understanding_score,memorable_point"),
        ]);
        // 同一参加者の複数回答は初回回答を採用（参加者別に1行）。
        const firstPre = new Map<string, PreSurvey>();
        const firstPost = new Map<string, PostSurvey>();
        for (const row of pre) if (!firstPre.has(row.participant_id)) firstPre.set(row.participant_id, row);
        for (const row of post) if (!firstPost.has(row.participant_id)) firstPost.set(row.participant_id, row);
        const header = ["参加者ID(先頭4文字のみ)", "学年", "学科", "性別(参加前回答)", ...baseHeader,
          "参加前:お菓子を食べる頻度", "参加前:リニューアル認知", "参加前:シェア経験", "参加前:シェアする場面(記述)",
          "参加前:ポッキーへの興味", "参加前:食べたい気持ち", "参加前:シェアしたい気持ち", "参加前:価値理解", "参加前:カカオ社会理解",
          "参加後:ポッキーへの興味", "参加後:食べたい気持ち", "参加後:シェアしたい気持ち", "参加後:リニューアル理解", "参加後:印象に残ったこと(記述)"];
        const rows = participants.map(p => {
          const beforeSurvey = firstPre.get(p.id);
          const afterSurvey = firstPost.get(p.id);
          const maskedId = p.id.slice(0, 4) + "*".repeat(Math.max(0, p.id.length - 4));
          return [maskedId, p.grade ?? "", p.department ?? "", beforeSurvey?.gender ?? "", ...baseFields(p),
            beforeSurvey?.pocky_frequency ?? "", yesNo(beforeSurvey?.knew_renewal), yesNo(beforeSurvey?.has_shared_pocky), beforeSurvey?.share_situation ?? "",
            field(beforeSurvey?.interest_score), field(beforeSurvey?.eat_intent_score), field(beforeSurvey?.share_intent_score), field(beforeSurvey?.pocky_value_understanding), field(beforeSurvey?.cocoa_social_understanding),
            field(afterSurvey?.interest_score), field(afterSurvey?.eat_intent_score), field(afterSurvey?.share_intent_score), field(afterSurvey?.renewal_understanding_score), afterSurvey?.memorable_point ?? ""];
        });
        downloadCsv(`POKIPO_参加者一覧_氏名非表示_回答表示_${date}.csv`, [header, ...rows]);
      }
      setOpened(false);
      setMessage(`${participants.length}人分のCSVを出力しました。発行形式：${chosenMode === "identified" ? "ニックネーム表示・回答非表示" : "ニックネーム非表示・回答表示"}。`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "CSV出力に失敗しました。");
    } finally {
      // パスワードは成功・失敗にかかわらず保持しない。
      setPassword("");
      setBusy(false);
    }
  }

  if (checking || !allowed) return null;
  return <section className="pokipoOpsCard" aria-label="参加者一覧CSVの発行">
    <h2>参加者一覧のExcel・スプレッドシート出力</h2>
    <p>CSV出力時は毎回 lipost-furuya によるパスワード再認証が必要です。出力する個人情報とアンケート回答の範囲を選択できます。</p>
    {!opened ? <div className="pokipoOpsButtons"><button type="button" onClick={() => { setMessage(""); setOpened(true); }} >参加者一覧CSVの発行手続き</button></div> :
      <form style={panel} onSubmit={e => { e.preventDefault(); void exportParticipants(); }}>
        <strong style={{ color: "#8a1822" }}>① 出力形式を選択</strong>
        <label style={optionLabel}>
          <input type="radio" name="pokipo-csv-mode" checked={mode === "identified"} onChange={() => setMode("identified")} />
          <span><b>ニックネームと参加IDを表示 ／ アンケート回答を非表示</b><br/><small>既存の参加者管理・取得日時・達成状況を確認する形式。回答内容や性別は出力しません。</small></span>
        </label>
        <label style={optionLabel}>
          <input type="radio" name="pokipo-csv-mode" checked={mode === "survey"} onChange={() => setMode("survey")} />
          <span><b>ニックネーム非表示 ／ 参加IDは先頭4文字だけ ／ 学年・学科・性別・回答を表示</b><br/><small>アンケート分析向け形式。IDの残りは * で隠します。自由記述には個人情報が含まれる場合があります。</small></span>
        </label>
        <div style={{ marginTop: 15 }}>
          <label htmlFor="pokipo-export-password" style={{ display: "block", fontSize: 13, fontWeight: 800, marginBottom: 7, color: "#8a1822" }}>② lipost-furuya のパスワードで再認証</label>
          <input id="pokipo-export-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="管理者パスワード" style={{ width: "100%", maxWidth: 360, boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid #d8c9c4", background: "#fff", color: "#332d29" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <button type="submit" disabled={busy || !password} style={{ ...primaryButton, opacity: busy || !password ? .6 : 1 }}>{busy ? "再認証・取得中…" : "再認証してCSVを発行"}</button>
          <button type="button" disabled={busy} onClick={() => { setOpened(false); setPassword(""); }} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d8c9c4", background: "#fff", color: "#8a1822", fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
        </div>
        <p style={{ fontSize: 12, color: "#776a65", marginBottom: 0 }}>このCSVはダウンロード後に自動更新されません。ニックネームを非表示にしても再識別の可能性があるため、外部公開は避けてください。</p>
      </form>}
    {message && <p role="status" className="pokipoOpsSmall">{message}</p>}
  </section>;
}
