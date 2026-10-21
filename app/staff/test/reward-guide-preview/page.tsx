"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase-client";
import PokipoRewardPreparation from "../../../../components/PokipoRewardPreparation";
import { PokipoRewardQrPanel } from "../../../../components/PokipoRewardShared";

type Stage = "home" | "reward" | "survey" | "qr";
const red = "#8a1822";
const buttonStyle: React.CSSProperties = {
  display: "block", width: "100%", minHeight: 48, border: 0,
  borderRadius: 13, background: red, color: "white",
  padding: "12px 16px", fontWeight: 800, cursor: "pointer",
};
const focusStyle: React.CSSProperties = {
  position: "relative", zIndex: 3, borderRadius: 15,
  boxShadow: "0 0 0 5px #fff, 0 0 0 9px #d1a1a5, 0 10px 30px rgba(50,25,25,.22)",
};
const speechStyle: React.CSSProperties = {
  position: "relative", zIndex: 3, background: "#fffdfb",
  border: "1px solid #e9c9cb", borderRadius: 14, padding: "12px 14px",
  marginBottom: 16, textAlign: "center", color: red,
  fontSize: 14, fontWeight: 900, boxShadow: "0 5px 16px rgba(70,25,25,.08)",
};

export default function RewardGuidePreviewPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("home");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error } = await supabase.auth.getUser();
      if (error || !auth.user) {
        if (active) setAuthorized(false);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles").select("user_id")
        .eq("user_id", auth.user.id).maybeSingle();
      if (active) setAuthorized(!profileError && Boolean(profile));
    })();
    return () => { active = false; };
  }, []);

  if (authorized === null) return <main className="shell" style={{padding:24}}>管理者権限を確認中...</main>;
  if (!authorized) return <main className="shell" style={{padding:24}}>スタッフログインが必要です。 <Link href="/staff">管理画面へ</Link></main>;

  return (
    <main className="shell" style={{ padding: "24px 14px 64px", width: "100%", minWidth: 0 }}>
      <div style={{ width: "100%", maxWidth: 720, minWidth: 0, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".1em", color: red }}>STAFF PREVIEW · 本番データ変更なし</p>
        <h1 style={{ fontSize: 23, color: "#302a26" }}>特典交換チュートリアル確認</h1>
        <p style={{ color: "#766b63", fontSize: 13, lineHeight: 1.8 }}>
          ホームのメニューデザインは実際のPOKIPOで使うCSSクラスを再利用しています。
          ここでは参加・アンケート送信・特典発行は行わず、案内だけを操作できます。
        </p>
        <section style={{ position: "relative", isolation: "isolate", overflow: "hidden", borderRadius: 20, background: "#fffaf7", border: "1px solid #eee6df", padding: "22px 16px", marginTop: 18 }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(40,29,31,.60)", zIndex: 1, pointerEvents: "none" }} />
          {stage === "home" && (
            <>
              <div style={speechStyle}>特典交換の準備をしよう！<div style={{fontSize:11,color:"#766b63",marginTop:5}}>明るくなっている「特典」をタップしてね ↓</div></div>
              <div style={{opacity:.27,marginBottom:20,pointerEvents:"none"}}>
                <div className="visualNextSpot complete" style={{padding:15,textAlign:"center"}}>★ COMPLETE　5か所達成！</div>
                <div className="visualQrButton" style={{padding:16,textAlign:"center",marginTop:12}}>QRを読み取る →</div>
              </div>
              <section className="visualMenuGrid" style={{position:"relative",zIndex:2,width:"100%",minWidth:0,gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>
                <div className="visualMenuCard" style={{opacity:.25,pointerEvents:"none"}}><div className="visualMenuIcon bookIcon">?</div><strong>豆知識</strong><span>5/5</span></div>
                <div className="visualMenuCard" style={{opacity:.25,pointerEvents:"none"}}><div className="visualMenuIcon routeIcon">✓</div><strong>進捗</strong><span>100%</span></div>
                <button type="button" className="visualMenuCard rewardMenu unlocked" style={focusStyle} onClick={() => setStage("reward")}>
                  <div className="visualMenuIcon rewardMenuIcon">★</div><strong>特典</strong><span>交換OK</span>
                </button>
              </section>
            </>
          )}
          {stage === "reward" && (
            <>
              <div style={speechStyle}>まずは参加後アンケートに回答しよう！ ↓</div>
              <div style={{opacity:.22,pointerEvents:"none",marginBottom:18}}>
                <PokipoRewardPreparation stampCount={5} postSurveyCompleted={false} qrIssued={false} exchanged={false} preview />
              </div>
              <button type="button" style={{...buttonStyle,...focusStyle}} onClick={() => setStage("survey")}>参加後アンケートに回答する →（模擬）</button>
            </>
          )}
          {stage === "survey" && (
            <>
              <div style={speechStyle}>アンケート回答完了！ 特典画面に戻ろう ↓</div>
              <div style={{borderRadius:15,padding:20,background:"#fff",opacity:.55,marginBottom:18,textAlign:"center",position:"relative",zIndex:2}}>✓ 参加後アンケート回答済み（模擬）</div>
              <button type="button" style={{...buttonStyle,...focusStyle}} onClick={() => setStage("qr")}>特典画面に戻ってQRを確認 →</button>
            </>
          )}
          {stage === "qr" && (
            <>
              <div style={speechStyle}>このQRと確認番号を交換日にスタッフへ見せよう！</div>
              <div style={{...focusStyle,background:"#fff",padding:8}}>
                <PokipoRewardQrPanel mode="test" status="issued" token="demo-not-valid-for-exchange" confirmationCode="DEMO-ONLY" />
              </div>
            </>
          )}
        </section>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:20}}>
          <button type="button" style={{...buttonStyle,width:"auto",background:"#fff",color:red,border:"1px solid #e8d9d4"}} onClick={()=>setStage("home")}>最初から再生</button>
          <Link href="/staff/test" style={{padding:13,color:red}}>動作確認メニューへ戻る</Link>
        </div>
        <p style={{fontSize:12,color:"#897d74",lineHeight:1.7}}>※ この画面は安全な模擬表示です。本番の全画面を完全複製したものではありません。特典QRは交換できません。</p>
      </div>
    </main>
  );
}