"use client";

import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";

type State = "checking" | "password" | "approved" | "denied";

/** UI再認証。データ取得自体はDB側の lipost-furuya 専用RPCでも制限する。 */
export default function PokipoFuruyaReauthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user || !auth.user.email) {
        setState("denied");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("admin_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || profile?.admin_id !== "lipost-furuya") {
        setState("denied");
        return;
      }
      setEmail(auth.user.email);
      setUserId(auth.user.id);
      setState("password");
    }
    void check();
    return () => { active = false; };
  }, []);

  async function confirm() {
    if (!password || working) return;
    setWorking(true);
    setError("");
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error || result.data.user?.id !== userId) {
        setError("再認証に失敗しました。ログイン中の管理者のパスワードを確認してください。");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("admin_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError || profile?.admin_id !== "lipost-furuya") {
        setState("denied");
        return;
      }
      setPassword("");
      setState("approved");
    } finally {
      setWorking(false);
    }
  }

  if (state === "approved") return <>{children}</>;

  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box" }}>
      <section style={{ width: "100%", maxWidth: 440, border: "1px solid #e5d8d4", borderRadius: 18, background: "#fff", padding: 24, boxSizing: "border-box", color: "#352b2b" }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#8a1822" }}>POKIPO / PRIVATE ACCESS</span>
        <h1 style={{ fontSize: 21, marginTop: 10 }}>管理者の再認証</h1>
        {state === "checking" ? <p>権限を確認しています…</p> :
          state === "denied" ? <p role="alert">この画面は lipost-furuya のみ閲覧できます。スタッフログインをご確認ください。</p> :
          <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>参加者情報を保護するため、閲覧のたびにパスワードを確認します。</p>
            <p style={{ fontSize: 12, overflowWrap: "anywhere" }}>{email}</p>
            <label htmlFor="pokipo-furuya-reconfirm" style={{ fontSize: 13, fontWeight: 700 }}>管理者パスワード</label>
            <input id="pokipo-furuya-reconfirm" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 12, marginTop: 7, marginBottom: 14, border: "1px solid #d8c9c4", borderRadius: 10, background: "#fff", color: "#352b2b" }} />
            {error && <p role="alert" style={{ color: "#a52b33", fontSize: 12 }}>{error}</p>}
            <button type="submit" disabled={working} style={{ padding: "12px 22px", color: "#fff", background: "#8a1822", border: 0, borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>{working ? "確認中…" : "再認証して閲覧"}</button>
          </form>}
      </section>
    </main>
  );
}