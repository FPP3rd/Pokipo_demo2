"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";
import PokipoNextSpotGuide from "../../../../components/PokipoNextSpotGuide";

const SPOTS = [
  { id: "spot1", name: "学生センター" },
  { id: "spot2", name: "東棟2階" },
  { id: "spot3", name: "ゆうちょ銀行ATM付近掲示板" },
  { id: "spot4", name: "ラーニングスクエア" },
  { id: "spot5", name: "セブンイレブン付近掲示板" },
] as const;

type SpotId = (typeof SPOTS)[number]["id"];

export default function NextSpotPreviewPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [acquired, setAcquired] = useState<SpotId[]>([]);

  useEffect(() => {
    let live = true;
    async function check() {
      const { data, error } = await supabase.auth.getUser();
      if (!live) return;
      if (error || !data.user) {
        router.replace("/staff/reward");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!live) return;
      setAuthStatus(!profileError && profile ? "allowed" : "denied");
    }
    void check();
    return () => { live = false; };
  }, [router]);

  function toggle(id: SpotId) {
    setAcquired((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  if (authStatus !== "allowed") {
    return (
      <main className="shell" style={{ padding: 24 }}>
        {authStatus === "checking" ? "スタッフ権限を確認しています..." : "スタッフ権限を確認できませんでした。"}
      </main>
    );
  }

  return (
    <main className="shell" style={{ padding: "22px 16px 54px", maxWidth: 900, margin: "0 auto", boxSizing: "border-box" }}>
      <Link href="/staff/test" style={{ color: "#8a1822", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
        ← 管理者テスト画面に戻る
      </Link>
      <header style={{ margin: "20px 0" }}>
        <span style={{ color: "#8a1822", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>POKIPO STAFF / PREVIEW</span>
        <h1 style={{ color: "#332d29", fontSize: 22, lineHeight: 1.4, margin: "8px 0" }}>次のスポット案内プレビュー</h1>
        <p style={{ color: "#786c64", fontSize: 12, lineHeight: 1.8, margin: 0 }}>
          実際の参加者と同じ案内を表示します。スポットはどの順番で取得してもOKです。
        </p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", alignItems: "start", gap: 16 }}>
        <section style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #e9ddd7", background: "#f7f2ef", padding: 14, borderRadius: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#8a1822", letterSpacing: ".06em", marginBottom: 6 }}>参加者画面の表示</div>
          <PokipoNextSpotGuide acquiredSpotIds={acquired} />
        </section>
        <section style={{ minWidth: 0, boxSizing: "border-box", background: "#fff", border: "1px solid #eee3de", borderRadius: 20, padding: 18 }}>
          <h2 style={{ color: "#332d29", fontSize: 16, margin: "0 0 8px" }}>取得済みスポットを選択</h2>
          <p style={{ color: "#786c64", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>チェックを切り替えると、左（スマートフォンでは上）の表示が即座に変わります。</p>
          <div style={{ display: "grid", gap: 9 }}>
            {SPOTS.map((spot) => (
              <label key={spot.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", background: acquired.includes(spot.id) ? "#fff5f3" : "#faf8f6", border: "1px solid #eadbd7", borderRadius: 12, color: "#332d29", cursor: "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                <input type="checkbox" style={{ width: 18, height: 18, flexShrink: 0, accentColor: "#a22736" }} checked={acquired.includes(spot.id)} onChange={() => toggle(spot.id)} />
                <span>{spot.name}</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setAcquired([])} style={{ width: "100%", marginTop: 14, border: "1px solid #e4c7c1", borderRadius: 11, background: "#fff", padding: "11px 14px", color: "#8a1822", fontWeight: 800, cursor: "pointer" }}>すべて未取得に戻す</button>
          <p style={{ color: "#81746d", fontSize: 11, lineHeight: 1.7, margin: "14px 0 0" }}>プレビューの操作は実際の参加者データには反映されません。</p>
        </section>
      </div>
    </main>
  );
}