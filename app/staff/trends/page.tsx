"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Keys = "participants" | "completions" | "surveys" | "exchanges";
type Counts = Record<Keys, number>;
type RecordRow = Counts & { day: string };
type Comparison = Record<Keys, { current: number; previous: number; yesterday: number }>;
type Result = { days: number; records: RecordRow[]; comparison: Comparison; generatedAt: string; note: string; error?: string };
const SERIES: { key: Keys; name: string; color: string }[] = [
  { key: "participants", name: "参加登録", color: "#8a1822" },
  { key: "completions", name: "5か所達成", color: "#c58b44" },
  { key: "surveys", name: "参加後アンケート", color: "#6d8795" },
  { key: "exchanges", name: "特典交換", color: "#46805c" }
];
function jst(d: string) {
  return new Date(d).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
}
const TEST: Result = {
  days: 7,
  generatedAt: new Date().toISOString(),
  note: "模擬データです。参加者情報・データベースは変更しません。",
  records: [
    [18,6,2,0],[27,13,8,0],[37,25,17,0],[31,28,24,0],
    [45,33,28,0],[35,26,24,0],[52,43,40,29]
  ].map((r,i) => {
    const d = new Date(Date.now() - (6-i)*86400000);
    return { day: d.toLocaleDateString("en-CA", {timeZone:"Asia/Tokyo"}), participants:r[0],completions:r[1],surveys:r[2],exchanges:r[3] };
  }),
  comparison: {
    participants:{current:9,previous:13,yesterday:6},
    completions:{current:5,previous:8,yesterday:4},
    surveys:{current:4,previous:7,yesterday:2},
    exchanges:{current:3,previous:6,yesterday:0}
  }
};
export default function StaffTrendsPage() {
  const router = useRouter();
  const [mode,setMode] = useState<"demo"|"live">("demo");
  const [days,setDays] = useState(14);
  const [result,setResult] = useState<Result | null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [authorized,setAuthorized] = useState(false);

  useEffect(() => {
    let active=true;
    async function check() {
      const {data:user,error:e}=await supabase.auth.getUser();
      if (!active) return;
      if (e || !user.user) { setLoading(false); return; }
      const {data:staff}=await supabase.from("staff_profiles").select("user_id").eq("user_id",user.user.id).maybeSingle();
      if (!active) return;
      setAuthorized(Boolean(staff));setLoading(false);
    }
    void check();
    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    if (!authorized || mode!=="live") return;
    let cancelled=false;
    async function refresh() {
      setError("");
      try {
        const {data}=await supabase.auth.getSession();
        const jwt=data.session?.access_token;
        if (!jwt) throw new Error("再ログインしてください");
        const response=await fetch(`/api/staff/trends?days=${days}`, {
          headers:{Authorization:`Bearer ${jwt}`}, cache:"no-store"
        });
        const json=await response.json() as Result;
        if (!response.ok) throw new Error(json.error || "集計できませんでした");
        if (!cancelled) setResult(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error?e.message:"集計エラー");
      }
    }
    void refresh();
    const timer=window.setInterval(()=>void refresh(),60000);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[authorized,mode,days]);

  const data=mode==="demo"?TEST:result;
  const maxValue=useMemo(()=>Math.max(1,...(data?.records||[]).flatMap(row=>SERIES.map(s=>row[s.key]))),[data]);
  const totals=useMemo(()=>Object.fromEntries(SERIES.map(s=>[s.key,(data?.records||[]).reduce((n,row)=>n+row[s.key],0)])),[data]) as Counts;

  if (loading) return <main className="shell" style={{padding:24}}>認証確認中...</main>;
  if (!authorized) return <main className="shell" style={{padding:24}}>
    スタッフとしてログインしてください。<button onClick={()=>router.push("/staff/reward")}>ログインへ</button>
  </main>;
  return (
    <main className="shell pokipoTrendsPage">
      <section className="pokipoTrendsContainer">
        <button className="pokipoTrendsBack" onClick={()=>router.push("/staff")}>
          ← スタッフメニュー
        </button>
        <header className="pokipoTrendsHeader"><span className="pokipoTrendsEyebrow">POKIPO STAFF / ANALYTICS</span><h1>参加動向分析</h1></header>
        <p className="pokipoTrendsLead">参加登録・達成・アンケート・特典交換の動きをまとめて確認できます。</p>
        <div className="pokipoTrendsToolbar">
          <button className="pokipoTrendsToggle" aria-pressed={mode==="demo"} onClick={()=>setMode("demo")}>模擬データ</button>
          <button className="pokipoTrendsToggle" aria-pressed={mode==="live"} onClick={()=>setMode("live")}>本番集計</button>
          {mode==="live"&& <select value={days} onChange={e=>{setResult(null);setDays(Number(e.target.value));}}
            className="pokipoTrendsSelect"><option value={7}>直近7日</option><option value={14}>直近14日</option><option value={31}>直近31日</option></select>}
        </div>
        {mode==="demo" && <p className="pokipoTrendsDemoLabel">DEMO MODE｜以下の数値はダミーデータです</p>}
        {error && <p role="alert" style={{color:"#b52f3f"}}>{error}</p>}
        {!data ? <p>本番データを読み込み中...</p> : <>
          <div className="pokipoTrendsStats">
            {SERIES.map(s=><div key={s.key} className="pokipoTrendsStatCard">
              <span className="pokipoTrendsStatLabel">{s.name}（期間合計）</span>
              <div className="pokipoTrendsStatNumber">{totals[s.key].toLocaleString()}<span> 件</span></div>
            </div>)}
          </div>
          <section className="pokipoTrendsPanel">
            <h2 className="pokipoTrendsPanelTitle">前時間帯・前日同時間帯との比較</h2>
            <p style={{color:"#7c6c70",fontSize:12}}>現在時刻の1時間枠は集計途中のため、前時間帯とは厳密に同じ経過時間ではありません。</p>
            <div className="pokipoTrendsTableScroll">
              <table className="pokipoTrendsTable">
                <thead><tr>{["項目","現在の時間帯","前の時間帯","前日同時間帯","前時間帯との差"].map(t=><th key={t} style={th()}>{t}</th>)}</tr></thead>
                <tbody>{SERIES.map(s=>{
                  const v=data.comparison[s.key];
                  return <tr key={s.key}><td style={td()}>{s.name}</td><td style={td()}>{v.current}</td>
                    <td style={td()}>{v.previous}</td><td style={td()}>{v.yesterday}</td>
                    <td style={td()}>{v.current-v.previous>=0?"+":""}{v.current-v.previous}</td></tr>;
                })}</tbody>
              </table>
            </div>
          </section>
          <section className="pokipoTrendsPanel">
            <h2 className="pokipoTrendsPanelTitle">日別イベント時系列ビュー</h2>
            <div className="pokipoTrendsLegend">
              {SERIES.map(s=><span key={s.key}><span style={{color:s.color}}>●</span> {s.name}</span>)}
            </div>
            <div className="pokipoTrendsDailyRows">
              {data.records.map(row=><div key={row.day} style={{display:"grid",gridTemplateColumns:"75px 1fr",gap:10,alignItems:"center"}}>
                <span className="pokipoTrendsDayLabel">{row.day.slice(5)}</span>
                <div className="pokipoTrendsBarGroup">
                  {SERIES.map(s=><div key={s.key} className="pokipoTrendsBarRow">
                    <div title={`${s.name}: ${row[s.key]}件`} style={{height:8,minWidth:row[s.key]>0?2:0,width:`${row[s.key]/maxValue*90}%`,borderRadius:8,background:s.color}}/>
                    <span className="pokipoTrendsBarNumber">{row[s.key]}</span>
                  </div>)}
                </div>
              </div>)}
            </div>
            <p style={{fontSize:12,color:"#75676c",marginBottom:0}}>各日の新規発生件数です。累積人数ではありません。</p>
          </section>
          <p className="pokipoTrendsUpdated">最終更新：{jst(data.generatedAt)}　｜ 読み取り専用</p>
        </>}
      </section>
    </main>
  );
}
function th():React.CSSProperties {return {padding:12,textAlign:"left",whiteSpace:"nowrap"};}
function td():React.CSSProperties {return {padding:12,textAlign:"left"};}