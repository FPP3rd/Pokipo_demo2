"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";
import PokipoRewardPreparation from "../../../components/PokipoRewardPreparation";

type PreviewMode = "start" | "stamps" | "survey" | "ready" | "exchanged";

const MODES: { id: PreviewMode; label: string; description: string }[] = [
  { id: "start", label: "未達成", description: "スタンプ2/5、アンケート未回答" },
  { id: "stamps", label: "5か所達成", description: "スタンプ5/5、アンケート未回答" },
  { id: "survey", label: "アンケート完了", description: "アンケート回答済み、QR準備中" },
  { id: "ready", label: "準備完了", description: "交換QR発行済み" },
  { id: "exchanged", label: "交換済み", description: "景品交換完了後" },
];

export default function StaffPreparationPreviewPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<"checking" | "ok" | "denied">("checking");
  const [mode, setMode] = useState<PreviewMode>("ready");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !data.user) {
          setAuth("denied");
          return;
        }
        const { data: staff, error: staffError } = await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (!active) return;
        setAuth(!staffError && !!staff ? "ok" : "denied");
      } catch {
        if (active) setAuth("denied");
      }
    }
    void check();
    return () => { active = false; };
  }, []);

  const current =
    mode === "start" ? { stampCount: 2, postSurveyCompleted: false, qrIssued: false, exchanged: false } :
    mode === "stamps" ? { stampCount: 5, postSurveyCompleted: false, qrIssued: false, exchanged: false } :
    mode === "survey" ? { stampCount: 5, postSurveyCompleted: true, qrIssued: false, exchanged: false } :
    mode === "exchanged" ? { stampCount: 5, postSurveyCompleted: true, qrIssued: true, exchanged: true } :
    { stampCount: 5, postSurveyCompleted: true, qrIssued: true, exchanged: false };

  if (auth === "checking") {
    return <main className="shell" style={{ padding: 24 }}>スタッフ権限を確認中...</main>;
  }
  if (auth === "denied") {
    return <main className="shell" style={{ padding: 24 }}>
      <p>スタッフログインが必要です。</p>
      <button type="button" onClick={() => router.push("/staff/reward")}>ログイン画面へ</button>
    </main>;
  }

  return (
    <main className="shell" style={{ minHeight: "100vh", padding: "clamp(12px,3vw,28px)" }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <button type="button" onClick={() => router.push("/staff")}
          style={{ padding: "10px 0", background: "transparent", border: 0, color: "#a52b39", fontWeight: 800, cursor: "pointer" }}>
          ← スタッフメニューへ戻る
        </button>
        <div style={{
          padding: "20px 22px", borderRadius: 18, color: "#3c3033",
          background: "#fff", border: "1px solid #edddda", marginTop: 8
        }}>
          <p style={{ margin: 0, color: "#a52b39", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>
            STAFF / DEMO PREVIEW
          </p>
          <h1 style={{ margin: "7px 0", fontSize: 24 }}>特典交換準備チェックリスト・模擬画面</h1>
          <p style={{ fontSize: 13, color: "#78686a", lineHeight: 1.8 }}>
            スタッフ専用の表示確認です。ボタンを切り替えて、参加者が見る画面を確認できます。
            スタンプ、アンケート、特典交換記録は一切変更しません。
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {MODES.map((item) => (
              <button key={item.id} type="button" onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
                title={item.description}
                style={{
                  padding: "10px 13px", borderRadius: 99, fontSize: 12, fontWeight: 800,
                  border: `1px solid ${mode === item.id ? "#ae3442" : "#e8d8d6"}`,
                  color: mode === item.id ? "#fff" : "#57454a",
                  background: mode === item.id ? "#ae3442" : "#fff",
                  cursor: "pointer"
                }}>
                {item.label}
              </button>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#796b6e" }}>
            現在の模擬状態：{MODES.find((m) => m.id === mode)?.description}
          </p>
        </div>
        <PokipoRewardPreparation {...current} preview />
      </section>
    </main>
  );
}