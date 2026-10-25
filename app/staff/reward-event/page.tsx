"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Tab = "overview" | "eligible" | "operations" | "report";
type Exchange = { id: string; participant_id: string; status: string; created_at: string; exchanged_at: string | null };
type Monitor = { station_id: string; state: string; updated_at: string; guide_direction: string | null };
const LIMIT = 360;
const START = Date.parse("2026-10-27T12:35:00+09:00");
const END = Date.parse("2026-10-27T16:00:00+09:00");
const jst = (value: string | null) => value ? new Date(value).toLocaleString("ja-JP", {timeZone:"Asia/Tokyo", month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";
const label = (value: number | null) => value === null ? "取得不可" : `${value.toLocaleString()}人`;
const panel: React.CSSProperties = { background:"#fff", border:"1px solid #eadbdb", borderRadius:16, padding:18 };
const nav: React.CSSProperties = { border:"1px solid #d7c4c4", borderRadius:10, padding:"10px 14px", background:"white", color:"#881a29", fontWeight:700, cursor:"pointer" };

export default function RewardEventManagementPage() {
 const router=useRouter();
 const [auth,setAuth]=useState<"loading"|"ok"|"denied">("loading");
 const [tab,setTab]=useState<Tab>("overview");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [refreshed,setRefreshed]=useState("");
 const [clock,setClock]=useState(Date.now());
 const [registered,setRegistered]=useState<number|null>(null);
 const [completed,setCompleted]=useState<number|null>(null);
 const [postAnswered,setPostAnswered]=useState<number|null>(null);
 const [exchanges,setExchanges]=useState<Exchange[]|null>(null);
 const [monitor,setMonitor]=useState<Monitor|null>(null);
 const [monitorError,setMonitorError]=useState(false);
 useEffect(()=>{let alive=true; (async()=>{const {data,error}=await supabase.auth.getUser();if(error||!data.user){if(alive)setAuth("denied");return;}const p=await supabase.from("staff_profiles").select("user_id").eq("user_id",data.user.id).maybeSingle();if(alive)setAuth(p.error||!p.data?"denied":"ok");})();return()=>{alive=false};},[]);
 const refresh=useCallback(async()=>{
  if(auth!=="ok")return;
  setBusy(true);setError("");
  try{
   const [pc,cc,ex,mo,post]=await Promise.all([
    supabase.rpc("get_participant_count"),
    supabase.rpc("get_completed_participant_count"),
    supabase.from("pokipo_official_reward_exchanges").select("id,participant_id,status,created_at,exchanged_at").order("created_at",{ascending:false}).limit(5000),
    supabase.from("reward_monitor_state").select("station_id,state,updated_at,guide_direction").eq("station_id","main").maybeSingle(),
    supabase.from("pokipo_post_surveys").select("id",{count:"exact",head:true})
   ]);
   setRegistered(pc.error?null:Number(pc.data??0));
   setCompleted(cc.error?null:Number(cc.data??0));
   setPostAnswered(post.error?null:post.count);
   setExchanges(ex.error?null:(ex.data??[]) as Exchange[]);
   setMonitor(mo.error?null:(mo.data as Monitor|null));setMonitorError(Boolean(mo.error));
   const failures=[pc.error&&"参加登録者",cc.error&&"完走者",ex.error&&"交換データ",mo.error&&"モニター状態",post.error&&"参加後アンケート回答数"].filter(Boolean);
   if(failures.length)setError(`取得できなかった項目: ${failures.join("・")}。権限・通信・RLSを確認してください。`);
   setRefreshed(new Date().toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}));
  }catch(e){setError("通信エラーが発生しました。更新をお試しください。");}
  finally{setBusy(false)}
 },[auth]);
 useEffect(()=>{if(auth!=="ok")return;void refresh();const timer=window.setInterval(()=>{setClock(Date.now());if(document.visibilityState==="visible")void refresh()},30000);const update=()=>{if(document.visibilityState==="visible")void refresh()};document.addEventListener("visibilitychange",update);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",update)}},[auth,refresh]);
 const exchanged=useMemo(()=>exchanges?.filter(x=>x.status==="exchanged")??[],[exchanges]);
 const exchangedUnique=useMemo(()=>new Set(exchanged.map(x=>x.participant_id)).size,[exchanged]);
 const issued=useMemo(()=>exchanges?.filter(x=>x.status==="issued")??[],[exchanges]);
 const prepared=useMemo(()=>new Set([ ...issued.map(x=>x.participant_id), ...exchanged.map(x=>x.participant_id) ]).size,[issued,exchanged]);
 const waiting=useMemo(()=>new Set(issued.map(x=>x.participant_id).filter(id=>!exchanged.some(e=>e.participant_id===id))).size,[issued,exchanged]);
 const within=exchanged.filter(x=>x.exchanged_at && Date.parse(x.exchanged_at)>=START && Date.parse(x.exchanged_at)<END);
 const recent=within.filter(x=>x.exchanged_at && Date.parse(x.exchanged_at)>=clock-30*60000);
 const remaining=Math.max(0,LIMIT-exchanged.length);
 const time=clock<START?"開催前":clock>=END?"終了":"開催中";
 const timeRemaining=clock>=END?"終了":clock<START?"開催開始前":`${Math.floor((END-clock)/60000)}分`;
 const buckets=Array.from({length:7},(_,i)=>{const lo=START+i*30*60000;const hi=Math.min(END,lo+30*60000);return {name:new Date(lo).toLocaleTimeString("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit"}),n:within.filter(x=>{const t=Date.parse(x.exchanged_at!);return t>=lo&&t<hi}).length}});
 const cards=[{name:"参加登録者",value:label(registered)},{name:"5か所達成者",value:label(completed)},{name:"QR発行済み（累計推定）",value:exchanges===null?"取得不可":label(prepared)},{name:"QR発行済み・未交換",value:exchanges===null?"取得不可":label(waiting)},{name:"参加後アンケート回答",value:label(postAnswered)},{name:"交換済み（累計）",value:exchanges===null?"取得不可":label(exchangedUnique)},{name:"10/27 交換件数",value:exchanges===null?"取得不可":`${within.length}件`},{name:"360枠の残り目安",value:exchanges===null?"取得不可":`${remaining}枠`}];
 const doExport=()=>{const fields=["項目,数値",...cards.map(x=>`${x.name},${x.value}`),`直近30分,${recent.length}件`,`更新日時,${refreshed}`];const blob=new Blob(["\uFEFF"+fields.join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="pokipo-reward-event-summary.csv";a.click();URL.revokeObjectURL(url)};
 if(auth==="loading")return <main style={{padding:24}}>管理者権限を確認中...</main>;
 if(auth==="denied")return <main style={{padding:24}}><p>管理者ログインが必要です。</p><button style={nav} onClick={()=>router.push("/staff/reward")}>ログイン画面へ</button></main>;
 return <main className="shell" style={{padding:"22px 12px",minHeight:"100vh"}}><section style={{maxWidth:1100,margin:"auto",color:"#342b2b"}}>
 <header style={{...panel,background:"linear-gradient(125deg,#fff6f3,#fff)",marginBottom:14}}><div style={{fontSize:11,color:"#8a1822",fontWeight:800}}>POKIPO / REWARD EVENT CONTROL</div><h1 style={{margin:"6px 0",fontSize:"clamp(22px,4vw,30px)"}}>特典交換会管理</h1><p style={{fontSize:13}}>10月27日（火）12:35〜16:00 ／ 雄飛ホール</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}><button style={nav} onClick={()=>router.push("/staff")}>← スタッフメニュー</button><button style={nav} disabled={busy} onClick={()=>void refresh()}>{busy?"更新中...":"↻ 最新情報に更新"}</button></div><p style={{fontSize:11,color:"#706364"}}>最終取得: {refreshed||"未取得"}（30秒ごとに更新）</p></header>
 {error&&<p role="alert" style={{...panel,color:"#a22a28",background:"#fff4f1"}}>{error}</p>}
 <nav aria-label="管理タブ" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{([{id:"overview",name:"全体状況"},{id:"eligible",name:"交換対象者"},{id:"operations",name:"運営・モニター"},{id:"report",name:"最終集計"}] as const).map(t=><button key={t.id} style={{...nav,background:tab===t.id?"#8a1822":"#fff",color:tab===t.id?"#fff":"#8a1822"}} onClick={()=>setTab(t.id)}>{t.name}</button>)}</nav>
 {tab==="overview"&&<div style={{display:"grid",gap:13}}><div style={{...panel}}><h2 style={{fontSize:17}}>交換会の開催状況</h2><strong style={{color:"#8a1822",fontSize:24}}>{time}</strong><p>終了まで：{timeRemaining} ／ 最近30分の交換：{exchanges===null?"取得不可":`${recent.length}件`}</p><p style={{fontSize:12,color:"#78666b"}}>現在時刻から算出しています。景品の実在庫や受付可否を保証するものではありません。</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>{cards.map(c=><div key={c.name} style={panel}><div style={{fontSize:12,color:"#77686b"}}>{c.name}</div><strong style={{fontSize:24,color:"#8a1822"}}>{c.value}</strong></div>)}</div><section style={panel}><h2 style={{fontSize:17}}>交換時間帯別（10/27）</h2>{exchanges===null?<p>データを取得できません。</p>:buckets.map(b=><div key={b.name} style={{display:"flex",gap:10,alignItems:"center",margin:"9px 0",fontSize:13}}><span style={{width:55}}>{b.name}</span><div style={{height:13,flex:1,background:"#f5e9e6",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${b.n===0?0:Math.max(3,b.n/Math.max(1,...buckets.map(x=>x.n))*100)}%`,background:"#a72b42"}}/></div><strong style={{width:36,textAlign:"right"}}>{b.n}件</strong></div>)}</section></div>}
 {tab==="eligible"&&<section style={panel}><h2 style={{fontSize:19}}>交換対象者の進捗</h2><p>参加登録 → 5か所達成 → QR発行 → 景品交換の各段階を確認します。</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>{cards.slice(0,6).map(c=><div key={c.name} style={{...panel,background:"#fffaf8"}}><small>{c.name}</small><h3 style={{color:"#8a1822"}}>{c.value}</h3></div>)}</div><p style={{fontSize:12,color:"#716466"}}>QR発行済み・未交換は status=issued のユニーク参加者数から算出しています。参加後アンケート未回答者数は既存の参加者一覧で確認してください。異なる集計段階の数値を単純に差し引かないようにしています。</p><button style={nav} onClick={()=>router.push("/staff/participants")}>参加者一覧・アンケート回答状況</button></section>}
 {tab==="operations"&&<div style={{display:"grid",gap:12}}><section style={panel}><h2 style={{fontSize:19}}>モニター表示状態</h2>{monitorError?<p>モニター状態の取得に失敗しました。</p>:monitor?<><p><strong>状態：</strong>{monitor.state==="idle"?"待機中":monitor.state==="presented"?"参加者表示中":monitor.state==="completed"?"交換完了表示中":monitor.state}</p><p><strong>最終更新：</strong>{jst(monitor.updated_at)}</p><p><strong>案内方向：</strong>{monitor.guide_direction==="left"?"左":monitor.guide_direction==="right"?"右":"未設定"}</p></>:<p>モニター状態の登録を確認できません。</p>}<p style={{fontSize:12,color:"#756b6b"}}>ここはデータベース上の表示状態です。モニター端末がオンラインであることの証明ではありません。</p></section><section style={panel}><h2 style={{fontSize:19}}>当日運営・トラブル対応</h2><div style={{display:"flex",flexWrap:"wrap",gap:8}}><button style={nav} onClick={()=>router.push("/staff/reward")}>景品交換端末の設定</button><button style={nav} onClick={()=>router.push("/staff/reward/history")}>景品交換履歴</button><button style={nav} onClick={()=>router.push("/staff/support/by-inquiry")}>問い合わせ対応</button><button style={nav} onClick={()=>router.push("/staff/operations")}>システム稼働確認</button></div><p style={{fontSize:12}}>QR読み取り不良や交換の取り消しは、既存の専用画面から実行します。このページから交換データを直接更新することはありません。</p></section></div>}
 {tab==="report"&&<section style={panel}><h2 style={{fontSize:19}}>最終集計・報告</h2><p>10月27日16:00までに記録された交換実績を確認できます。</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}><div style={panel}>10月27日の交換実績<h3>{exchanges===null?"取得不可":`${within.length}件`}</h3></div><div style={panel}>累計交換済み<h3>{exchanges===null?"取得不可":`${exchangedUnique}人`}</h3></div><div style={panel}>完走者数<h3>{label(completed)}</h3></div></div><button style={nav} onClick={doExport} disabled={exchanges===null||registered===null||completed===null}>現時点の集計CSVを出力</button><p style={{fontSize:12,color:"#77686b"}}>CSVは出力時点のスナップショットです。記録の確定・交換受付の停止は行いません。10月27日の集計は12:35〜16:00（日本時間）の交換記録に限定しています。</p></section>}
 </section></main>
}
