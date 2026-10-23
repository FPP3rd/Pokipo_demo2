"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";

type Result = { participant_id: string; nickname: string; grade: string | null; department: string | null; support_token: string };
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default function ByParticipantPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [participantId, setParticipantId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResult(null);
    if (status !== "allowed") return;
    if (!ID_PATTERN.test(participantId.trim())) { setError("正しい参加者ID（UUID形式）を入力してください。"); return; }
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase.rpc("pokipo_furuya_resolve_participant_id", { p_participant_id: participantId.trim() });
      if (queryError) throw queryError;
      if (!data) { setError("該当する参加者は見つかりませんでした。"); return; }
      setResult(data as Result);
    } catch { setError("照会に失敗しました。権限とSQL関数の適用状況を確認してください。"); }
    finally { setLoading(false); }
  }
  function continueTo(path: string) {
    if (!result || status !== "allowed") return;
    sessionStorage.setItem("pokipo_staff_support_prefill", result.support_token);
    router.push(path);
  }
  return <main className="shell" style={{padding:"24px 16px 50px"}}><section style={{maxWidth:700,margin:"0 auto"}}>
    <Link href="/staff/support/entry" style={{color:"#a22736",fontWeight:800}}>← 対応方法の選択へ</Link>
    <h1 style={{fontSize:24,color:"#332d29",marginTop:22}}>スタンプ修正・景品交換取消復旧</h1>
    <p style={{color:"#b42a3b",fontWeight:900}}>管理者から参加者修正を行う場合はこちら</p>
    <p style={{fontSize:13,color:"#786c64"}}>参加者IDで検索し、対象を確認した後に修正画面へ進みます。</p>
    {status === "checking" && <p>管理者権限を確認しています...</p>}
    {status === "denied" && <p role="alert" style={{color:"#a22736"}}>lipost-furuya の権限が必要です。</p>}
    {status === "allowed" && <>
      <form onSubmit={search} style={{display:"grid",gap:12,padding:20,background:"#fff8f7",border:"1px solid #eac9c7",borderRadius:16}}>
        <label htmlFor="participantId" style={{fontWeight:850,fontSize:13}}>参加者ID</label>
        <input id="participantId" value={participantId} onChange={e=>setParticipantId(e.target.value)} autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{width:"100%",boxSizing:"border-box",padding:12,fontSize:16,border:"1px solid #d6b8b6",borderRadius:9}}/>
        <button type="submit" disabled={loading} style={{padding:13,background:"#a22736",color:"#fff",border:0,borderRadius:10,fontWeight:850}}>{loading?"照会中...":"参加者を照会する"}</button>
        {error && <p role="alert" style={{color:"#a22736",margin:0}}>{error}</p>}
      </form>
      {result && <section style={{marginTop:18,padding:20,border:"1px solid #e7d7d2",borderRadius:16,background:"white"}}>
        <strong style={{display:"block",color:"#8a1822",marginBottom:10}}>照会結果（対象をご確認ください）</strong>
        <p style={{margin:"0 0 7px"}}>ニックネーム：{result.nickname}</p>
        <p style={{margin:"0 0 7px"}}>学年・所属：{result.grade || "未設定"}</p>
        <p style={{margin:"0 0 14px"}}>学科：{result.department || "なし"}</p>
        <div style={{display:"grid",gap:10}}>
          <button type="button" onClick={()=>continueTo("/staff/support")} style={{padding:14,border:0,borderRadius:10,background:"#9f2938",color:"#fff",fontWeight:850}}>スタンプ修正へ →</button>
          <button type="button" onClick={()=>continueTo("/staff/support/reward")} style={{padding:14,border:"1px solid #9f2938",borderRadius:10,background:"white",color:"#9f2938",fontWeight:850}}>景品交換の取消・復旧へ →</button>
        </div>
      </section>}
    </>}
  </section></main>;
}