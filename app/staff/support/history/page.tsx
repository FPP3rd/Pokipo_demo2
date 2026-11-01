"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";

type Log = {
  log_id: string;
  change_type: string;
  participant_id: string;
  participant_nickname: string;
  staff_name: string;
  spot_id: string | null;
  reason: string | null;
  before_count: number | null;
  after_count: number | null;
  changed_at: string;
};
type Filter = "all" | "stamp_add" | "stamp_remove" | "reward_rollback";
const RED = "#8a1822";
const card: React.CSSProperties = { background: "#fff", border: "1px solid #eadfda", borderRadius: 18, padding: 18, boxShadow: "0 7px 24px rgba(55,35,25,.045)" };
const button: React.CSSProperties = { padding: "10px 14px", border: "1px solid #d9c6c4", borderRadius: 12, background: "white", color: RED, fontWeight: 800, cursor: "pointer" };
const spots: Record<string, string> = { spot1: "学生センター", spot2: "東棟2階", spot3: "ゆうちょ銀行ATM付近", spot4: "ラーニングスクエア", spot5: "セブンイレブン付近" };
const types: Record<string, string> = { stamp_add: "スタンプ追加", stamp_remove: "スタンプ削除", reward_rollback: "特典交換取消" };
const date = (value: string) => new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function SupportHistoryPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<"loading" | "ok" | "denied">("loading");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const u = await supabase.auth.getUser();
      if (!alive) return;
      if (u.error || !u.data.user) { setAuth("denied"); return; }
      const p = await supabase.from("staff_profiles").select("admin_id").eq("user_id", u.data.user.id).maybeSingle();
      if (alive) setAuth(!p.error && p.data?.admin_id === "lipost-furuya" ? "ok" : "denied");
    })();
    return () => { alive = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (auth !== "ok") return;
    setLoading(true); setError("");
    const { data, error: fetchError } = await supabase.rpc("pokipo_furuya_support_history", { p_limit: 500 });
    if (fetchError) { setError("変更履歴の取得に失敗しました。SQL関数と管理権限をご確認ください。"); }
    else { setLogs((Array.isArray(data) ? data : []) as Log[]); setUpdated(date(new Date().toISOString())); }
    setLoading(false);
  }, [auth]);

  useEffect(() => {
    if (auth !== "ok") return;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [auth, refresh]);

  const visible = useMemo(() => logs.filter((x) => {
    const matchesType = filter === "all" || x.change_type === filter;
    const needle = query.trim().toLowerCase();
    const matchesText = !needle || [x.participant_nickname, x.participant_id, x.staff_name, x.reason, x.spot_id].some((value) => (value ?? "").toLowerCase().includes(needle));
    return matchesType && matchesText;
  }), [logs, filter, query]);
  const stats = useMemo(() => ({ all: logs.length, add: logs.filter(x => x.change_type === "stamp_add").length, remove: logs.filter(x => x.change_type === "stamp_remove").length, rollback: logs.filter(x => x.change_type === "reward_rollback").length }), [logs]);
  if (auth === "loading") return <main className="shell" style={{ padding: 24 }}>管理者権限を確認中...</main>;
  if (auth === "denied") return <main className="shell" style={{ padding: 24 }}><p>この画面は lipost-furuya 専用です。</p><button type="button" style={button} onClick={() => router.push("/staff")}>管理メニューに戻る</button></main>;

  return (
    <main className="shell" style={{ minHeight: "100vh", padding: "22px 12px 55px" }}>
      <div style={{ maxWidth: 1120, margin: "auto", display: "grid", gap: 16 }}>
        <header style={{ ...card, background: "linear-gradient(120deg,#fff8f2,#fff,#fff1ee)", padding: "25px 22px" }}>
          <small style={{ color: RED, fontWeight: 900, letterSpacing: ".13em" }}>POKIPO STAFF / SUPPORT HISTORY</small>
          <h1 style={{ fontSize: "clamp(24px,4vw,32px)", color: "#342c2a", margin: "8px 0" }}>参加者サポート・変更履歴</h1>
          <p style={{ fontSize: 13, color: "#756963" }}>スタンプ修正と特典交換取消の操作記録を日時順に表示します。</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={button} onClick={() => router.push("/staff")}>← スタッフメニュー</button>
            <button type="button" style={button} disabled={loading} onClick={() => void refresh()}>{loading ? "更新中..." : "↻ 最新情報に更新"}</button>
          </div>
          <p style={{ color: "#7f7570", fontSize: 11, marginBottom: 0 }}>最終取得：{updated || "未取得"} ／ 表示中は30秒ごとに更新</p>
        </header>
        {error && <p role="alert" style={{ ...card, color: RED, background: "#fff1ef" }}>{error}</p>}
        <section aria-label="操作件数" className="supportHistoryStats">
          {[
            ["TOTAL", "履歴総数", stats.all], ["STAMP ADD", "スタンプ追加", stats.add],
            ["STAMP REMOVE", "スタンプ削除", stats.remove], ["REWARD", "特典交換取消", stats.rollback]
          ].map(([name, label, value]) => <article key={String(name)} style={{ ...card, background: "#fffaf7", minWidth: 0 }}>
            <small style={{ color: RED, fontWeight: 900 }}>{name}</small>
            <strong style={{ display: "block", color: RED, fontSize: 31, lineHeight: 1.4 }}>{loading && !updated ? "—" : value}</strong>
            <span style={{ color: "#776b65", fontSize: 12 }}>{label}</span>
          </article>)}
        </section>
        <section style={card}>
          <h2 style={{ fontSize: 18, marginTop: 0, borderLeft: `4px solid ${RED}`, paddingLeft: 12 }}>履歴の絞り込み</h2>
          <div className="supportHistoryFilters">
            <input aria-label="履歴検索" value={query} onChange={e => setQuery(e.target.value)} placeholder="参加者名・ID・担当者・理由で検索" style={{ ...button, color: "#342c2a", fontWeight: 500, flex: "2 1 260px", minWidth: 0 }} />
            <select aria-label="操作種別" value={filter} onChange={e => setFilter(e.target.value as Filter)} style={{ ...button, minWidth: 0, flex: "1 1 180px" }}>
              <option value="all">すべての操作</option><option value="stamp_add">スタンプ追加</option><option value="stamp_remove">スタンプ削除</option><option value="reward_rollback">特典交換取消</option>
            </select>
            <button type="button" style={button} onClick={() => { setFilter("all"); setQuery(""); }}>解除</button>
          </div>
          <p style={{ fontSize: 12, color: "#7b706b" }}>表示：{visible.length}件／取得：{logs.length}件（最新500件まで）</p>
        </section>
        <section style={card}>
          <h2 style={{ fontSize: 18, marginTop: 0, borderLeft: `4px solid ${RED}`, paddingLeft: 12 }}>変更履歴一覧</h2>
          {loading && !updated ? <p>取得中...</p> : visible.length === 0 ? <p style={{ color: "#786c64" }}>条件に一致する履歴はありません。</p> :
            <div style={{ display: "grid", gap: 10 }}>
              {visible.map(item => <article key={`${item.change_type}-${item.log_id}`} style={{ background: "#fffaf8", border: "1px solid #ebe0dc", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ color: RED }}>{types[item.change_type] || item.change_type}</strong>
                  <time style={{ fontSize: 12, color: "#766b66" }}>{date(item.changed_at)}</time>
                </div>
                <p style={{ margin: "7px 0", fontWeight: 800, color: "#342c2a", overflowWrap: "anywhere" }}>{item.participant_nickname} <small style={{ color: "#80736d", fontWeight: 500 }}>（{item.participant_id}）</small></p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 12, color: "#746863" }}>
                  <span>担当：{item.staff_name}</span>
                  {item.spot_id && <span>場所：{spots[item.spot_id] || item.spot_id}</span>}
                  {item.before_count !== null &&
                    item.after_count !== null ? (
                    <span>
                    取得数：{item.before_count} → {item.after_count}
                    </span>
                    ) : null}
                </div>
                <p style={{ fontSize: 13, marginBottom: 0, overflowWrap: "anywhere" }}>理由：{item.reason || "記載なし"}</p>
              </article>)}
            </div>}
          <p style={{ fontSize: 11, color: "#85766f", marginTop: 16 }}>本画面は参照専用です。変更操作や履歴削除はできません。特典交換の通常受付履歴は「景品交換履歴」で確認してください。</p>
        </section>
      </div>
      <style jsx global>{`
        .supportHistoryStats { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px; }
        .supportHistoryFilters { display:flex;align-items:stretch;flex-wrap:wrap;gap:10px; }
        .supportHistoryFilters input:focus-visible,.supportHistoryFilters select:focus-visible { outline:2px solid #b54758;outline-offset:2px; }
        @media(max-width:780px) { .supportHistoryStats {grid-template-columns:repeat(2,minmax(0,1fr));gap:9px} }
      `}</style>
    </main>
  );
}