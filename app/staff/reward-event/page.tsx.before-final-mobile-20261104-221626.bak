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
 return (
  <main className="shell pokipoRewardEventV2">
    <section className="staffDashboardPage rePage">
      <header className="staffDashboardHeader reHeader">
        <div className="pokipoDashboardHeaderTitle">
          <span>POKIPO STAFF / REWARD EVENT</span>
          <h1>特典交換会管理</h1>
          <p>10/27（火）終了 ／ 11/4（水）12:35〜16:00 追加開催・雄飛ホール</p>
          <div className="reEventState">{eventMessage}</div>
        </div>
        <div className="reHeaderActions">
          <button type="button" onClick={() => router.push("/staff")}>← 管理メニュー</button>
          <button type="button" disabled={loading} onClick={() => void refresh()}>
            {loading ? "更新中…" : "↻ 最新情報に更新"}
          </button>
          <small>最終取得：{updated || "未取得"} ／ 30秒ごとに更新</small>
        </div>
      </header>

      {error && <p className="reError" role="alert">{error}</p>}

      <section className="reControls" aria-label="集計期間の切り替え">
        <div className="reSectionHeading"><span>PERIOD</span><h2>集計期間</h2></div>
        <div className="rePeriods">
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <button type="button" key={key} aria-pressed={period === key} className={period === key ? "active" : ""} onClick={() => setPeriod(key)}>
              {PERIODS[key].name}
            </button>
          ))}
        </div>
        <p className="reHint">{PERIODS[period].caption}の記録を表示。参加者数は各段階の記録日時で集計し、過去の記録は変更しません。</p>
      </section>

      <nav className="reTabs" aria-label="特典交換会管理タブ">
        {([
          { id: "overview", name: "全体状況" },
          { id: "eligible", name: "交換対象者" },
          { id: "operations", name: "運営・モニター" },
          { id: "report", name: "集計・CSV" },
        ] as const).map((item) => (
          <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.name}
          </button>
        ))}
      </nav>

      {(tab === "overview" || tab === "eligible") && (
        <section className="reSection">
          <div className="reSectionHeading"><span>{tab === "overview" ? "PERFORMANCE" : "PARTICIPANT STATUS"}</span><h2>{tab === "overview" ? "期間別の参加・交換状況" : "交換対象者の進捗"}</h2></div>
          <div className="reStatGrid">
            {entries.slice(0, 5).map(([name, value], index) => (
              <article key={name} className={`reStatCard ${index === 4 ? "primary" : ""}`}>
                <span>{["REGISTERED", "COMPLETED", "SURVEY", "QR ISSUED", "EXCHANGED"][index]}</span>
                <strong>{value}</strong>
                <p>{name}</p>
              </article>
            ))}
          </div>
          <div className="reSecondaryGrid">
            {entries.slice(5).map(([name, value]) => (
              <article key={name} className="reSecondaryStat"><span>{name}</span><strong>{value}</strong></article>
            ))}
          </div>
          <p className="reHint">「登録」「完走」「アンケート」「QR発行」「交換」はそれぞれの発生日時を基準に集計しています。期間をまたぐ参加者がいるため、単純な差分は離脱人数を意味しません。</p>
          {tab === "eligible" && <button className="reActionLink" type="button" onClick={() => router.push("/staff/participants")}>参加者一覧・回答状況を確認 →</button>}
        </section>
      )}

      {tab === "overview" && (
        <section className="reSection">
          <div className="reSectionHeading"><span>REWARD EXCHANGE TREND</span><h2>特典交換人数の推移</h2></div>
          <p className="reHint">対象期間の直近30分：{exchanges ? `${recent}件` : "取得不可"} ／ 時間帯別の交換件数</p>
          {graph.map((item) => {
            const maximum = Math.max(1, ...item.buckets.map((b) => b.value));
            const total = item.buckets.reduce((sum, b) => sum + b.value, 0);
            return (
              <div className="reTrendDay" key={item.title}>
                <div className="reTrendTitle"><h3>{item.title}</h3><strong>{total}件</strong></div>
                {item.buckets.map((b) => (
                  <div className="reTrendRow" key={b.label}>
                    <time>{b.label}</time>
                    <div className="reTrack"><div style={{ width: `${(b.value / maximum) * 100}%` }} /></div>
                    <strong>{b.value}件</strong>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {tab === "operations" && (
        <div className="reOperations">
          <section className="reSection">
            <div className="reSectionHeading"><span>MONITOR STATUS</span><h2>特典交換モニター</h2></div>
            <div className="reInfoRows">
              <div><span>表示状態</span><strong>{monitor ? (({ idle: "待機中", presented: "参加者表示中", completed: "交換完了表示中" } as Record<string, string>)[monitor.state] || monitor.state) : "取得不可"}</strong></div>
              <div><span>最終更新</span><strong>{monitor ? fmt(monitor.updated_at) : "取得不可"}</strong></div>
            </div>
            <p className="reHint">モニターのデータベース上の状態です。端末がオンラインであることを保証するものではありません。</p>
          </section>
          <section className="reSection">
            <div className="reSectionHeading"><span>QUICK ACTIONS</span><h2>運営・トラブル対応</h2></div>
            <div className="reQuickLinks">
              {[
                { title: "交換受付", label: "参加者QRの読み取り", href: "/staff/reward" },
                { title: "交換履歴", label: "交換済みの記録を確認", href: "/staff/reward/history" },
                { title: "問い合わせ対応", label: "参加者からの問い合わせ", href: "/staff/support/by-inquiry" },
                { title: "システム稼働確認", label: "システムの状態を確認", href: "/staff/operations" },
              ].map((link) => (
                <button type="button" key={link.href} onClick={() => router.push(link.href)}><span><strong>{link.title}</strong><small>{link.label}</small></span><b>→</b></button>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "report" && (
        <section className="reSection">
          <div className="reSectionHeading"><span>REPORT & EXPORT</span><h2>集計・CSV出力</h2></div>
          <p className="reHint">対象：{PERIODS[period].caption} ／ 選択期間の集計値を出力します。</p>
          <div className="reStatGrid">
            {entries.slice(0, 5).map(([name, value], index) => (
              <article className="reStatCard" key={name}><span>{["REGISTERED", "COMPLETED", "SURVEY", "QR", "EXCHANGED"][index]}</span><strong>{value}</strong><p>{name}</p></article>
            ))}
          </div>
          <button className="reExport" type="button" disabled={!counts} onClick={() => download(`pokipo-reward-${period}-2026.csv`, [["期間", PERIODS[period].caption], ["取得日時", updated], ["項目", "人数"], ...entries])}>
            <span>CSV</span> 選択期間の集計をダウンロード →
          </button>
          <p className="reHint">CSVは取得時点の集計です。交換履歴の確定・受付停止・記録変更は行いません。</p>
        </section>
      )}
    </section>
    <style jsx global>{`
      .pokipoRewardEventV2 .rePage { max-width: 1140px; margin: 0 auto; }
      .pokipoRewardEventV2 .reHeader { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
      .pokipoRewardEventV2 .reHeaderActions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .pokipoRewardEventV2 .reHeaderActions button, .pokipoRewardEventV2 .reActionLink { border: 1px solid #b99194; background: #fffaf8; color: #8a1822; border-radius: 999px; padding: 10px 16px; cursor: pointer; font-weight: 800; }
      .pokipoRewardEventV2 .reHeaderActions small { flex-basis: 100%; color: #7a6d68; font-size: 11px; }
      .pokipoRewardEventV2 .reEventState { display: inline-flex; margin-top: 10px; padding: 7px 12px; border-radius: 999px; background: #fff1ee; color: #8a1822; font-size: 12px; font-weight: 800; }
      .pokipoRewardEventV2 .reSection, .pokipoRewardEventV2 .reControls { background: #fff; border: 1px solid #eee6df; border-radius: 20px; padding: clamp(16px, 3vw, 24px); margin-top: 18px; box-shadow: 0 8px 22px rgba(55,35,25,.055); }
      .pokipoRewardEventV2 .reSectionHeading { margin-bottom: 16px; }
      .pokipoRewardEventV2 .reSectionHeading > span { font-size: 10px; letter-spacing: .12em; font-weight: 900; color: #a43342; }
      .pokipoRewardEventV2 .reSectionHeading h2 { font-size: clamp(17px, 2vw, 21px); color: #332c29; margin: 5px 0 0; font-weight: 900; }
      .pokipoRewardEventV2 .rePeriods { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
      .pokipoRewardEventV2 .rePeriods button, .pokipoRewardEventV2 .reTabs button { min-height: 44px; border: 1px solid #e4d4d1; border-radius: 12px; background: #fff; color: #7a3b42; font-weight: 800; cursor: pointer; padding: 10px 8px; font-size: 13px; }
      .pokipoRewardEventV2 .rePeriods button.active, .pokipoRewardEventV2 .reTabs button.active { background: #8a1822; color: #fff; border-color: #8a1822; }
      .pokipoRewardEventV2 .reTabs { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-top: 18px; padding: 8px; border: 1px solid #eee6df; border-radius: 16px; background: #fff; }
      .pokipoRewardEventV2 .reStatGrid { display: grid; grid-template-columns: repeat(auto-fit,minmax(168px,1fr)); gap: 12px; }
      .pokipoRewardEventV2 .reStatCard { display: flex; flex-direction: column; min-height: 132px; border: 1px solid #eee0dc; border-radius: 16px; padding: 17px 14px; background: #fffaf8; }
      .pokipoRewardEventV2 .reStatCard > span { font-size: 10px; letter-spacing: .1em; font-weight: 900; color: #a72e3f; }
      .pokipoRewardEventV2 .reStatCard > strong { font-size: clamp(23px,3vw,32px); line-height: 1.3; letter-spacing: -.03em; color: #8a1822; margin-top: 8px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
      .pokipoRewardEventV2 .reStatCard > p { margin: auto 0 0; color: #6f625e; font-size: 12px; font-weight: 700; }
      .pokipoRewardEventV2 .reStatCard.primary { background: #8a1822; border-color: #8a1822; }
      .pokipoRewardEventV2 .reStatCard.primary span, .pokipoRewardEventV2 .reStatCard.primary strong, .pokipoRewardEventV2 .reStatCard.primary p { color: #fff; }
      .pokipoRewardEventV2 .reSecondaryGrid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin-top: 12px; }
      .pokipoRewardEventV2 .reSecondaryStat { border-radius: 13px; border: 1px solid #ede3df; background: #fff; padding: 13px 15px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .pokipoRewardEventV2 .reSecondaryStat span { font-size: 12px; color: #766662; }
      .pokipoRewardEventV2 .reSecondaryStat strong { font-size: 16px; color: #8a1822; }
      .pokipoRewardEventV2 .reHint { color: #716662; font-size: 12px; line-height: 1.8; margin: 13px 0 0; }
      .pokipoRewardEventV2 .reTrendDay { border: 1px solid #f0e4e0; border-radius: 14px; padding: 16px; margin-top: 14px; }
      .pokipoRewardEventV2 .reTrendTitle { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 16px; }
      .pokipoRewardEventV2 .reTrendTitle h3 { margin: 0; font-size: 15px; color: #382e2b; }
      .pokipoRewardEventV2 .reTrendTitle strong { color: #8a1822; font-size: 20px; }
      .pokipoRewardEventV2 .reTrendRow { display: grid; grid-template-columns: 60px minmax(0,1fr) 45px; align-items: center; gap: 9px; margin: 11px 0; }
      .pokipoRewardEventV2 .reTrendRow time { color: #7b7069; font-size: 12px; }
      .pokipoRewardEventV2 .reTrendRow strong { color: #8a1822; text-align: right; font-size: 12px; }
      .pokipoRewardEventV2 .reTrack { height: 12px; border-radius: 20px; overflow: hidden; background: #f3e8e4; }
      .pokipoRewardEventV2 .reTrack > div { height: 100%; border-radius: 20px; background: #aa2b40; }
      .pokipoRewardEventV2 .reOperations { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
      .pokipoRewardEventV2 .reInfoRows > div { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid #f1e8e4; }
      .pokipoRewardEventV2 .reInfoRows span { color: #746b65; font-size: 13px; }
      .pokipoRewardEventV2 .reInfoRows strong { color: #8a1822; font-size: 14px; }
      .pokipoRewardEventV2 .reQuickLinks { display: grid; gap: 9px; }
      .pokipoRewardEventV2 .reQuickLinks button { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid #eee2de; background: #fffaf8; padding: 13px 14px; border-radius: 13px; text-align: left; color: #8a1822; cursor: pointer; }
      .pokipoRewardEventV2 .reQuickLinks button span { display: flex; flex-direction: column; gap: 4px; }
      .pokipoRewardEventV2 .reQuickLinks button small { font-size: 11px; color: #756965; }
      .pokipoRewardEventV2 .reQuickLinks button b { font-size: 19px; }
      .pokipoRewardEventV2 .reExport { margin-top: 17px; background: #8a1822; color: #fff; border: 0; border-radius: 13px; padding: 13px 18px; font-weight: 800; cursor: pointer; }
      .pokipoRewardEventV2 .reExport span { margin-right: 9px; }
      .pokipoRewardEventV2 .reError { border: 1px solid #ebc6c9; background: #fff0f0; color: #9b2635; border-radius: 13px; padding: 14px; }
      .pokipoRewardEventV2 button:focus-visible { outline: 3px solid #de9ca6; outline-offset: 3px; }
      .pokipoRewardEventV2 button:disabled { opacity: .55; cursor: not-allowed; }
      @media(max-width:700px) {
        .pokipoRewardEventV2 .reHeader { align-items: stretch; }
        .pokipoRewardEventV2 .reTabs { grid-template-columns: repeat(2,minmax(0,1fr)); }
        .pokipoRewardEventV2 .reStatGrid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }
        .pokipoRewardEventV2 .reStatCard { padding: 13px 10px; min-height: 119px; }
        .pokipoRewardEventV2 .reStatCard > strong { font-size: 24px; }
        .pokipoRewardEventV2 .reSecondaryGrid, .pokipoRewardEventV2 .reOperations { grid-template-columns: 1fr; }
        .pokipoRewardEventV2 .rePeriods button { font-size: 11px; }
      }
    `}</style>
  </main>
 );
}
