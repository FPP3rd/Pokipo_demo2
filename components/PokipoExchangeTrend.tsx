"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase-client";

type ExchangeRow = { exchanged_at: string | null };
type DayId = 0 | 1;

const DAYS = [
  { label: "10/27（火）", date: "10月27日", start: "2026-10-27T12:35:00+09:00", end: "2026-10-27T16:00:00+09:00" },
  { label: "11/4（水）", date: "11月4日", start: "2026-11-04T12:35:00+09:00", end: "2026-11-04T16:00:00+09:00" },
] as const;

const SLOTS = [
  { label: "12:35〜13:00", start: 12 * 60 + 35, end: 13 * 60 },
  { label: "13:00〜14:00", start: 13 * 60, end: 14 * 60 },
  { label: "14:00〜15:00", start: 14 * 60, end: 15 * 60 },
  { label: "15:00〜16:00", start: 15 * 60, end: 16 * 60 },
];

function jstMinutes(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(value));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export default function PokipoExchangeTrend() {
  const [day, setDay] = useState<DayId>(0);
  const [records, setRecords] = useState<ExchangeRow[][]>([[], []]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<boolean[]>([false, false]);
  const startTouch = useRef<{ x: number; y: number } | null>(null);

  const refresh = useCallback(async () => {
    const results = await Promise.all(DAYS.map((d) =>
      supabase.from("pokipo_official_reward_exchanges")
        .select("exchanged_at")
        .eq("status", "exchanged")
        .gte("exchanged_at", d.start)
        .lt("exchanged_at", d.end)
        .order("exchanged_at", { ascending: true })
        .limit(1000)
    ));
    setRecords(results.map((r) => (r.error ? [] : (r.data ?? []) as ExchangeRow[])));
    setErrors(results.map((r) => Boolean(r.error)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const counts = useMemo(() => SLOTS.map((slot) => ({
    label: slot.label,
    count: records[day].filter((r) => {
      if (!r.exchanged_at) return false;
      const n = jstMinutes(r.exchanged_at);
      return n >= slot.start && n < slot.end;
    }).length,
  })), [records, day]);

  const maximum = Math.max(1, ...counts.map((s) => s.count));
  const current = DAYS[day];

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (!startTouch.current) return;
    const dx = event.changedTouches[0].clientX - startTouch.current.x;
    const dy = event.changedTouches[0].clientY - startTouch.current.y;
    startTouch.current = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    setDay((previous) => dx < 0 ? 1 : 0);
  }

  return (
    <section
      aria-label="特典交換の時間帯別推移"
      onTouchStart={(event) => {
        startTouch.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { startTouch.current = null; }}
      style={{ padding: "clamp(15px, 3vw, 22px)", margin: "18px 0", background: "#fffaf8", border: "1px solid #efe4df", borderRadius: 18, overflow: "hidden" }}
    >
      <div style={{ fontSize: 10, color: "#9b2635", fontWeight: 900, letterSpacing: ".1em" }}>REWARD EXCHANGE TREND</div>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: "#332c29", margin: "6px 0" }}>特典交換人数の推移</h2>
      <p style={{ fontSize: 12, color: "#716762", margin: "0 0 12px" }}>12:35〜16:00 ／ 30秒ごとに更新</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }} role="group" aria-label="交換会の日付を選択">
        {DAYS.map((d, index) => (
          <button
            key={d.label}
            type="button"
            aria-pressed={day === index}
            onClick={() => setDay(index as DayId)}
            style={{
              border: "1px solid #9e4c59", borderRadius: 10, padding: "9px 13px",
              fontSize: 12, fontWeight: 800, flex: 1, cursor: "pointer",
              background: day === index ? "#8a1822" : "#fff",
              color: day === index ? "#fff" : "#8a1822",
            }}
          >{d.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#8a1822", fontSize: 11, fontWeight: 700, marginBottom: 15 }}>
        <span>‹ 10/27</span>
        <span>左右スワイプでも切り替え</span>
        <span>11/4 ›</span>
      </div>

      {loading ? <p>集計中…</p> : errors[day] ? <p role="alert">交換履歴を取得できませんでした。</p> : (
        <div key={day}>
          <p style={{ color: "#624e50", fontSize: 12, fontWeight: 700, margin: "0 0 12px" }}>{current.date}の特典交換実績</p>
          <div style={{ display: "grid", gap: 12 }}>
            {counts.map(({ label, count }) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr) 46px", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#746a66", whiteSpace: "nowrap" }}>{label}</span>
                <div style={{ height: 12, borderRadius: 8, background: "#f1e5e1", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maximum) * 100}%`, borderRadius: 8, background: "#ad3444", transition: "width .4s ease" }} />
                </div>
                <strong style={{ fontSize: 12, color: "#8a1822", textAlign: "right" }}>{count}人</strong>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#8a1822", margin: "15px 0 0" }}>
            {current.date}の交換：{records[day].length}人
          </p>
          <p style={{ fontSize: 11, color: "#786c64", marginTop: 8 }}>
            10/27の実績を保持し、11/4の実績は交換が発生すると追加表示されます。
          </p>
        </div>
      )}
    </section>
  );
}
