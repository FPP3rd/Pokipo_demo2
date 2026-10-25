"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase-client";

type Phase = "idle" | "presented" | "completed";
const spots = ["学生センター", "ラーニングスクエア", "東棟2階", "ゆうちょ銀行ATM付近掲示板", "セブンイレブン付近掲示板"];

export default function RewardMonitorPreviewPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [nickname, setNickname] = useState("テスト参加者");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [full, setFull] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { router.replace("/staff/reward"); return; }
      const { data: staff } = await supabase.from("staff_profiles").select("admin_id").eq("user_id", data.user.id).maybeSingle();
      if (!active) return;
      if (staff?.admin_id === "lipost-furuya") setAllowed(true);
      else router.replace("/staff/test");
    })();
    const onFullscreen = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { active = false; document.removeEventListener("fullscreenchange", onFullscreen); };
  }, [router]);
  if (!allowed) return <main className="shell" style={{padding:24}}>管理者権限を確認しています...</main>;
  return (
    <main className="pokipoMonitorPreview" style={{minHeight:"100dvh", background:"#f8f2ef"}}>
      {!full && <div style={{display:"flex", flexWrap:"wrap", gap:10, padding:12, alignItems:"center", background:"#fff", color:"#422b30"}}>
        <Link href="/staff/test/reward/scan" style={{color:"#8a1822", fontWeight:800}}>← 検証用交換画面に戻る</Link>
        {(["idle","presented","completed"] as Phase[]).map((v,i)=><button key={v} type="button" onClick={()=>setPhase(v)} style={{border:"1px solid #cdaaaa",borderRadius:10,padding:"9px 12px",background:phase===v?"#8a1822":"#fff",color:phase===v?"#fff":"#8a1822",fontWeight:800}}>{["① 待機","② ゴール","③ ありがとう"][i]}</button>)}
        <input aria-label="プレビュー用ニックネーム" value={nickname} maxLength={40} onChange={e=>setNickname(e.target.value)} style={{border:"1px solid #ddd",borderRadius:8,padding:8,color:"#333",maxWidth:180}} />
        <button type="button" onClick={()=>setDirection(direction==="left"?"right":"left")} style={{padding:8,color:"#8a1822",background:"white",border:"1px solid #ddd",borderRadius:8}}>誘導方向 {direction==="left"?"←":"→"}</button>
        <button type="button" onClick={()=>{ if(!document.fullscreenElement) void document.getElementById("pokipo-preview-screen")?.requestFullscreen(); else void document.exitFullscreen(); }} style={{padding:9,color:"#fff",background:"#8a1822",border:0,borderRadius:9}}>全画面{full?"終了":"表示"}</button>
        <span style={{fontSize:11,color:"#786c64"}}>これは模擬表示です。本番データ・本番モニターは変更しません。</span>
      </div>}
      <div id="pokipo-preview-screen" className={`rewardMonitorScreen state-${phase}`} style={{width:"100%",height:full?"100dvh":"min(75vh,740px)",minHeight:0,overflow:"hidden",position:"relative"}}>
        {phase==="idle" && <section className="rewardMonitorIdle" style={{height:"100%"}}><div className="rewardMonitorIdleDecor decorOne"/><div className="rewardMonitorIdleDecor decorTwo"/><div className="rewardMonitorIdleDecor decorThree"/><span className="rewardMonitorEyebrow">高安ゼミ LiPost × POCKY</span><h1>POKIPO</h1><div className="rewardMonitorIdleLine"/><h2>5つのスポットを巡って<br/>ポッキーの持つ価値を知ろう</h2><p>特典交換に来た参加者を<br/>お待ちしています</p><div className="rewardMonitorWaiting"><span className="rewardMonitorWaitingDot"/>NEXT CHALLENGER...</div></section>}
        {phase==="presented" && <section key={phase} className="rewardMonitorPresented" style={{height:"100%"}}><span className="rewardMonitorPresentedEyebrow">POKIPO COMPLETE</span><h1>CONGRATULATIONS!</h1><div className="rewardMonitorParticipantName"><strong>{nickname||"テスト参加者"}</strong><span>さん</span></div><div className="rewardMonitorRank"><span>あなたは</span><strong>125</strong><span>番目のゴール！</span></div><section className="rewardMonitorRoute"><div className="rewardMonitorRouteTitle"><span>YOUR ROUTE</span><strong>あなたが回った順番</strong></div><div className="rewardMonitorRouteTrack">{spots.map((name,i)=><div className="rewardMonitorRouteGroup" key={name}><div className="rewardMonitorRouteStop"><span>{String(i+1).padStart(2,"0")}</span><div><small>SPOT {i+1}</small><strong>{name}</strong></div></div>{i<4&&<div className="rewardMonitorRouteArrow">→</div>}</div>)}</div></section></section>}
        {phase==="completed" && <section key={phase} className="rewardMonitorCompleted" style={{height:"100%"}}><div className="rewardMonitorConfetti confetti1">✦</div><div className="rewardMonitorConfetti confetti2">●</div><div className="rewardMonitorConfetti confetti3">★</div><span>THANK YOU!</span><h1>{nickname||"テスト参加者"}<small>さん</small></h1><h2>POKIPOに参加してくれて<br/>ありがとう！！</h2><p>これからもポッキーと一緒に<br/>SHARE HAPPINESS!</p><div className="rewardMonitorExhibitionGuide" style={{margin:"clamp(8px,2vh,20px) auto 0",padding:"clamp(10px,2vh,20px)",width:"min(92%,820px)",borderRadius:22,background:"rgba(255,255,255,.93)",color:"#9b2537",textAlign:"center"}}><div style={{fontSize:"clamp(14px,2.4vw,22px)",fontWeight:800}}>取り組み展示・募金エリアにお進みください</div><div aria-label="誘導方向" style={{fontSize:"clamp(42px,9vh,90px)",lineHeight:1}}>{direction==="left"?"←":"→"}</div></div><p className="rewardMonitorWaitNote">次のご案内まで、この画面をご覧ください。</p></section>}
      </div>
      {full && <button type="button" onClick={()=>void document.exitFullscreen()} style={{position:"fixed",right:12,bottom:12,zIndex:99,padding:9,background:"#ffffffdd",color:"#8a1822",border:0,borderRadius:9}}>全画面終了</button>}
    </main>
  );
}