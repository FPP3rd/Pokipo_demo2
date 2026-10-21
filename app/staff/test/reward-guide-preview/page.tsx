"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase-client";
import PokipoRewardPreparation from "../../../../components/PokipoRewardPreparation";
import { PokipoRewardQrPanel } from "../../../../components/PokipoRewardShared";

type Stage = "home" | "reward" | "survey" | "qr" | "done";

const btn: React.CSSProperties = {
  border: 0, borderRadius: 14, padding: "16px 18px", fontWeight: 900,
  background: "#8a1822", color: "white", width: "100%", cursor: "pointer",
};

export default function RewardGuidePreviewPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("home");
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data: auth, error } = await supabase.auth.getUser();
      if (error || !auth.user) {
        if (mounted) setAuthorized(false);
        return;
      }
      const { data: staff, error: staffError } = await supabase
        .from("staff_profiles").select("user_id").eq("user_id", auth.user.id).maybeSingle();
      if (mounted) setAuthorized(!staffError && !!staff);
    })();
    return () => { mounted = false; };
  }, []);

  if (authorized === null) return <main className="shell" style={{padding:25}}>スタッフ認証を確認中...</main>;
  if (!authorized) return <main className="shell" style={{padding:25}}>スタッフログインが必要です。 <Link href="/staff">管理者ページ</Link></main>;

  const guideText: Record<Stage, string> = {
    home: "特典交換の準備をしよう！ 下の「特典」を押してね。",
    reward: "まずは参加後アンケートに回答しよう！",
    survey: "アンケートに回答したら、特典画面へ戻ろう！",
    qr: "交換用QRと確認番号を確認しよう！",
    done: "確認完了！10月27日はこのQRをスタッフに見せよう。",
  };

  return (
    <main className="shell" style={{padding:"24px 16px 65px",maxWidth:780,margin:"auto"}}>
      <p style={{fontSize:12,color:"#8a1822",fontWeight:900}}>STAFF PREVIEW · 本番データの書き込みなし</p>
      <h1 style={{fontSize:24,color:"#302a26"}}>特典交換のスポットライト案内</h1>
      <p style={{color:"#756960",fontSize:13,lineHeight:1.7}}>
        5か所コンプリート後の操作誘導を、模擬画面で順番に確認します。
        本番の参加者情報・アンケート・スタンプ・QR発行履歴は変更しません。
      </p>
      <section style={{position:"relative",marginTop:20,padding:20,borderRadius:22,background:"#28252a",minHeight:360}}>
        <div style={{position:"relative",zIndex:2,maxWidth:530,margin:"0 auto 18px",background:"#fff7f4",border:"2px solid #d4a5a7",borderRadius:16,padding:15,boxShadow:"0 0 0 4px rgba(255,255,255,.15)"}}>
          <strong style={{color:"#8a1822"}}>➤ {guideText[stage]}</strong>
        </div>
        {stage === "home" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0, 1fr))",gap:10}}>
            <div style={{background:"#b9b1af",opacity:.24,padding:"35px 4px",borderRadius:13,textAlign:"center"}}>豆知識</div>
            <div style={{background:"#b9b1af",opacity:.24,padding:"35px 4px",borderRadius:13,textAlign:"center"}}>進捗</div>
            <button type="button" style={{...btn,boxShadow:"0 0 0 5px #f6e0cf, 0 0 30px #fff5e9"}} onClick={()=>setStage("reward")}>★ 特典</button>
          </div>
        )}
        {stage === "reward" && (
          <div style={{maxWidth:540,margin:"auto"}}>
            <div style={{background:"#b9b1af",opacity:.2,padding:18,borderRadius:12,marginBottom:20}}>特典交換の準備チェックリスト</div>
            <button type="button" style={{...btn,boxShadow:"0 0 0 5px #f6e0cf, 0 0 30px #fff5e9"}} onClick={()=>setStage("survey")}>参加後アンケートに回答する →</button>
          </div>
        )}
        {stage === "survey" && (
          <div style={{maxWidth:540,margin:"auto"}}>
            <div style={{background:"#b9b1af",opacity:.2,padding:18,borderRadius:12,marginBottom:20}}>アンケート回答完了（模擬）</div>
            <button type="button" style={{...btn,boxShadow:"0 0 0 5px #f6e0cf, 0 0 30px #fff5e9"}} onClick={()=>setStage("qr")}>特典画面に戻ってQRを確認 →</button>
          </div>
        )}
        {(stage === "qr" || stage === "done") && (
          <div style={{maxWidth:540,margin:"auto"}}>
            <div style={{background:"#fff",borderRadius:16,padding:12,boxShadow:"0 0 0 5px #f6e0cf, 0 0 30px #fff5e9"}}>
              <PokipoRewardQrPanel mode="test" status="issued" token="preview-only-not-valid-for-exchange" confirmationCode="DEMO-ONLY" />
            </div>
            {stage === "qr" && <button type="button" style={{...btn,marginTop:18}} onClick={()=>setStage("done")}>確認した →</button>}
          </div>
        )}
      </section>
      {stage === "reward" && <PokipoRewardPreparation stampCount={5} postSurveyCompleted={false} qrIssued={false} exchanged={false} preview />}
      {stage === "qr" && <PokipoRewardPreparation stampCount={5} postSurveyCompleted qrIssued exchanged={false} preview />}
      <div style={{display:"flex",gap:10,marginTop:20,flexWrap:"wrap"}}>
        <button type="button" onClick={()=>setStage("home")} style={{...btn,width:"auto",background:"#fff",color:"#8a1822",border:"1px solid #e8d9d4"}}>最初から再生</button>
        <Link href="/staff/test" style={{padding:14,color:"#8a1822"}}>動作確認に戻る</Link>
      </div>
    </main>
  );
}