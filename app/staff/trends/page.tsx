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
  { key: "participants", name: "参加登録", color: "#b63748" },
  { key: "completions", name: "5か所達成", color: "#c98730" },
  { key: "surveys", name: "参加後アンケート", color: "#4479a3" },
  { key: "exchanges", name: "特典交換", color: "#44845b" }
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
    <main className="shell" style={{padding:"clamp(12px,3vw,28px)"}}>
      <section style={{maxWidth:1080,margin:"0 auto",color:"#3d3034"}}>
        <button onClick={()=>router.push("/staff")} style={{border:0,background:"transparent",padding:8,color:"#ab3543",fontWeight:800}}>
          ← スタッフメニュー
        </button>
        <h1 style={{fontSize:27,margin:"10px 0"}}>POKIPO 参加動向分析</h1>
        <p style={{color:"#77686e",fontSize:13}}>時間帯比較（12）と時系列ビュー（14）を一画面にまとめました。</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>
          <button aria-pressed={mode==="demo"} onClick={()=>setMode("demo")} style={btn(mode==="demo")}>模擬データ</button>
          <button aria-pressed={mode==="live"} onClick={()=>setMode("live")} style={btn(mode==="live")}>本番集計</button>
          {mode==="live"&& <select value={days} onChange={e=>{setResult(null);setDays(Number(e.target.value));}}
            style={{borderRadius:10,padding:9}}><option value={7}>直近7日</option><option value={14}>直近14日</option><option value={31}>直近31日</option></select>}
        </div>
        {mode==="demo" && <p style={{color:"#a52b39",fontWeight:800}}>模擬画面｜以下の数字はダミーデータです</p>}
        {error && <p role="alert" style={{color:"#b52f3f"}}>{error}</p>}
        {!data ? <p>本番データを読み込み中...</p> : <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,margin:"18px 0"}}>
            {SERIES.map(s=><div key={s.key} style={card()}>
              <span style={{color:"#716269",fontSize:12}}>{s.name}（期間合計）</span>
              <div style={{fontWeight:900,fontSize:29,color:s.color,marginTop:8}}>{totals[s.key].toLocaleString()}<span style={{fontSize:13}}> 件</span></div>
            </div>)}
          </div>
          <section style={card()}>
            <h2 style={{fontSize:19,marginTop:0}}>前時間帯・前日同時間帯との比較</h2>
            <p style={{color:"#7c6c70",fontSize:12}}>現在時刻の1時間枠は集計途中のため、前時間帯とは厳密に同じ経過時間ではありません。</p>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:540}}>
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
          <section style={{...card(),marginTop:16}}>
            <h2 style={{fontSize:19,marginTop:0}}>日別イベント時系列ビュー</h2>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,marginBottom:13}}>
              {SERIES.map(s=><span key={s.key}><span style={{color:s.color}}>●</span> {s.name}</span>)}
            </div>
            <div style={{display:"grid",gap:13}}>
              {data.records.map(row=><div key={row.day} style={{display:"grid",gridTemplateColumns:"75px 1fr",gap:10,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#71656b"}}>{row.day.slice(5)}</span>
                <div style={{display:"grid",gap:3}}>
                  {SERIES.map(s=><div key={s.key} style={{display:"flex",alignItems:"center",gap:7}}>
                    <div title={`${s.name}: ${row[s.key]}件`} style={{height:8,minWidth:row[s.key]>0?2:0,width:`${row[s.key]/maxValue*90}%`,borderRadius:8,background:s.color}}/>
                    <span style={{fontSize:10,color:"#7f7478"}}>{row[s.key]}</span>
                  </div>)}
                </div>
              </div>)}
            </div>
            <p style={{fontSize:12,color:"#75676c",marginBottom:0}}>各日の新規発生件数です。累積人数ではありません。</p>
          </section>
          <p style={{fontSize:12,color:"#77686a",marginTop:16}}>最終更新：{jst(data.generatedAt)}　｜ 読み取り専用</p>
        </>}
      </section>
    </main>
  );
}
function btn(active:boolean):React.CSSProperties {
  return {padding:"10px 16px",border:"1px solid #dcb7bb",borderRadius:10,
    background:active?"#a93243":"#fff",color:active?"#fff":"#7c3440",fontWeight:800,cursor:"pointer"};
}
function card():React.CSSProperties {
  return {padding:"clamp(14px,3vw,22px)",background:"#fff",border:"1px solid #e9dce0",
    borderRadius:17,boxShadow:"0 3px 12px rgba(69,30,41,.05)"};
}
function th():React.CSSProperties {return {padding:10,borderBottom:"2px solid #eee0e3",textAlign:"left",whiteSpace:"nowrap"};}
function td():React.CSSProperties {return {padding:10,borderBottom:"1px solid #eee5e6",textAlign:"left"};}