"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase-client";

export default function SupportEntryPage() {
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
  return <main className="shell" style={{padding: "24px 16px 50px"}}>
    <section style={{maxWidth: 760, margin: "0 auto"}}>
      <Link href="/staff" style={{color:"#8a1822", fontWeight:800}}>← スタッフメニューに戻る</Link>
      <h1 style={{fontSize:25, margin:"22px 0 6px", color:"#332d29"}}>スタンプ修正・景品交換取消復旧</h1>
      <p style={{color:"#786c64", fontSize:13, lineHeight:1.7}}>利用目的に応じて入口を選択してください。管理者ID「lipost-furuya」専用の操作です。</p>
      {status === "checking" && <p>権限を確認しています...</p>}
      {status === "denied" && <p role="alert" style={{color:"#a22736",fontWeight:800}}>lipost-furuya の権限が必要です。</p>}
      {status === "allowed" && <div style={{display:"grid",gap:16,marginTop:22}}>
        <Link href="/staff/support/by-participant" style={{display:"block",background:"#fff7f7",border:"2px solid #c24550",borderRadius:18,padding:"20px",textDecoration:"none"}}>
          <span style={{display:"block",color:"#b42a3b",fontWeight:900,fontSize:12}}>管理者から修正</span>
          <strong style={{display:"block",color:"#322b29",fontSize:19,margin:"7px 0"}}>スタンプ修正・景品交換取消復旧</strong>
          <span style={{color:"#b42a3b",fontWeight:800,fontSize:13}}>管理者から参加者修正を行う場合はこちら →</span>
          <small style={{display:"block",color:"#776b67",marginTop:8}}>参加者IDを入力して対象を照会</small>
        </Link>
        <Link href="/staff/support/by-inquiry" style={{display:"block",background:"#f4f9ff",border:"2px solid #417fbd",borderRadius:18,padding:"20px",textDecoration:"none"}}>
          <span style={{display:"block",color:"#286ca7",fontWeight:900,fontSize:12}}>参加者からの問い合わせ</span>
          <strong style={{display:"block",color:"#322b29",fontSize:19,margin:"7px 0"}}>スタンプ修正・景品交換取消復旧</strong>
          <span style={{color:"#286ca7",fontWeight:800,fontSize:13}}>参加者からの問い合わせがあった場合はこちら →</span>
          <small style={{display:"block",color:"#776b67",marginTop:8}}>問い合わせID・問い合わせQRから対応</small>
        </Link>
      </div>}
    </section>
  </main>;
}