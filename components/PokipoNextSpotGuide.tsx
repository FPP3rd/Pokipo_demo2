"use client";

type Props = {
  acquiredSpotIds: string[];
};

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
  const next = remaining[0];

  return (
    <section
      aria-label="次に行くスポット"
      style={{
        margin: "16px 0",
        padding: "16px",
        background: "#fffaf8",
        border: "1px solid #eadbd7",
        borderRadius: 18,
      }}
    >
      <div style={{ color: "#8a1822", fontWeight: 900, fontSize: 11, letterSpacing: ".08em" }}>
        NEXT SPOT
      </div>
      {next ? (
        <>
          <h2 style={{ margin: "6px 0", fontSize: 18, color: "#392e2b" }}>
            次は「{next.name}」へ！
          </h2>
          <p style={{ margin: "6px 0 12px", fontSize: 12, lineHeight: 1.7, color: "#776a65" }}>
            {next.hint}　未取得スポットはあと{remaining.length}か所です。
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SPOTS.map((spot) => (
              <span
                key={spot.id}
                title={spot.name}
                style={{
                  background: completed.has(spot.id) ? "#f0e6e3" : "#fff",
                  border: `1px solid ${completed.has(spot.id) ? "#e1d6d1" : "#d3a5a2"}`,
                  color: completed.has(spot.id) ? "#888" : "#8a1822",
                  borderRadius: 999,
                  fontSize: 11,
                  padding: "5px 10px",
                  fontWeight: 700,
                }}
              >
                {completed.has(spot.id) ? "✓ " : "○ "}{spot.name}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 style={{ margin: "6px 0", fontSize: 18, color: "#392e2b" }}>
            5か所すべて達成！
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#776a65" }}>
            スタンプコンプリートおめでとうございます。特典画面をご確認ください。
          </p>
        </>
      )}
    </section>
  );
}