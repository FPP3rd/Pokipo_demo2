"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Period = "all" | "first" | "second";
type Tab = "overview" | "eligible" | "operations" | "report";
type Counts = {registered:number;completed:number;post_answered:number;qr_issued:number;exchanged:number};
type Exchange = {id:string;participant_id:string;status:string;created_at:string;exchanged_at:string|null};
type Monitor = {state:string;updated_at:string;guide_direction:string|null};
const PERIODS:Record<Period,{name:string;start:string;end:string;caption:string}> = {
  all:{name:"全体",start:"2026-10-13T00:00:00+09:00",end:"2026-11-05T00:00:00+09:00",caption:"10/13〜11/4"},
  first:{name:"10/13〜10/27",start:"2026-10-13T00:00:00+09:00",end:"2026-10-28T00:00:00+09:00",caption:"第1期間（10/27交換会）"},
  second:{name:"10/28〜11/4",start:"2026-10-28T00:00:00+09:00",end:"2026-11-05T00:00:00+09:00",caption:"第2期間（11/4追加交換会）"}
};
const EVENT_WINDOWS = [
  {title:"10/27（火）終了",start:Date.parse("2026-10-27T12:35:00+09:00"),end:Date.parse("2026-10-27T16:00:00+09:00")},
  {title:"11/4（水）追加開催",start:Date.parse("2026-11-04T12:35:00+09:00"),end:Date.parse("2026-11-04T16:00:00+09:00")}
];
const wrap:React.CSSProperties={border:"1px solid #e9d9d9",borderRadius:16,padding:16,background:"#fff"};
const btn:React.CSSProperties={border:"1px solid #d8bec4",borderRadius:10,padding:"10px 12px",background:"white",color:"#8a1822",fontWeight:750,cursor:"pointer"};
const fmt=(x:string|null)=>x?new Date(x).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
const inRange=(x:string|null,p:Period)=>x!==null&&Date.parse(x)>=Date.parse(PERIODS[p].start)&&Date.parse(x)<Date.parse(PERIODS[p].end);
function download(filename:string,rows:(string|number)[][]){const value="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([value],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500)}

export default function RewardEventManagementPage(){
 const router=useRouter();
 const [auth,setAuth]=useState<"loading"|"ok"|"denied">("loading");
 const [period,setPeriod]=useState<Period>("all");
 const [tab,setTab]=useState<Tab>("overview");
 const [counts,setCounts]=useState<Counts|null>(null);
 const [exchanges,setExchanges]=useState<Exchange[]|null>(null);
 const [monitor,setMonitor]=useState<Monitor|null>(null);
 const [error,setError]=useState("");
 const [updated,setUpdated]=useState("");
 const [loading,setLoading]=useState(false);
 const [now,setNow]=useState(0);
 useEffect(()=>{setNow(Date.now());const t=window.setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(t)},[]);
 useEffect(()=>{let active=true;(async()=>{const u=await supabase.auth.getUser();if(!active)return;if(u.error||!u.data.user){setAuth("denied");return;}const s=await supabase.from("staff_profiles").select("user_id").eq("user_id",u.data.user.id).maybeSingle();if(active)setAuth(s.error||!s.data?"denied":"ok")})();return()=>{active=false}},[]);
 const refresh=useCallback(async()=>{
  if(auth!=="ok")return;
  setLoading(true);setError("");
  const p=PERIODS[period];
  try{
   const [stats,exchangeRows,monitorRow]=await Promise.all([
    supabase.rpc("pokipo_reward_event_period_stats",{p_start:p.start,p_end:p.end}),
    supabase.from("pokipo_official_reward_exchanges").select("id,participant_id,status,created_at,exchanged_at").order("created_at",{ascending:false}).limit(5000),
    supabase.from("reward_monitor_state").select("state,updated_at,guide_direction").eq("station_id","main").maybeSingle()
   ]);
   setCounts(stats.error?null:stats.data as Counts);
   setExchanges(exchangeRows.error?null:(exchangeRows.data||[]) as Exchange[]);
   setMonitor(monitorRow.error?null:monitorRow.data as Monitor|null);
   const failed=[stats.error&&"期間別人数（SQL関数）",exchangeRows.error&&"交換履歴",monitorRow.error&&"モニター状態"].filter(Boolean);
   if(failed.length)setError(`取得に失敗: ${failed.join("・")}。SQL関数・権限・通信状態を確認してください。`);
   setUpdated(new Date().toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}));
  }catch{setError("データ取得時に通信エラーが発生しました。")}finally{setLoading(false)}
 },[auth,period]);
 useEffect(()=>{if(auth!=="ok")return;void refresh();const t=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},30000);return()=>clearInterval(t)},[auth,refresh]);
 const scoped=useMemo(()=>exchanges?.filter(e=>e.status==="exchanged"&&inRange(e.exchanged_at,period))??[],[exchanges,period]);
 const issuedNow=useMemo(()=>exchanges?.filter(e=>e.status==="issued")??[],[exchanges]);
 const waiting=useMemo(()=>new Set(issuedNow.map(e=>e.participant_id)).size,[issuedNow]);
 const allExchanged=exchanges?.filter(e=>e.status==="exchanged").length??0;
 const recent=scoped.filter(e=>e.exchanged_at&&now-Date.parse(e.exchanged_at)<=1800000&&now>=Date.parse(e.exchanged_at)).length;
 const active=EVENT_WINDOWS.find(e=>now>=e.start&&now<e.end);
 const upcoming=EVENT_WINDOWS.find(e=>now<e.start);
 const eventMessage=active?`${active.title} 開催中／終了まであと${Math.ceil((active.end-now)/60000)}分`:upcoming?`${upcoming.title} 開催前`:"10/27・11/4の特典交換会は終了しました";
 const entries:[string,string][]=[
  ["新規登録者",counts?`${counts.registered}人`:"取得不可"],["期間内の5か所達成",counts?`${counts.completed}人`:"取得不可"],
  ["参加後アンケート回答",counts?`${counts.post_answered}人`:"取得不可"],["QR発行者（発行日時基準）",counts?`${counts.qr_issued}人`:"取得不可"],
  ["交換済み（交換日時基準）",counts?`${counts.exchanged}人`:"取得不可"],["現時点のQR発行済み・未交換",exchanges?`${waiting}人（全期間共通）`:"取得不可"],
  ["360枠の残り目安",exchanges?`${Math.max(0,360-allExchanged)}枠（全期間共通）`:"取得不可"]
 ];
 const graph=EVENT_WINDOWS.filter((_,i)=>period==="all"||period==="first"&&i===0||period==="second"&&i===1).map(e=>({title:e.title,buckets:Array.from({length:7},(_,i)=>{const a=e.start+i*30*60000;const z=Math.min(e.end,a+30*60000);return {label:new Date(a).toLocaleTimeString("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit"}),value:scoped.filter(x=>x.exchanged_at&&Date.parse(x.exchanged_at)>=a&&Date.parse(x.exchanged_at)<z).length}})}));
 if(auth==="loading")return <main style={{padding:24}}>管理者認証を確認中...</main>;
 if(auth==="denied")return <main style={{padding:24}}>スタッフのログインが必要です。<button style={btn} onClick={()=>router.push("/staff/reward")}>ログインへ</button></main>;
 return <main className="shell" style={{minHeight:"100vh",padding:"22px 12px"}}><div style={{maxWidth:1100,margin:"auto",display:"grid",gap:12,color:"#3e292e"}}>
 <header style={{...wrap,background:"linear-gradient(120deg,#fff3f1,#fff)"}}><small style={{fontWeight:900,color:"#8a1822"}}>POKIPO / REWARD EVENT CONTROL</small><h1 style={{fontSize:26,margin:"8px 0"}}>特典交換会管理</h1><p>10/27（火）終了 ・ <strong>11/4（水）12:35〜16:00 追加開催</strong> ／ 雄飛ホール</p><strong style={{color:"#8a1822"}}>{eventMessage}</strong><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button style={btn} onClick={()=>router.push("/staff")}>← 管理メニュー</button><button style={btn} disabled={loading} onClick={()=>void refresh()}>{loading?"更新中":"↻ 更新"}</button></div><p style={{fontSize:11,color:"#806b6e"}}>取得日時：{updated||"未取得"} ／ 30秒ごとに再取得</p></header>
 <section style={wrap}><strong>集計期間の切り替え</strong><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>{(Object.keys(PERIODS) as Period[]).map(k=><button key={k} onClick={()=>setPeriod(k)} aria-pressed={period===k} style={{...btn,background:period===k?"#8a1822":"#fff",color:period===k?"white":"#8a1822"}}>{PERIODS[k].name}</button>)}</div><p style={{fontSize:12,color:"#78666b",marginBottom:0}}>現在：{PERIODS[period].caption} ／ 各記録の発生日時で集計。期間外の記録は削除・移動しません。</p></section>
 {error&&<div role="alert" style={{...wrap,background:"#fff1ee",color:"#9a1a2b"}}>{error}</div>}
 <nav aria-label="表示内容" style={{display:"flex",gap:8,flexWrap:"wrap"}}>{([{id:"overview",label:"全体状況"},{id:"eligible",label:"交換対象者"},{id:"operations",label:"運営・モニター"},{id:"report",label:"集計・CSV"}] as const).map(x=><button key={x.id} onClick={()=>setTab(x.id)} style={{...btn,background:tab===x.id?"#8a1822":"#fff",color:tab===x.id?"#fff":"#8a1822"}}>{x.label}</button>)}</nav>
 {(tab==="overview"||tab==="eligible")&&<section style={wrap}><h2 style={{fontSize:18,marginTop:0}}>{tab==="overview"?"期間別の全体状況":"交換対象者の段階別状況"}</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>{entries.map(([k,v])=><div key={k} style={{padding:14,border:"1px solid #ecdcdc",borderRadius:12,background:"#fff9f7"}}><div style={{fontSize:12,color:"#765c62"}}>{k}</div><strong style={{fontSize:21,color:"#8a1822"}}>{v}</strong></div>)}</div><p style={{fontSize:12,lineHeight:1.7}}>「登録」「完走」「アンケート」「QR発行」「交換」はそれぞれの発生日時による期間別集計です。同じ参加者が異なる期間に進むことがあるため、数値を単純に差し引いて離脱人数とは扱いません。</p>{tab==="eligible"&&<button style={btn} onClick={()=>router.push("/staff/participants")}>参加者一覧・回答状況へ</button>}</section>}
 {tab==="overview"&&<section style={wrap}><h2 style={{fontSize:18}}>交換推移（各開催日）</h2><p>直近30分の交換：{exchanges?`${recent}件`:"取得不可"} ／ 計測対象は選択期間内の実績です。</p>{graph.map(g=><div key={g.title}><h3 style={{fontSize:15}}>{g.title}</h3>{g.buckets.map(b=><div key={b.label} style={{display:"flex",gap:9,alignItems:"center",margin:"8px 0",fontSize:12}}><span style={{width:50}}>{b.label}</span><div style={{flex:1,background:"#f3e8e7",borderRadius:5,height:13}}><div style={{background:"#a02a3d",width:`${b.value===0?0:Math.max(3,100*b.value/Math.max(1,...g.buckets.map(x=>x.value)))}%`,height:"100%",borderRadius:5}}/></div><strong style={{width:42,textAlign:"right"}}>{b.value}件</strong></div>)}</div>)}</section>}
 {tab==="operations"&&<><section style={wrap}><h2 style={{fontSize:18}}>モニター表示状態</h2><p>状態：<strong>{monitor?({idle:"待機中",presented:"参加者表示中",completed:"交換完了表示中"} as Record<string,string>)[monitor.state]||monitor.state:"取得不可"}</strong></p><p>最終更新：{monitor?fmt(monitor.updated_at):"取得不可"}</p><p>案内方向：{monitor?.guide_direction==="left"?"左":monitor?.guide_direction==="right"?"右":"未設定"}</p><small>DB上の表示状態です。モニター端末のオンライン状態を確認するものではありません。</small></section><section style={wrap}><h2 style={{fontSize:18}}>交換トラブル対応</h2><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[{label:"交換受付",url:"/staff/reward"},{label:"交換履歴",url:"/staff/reward/history"},{label:"問い合わせ対応",url:"/staff/support/by-inquiry"},{label:"運営・稼働確認",url:"/staff/operations"}].map(x=><button key={x.url} style={btn} onClick={()=>router.push(x.url)}>{x.label}</button>)}</div></section></>}
 {tab==="report"&&<section style={wrap}><h2 style={{fontSize:18}}>最終集計・データ出力</h2><p>対象期間：{PERIODS[period].caption} ／ {period==="all"?"両開催日を含む":"選択した期間"}</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>{entries.slice(0,5).map(([k,v])=><div key={k} style={{...wrap,background:"#fffaf8"}}><small>{k}</small><h3 style={{color:"#8a1822"}}>{v}</h3></div>)}</div><button style={{...btn,marginTop:12}} disabled={!counts} onClick={()=>download(`pokipo-reward-${period}-2026.csv`,[["期間",PERIODS[period].caption],["取得日時",updated],["項目","人数"],...entries])}>この期間の集計CSVを保存</button><p style={{fontSize:12,color:"#806b6e"}}>10/27の記録は保持したまま、11/4の追加交換会を別期間として扱います。CSVは取得時点の数値で、集計の確定や受付停止は行いません。</p></section>}
 </div></main>;
}