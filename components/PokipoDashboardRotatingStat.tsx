"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-client";

type Props = {
  loading: boolean;
  participants: number;
  completions: number;
  exchanged: number;
  todayExchanged: number;
};

type Extra = {
  registrationsToday: number | null;
  registrationsYesterday: number | null;
  topDepartment: string | null;
  topDepartmentCount: number | null;
  departmentKinds: number | null;
  stamps: number | null;
};


export default function PokipoDashboardRotatingStat({
  loading,
  participants,
  completions,
  exchanged,
  todayExchanged,
}: Props) {
  const [index, setIndex] = useState(0);
  const [extra, setExtra] = useState<Extra>({
    registrationsToday: null,
    registrationsYesterday: null,
    topDepartment: null,
    topDepartmentCount: null,
    departmentKinds: null,
    stamps: null,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((old) => old + 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let pending = false;

    async function refresh() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        // Staff-only aggregated RPC. It never returns participant-level data.
        const { data, error } = await supabase.rpc("pokipo_staff_rotating_stats");
        if (!active) return;
        if (error) {
          console.error("動的統計取得エラー:", error.message);
          return;
        }
        const stats = data as Partial<{
          registrations_today: number;
          registrations_yesterday: number;
          top_department: string | null;
          top_department_count: number;
          department_kinds: number;
          stamps: number;
        }> | null;
        if (!stats) return;
        setExtra({
          registrationsToday: typeof stats.registrations_today === "number" ? stats.registrations_today : null,
          registrationsYesterday: typeof stats.registrations_yesterday === "number" ? stats.registrations_yesterday : null,
          topDepartment: stats.top_department ?? null,
          topDepartmentCount: typeof stats.top_department_count === "number" ? stats.top_department_count : null,
          departmentKinds: typeof stats.department_kinds === "number" ? stats.department_kinds : null,
          stamps: typeof stats.stamps === "number" ? stats.stamps : null,
        });
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const items = useMemo(() => {
    const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";
    const previous = extra.registrationsYesterday;
    const delta = previous === null || extra.registrationsToday === null ? null : extra.registrationsToday - previous;
    return [
      { eyebrow: "TODAY", value: String(todayExchanged), unit: "人", label: "本日の特典交換" },
      { eyebrow: "NEW REGISTRATIONS", value: extra.registrationsToday === null ? "—" : String(extra.registrationsToday), unit: extra.registrationsToday === null ? "" : "人", label: "本日の新規登録者" },
      { eyebrow: "YESTERDAY", value: previous === null ? "—" : String(previous), unit: previous === null ? "" : "人", label: "昨日の新規登録者" },
      { eyebrow: "DAY OVER DAY", value: delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`, unit: delta === null ? "" : "人", label: "登録者数の前日差" },
      { eyebrow: "TOP DEPARTMENT", value: extra.topDepartmentCount === null ? "—" : String(extra.topDepartmentCount), unit: extra.topDepartmentCount === null ? "" : "人", label: extra.topDepartment ? `参加最多：${extra.topDepartment}` : "学科別参加者トップ" },
      { eyebrow: "DEPARTMENT MIX", value: extra.departmentKinds === null ? "—" : String(extra.departmentKinds), unit: extra.departmentKinds === null ? "" : "学科", label: "参加者の所属学科数" },
      { eyebrow: "COMPLETION RATE", value: pct(completions, participants), unit: "", label: "参加者のスタンプ完走率" },
      { eyebrow: "REDEMPTION RATE", value: pct(exchanged, completions), unit: "", label: "完走者の特典交換率" },
      { eyebrow: "AWAITING EXCHANGE", value: String(Math.max(0, completions - exchanged)), unit: "人", label: "完走済み・特典未交換" },
      { eyebrow: "TOTAL STAMPS", value: extra.stamps === null ? "—" : String(extra.stamps), unit: extra.stamps === null ? "" : "個", label: "累計スタンプ取得数" },
      { eyebrow: "STAMP AVERAGE", value: extra.stamps === null || participants === 0 ? "—" : (extra.stamps / participants).toFixed(1), unit: extra.stamps === null || participants === 0 ? "" : "個", label: "平均スタンプ数／人" },
    ];
  }, [todayExchanged, completions, participants, exchanged, extra]);

  const item = items[index % items.length];

  return (
    <>
      <div
        key={index}
        style={{
          display: "contents",
        }}
      >
        <span style={{ display: "block", minWidth: 0, width: "100%", maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#8a1822", fontSize: 9, fontWeight: 900, letterSpacing: "0.08em", animation: "pokipoStatSwap 380ms ease-out both" }}>
          {item.eyebrow}
        </span>
        <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", animation: "pokipoStatSwap 380ms ease-out both" }}>
          <strong style={{ fontSize: item.value.length >= 7 ? "clamp(20px, 2vw, 32px)" : undefined, whiteSpace: "nowrap" }}>
            {loading ? "—" : item.value}
          </strong>
          <small>{loading ? "" : item.unit}</small>
        </div>
        <p
          style={{
            minWidth: 0,
            maxWidth: "100%",
            marginInline: "auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflowWrap: "normal",
            lineHeight: 1.2,
            fontSize: 10,
            textAlign: "center",
            animation: "pokipoStatSwap 380ms ease-out both",
          }}
          title={item.label}
        >
          {item.label}
        </p>
      </div>
      <div
        aria-label={`${items.length}種類の情報を5秒ごとに切り替え中（${index % items.length + 1}番目）`}
        title={`${items.length}種類の情報を順番に表示しています`}
        style={{
          width: 30,
          height: 10,
          margin: "5px auto 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 5,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {[-1, 0, 1].map((offset) => {
          const active = offset === 0;
          return (
            <span
              key={`${index}-${offset}`}
              aria-hidden="true"
              style={{
                display: "block",
                flex: "0 0 auto",
                width: active ? 6 : 3,
                height: active ? 6 : 3,
                borderRadius: "50%",
                backgroundColor: "#8a1822",
                opacity: active ? 0.9 : 0.22,
                transform: active ? "scale(1)" : "scale(0.8)",
                animation: active ? "pokipoDotAppear 380ms ease-out both" : undefined,
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes pokipoDotAppear {
          from { opacity: 0; transform: translateX(4px) scale(0.55); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes pokipoStatSwap {
          from { opacity: 0.45; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .staffDashboardStatCard.today * { animation: none !important; }
        }
      `}</style>
    </>
  );
}