"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Key = "participants" | "completions" | "surveys" | "exchanges";
type Counts = Record<Key, number>;
type DayRow = Counts & { day: string };
type Comparison = Record<Key, { current: number; previous: number; yesterday: number }>;
type Result = {
  days: number;
  records: DayRow[];
  comparison: Comparison;
  generatedAt: string;
  note: string;
  error?: string;
};
const SERIES: { key: Key; label: string; color: string }[] = [
  { key: "participants", label: "参加登録", color: "#8a1822" },
  { key: "completions", label: "5か所達成", color: "#c78b45" },
  { key: "surveys", label: "参加後アンケート", color: "#6c8896" },
  { key: "exchanges", label: "特典交換", color: "#4d8662" },
];
const dummyValues = [
  [18, 6, 2, 0], [27, 13, 8, 0], [37, 25, 17, 0],
  [31, 28, 24, 0], [45, 33, 28, 0], [35, 26, 24, 0], [52, 43, 40, 29],
];
const DEMO: Result = {
  days: 7,
  records: dummyValues.map((n, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000);
    return {
      day: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(date),
      participants: n[0], completions: n[1], surveys: n[2], exchanges: n[3],
    };
  }),
  comparison: {
    participants: { current: 9, previous: 13, yesterday: 6 },
    completions: { current: 5, previous: 8, yesterday: 4 },
    surveys: { current: 4, previous: 7, yesterday: 2 },
    exchanges: { current: 3, previous: 6, yesterday: 0 },
  },
  generatedAt: new Date().toISOString(),
  note: "模擬用データです。",
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default function StaffTrendsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [days, setDays] = useState(14);
  const [live, setLive] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [activeSeries, setActiveSeries] = useState<Key>("participants");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const { data, error: loginError } = await supabase.auth.getUser();
        if (!active || loginError || !data.user) return;
        const { data: staff, error: staffError } = await supabase
          .from("staff_profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
        if (active) setAuthorized(Boolean(staff && !staffError));
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    void check();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authorized || mode !== "live") return;
    let cancelled = false;
    async function load() {
      setLoadingLive(true);
      setError("");
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("再ログインしてください。");
        const response = await fetch(`/api/staff/trends?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        const json = (await response.json()) as Result;
        if (!response.ok) throw new Error(json.error || "データ取得に失敗しました。");
        if (!cancelled) setLive(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "通信エラー");
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [authorized, mode, days]);

  const data = mode === "demo" ? DEMO : live;
  const totals = useMemo(() => {
    const sums = { participants: 0, completions: 0, surveys: 0, exchanges: 0 };
    data?.records.forEach(row => SERIES.forEach(s => { sums[s.key] += row[s.key]; }));
    return sums;
  }, [data]);
  const maxValue = Math.max(1, ...(data?.records.map(row => row[activeSeries]) ?? []));
  const selected = SERIES.find(s => s.key === activeSeries) ?? SERIES[0];

  if (authLoading) return <main className="shell"><p>管理者情報を確認中...</p></main>;
  if (!authorized) return <main className="shell"><section className="pokipoTrendAccessDenied">
    <p>スタッフログインが必要です。</p>
    <button type="button" onClick={() => router.push("/staff/reward")}>ログインへ</button>
  </section></main>;

  return (
    <main className="shell pokipoTrendsPage">
      <section className="pokipoTrendsInner">
        <header className="pokipoTrendsHeader">
          <span className="pokipoTrendsEyebrow">POKIPO STAFF / DATA</span>
          <h1>参加動向分析</h1>
          <p>参加状況を日別・時間帯別に確認できます。</p>
        </header>

        <button type="button" className="pokipoTrendsBack" onClick={() => router.push("/staff/dashboard")}>← 管理ダッシュボードに戻る</button>

        <div className="pokipoTrendsToolbar">
          <div className="pokipoTrendsModeGroup" role="group" aria-label="集計モード">
            <button type="button" aria-pressed={mode === "demo"} onClick={() => setMode("demo")}>模擬データ</button>
            <button type="button" aria-pressed={mode === "live"} onClick={() => setMode("live")}>本番集計</button>
          </div>
          {mode === "live" && (
            <select value={days} aria-label="集計期間" onChange={e => { setLive(null); setDays(Number(e.target.value)); }}>
              <option value={7}>直近7日</option><option value={14}>直近14日</option><option value={31}>直近31日</option>
            </select>
          )}
        </div>
        {mode === "demo" && <p className="pokipoTrendsDemoNote">DEMO / 数値はすべてダミーです</p>}
        {error && <p role="alert" className="pokipoTrendsError">{error}</p>}
        {!data ? <div className="pokipoTrendsPanel" role="status">{loadingLive ? "本番データを読み込み中..." : "本番データを準備中..."}</div> : <>
          <section className="pokipoTrendsStats" aria-label="期間中の集計件数">
            {SERIES.map(item => <article className="pokipoTrendsStat" key={item.key}>
              <span className="pokipoTrendsStatMarker" style={{ background: item.color }} />
              <span className="pokipoTrendsStatName">{item.label}</span>
              <strong>{totals[item.key].toLocaleString()}<small>件</small></strong>
            </article>)}
          </section>

          <section className="pokipoTrendsPanel">
            <div className="pokipoTrendsSectionHeading">
              <span>HOURLY COMPARISON</span><h2>時間帯ごとの比較</h2>
            </div>
            <p className="pokipoTrendsHint">現在の1時間枠は集計途中です。比較値は確定した1時間とは条件が異なります。</p>
            <div className="pokipoTrendsCompareGrid">
              {SERIES.map(item => {
                const v = data.comparison[item.key];
                const diff = v.current - v.previous;
                return <article key={item.key} className="pokipoTrendsCompareCard">
                  <h3><span style={{ background: item.color }} />{item.label}</h3>
                  <div className="pokipoTrendsCurrent">{v.current}<small>件 / 現在の時間帯</small></div>
                  <div className="pokipoTrendsComparePairs">
                    <div><span>前の時間帯</span><strong>{v.previous}件</strong></div>
                    <div><span>前日同時間帯</span><strong>{v.yesterday}件</strong></div>
                    <div><span>前時間帯との差</span><strong>{diff > 0 ? "+" : ""}{diff}件</strong></div>
                  </div>
                </article>;
              })}
            </div>
          </section>

          <section className="pokipoTrendsPanel">
            <div className="pokipoTrendsSectionHeading"><span>DAILY ACTIVITY</span><h2>日別の参加動向</h2></div>
            <p className="pokipoTrendsHint">見たい項目を選んで、1種類ずつ大きく表示できます。</p>
            <div className="pokipoTrendsSeriesTabs" role="group" aria-label="表示する項目">
              {SERIES.map(item => <button type="button" aria-pressed={activeSeries === item.key}
                onClick={() => setActiveSeries(item.key)} key={item.key}>{item.label}</button>)}
            </div>
            <div className="pokipoTrendsChart" role="img" aria-label={`${selected.label}の日別件数の棒グラフ`}>
              {data.records.map(row => <div className="pokipoTrendsBarRow" key={row.day}>
                <span>{row.day.slice(5).replace("-", "/")}</span>
                <div className="pokipoTrendsBarTrack"><div className="pokipoTrendsBar" style={{ width: `${row[activeSeries] / maxValue * 100}%`, background: selected.color }} /></div>
                <strong>{row[activeSeries]}</strong>
              </div>)}
            </div>
            <p className="pokipoTrendsHint">各日に新しく発生した件数です。累積人数ではありません。</p>
          </section>
          <p className="pokipoTrendsUpdated">最終更新：{formatDate(data.generatedAt)}　/　読み取り専用</p>
        </>}
      </section>
    </main>
  );
}