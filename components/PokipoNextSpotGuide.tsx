"use client";

type Props = { acquiredSpotIds: string[] };

const SPOTS = [
  { id: "spot1", name: "学生センター", hint: "学生センター付近の掲示を探そう" },
  { id: "spot2", name: "東棟2階", hint: "東棟の2階にある掲示を探そう" },
  { id: "spot3", name: "ゆうちょ銀行ATM付近掲示板", hint: "ゆうちょ銀行ATM付近の掲示板を探そう" },
  { id: "spot4", name: "ラーニングスクエア", hint: "ラーニングスクエア内の掲示を探そう" },
  { id: "spot5", name: "セブンイレブン付近掲示板", hint: "セブンイレブン付近の掲示板を探そう" },
] as const;

export default function PokipoNextSpotGuide({ acquiredSpotIds }: Props) {
  const completed = new Set(acquiredSpotIds);
  const remaining = SPOTS.filter((spot) => !completed.has(spot.id));

  return (
    <section aria-label="未取得スポット案内" style={{ width: "100%", minWidth: 0, boxSizing: "border-box", margin: "16px 0", padding: "18px 16px", background: "#fffaf8", border: "1px solid #eadbd7", borderRadius: 18 }}>
      <div style={{ color: "#8a1822", fontWeight: 900, fontSize: 11, letterSpacing: ".08em" }}>SPOT GUIDE</div>
      <h2 style={{ margin: "8px 0 4px", fontSize: 18, lineHeight: 1.5, color: "#392e2b" }}>
        {remaining.length ? "まだ行っていないスポットを探そう！" : "5か所すべて達成！"}
      </h2>
      <p style={{ margin: "0 0 12px", color: "#776a65", fontSize: 12, lineHeight: 1.7 }}>
        {remaining.length ? `未取得スポットは残り${remaining.length}か所。どこから回ってもOK！` : "コンプリートおめでとうございます。特典画面をご確認ください。"}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: remaining.length ? 14 : 0 }}>
        {SPOTS.map((spot) => (
          <span key={spot.id} title={spot.name} style={{ maxWidth: "100%", overflowWrap: "anywhere", boxSizing: "border-box", borderRadius: 999, fontSize: 11, padding: "5px 10px", fontWeight: 700, background: completed.has(spot.id) ? "#f0e6e3" : "#ffffff", border: `1px solid ${completed.has(spot.id) ? "#e1d6d1" : "#d3a5a2"}`, color: completed.has(spot.id) ? "#77706c" : "#8a1822" }}>
            {completed.has(spot.id) ? "✓ " : "○ "}{spot.name}
          </span>
        ))}
      </div>
      {remaining.length > 0 && (
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          {remaining.map((spot) => (
            <div key={spot.id} style={{ minWidth: 0, boxSizing: "border-box", background: "#ffffff", border: "1px solid #efdfda", borderRadius: 12, padding: "11px 12px" }}>
              <strong style={{ display: "block", color: "#8a1822", fontSize: 13, lineHeight: 1.5, overflowWrap: "anywhere" }}>{spot.name}</strong>
              <p style={{ margin: "4px 0 0", color: "#81746d", fontSize: 11, lineHeight: 1.6 }}>{spot.hint}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}