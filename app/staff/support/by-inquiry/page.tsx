"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase-client";

export default function SupportInquiryEntry() {
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { setStatus("denied"); return; }
      const { data: profile } = await supabase.from("staff_profiles").select("admin_id").eq("user_id", data.user.id).maybeSingle();
      if (active) setStatus(profile?.admin_id === "lipost-furuya" ? "allowed" : "denied");
    })();
    return () => { active = false; };
  }, []);
  const card: React.CSSProperties = { display:"block",padding:20,background:"white",border:"1px solid #bdd4e9",borderRadius:14,textDecoration:"none",color:"#27689c",fontSize:17,fontWeight:850 };
  return <main className="shell" style={{padding:"24px 16px 50px"}}><section style={{maxWidth:700,margin:"0 auto"}}>
    <Link href="/staff/support/entry" style={{color:"#286ca7",fontWeight:800}}>← 対応方法の選択へ</Link>
    <h1 style={{fontSize:24,color:"#332d29",marginTop:22}}>スタンプ修正・景品交換取消復旧</h1>
    <p style={{color:"#286ca7",fontWeight:900}}>参加者からの問い合わせがあった場合はこちら</p>
    <p style={{fontSize:13,color:"#786c64"}}>問い合わせIDの入力または問い合わせQRのカメラ読み取りは、それぞれの既存画面で行います。</p>
    {status === "checking" ? <p>管理者権限を確認しています...</p> : status === "denied" ? <p role="alert" style={{color:"#a22736"}}>lipost-furuya の権限が必要です。</p> : <div style={{display:"grid",gap:14,marginTop:20}}>
      <Link href="/staff/support" style={card}>スタンプ修正・参加者照会 →</Link>
      <Link href="/staff/support/reward" style={card}>景品交換の取消・復旧 →</Link>
    </div>}
  </section></main>;
}