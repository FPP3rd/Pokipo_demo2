"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-client";

type ExchangeRow = { exchanged_at: string | null };
const HOURS = [12, 13, 14, 15];

export default function PokipoExchangeTrend() {
  const [rows, setRows] = useState<ExchangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data, error: fetchError } = await supabase
        .from("reward_exchanges")
        .select("exchanged_at")
        .eq("status", "exchanged")
        .gte("exchanged_at", "2026-10-27T12:35:00+09:00")
        .lt("exchanged_at", "2026-10-27T16:00:00+09:00")
        .order("exchanged_at", { ascending: true })
        .limit(1000);
      if (!active) return;
      setError(Boolean(fetchError));
      if (!fetchError) setRows((data ?? []) as ExchangeRow[]);
      setLoading(false);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const counts = useMemo(() => {
    return HOURS.map((hour) => {
      const count = rows.filter((row) => {
        if (!row.exchanged_at) return false;
        const date = new Date(row.exchanged_at);
        const localHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", hourCycle: "h23" }).format(date));
        return localHour === hour;
      }).length;
      return { hour, count };
    });
  }, [rows]);
  const max = Math.max(1, ...counts.map((item) => item.count));

  return (
    <section aria-label="特典交換の時間帯別推移" style={{ padding: 18, margin: "18px 0", background: "#fffaf8", border: "1px solid #efe4df", borderRadius: 18 }}>
      <div style={{ fontSize: 10, color: "#9b2635", fontWeight: 900, letterSpacing: ".1em" }}>REWARD EXCHANGE TREND</div>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: "#332c29", margin: "6px 0" }}>特典交換人数の推移</h2>
      <p style={{ fontSize: 12, color: "#716762", margin: "0 0 15px" }}>10月27日 12:35〜16:00／30秒ごとに更新</p>
      {loading ? <p>集計中…</p> : error ? <p role="alert">交換履歴を取得できませんでした。</p> : (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            {counts.map(({ hour, count }) => (
              <div key={hour} style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr) 40px", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#746a66", whiteSpace: "nowrap" }}>{hour === 12 ? "12:35〜13:00" : `${hour}:00〜${hour + 1}:00`}</span>
                <div style={{ height: 12, borderRadius: 8, background: "#f1e5e1", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / max) * 100}%`, borderRadius: 8, background: "#ad3444", transition: "width .4s ease" }} />
                </div>
                <strong style={{ fontSize: 12, color: "#8a1822", textAlign: "right" }}>{count}人</strong>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#8a1822", margin: "15px 0 0" }}>対象時間内の交換：{rows.length}人</p>
        </>
      )}
    </section>
  );
}