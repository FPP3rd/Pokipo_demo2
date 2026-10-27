"use client";

import { useEffect, useState } from "react";

const NEXT_START = Date.parse("2026-11-04T12:35:00+09:00");
const NEXT_END = Date.parse("2026-11-04T16:00:00+09:00");

function duration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  return days > 0
    ? `${days}日 ${hours}時間 ${minutes}分`
    : `${hours}時間 ${minutes}分`;
}

type Props = { exchanged?: boolean; checking?: boolean };

export default function PokipoRewardEventStatus({
  exchanged,
  checking = false,
}: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const before = now !== null && now < NEXT_START;
  const during = now !== null && now >= NEXT_START && now < NEXT_END;
  const after = now !== null && now >= NEXT_END;

  return (
    <section
      aria-label="特典交換会のご案内"
      style={{
        margin: "16px 0",
        padding: "20px 17px",
        background: "linear-gradient(145deg, #fff9f5, #fff0ef)",
        border: "1px solid #e8d5d3",
        borderRadius: 18,
        color: "#362d2b",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 900, color: "#9b2635", letterSpacing: ".1em" }}>
        POKIPO REWARD EVENT
      </div>
      <p style={{ fontSize: 11, color: "#837573", margin: "9px 0 12px" }}>
        10月27日（火）の特典交換会は終了しました。
      </p>
      <h2 style={{ margin: "0 0 8px", color: "#8a1822", fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 900, lineHeight: 1.5 }}>
        11月4日（水）追加開催が急遽決定！
      </h2>
      <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fff", border: "1px solid #edddda" }}>
        <strong style={{ display: "block", color: "#8a1822", fontSize: 19 }}>
          12:35〜16:00
        </strong>
        <strong style={{ display: "block", marginTop: 3, fontSize: 14 }}>
          雄飛ホール
        </strong>
      </div>
      {before && (
        <p style={{ fontSize: 12, color: "#8a1822", fontWeight: 800, margin: "10px 0 0" }}>
          追加開催まであと {duration(NEXT_START - now!)}
        </p>
      )}
      {during && (
        <p style={{ fontSize: 12, color: "#8a1822", fontWeight: 800, margin: "10px 0 0" }}>
          追加特典交換会 開催中！ 終了まであと {duration(NEXT_END - now!)}
        </p>
      )}
      {after && (
        <p style={{ fontSize: 12, color: "#746b68", margin: "10px 0 0" }}>
          11月4日の追加特典交換会も終了しました。
        </p>
      )}
      <p style={{ fontSize: 12, lineHeight: 1.7, margin: "11px 0 0" }}>
        特典交換には5か所のスタンプ獲得・参加後アンケート回答・交換用QRが必要です。
      </p>
      {typeof exchanged === "boolean" && (
        <div style={{ padding: "11px 12px", marginTop: 12, background: "#ffffff", border: "1px solid #eee3df", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
          {checking ? "特典交換状況を確認中…" : exchanged ? "✓ 特典交換済み" : "特典：未交換"}
        </div>
      )}
    </section>
  );
}
