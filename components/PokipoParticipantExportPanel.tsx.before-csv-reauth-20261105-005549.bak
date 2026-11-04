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
const SPOTS = ["spot1", "spot2", "spot3", "spot4", "spot5"];
const fmt = (date: string | null | undefined) => date
  ? new Date(date).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"})
  : "";
// CSV/Excel の数式インジェクションを防止
function safeCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export default function PokipoParticipantExportPanel() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const checkPermission = useCallback(async () => {
    const {data: user, error: authError} = await supabase.auth.getUser();
    if (authError || !user.user) return false;
    const {data: staff, error: profileError} = await supabase.from("staff_profiles")
      .select("admin_id").eq("user_id", user.user.id).maybeSingle();
    return !profileError && staff?.admin_id === "lipost-furuya";
  }, []);
  useEffect(() => {
    let active = true;
    void checkPermission().then(ok => {if (active) {setAllowed(ok); setChecking(false);}});
    return () => {active = false;};
  }, [checkPermission]);
  async function exportParticipants() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (!await checkPermission()) {
        setAllowed(false);
        setMessage("参加者一覧の出力権限がありません。");
        return;
      }
      // サーバー側でも lipost-furuya 以外を拒否する既存RPCを利用
      const {data, error} = await supabase.rpc("pokipo_furuya_participant_list");
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("参加者データの形式が不正です。");
      const participants = data as Participant[];
      const header = ["参加者ID", "ニックネーム", "学年", "学科", "登録日時(JST)", "スタンプ数", "5か所達成", "参加前アンケート", "参加後アンケート", "特典交換", ...SPOTS.map((_,i) => `スポット${i+1}取得日時(JST)`), "初回取得日時(JST)", "5か所目取得日時(JST)"];
      const lines = [header, ...participants.map(p => {
        const times = SPOTS.map(id => p.stamps?.filter(s => s.spot_id === id).map(s => s.acquired_at).sort()[0] ?? null);
        const completed = times.every(Boolean);
        const valid = times.filter((t): t is string => Boolean(t)).sort();
        return [p.id, p.nickname ?? "", p.grade ?? "", p.department ?? "", fmt(p.created_at), times.filter(Boolean).length, completed ? "達成" : "未達成", p.pre_survey_answered ? "回答済み" : "未回答", p.post_survey_answered ? "回答済み" : "未回答", p.reward_exchanged ? "交換済み" : "未交換", ...times.map(fmt), fmt(valid[0]), completed ? fmt(valid[valid.length-1]) : ""];
      })];
      const csv = "\uFEFF" + lines.map(r => r.map(safeCell).join(",")).join("\r\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const date = new Date().toLocaleDateString("sv-SE", {timeZone:"Asia/Tokyo"});
      anchor.download = `POKIPO_参加者一覧_${date}.csv`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage(`${participants.length}人分の最新情報を出力しました。`);
    } catch (error) {
      console.error("参加者一覧出力エラー:", error);
      setMessage("参加者一覧を取得できませんでした。通信状態・権限・管理者用SQL関数をご確認ください。");
    } finally {setBusy(false);}
  }
  if (checking || !allowed) return null;
  return (
    <section className="pokipoOpsCard" aria-label="参加者一覧のエクスポート">
      <h2>参加者一覧のExcel・スプレッドシート出力</h2>
      <p>登録者・スタンプ5か所の取得日時・アンケート回答・特典交換状況を、ExcelとGoogleスプレッドシートで開けるCSV形式で保存します。</p>
      <p className="pokipoOpsSmall">出力するたびにSupabaseから最新の記録を取得します。ダウンロード後のファイルは自動更新されません。</p>
      <p className="pokipoOpsSmall">参加者ID・ニックネーム等が含まれます。共有範囲を限定し、公開リンクにはしないでください。学籍番号は含みません。</p>
      <div className="pokipoOpsButtons"><button type="button" disabled={busy} onClick={() => void exportParticipants()}>{busy ? "取得中..." : "参加者一覧CSVをダウンロード"}</button></div>
      {message && <p role="status" className="pokipoOpsSmall">{message}</p>}
    </section>
  );
}