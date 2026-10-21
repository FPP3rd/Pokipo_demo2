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
  yesterday: number | null;
  topDepartment: string | null;
  topDepartmentCount: number | null;
  departmentKinds: number | null;
  stamps: number | null;
};

function jstYesterdayRange() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (key: string) =>
    Number(parts.find((part) => part.type === key)?.value ?? 0);
  const todayStart = Date.UTC(value("year"), value("month") - 1, value("day"), -9);
  return {
    start: new Date(todayStart - 86400000).toISOString(),
    end: new Date(todayStart).toISOString(),
  };
}

export default function PokipoDashboardRotatingStat({
  loading,
  participants,
  completions,
  exchanged,
  todayExchanged,
}: Props) {
  const [index, setIndex] = useState(0);
  const [extra, setExtra] = useState<Extra>({
    yesterday: null,
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
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      const range = jstYesterdayRange();
      const [previous, departmentRows, stampCount] = await Promise.all([
        supabase.from("reward_exchanges")
          .select("*", { count: "exact", head: true })
          .eq("status", "exchanged")
          .gte("exchanged_at", range.start)
          .lt("exchanged_at", range.end),
        supabase.from("participants").select("department").limit(1000),
        supabase.from("participant_stamps")
          .select("*", { count: "exact", head: true }),
      ]);
      if (!active) return;
      const groups = new Map<string, number>();
      if (!departmentRows.error && departmentRows.data) {
        for (const row of departmentRows.data) {
          const department = typeof row.department === "string" ? row.department.trim() : "";
          if (department) groups.set(department, (groups.get(department) ?? 0) + 1);
        }
      }
      const top = Array.from(groups.entries()).sort((a, b) => b[1] - a[1])[0];
      setExtra({
        yesterday: previous.error ? null : (previous.count ?? 0),
        topDepartment: top?.[0] ?? null,
        topDepartmentCount: top?.[1] ?? null,
        departmentKinds: departmentRows.error ? null : groups.size,
        stamps: stampCount.error ? null : (stampCount.count ?? 0),
      });
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const items = useMemo(() => {
    const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";
    const previous = extra.yesterday;
    const delta = previous === null ? null : todayExchanged - previous;
    return [
      { eyebrow: "TODAY", value: String(todayExchanged), unit: "人", label: "本日の特典交換" },
      { eyebrow: "YESTERDAY", value: previous === null ? "—" : String(previous), unit: previous === null ? "" : "人", label: "昨日の特典交換" },
      { eyebrow: "DAY OVER DAY", value: delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`, unit: delta === null ? "" : "人", label: "特典交換数の前日差" },
      { eyebrow: "TOP DEPARTMENT", value: extra.topDepartmentCount === null ? "—" : String(extra.topDepartmentCount), unit: extra.topDepartmentCount === null ? "" : "人", label: extra.topDepartment ? `参加最多：${extra.topDepartment}` : "学科別参加者トップ" },
      { eyebrow: "DEPARTMENT MIX", value: extra.departmentKinds === null ? "—" : String(extra.departmentKinds), unit: extra.departmentKinds === null ? "" : "学科", label: "参加者の所属学科数" },
      { eyebrow: "COMPLETION RATE", value: pct(completions, participants), unit: "", label: "参加者のスタンプ完走率" },
      { eyebrow: "REDEMPTION RATE", value: pct(exchanged, completions), unit: "", label: "完走者の特典交換率" },
      { eyebrow: "AWAITING EXCHANGE", value: String(Math.max(0, completions - exchanged)), unit: "人", label: "完走済み・特典未交換" },
      { eyebrow: "TOTAL STAMPS", value: extra.stamps === null ? "—" : String(extra.stamps), unit: extra.stamps === null ? "" : "個", label: "累計スタンプ取得数" },
      { eyebrow: "STAMP AVERAGE", value: extra.stamps === null || participants === 0 ? "—" : (extra.stamps / participants).toFixed(1), unit: extra.stamps === null || participants === 0 ? "" : "個", label: "参加者1人あたりの平均スタンプ数" },
    ];
  }, [todayExchanged, completions, participants, exchanged, extra]);

  const item = items[index % items.length];

  return (
    <>
      <span style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.eyebrow}</span>
      <div>
        <strong style={{ fontSize: item.value.length >= 7 ? "clamp(20px, 2vw, 32px)" : undefined, whiteSpace: "nowrap" }}>
          {loading ? "—" : item.value}
        </strong>
        <small>{loading ? "" : item.unit}</small>
      </div>
      <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.label}>{item.label}</p>
    </>
  );
}