"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";

const SPOTS = [
  { id: "spot1", name: "学生センター", hint: "学生センター付近の掲示を探してみよう" },
  { id: "spot2", name: "東棟2階", hint: "東棟2階の掲示を探してみよう" },
  { id: "spot3", name: "ゆうちょ銀行ATM付近掲示板", hint: "ゆうちょ銀行ATM付近の掲示板を探してみよう" },
  { id: "spot4", name: "ラーニングスクエア", hint: "ラーニングスクエア内を探してみよう" },
  { id: "spot5", name: "セブンイレブン付近掲示板", hint: "セブンイレブン付近の掲示板を探してみよう" },
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

  const remaining = useMemo(() => SPOTS.filter((spot) => !acquired.includes(spot.id)), [acquired]);

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
    <main className="shell" style={{ padding: "22px 16px 54px", maxWidth: 860, margin: "0 auto" }}>
      <Link href="/staff/test" style={{ color: "#8a1822", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
        ← 管理者テスト画面に戻る
      </Link>
      <header style={{ margin: "22px 0" }}>
        <span style={{ color: "#8a1822", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>POKIPO STAFF / PREVIEW</span>
        <h1 style={{ fontSize: 24, margin: "8px 0" }}>次のスポット案内プレビュー</h1>
        <p style={{ color: "#786c64", fontSize: 13, lineHeight: 1.8 }}>
          スポットを好きな順番で選び、参加者向け案内の表示を確かめられます。プレビューは実データに影響しません。
        </p>
      </header>

      <section style={{ padding: 20, borderRadius: 20, border: "1px solid #edddd9", background: "#fffaf8", boxShadow: "0 6px 18px #8a182210" }}>
        <div style={{ fontSize: 11, color: "#a22736", fontWeight: 900, letterSpacing: ".1em" }}>SPOT GUIDE</div>
        <h2 style={{ fontSize: 20, margin: "8px 0", color: "#332d29" }}>
          {remaining.length ? "まだ行っていないスポットを探そう！" : "5か所すべて達成！"}
        </h2>
        <p style={{ fontSize: 12, color: "#786c64", margin: "0 0 14px" }}>
          {remaining.length ? `残り${remaining.length}か所。どこから回ってもOK！` : "すべてのスタンプを獲得しました。"}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: remaining.length ? 16 : 0 }}>
          {SPOTS.map((spot) => (
            <span key={spot.id} style={{ borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 700, background: acquired.includes(spot.id) ? "#ede6e3" : "#fff", color: acquired.includes(spot.id) ? "#817771" : "#8a1822", border: "1px solid #ebdad4" }}>
              {acquired.includes(spot.id) ? "✓" : "○"} {spot.name}
            </span>
          ))}
        </div>
        {remaining.length > 0 && (
          <div style={{ display: "grid", gap: 9 }}>
            {remaining.map((spot) => (
              <div key={spot.id} style={{ border: "1px solid #efdcd6", borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
                <div style={{ color: "#8a1822", fontWeight: 900, fontSize: 13 }}>{spot.name}</div>
                <div style={{ color: "#81746d", fontSize: 11, marginTop: 4 }}>{spot.hint}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18, background: "white", border: "1px solid #eee3de", borderRadius: 18, padding: 18 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>テスト操作：取得済みスポット</h2>
        <p style={{ color: "#786c64", fontSize: 12, marginBottom: 12 }}>好きな順番でチェックしてください。未取得スポットの案内が即座に変わります。</p>
        <div style={{ display: "grid", gap: 12 }}>
          {SPOTS.map((spot) => (
            <label key={spot.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={acquired.includes(spot.id)} onChange={() => toggle(spot.id)} />
              {spot.name}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setAcquired([])} style={{ marginTop: 18, border: "1px solid #e4c7c1", borderRadius: 10, background: "white", padding: "10px 14px", color: "#8a1822", fontWeight: 800, cursor: "pointer" }}>すべて未取得に戻す</button>
      </section>
      <p style={{ color: "#81746d", fontSize: 11, marginTop: 12 }}>このページは案内レイアウトの確認用です。スタンプの取得・登録・アンケート・特典交換は実行しません。</p>
    </main>
  );
}