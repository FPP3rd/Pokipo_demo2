"use client";

import { useEffect, useState } from "react";

const START = Date.parse("2026-10-27T12:35:00+09:00");
const END = Date.parse("2026-10-27T16:00:00+09:00");

function duration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days > 0 ? `${days}日 ${hours}時間 ${minutes}分` : `${hours}時間 ${minutes}分`;
}

type Props = { exchanged?: boolean; checking?: boolean };

export default function PokipoRewardEventStatus({ exchanged, checking = false }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const before = now !== null && now < START;
  const during = now !== null && now >= START && now < END;
  const after = now !== null && now >= END;

  const headline = before
    ? "特典交換会まであと"
    : during
      ? "特典交換会 開催中！"
      : after
        ? "特典交換会は終了しました"
        : "開催情報を確認中";

  return (
    <section aria-label="特典交換会のご案内" style={{ margin: "16px 0", padding: "18px 16px", background: "#fffaf8", border: "1px solid #eeded9", borderRadius: 18, color: "#362d2b" }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: "#9b2635", letterSpacing: ".1em" }}>POKIPO REWARD EVENT</div>
      <h2 style={{ margin: "7px 0 5px", fontSize: 19, fontWeight: 900 }}>{headline}</h2>
      {before && <strong style={{ display: "block", fontSize: 24, color: "#a22736", marginBottom: 6 }}>{duration(START - now!)}</strong>}
      {during && <strong style={{ display: "block", fontSize: 16, color: "#a22736", marginBottom: 6 }}>16:00まで（残り {duration(END - now!)}）</strong>}
      <p style={{ margin: "5px 0", fontSize: 13, fontWeight: 750 }}>10月27日（火）12:35〜16:00</p>
      <p style={{ margin: "5px 0 12px", fontSize: 13, fontWeight: 750 }}>場所：雄飛ホール</p>
      {typeof exchanged === "boolean" && (
        <div style={{ padding: "11px 12px", background: "#ffffff", border: "1px solid #eee3df", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
          {checking ? "特典交換状況を確認中…" : exchanged ? "✓ 特典交換済み" : "特典：未交換"}
        </div>
      )}
      {before && <p style={{ fontSize: 11, margin: "10px 0 0", color: "#746b68" }}>特典交換は先着360名です。5か所のスタンプと参加後アンケートが必要です。</p>}
    </section>
  );
}