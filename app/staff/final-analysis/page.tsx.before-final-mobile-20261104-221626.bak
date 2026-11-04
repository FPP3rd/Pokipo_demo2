"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

/** サービス終了日の翌日0時（JST）。この時刻以降の新規記録を分析対象から除外する。 */
const END = Date.parse("2026-11-05T00:00:00+09:00");
const START = Date.parse("2026-10-13T00:00:00+09:00");
const SECOND = Date.parse("2026-10-28T00:00:00+09:00");
const SPOTS: Record<string, string> = {
  spot1: "学生センター",
  spot2: "東棟2階",
  spot3: "ゆうちょ銀行ATM付近",
  spot4: "ラーニングスクエア",
  spot5: "セブンイレブン付近",
};
const SPOT_IDS = Object.keys(SPOTS);
const SCORE_METRICS = [
  { key: "interest_score", title: "ポッキーへの興味" },
  { key: "eat_intent_score", title: "今後食べたい気持ち" },
  { key: "share_intent_score", title: "シェアしたい気持ち" },
] as const;
type ScoreKey = (typeof SCORE_METRICS)[number]["key"];
type Stamp = { spot_id: string; acquired_at: string };
type Person = {
  id: string; nickname: string | null; grade: string | null; department: string | null;
  created_at: string; stamps: Stamp[];
  pre_survey_answered?: boolean; post_survey_answered?: boolean; reward_exchanged?: boolean;
};
type Pre = {
  participant_id: string; created_at: string; gender: string | null;
  pocky_frequency: string | null; knew_renewal: boolean | null;
  has_shared_pocky: boolean | null; share_situation: string | null;
  interest_score: number | null; eat_intent_score: number | null;
  share_intent_score: number | null; pocky_value_understanding?: number | null;
  cocoa_social_understanding?: number | null;
};
type Post = {
  participant_id: string; created_at: string;
  interest_score: number | null; eat_intent_score: number | null;
  share_intent_score: number | null; renewal_understanding_score: number | null;
  memorable_point: string | null;
};
type Exchange = {
  participant_id: string; status: string; created_at: string; exchanged_at: string | null;
};
type Dataset = { people: Person[]; pre: Pre[]; post: Post[]; exchanges: Exchange[]; fetched: string };
type Scope = "all" | "first" | "second";
type Tab = "summary" | "journey" | "survey" | "exchange" | "segments";
type GroupRow = { label: string; value: number };

function dateValue(value: string | null | undefined) { const n = value ? Date.parse(value) : NaN; return Number.isFinite(n) ? n : 0; }
function inEvent(value: string | null | undefined) { const n = dateValue(value); return n >= START && n < END; }
function isBeforeEnd(value: string | null | undefined) { const n = dateValue(value); return n > 0 && n < END; }
function day(value: string) { return new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); }
function hour(value: string) { return new Date(value).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false }).slice(0, 2); }
function num(value: number) { return value.toLocaleString("ja-JP"); }
function rate(a: number, b: number) { return b ? `${(a * 100 / b).toFixed(1)}%` : "—"; }
function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }
function fmtAvg(n: number | null, digits = 2) { return n === null ? "—" : n.toFixed(digits); }
function numeric(n: unknown): n is number { return typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 4; }
function group(values: (string | null | undefined)[]) {
  const m = new Map<string, number>();
  for (const value of values) { const k = String(value || "未回答・未設定"); m.set(k, (m.get(k) || 0) + 1); }
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "ja"));
}
function cleanCsvCell(v: string | number) {
  let s = String(v);
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function exportCsv(rows: (string | number)[][]) {
  const content = "\uFEFF" + rows.map(r => r.map(cleanCsvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "POKIPO_サービス終了時点_集計.csv";
  document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Supabase Data API のデフォルト1000件制限を考慮して全ページ取得 */
async function readAll<T>(table: "pokipo_official_pre_surveys" | "pokipo_official_post_surveys" | "pokipo_official_reward_exchanges", columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order("created_at", { ascending: true }).range(offset, offset + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data || []) as unknown as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw new Error(`${table}: 100,000件を超えたため取得を中止しました`);
}

function Panel({ title, eyebrow, note, children }: { title: string; eyebrow?: string; note?: string; children: React.ReactNode }) {
  return <section className="faPanel">
    {eyebrow && <span className="faEyebrow">{eyebrow}</span>}
    <h2>{title}</h2>{note && <p className="faNote">{note}</p>}{children}
  </section>;
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="faStat"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;
}
function Bars({ rows, unit = "人", maxRows = 30 }: { rows: GroupRow[]; unit?: string; maxRows?: number }) {
  const list = rows.slice(0, maxRows), max = Math.max(1, ...list.map(r => r.value));
  return <div className="faBars">{list.length === 0 ? <p className="faNote">該当データはありません。</p> : list.map(r =>
    <div className="faBar" key={r.label}>
      <span title={r.label}>{r.label}</span><div className="faTrack"><div style={{ width: `${Math.max(0, r.value / max * 100)}%` }} /></div>
      <strong>{num(r.value)}{unit}</strong>
    </div>)}</div>;
}
function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return <div className="faTableScroll"><table className="faTable"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default function FinalAnalysisPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<"loading" | "ok" | "denied">("loading");
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("summary");
  const [scope, setScope] = useState<Scope>("all");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const u = await supabase.auth.getUser();
        if (u.error || !u.data.user) { if (active) setAuth("denied"); return; }
        const s = await supabase.from("staff_profiles").select("admin_id").eq("user_id", u.data.user.id).maybeSingle();
        if (active) setAuth(s.error || s.data?.admin_id !== "lipost-furuya" ? "denied" : "ok");
      } catch { if (active) setAuth("denied"); }
    })();
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (auth !== "ok") return;
    setLoading(true); setError("");
    try {
      const owner = await supabase.rpc("pokipo_furuya_participant_list");
      if (owner.error) throw new Error(`参加者情報: ${owner.error.message}`);
      if (!Array.isArray(owner.data)) throw new Error("参加者一覧RPCが配列を返しませんでした");
      const [pre, post, exchanges] = await Promise.all([
        readAll<Pre>("pokipo_official_pre_surveys", "participant_id,created_at,gender,pocky_frequency,knew_renewal,has_shared_pocky,share_situation,interest_score,eat_intent_score,share_intent_score,pocky_value_understanding,cocoa_social_understanding"),
        readAll<Post>("pokipo_official_post_surveys", "participant_id,created_at,interest_score,eat_intent_score,share_intent_score,renewal_understanding_score,memorable_point"),
        readAll<Exchange>("pokipo_official_reward_exchanges", "participant_id,status,created_at,exchanged_at"),
      ]);
      setData({ people: owner.data as Person[], pre, post, exchanges, fetched: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) });
    } catch (e) { setError(e instanceof Error ? e.message : "読み込みに失敗しました"); }
    finally { setLoading(false); }
  }, [auth]);
  useEffect(() => { if (auth === "ok") void refresh(); }, [auth, refresh]);

  const analysis = useMemo(() => {
    if (!data) return null;
    const official = data.people.filter(p => p.nickname !== "lipost-furuya-test" && inEvent(p.created_at));
    const people = official.filter(p => scope === "all" || (scope === "first" ? dateValue(p.created_at) < SECOND : dateValue(p.created_at) >= SECOND));
    const ids = new Set(people.map(p => p.id));
    const stampsOf = (p: Person) => (Array.isArray(p.stamps) ? p.stamps : []).filter(s => isBeforeEnd(s.acquired_at) && SPOT_IDS.includes(s.spot_id)).sort((a, b) => dateValue(a.acquired_at) - dateValue(b.acquired_at));
    const distinct = (p: Person) => new Set(stampsOf(p).map(s => s.spot_id)).size;
    const done = people.filter(p => distinct(p) === 5);
    const stamped = people.filter(p => distinct(p) > 0);
    const pre = data.pre.filter(s => ids.has(s.participant_id) && isBeforeEnd(s.created_at));
    const post = data.post.filter(s => ids.has(s.participant_id) && isBeforeEnd(s.created_at));
    const firstPre = new Map<string, Pre>();
    const firstPost = new Map<string, Post>();
    for (const p of [...pre].sort((a,b)=>dateValue(a.created_at)-dateValue(b.created_at))) if (!firstPre.has(p.participant_id)) firstPre.set(p.participant_id,p);
    for (const p of [...post].sort((a,b)=>dateValue(a.created_at)-dateValue(b.created_at))) if (!firstPost.has(p.participant_id)) firstPost.set(p.participant_id,p);
    const pairs = [...firstPre].flatMap(([id,p]) => { const q=firstPost.get(id); return q ? [{ id, pre:p, post:q }] : []; });
    const exchange = data.exchanges.filter(e => ids.has(e.participant_id) && e.status === "exchanged" && isBeforeEnd(e.exchanged_at));
    const exchangedIds = new Set(exchange.map(e => e.participant_id));
    const issuedIds = new Set(data.exchanges.filter(e => ids.has(e.participant_id) && isBeforeEnd(e.created_at)).map(e => e.participant_id));
    const stampRows = people.flatMap(p => stampsOf(p).map(s => ({ participant_id: p.id, ...s })));
    const spotRows = SPOT_IDS.map(id => ({ label: SPOTS[id], value: people.filter(p => stampsOf(p).some(s => s.spot_id === id)).length }));
    const levels = Array.from({ length: 6 }, (_, i) => ({ label: `${i}か所`, value: people.filter(p => distinct(p) === i).length }));
    const elapsed = done.map(p => { const rows = stampsOf(p); const unique = new Set<string>(); const relevant: Stamp[]=[];
      for (const s of rows) if (!unique.has(s.spot_id)) { unique.add(s.spot_id); relevant.push(s); }
      if (relevant.length < 5) return null;
      const delta = (dateValue(relevant[4].acquired_at) - dateValue(relevant[0].acquired_at)) / 60000;
      return delta >= 0 ? delta : null;
    }).filter((x):x is number=> x !== null);
    const firstSpots = group(people.map(p => stampsOf(p)[0]?.spot_id).filter(Boolean).map(s => SPOTS[s!] || s!));
    const lastSpots = group(done.map(p => { const a=stampsOf(p), u=new Set<string>(); const unique=a.filter(s=>!u.has(s.spot_id)&&!!u.add(s.spot_id)); return SPOTS[unique[4]?.spot_id] || "不明"; }));
    const routeNames = done.map(p => { const u = new Set<string>(); return stampsOf(p).filter(s=>!u.has(s.spot_id)&&!!u.add(s.spot_id)).map(s => SPOT_IDS.indexOf(s.spot_id) + 1).join("→"); });
    const routes = group(routeNames);
    const byDate = (values:string[])=>group(values.map(day)).sort((a,b)=>a.label.localeCompare(b.label));
    const dayRegistration = byDate(people.map(p=>p.created_at));
    const dayStamps = byDate(stampRows.map(s=>s.acquired_at));
    const dayExchanges = byDate(exchange.filter(e=>e.exchanged_at).map(e=>e.exchanged_at!));
    const hourRegistrations = group(people.map(p=>hour(p.created_at)+"時")).sort((a,b)=>a.label.localeCompare(b.label));
    const hourStamps = group(stampRows.map(s=>hour(s.acquired_at)+"時")).sort((a,b)=>a.label.localeCompare(b.label));
    const grade = group(people.map(p=>p.grade));
    const department = group(people.map(p=>p.department));
    const gender = group([...firstPre.values()].map(p=>p.gender));
    const frequency = group([...firstPre.values()].map(p=>p.pocky_frequency));
    const sharing = group([...firstPre.values()].map(p=>p.has_shared_pocky===null?"無回答":p.has_shared_pocky?"シェア経験あり":"シェア経験なし"));
    const renewal = group([...firstPre.values()].map(p=>p.knew_renewal===null?"無回答":p.knew_renewal?"リニューアル認知あり":"リニューアル認知なし"));
    const memorable = group([...firstPost.values()].map(p=>p.memorable_point).filter((s):s is string=>Boolean(s && s.trim())));
    const grades = grade.map(g=>{const persons=people.filter(p=>(p.grade || "未回答・未設定")===g.label);return [g.label,persons.length,persons.filter(p=>distinct(p)===5).length,persons.filter(p=>exchangedIds.has(p.id)).length] as (string|number)[];});
    const departments = department.map(g=>{const persons=people.filter(p=>(p.department || "未回答・未設定")===g.label);return [g.label,persons.length,persons.filter(p=>distinct(p)===5).length,persons.filter(p=>exchangedIds.has(p.id)).length] as (string|number)[];});
    const duplicateStamps = stampRows.length - people.reduce((n,p)=>n+distinct(p),0);
    const scores = SCORE_METRICS.map(m=>{
      const before=[...firstPre.values()].map(p=>p[m.key]).filter(numeric), after=[...firstPost.values()].map(p=>p[m.key]).filter(numeric);
      const matched=pairs.filter(x=>numeric(x.pre[m.key])&&numeric(x.post[m.key]));
      const bp=matched.map(x=>x.pre[m.key] as number), ap=matched.map(x=>x.post[m.key] as number);
      const improvement=matched.filter(x=>(x.post[m.key] as number)>(x.pre[m.key] as number)).length;
      const unchanged=matched.filter(x=>(x.post[m.key] as number)===(x.pre[m.key] as number)).length;
      return { title:m.title, before, after, matched, beforePair:avg(bp), afterPair:avg(ap), delta:bp.length?avg(ap)!-avg(bp)!:null,
        improvement, unchanged, decreased:matched.length-improvement-unchanged,
        beforePositive:before.filter(n=>n>=3).length, afterPositive:after.filter(n=>n>=3).length,
        beforeDistribution:group(before.map(x=>`${x}点`)).sort((a,b)=>a.label.localeCompare(b.label)),
        afterDistribution:group(after.map(x=>`${x}点`)).sort((a,b)=>a.label.localeCompare(b.label))};
    });
    const changesByDay = ["2026-10-27", "2026-11-04"].map(d=>({label:d,value:exchange.filter(e=>e.exchanged_at && day(e.exchanged_at)===d).length}));
    const total = people.length;
    // 追加分析：終了時点の取得履歴に限定し、個人を特定する内容は表示しない。
    const firstStampDelay = stamped.map(p => (dateValue(stampsOf(p)[0]?.acquired_at) - dateValue(p.created_at)) / 60000).filter(v => Number.isFinite(v) && v >= 0);
    const completionDetails = done.map(p => {
      const unique = new Set<string>();
      const s = stampsOf(p).filter(x => !unique.has(x.spot_id) && !!unique.add(x.spot_id));
      return { id: p.id, first: s[0]?.acquired_at || "", completed: s[4]?.acquired_at || "", duration: (dateValue(s[4]?.acquired_at) - dateValue(s[0]?.acquired_at)) / 60000 };
    }).filter(x => !!x.completed && Number.isFinite(x.duration) && x.duration >= 0);
    const completionByDay = byDate(completionDetails.map(x => x.completed));
    const completionByHour = group(completionDetails.map(x => hour(x.completed) + "時")).sort((a,b)=>a.label.localeCompare(b.label));
    const stampByWeekday = group(stampRows.map(x => new Date(x.acquired_at).toLocaleDateString("ja-JP", { timeZone:"Asia/Tokyo", weekday:"long" })));
    const registrationByWeekday = group(people.map(x => new Date(x.created_at).toLocaleDateString("ja-JP", { timeZone:"Asia/Tokyo", weekday:"long" })));
    const completionSameDay = completionDetails.filter(x => day(x.first) === day(x.completed)).length;
    const completionBuckets = [
      { label:"30分以内", value: completionDetails.filter(x=>x.duration<=30).length },
      { label:"30分超〜60分", value: completionDetails.filter(x=>x.duration>30&&x.duration<=60).length },
      { label:"1時間超〜3時間", value: completionDetails.filter(x=>x.duration>60&&x.duration<=180).length },
      { label:"3時間超〜当日内", value: completionDetails.filter(x=>x.duration>180&&day(x.first)===day(x.completed)).length },
      { label:"日付をまたぐ", value: completionDetails.filter(x=>day(x.first)!==day(x.completed)).length },
    ];
    const firstStampBuckets = [
      { label:"登録後15分以内", value:firstStampDelay.filter(x=>x<=15).length },
      { label:"15分超〜60分", value:firstStampDelay.filter(x=>x>15&&x<=60).length },
      { label:"1時間超〜24時間", value:firstStampDelay.filter(x=>x>60&&x<=1440).length },
      { label:"24時間超", value:firstStampDelay.filter(x=>x>1440).length },
    ];
    const repeatStampPeople = people.filter(p=>stampsOf(p).length>distinct(p)).length;
    const exchangeByHour = group(exchange.filter(e=>e.exchanged_at).map(e=>hour(e.exchanged_at!)+"時")).sort((a,b)=>a.label.localeCompare(b.label));
    const exchangeDelay = completionDetails.flatMap(c => {
      const exchanged = exchange.filter(e=>e.participant_id===c.id&&e.exchanged_at&&dateValue(e.exchanged_at)>=dateValue(c.completed)).sort((a,b)=>dateValue(a.exchanged_at)-dateValue(b.exchanged_at))[0];
      return exchanged ? [(dateValue(exchanged.exchanged_at)-dateValue(c.completed))/60000] : [];
    }).filter(v=>Number.isFinite(v)&&v>=0);
    const exchangeDelayBuckets = [
      {label:"完走後30分以内",value:exchangeDelay.filter(v=>v<=30).length},
      {label:"30分超〜3時間",value:exchangeDelay.filter(v=>v>30&&v<=180).length},
      {label:"3時間超〜1日",value:exchangeDelay.filter(v=>v>180&&v<=1440).length},
      {label:"1日超",value:exchangeDelay.filter(v=>v>1440).length},
    ];
    const exchangedAfterIssue = data.exchanges.filter(e=>ids.has(e.participant_id)&&e.status==="exchanged"&&isBeforeEnd(e.exchanged_at)&&isBeforeEnd(e.created_at)&&dateValue(e.exchanged_at)>=dateValue(e.created_at)).map(e=>(dateValue(e.exchanged_at)-dateValue(e.created_at))/60000);
    const registrationHalf = [
      {label:"前半（10/13〜10/27）",value:people.filter(p=>dateValue(p.created_at)<SECOND).length},
      {label:"延長（10/28〜11/4）",value:people.filter(p=>dateValue(p.created_at)>=SECOND).length},
    ];
    const completionByCohort = registrationHalf.map(x=>({label:x.label,value:done.filter(p=>x.label.startsWith("前半")?dateValue(p.created_at)<SECOND:dateValue(p.created_at)>=SECOND).length}));
    const exchangedByCohort = registrationHalf.map(x=>({label:x.label,value:people.filter(p=>exchangedIds.has(p.id)&&(x.label.startsWith("前半")?dateValue(p.created_at)<SECOND:dateValue(p.created_at)>=SECOND)).length}));
    const spotReachRates = spotRows.map(x=>({label:x.label,value:total?Number((x.value/total*100).toFixed(1)):0}));
    return { officialCount: official.length, total, people, pre, post, firstPre, firstPost, pairs, done, stamped,
      distinct, stampsOf, stampRows, duplicateStamps, exchange, exchangedIds, issuedIds, spotRows, levels, elapsed,
      firstSpots,lastSpots,routes,dayRegistration,dayStamps,dayExchanges,hourRegistrations,hourStamps,
      grade,department,gender,frequency,sharing,renewal,memorable,grades,departments,scores,changesByDay,
      firstStampDelay,completionDetails,completionByDay,completionByHour,stampByWeekday,registrationByWeekday,
      completionSameDay,completionBuckets,firstStampBuckets,repeatStampPeople,exchangeByHour,exchangeDelay,
      exchangeDelayBuckets,exchangedAfterIssue,registrationHalf,completionByCohort,exchangedByCohort,spotReachRates,
    };
  }, [data, scope]);

  if (auth === "loading") return <main className="shell"><div style={{padding:30}}>管理権限を確認しています...</div></main>;
  if (auth === "denied") return <main className="shell"><div style={{padding:30}}><h1>閲覧権限がありません</h1><p>最終分析は lipost-furuya 専用です。</p><button onClick={()=>router.push("/staff")}>管理メニューへ</button></div></main>;

  const tabs: { id:Tab; title:string }[] = [
    {id:"summary",title:"総合サマリー"},{id:"journey",title:"回遊・行動分析"},{id:"survey",title:"アンケート分析"},
    {id:"exchange",title:"交換・到達分析"},{id:"segments",title:"属性・比較分析"},
  ];
  const reportRows: (string|number)[][] = analysis ? [
    ["集計基準","2026-11-04 23:59 JSTまでの記録"],
    ["登録者",analysis.total],["スタンプ取得者",analysis.stamped.length],["5か所達成者（現存スタンプから算出）",analysis.done.length],
    ["スタンプ記録件数",analysis.stampRows.length],["参加前回答者",analysis.firstPre.size],["参加後回答者",analysis.firstPost.size],
    ["前後両回答者",analysis.pairs.length],["特典交換者",analysis.exchangedIds.size],
    ["スタンプ取得重複件数",analysis.duplicateStamps],
    ...analysis.spotRows.map(r=>["スポット到達："+r.label,r.value]),
    ...analysis.scores.flatMap(s=>[[s.title+"・対応ペア数",s.matched.length],[s.title+"・対応前平均",fmtAvg(s.beforePair)],[s.title+"・対応後平均",fmtAvg(s.afterPair)],[s.title+"・平均差",fmtAvg(s.delta)]]),
  ] : [];

  return <main className="shell faPage"><div className="faContainer">
    <header className="faHero">
      <div><span className="faEyebrow">POKIPO STAFF / FINAL REPORT</span><h1>サービス終了時点・最終分析</h1>
        <p>LiPost × 江崎グリコ株式会社　｜　2026年10月13日〜11月4日</p>
        <span className="faHeroChip">集計基準：2026年11月4日 23:59（日本時間）</span>
      </div><div className="faHeroActions"><button onClick={()=>router.push("/staff")}>← 管理メニュー</button><button onClick={()=>void refresh()} disabled={loading}>{loading?"取得中...":"↻ データを再取得"}</button>
        <button onClick={()=>exportCsv([["項目","値"],...reportRows])} disabled={!analysis}>集計CSVを保存</button></div>
    </header>
    <p className="faCaution">この画面は集計結果を表示する参照専用機能です。2026/11/5 0:00以降の新規記録は除外しますが、過去の記録が後日修正・削除された場合、再取得結果も変化します。終了当時の完全固定スナップショットではありません。運営用テスト名「lipost-furuya-test」は除外しています。</p>
    {data && <p className="faFetched">取得日時：{data.fetched} ／ データ更新は「再取得」ボタンで実行</p>}
    {error && <div className="faError" role="alert">取得エラー：{error}</div>}
    {loading && !data && <div className="faPanel">集計データを取得しています...</div>}
    {analysis && <>
      <div className="faScope" aria-label="登録時期による対象選択"><strong>参加者の登録時期で絞り込み</strong>
        <div>{([{id:"all",label:"全期間"},{id:"first",label:"10/13〜10/27登録"},{id:"second",label:"10/28〜11/4登録"}] as const).map(x=><button key={x.id} aria-pressed={scope===x.id} onClick={()=>setScope(x.id)}>{x.label}</button>)}</div>
        <small>参加者の登録日時でグループ化します。行動や交換は、その参加者の終了日までの全記録を集計します。</small>
      </div>
      <nav className="faTabs" aria-label="分析カテゴリ">{tabs.map(x=><button key={x.id} aria-pressed={tab===x.id} onClick={()=>setTab(x.id)}>{x.title}</button>)}</nav>
      {tab==="summary" && <>
        <div className="faStatGrid">
          <Stat label="参加登録者" value={`${num(analysis.total)}人`} sub="運営テスト除外"/>
          <Stat label="1か所以上取得" value={`${num(analysis.stamped.length)}人`} sub={`登録者の ${rate(analysis.stamped.length,analysis.total)}`}/>
          <Stat label="5か所達成" value={`${num(analysis.done.length)}人`} sub={`登録者の ${rate(analysis.done.length,analysis.total)}`}/>
          <Stat label="特典交換済み" value={`${num(analysis.exchangedIds.size)}人`} sub={`達成者比 ${rate([...analysis.exchangedIds].filter(id=>analysis.done.some(p=>p.id===id)).length,analysis.done.length)}`}/>
          <Stat label="参加前回答者" value={`${num(analysis.firstPre.size)}人`} sub={`登録者比 ${rate(analysis.firstPre.size,analysis.total)}`}/>
          <Stat label="参加後回答者" value={`${num(analysis.firstPost.size)}人`} sub={`登録者比 ${rate(analysis.firstPost.size,analysis.total)}`}/>
          <Stat label="スタンプ取得件数" value={`${num(analysis.stampRows.length)}件`} sub="重複を含む実レコード"/>
          <Stat label="前後両回答者" value={`${num(analysis.pairs.length)}人`} sub="同一参加者の回答が揃った人数"/>
        </div>
        <div className="faTwo">
          <Panel title="到達ステップ別の人数" eyebrow="FUNNEL" note="前後アンケートとスタンプ達成は必ずしも同じ順序で発生しません。各人数の包含関係を保証するファネルではありません。">
            <Bars rows={[{label:"登録",value:analysis.total},{label:"スタンプ1か所以上",value:analysis.stamped.length},{label:"5か所達成",value:analysis.done.length},{label:"参加後回答",value:analysis.firstPost.size},{label:"特典交換",value:analysis.exchangedIds.size}]}/>
          </Panel>
          <Panel title="取得スポット数の分布" eyebrow="PROGRESS"><Bars rows={analysis.levels}/></Panel>
        </div>
        <div className="faTwo"><Panel title="日別登録者数" eyebrow="DAILY SIGNUPS"><Bars rows={analysis.dayRegistration} maxRows={32}/></Panel>
          <Panel title="日別スタンプ取得件数" eyebrow="DAILY SCANS"><Bars rows={analysis.dayStamps} unit="件" maxRows={32}/></Panel></div>
        <Panel title="分析結果の読み方" eyebrow="RESEARCH NOTES"><ul><li>完走は、終了日時までに現在のDBに残る5種類のスタンプが揃った状態で判定しています。修正履歴・完走テーブルの認定日時とは異なる場合があります。</li><li>特典交換は、公式交換テーブルのステータスが交換済み、かつ交換日時が終了日以前のものを数えます。後日の取消・復旧によって値は変わります。</li><li>人数の割合には、表示した母数を使用します。アンケート回答者は参加者全体の無作為標本ではありません。</li><li>前後比較は相関・変化の記述です。POKIPOが変化を引き起こしたと断定する分析ではありません。</li></ul></Panel>
      </>}
      {tab==="journey" && <>
        <div className="faStatGrid"><Stat label="1人あたり平均取得件数" value={analysis.total ? fmtAvg(analysis.stampRows.length/analysis.total) : "—"} sub="重複含む"/>
          <Stat label="取得記録の重複" value={`${num(analysis.duplicateStamps)}件`} sub="同一人物・同一スポットの2件目以降"/>
          <Stat label="完走者の平均回遊時間" value={analysis.elapsed.length?`${fmtAvg(avg(analysis.elapsed),1)}分`:"—"} sub="最初と5種類目の取得差"/>
          <Stat label="完走者の回遊時間中央値" value={analysis.elapsed.length?`${fmtAvg(avg([...analysis.elapsed].sort((a,b)=>a-b).slice(Math.floor((analysis.elapsed.length-1)/2),Math.floor(analysis.elapsed.length/2)+1)),1)}分`:"—"} sub="日をまたぐ場合も計上"/></div>
        <div className="faTwo"><Panel title="スポット別到達者数" eyebrow="SPOT REACH" note="同一参加者の同一スポットは1人として数えます。"><Bars rows={analysis.spotRows}/></Panel>
          <Panel title="最初に取得したスポット" eyebrow="FIRST TOUCH"><Bars rows={analysis.firstSpots}/></Panel></div>
        <div className="faTwo"><Panel title="5種類目に取得したスポット" eyebrow="FINAL TOUCH"><Bars rows={analysis.lastSpots}/></Panel>
          <Panel title="人気の回遊順序（上位10件）" eyebrow="ROUTES" note="スポット番号は 1:学生センター、2:東棟2階、3:ゆうちょATM、4:ラーニングスクエア、5:セブン付近。重複の初回のみ採用。"><Bars rows={analysis.routes} unit="人" maxRows={10}/></Panel></div>
        <div className="faTwo"><Panel title="登録が多かった時間帯" eyebrow="SIGNUP HOURS"><Bars rows={analysis.hourRegistrations}/></Panel>
          <Panel title="QR読み取りが多かった時間帯" eyebrow="SCAN HOURS"><Bars rows={analysis.hourStamps} unit="件"/></Panel></div>
      </>}
      {tab==="survey" && <>
        <div className="faStatGrid"><Stat label="参加前回答者" value={`${analysis.firstPre.size}人`}/><Stat label="参加後回答者" value={`${analysis.firstPost.size}人`}/>
          <Stat label="同一人物の対応ペア" value={`${analysis.pairs.length}人`}/><Stat label="前後対応率（参加前を母数）" value={rate(analysis.pairs.length,analysis.firstPre.size)}/></div>
        {analysis.scores.map(s=><Panel key={s.title} title={s.title} eyebrow="BEFORE / AFTER" note="4段階評価。全回答者平均と同一参加者の前後差を分けて表示しています。">
          <div className="faStatGrid"><Stat label="前回答者全体の平均" value={fmtAvg(avg(s.before))} sub={`${s.before.length}人・肯定率 ${rate(s.beforePositive,s.before.length)}`}/>
            <Stat label="後回答者全体の平均" value={fmtAvg(avg(s.after))} sub={`${s.after.length}人・肯定率 ${rate(s.afterPositive,s.after.length)}`}/>
            <Stat label="同一人物のみ・前→後" value={`${fmtAvg(s.beforePair)} → ${fmtAvg(s.afterPair)}`} sub={`対応 ${s.matched.length}人`}/>
            <Stat label="同一人物のみ・平均変化" value={s.delta===null?"—":`${s.delta>0?"+":""}${fmtAvg(s.delta)}`} sub={`上昇 ${s.improvement}人 / 不変 ${s.unchanged}人 / 低下 ${s.decreased}人`}/></div>
          <div className="faTwo"><div><h3 className="faMinor">参加前：得点分布</h3><Bars rows={s.beforeDistribution}/></div><div><h3 className="faMinor">参加後：得点分布</h3><Bars rows={s.afterDistribution}/></div></div>
        </Panel>)}
        <div className="faTwo"><Panel title="参加前：リニューアルの認知" eyebrow="AWARENESS"><Bars rows={analysis.renewal}/></Panel>
          <Panel title="参加前：ポッキーをシェアした経験" eyebrow="SHARING EXPERIENCE"><Bars rows={analysis.sharing}/></Panel></div>
        <div className="faTwo"><Panel title="参加前：購入・飲食頻度" eyebrow="FREQUENCY"><Bars rows={analysis.frequency}/></Panel>
          <Panel title="参加後：リニューアル理解" eyebrow="UNDERSTANDING" note="1〜4点の自己評価です。"><Bars rows={group([...analysis.firstPost.values()].map(p=>numeric(p.renewal_understanding_score)?`${p.renewal_understanding_score}点`:"無回答"))}/></Panel></div>
        <Panel title="参加後：印象に残った点（回答分布）" eyebrow="MEMORABLE POINTS" note="自由記述の内容をそのまま公開せず、同一回答文の出現件数を集計します。個人が推測される恐れがあるため、ここでは回答文を表示せず、既存のアンケート分析画面から確認してください。">
          <Stat label="記述あり回答" value={`${analysis.memorable.reduce((n,r)=>n+r.value,0)}件`} sub={`回答パターン ${analysis.memorable.length}種類`}/>
        </Panel>
      </>}
      {tab==="exchange" && <>
        <div className="faStatGrid"><Stat label="QR発行記録あり" value={`${analysis.issuedIds.size}人`} sub="発行日時で判定"/>
          <Stat label="交換済み" value={`${analysis.exchangedIds.size}人`} sub="状態と交換日時で判定"/>
          <Stat label="5か所達成者に対する交換率" value={rate([...analysis.exchangedIds].filter(id=>analysis.done.some(p=>p.id===id)).length,analysis.done.length)}/>
          <Stat label="交換が記録された件数" value={`${analysis.exchange.length}件`} sub="延べ件数・人数と区別"/></div>
        <div className="faTwo"><Panel title="交換会の開催日別交換数" eyebrow="EVENT DAYS"><Bars rows={analysis.changesByDay} unit="件"/></Panel>
          <Panel title="日別の交換実績" eyebrow="EXCHANGE TREND"><Bars rows={analysis.dayExchanges} unit="件"/></Panel></div>
        <Panel title="完走・交換の組み合わせ" eyebrow="CROSS CHECK"><Table headers={["グループ","人数"]} rows={[
          ["完走かつ交換済み",analysis.done.filter(p=>analysis.exchangedIds.has(p.id)).length],
          ["完走かつ未交換",analysis.done.filter(p=>!analysis.exchangedIds.has(p.id)).length],
          ["現在の5種類スタンプ未達・交換済み",analysis.people.filter(p=>analysis.distinct(p)<5&&analysis.exchangedIds.has(p.id)).length],
        ]}/><p className="faNote">最後の区分は後日の修正・復旧や取得履歴変更で発生する可能性があります。不正利用とは限りません。</p></Panel>
      </>}
      {tab==="segments" && <>
        <div className="faTwo"><Panel title="学年別登録者数" eyebrow="GRADE"><Bars rows={analysis.grade}/></Panel>
          <Panel title="学科別登録者数" eyebrow="DEPARTMENT"><Bars rows={analysis.department}/></Panel></div>
        <Panel title="学年別：登録・完走・交換" eyebrow="GRADE CONVERSION" note="少人数グループでは割合が大きく変動します。"><Table headers={["学年","登録者","5か所達成","交換済み","完走率"]} rows={analysis.grades.map(r=>[...r,rate(Number(r[2]),Number(r[1]))])}/></Panel>
        <Panel title="学科別：登録・完走・交換" eyebrow="DEPARTMENT CONVERSION"><Table headers={["学科","登録者","5か所達成","交換済み","完走率"]} rows={analysis.departments.map(r=>[...r,rate(Number(r[2]),Number(r[1]))])}/></Panel>
        <div className="faTwo"><Panel title="参加前回答：性別の分布" eyebrow="SURVEY DEMOGRAPHICS"><Bars rows={analysis.gender}/></Panel>
          <Panel title="登録時期別の参加者数" eyebrow="COHORT"><Bars rows={[
            {label:"10/13〜10/27登録",value:analysis.people.filter(p=>dateValue(p.created_at)<SECOND).length},
            {label:"10/28〜11/4登録",value:analysis.people.filter(p=>dateValue(p.created_at)>=SECOND).length},
          ]}/></Panel></div>
        <Panel title="属性別比較の注意" eyebrow="INTERPRETATION"><p className="faNote">学年・学科は参加登録時の自己申告値です。性別・購入頻度は参加前アンケートに回答した人だけを対象としています。回答していない人を含めた全参加者の属性割合として解釈しないでください。</p></Panel>
      </>}
      {/* ADDITIONAL FINAL ANALYSIS — existing panels retained */}
      {tab === "summary" && <>
        <div className="faSectionLabel">ADDITIONAL REPORT / 登録・進捗の詳細分析</div>
        <div className="faStatGrid">
          <Stat label="登録から初回取得まで・平均" value={analysis.firstStampDelay.length ? `${fmtAvg(avg(analysis.firstStampDelay),1)}分` : "—"} sub={`対象 ${analysis.firstStampDelay.length}人`} />
          <Stat label="一度も取得していない参加者" value={`${analysis.total-analysis.stamped.length}人`} sub={`登録者比 ${rate(analysis.total-analysis.stamped.length,analysis.total)}`} />
          <Stat label="1〜4か所の途中参加者" value={`${analysis.stamped.length-analysis.done.length}人`} sub="取得したが5種類未達" />
          <Stat label="完走者のうち当日内に5か所" value={`${analysis.completionSameDay}人`} sub={`完走者比 ${rate(analysis.completionSameDay,analysis.done.length)}`} />
        </div>
        <div className="faTwo">
          <Panel title="登録曜日別の人数" eyebrow="SIGNUP WEEKDAYS"><Bars rows={analysis.registrationByWeekday}/></Panel>
          <Panel title="登録後、初回スタンプまでの時間" eyebrow="FIRST STAMP DELAY"><Bars rows={analysis.firstStampBuckets}/></Panel>
        </div>
      </>}
      {tab === "journey" && <>
        <div className="faSectionLabel">ADDITIONAL REPORT / 回遊の詳細分析</div>
        <div className="faStatGrid">
          <Stat label="複数回取得記録のある参加者" value={`${analysis.repeatStampPeople}人`} sub="同一スポットの複数記録" />
          <Stat label="完走者のうち当日内に達成" value={`${analysis.completionSameDay}人`} sub={`完走者比 ${rate(analysis.completionSameDay,analysis.done.length)}`} />
          <Stat label="スポット到達の延べ人数" value={`${analysis.spotRows.reduce((v,r)=>v+r.value,0)}人回`} sub="同一スポットは1人1回" />
          <Stat label="1か所以上取得した人の平均取得スポット" value={analysis.stamped.length ? fmtAvg(analysis.spotRows.reduce((v,r)=>v+r.value,0)/analysis.stamped.length) : "—"} sub="重複を除いた平均" />
        </div>
        <div className="faTwo">
          <Panel title="完走した日別の人数" eyebrow="COMPLETION DAYS"><Bars rows={analysis.completionByDay}/></Panel>
          <Panel title="完走が多かった時間帯" eyebrow="COMPLETION HOURS"><Bars rows={analysis.completionByHour}/></Panel>
          <Panel title="完走までの時間帯別分布" eyebrow="JOURNEY DURATION"><Bars rows={analysis.completionBuckets}/></Panel>
          <Panel title="曜日別のスタンプ取得記録" eyebrow="STAMP WEEKDAYS"><Bars rows={analysis.stampByWeekday} unit="件"/></Panel>
          <Panel title="スポット別到達率（登録者比）" eyebrow="REACH RATE"><Bars rows={analysis.spotReachRates} unit="%"/></Panel>
        </div>
      </>}
      {tab === "exchange" && <>
        <div className="faSectionLabel">ADDITIONAL REPORT / 特典交換の詳細分析</div>
        <div className="faStatGrid">
          <Stat label="発行記録あり・未交換" value={`${Math.max(0,analysis.issuedIds.size-analysis.exchangedIds.size)}人`} sub="発行済み集合と交換集合の差（目安）" />
          <Stat label="完走から交換までの平均" value={analysis.exchangeDelay.length ? `${fmtAvg(avg(analysis.exchangeDelay),1)}分` : "—"} sub={`整合する日時の ${analysis.exchangeDelay.length}人`} />
          <Stat label="QR発行から交換までの平均" value={analysis.exchangedAfterIssue.length ? `${fmtAvg(avg(analysis.exchangedAfterIssue),1)}分` : "—"} sub={`日時が確認できる ${analysis.exchangedAfterIssue.length}件`} />
          <Stat label="完走者のうち未交換" value={`${analysis.done.filter(p=>!analysis.exchangedIds.has(p.id)).length}人`} sub="現存スタンプに基づく集計" />
        </div>
        <div className="faTwo">
          <Panel title="交換が多かった時間帯" eyebrow="EXCHANGE HOURS"><Bars rows={analysis.exchangeByHour} unit="件"/></Panel>
          <Panel title="完走後の交換までの時間" eyebrow="EXCHANGE DELAY"><Bars rows={analysis.exchangeDelayBuckets}/></Panel>
        </div>
      </>}
      {tab === "segments" && <>
        <div className="faSectionLabel">ADDITIONAL REPORT / 登録時期別の比較分析</div>
        <div className="faTwo">
          <Panel title="登録時期別・新規登録者数" eyebrow="COHORT REGISTRATION"><Bars rows={analysis.registrationHalf}/></Panel>
          <Panel title="登録時期別・5か所達成人数" eyebrow="COHORT COMPLETION"><Bars rows={analysis.completionByCohort}/></Panel>
          <Panel title="登録時期別・交換済み人数" eyebrow="COHORT EXCHANGE"><Bars rows={analysis.exchangedByCohort}/></Panel>
        </div>
        <Panel title="登録時期別・完走率と交換率" eyebrow="COHORT RATE" note="登録期間によって観測期間が異なります。数値は単純比較であり、延長の効果を示す因果分析ではありません。">
          <Table headers={["登録時期","登録者","5か所達成","完走率","交換者","交換率"]} rows={analysis.registrationHalf.map((r,i)=>[r.label,r.value,analysis.completionByCohort[i].value,rate(analysis.completionByCohort[i].value,r.value),analysis.exchangedByCohort[i].value,rate(analysis.exchangedByCohort[i].value,r.value)])}/>
        </Panel>
      </>}
      {tab === "survey" && <>
        <div className="faSectionLabel">ADDITIONAL REPORT / 前後アンケートの詳細指標</div>
        <Panel title="質問別・同一回答者のスコア変化" eyebrow="MATCHED CHANGE" note="同一参加者の回答が揃う場合のみ比較します。平均との差は因果効果を意味しません。">
          <Table headers={["設問","対応人数","改善","変化なし","低下","改善率","平均差"]} rows={analysis.scores.map(s=>[s.title,s.matched.length,s.improvement,s.unchanged,s.decreased,rate(s.improvement,s.matched.length),s.delta===null?"—":`${s.delta>0?"+":""}${fmtAvg(s.delta)}`])}/>
        </Panel>
      </>}
      <footer className="faFooter">POKIPO FINAL ANALYSIS　／　参照専用　／　個別参加者の氏名・ニックネームは表示・CSV出力しません。</footer>
    </>}
    <style jsx global>{`
      .faPage{min-height:100vh;padding:24px 12px 65px;color:#362a2a;background:linear-gradient(180deg,#fff9f5 0%,#fff 420px)}
      .faContainer{max-width:1180px;margin:auto;display:grid;gap:18px}.faHero{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;padding:28px;background:linear-gradient(120deg,#fff9f3,#fff 72%,#fbe9e6);border:1px solid #e8d8d5;border-radius:22px;box-shadow:0 8px 25px #70452b0d;border-left:6px solid #8a1822}
      .faEyebrow{font-size:11px;font-weight:900;color:#8a1822;letter-spacing:.12em}.faHero h1{font-size:clamp(23px,3vw,33px);margin:8px 0 10px;line-height:1.4}.faHero p{font-size:13px;color:#77666b;margin:0 0 12px}.faHeroChip{display:inline-block;background:#f9e9e6;border-radius:50px;padding:7px 12px;font-size:12px;font-weight:800;color:#8a1822}
      .faHeroActions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.faPage button{cursor:pointer;font:inherit;font-weight:750}.faHeroActions button{padding:10px 13px;border-radius:10px;border:1px solid #d9bdc0;background:#fff;color:#8a1822;white-space:nowrap}.faHeroActions button:last-child{background:#8a1822;color:white}.faPage button:disabled{opacity:.5;cursor:not-allowed}.faPage button:focus-visible{outline:3px solid #d7929b;outline-offset:2px}
      .faCaution{margin:0;border:1px solid #eadbc9;border-radius:12px;padding:13px 16px;background:#fffaf4;color:#765b47;font-size:12px;line-height:1.85}.faFetched{font-size:12px;color:#806f70;margin:0}.faError{background:#fff1f1;color:#9a1b2f;border:1px solid #f0bec5;padding:14px;border-radius:12px}.faScope,.faPanel{background:#fff;border:1px solid #e8ddd7;border-radius:18px;padding:22px;box-shadow:0 7px 21px #6e322309}.faScope{display:grid;gap:12px}.faScope strong{font-size:14px}.faScope>div{display:flex;flex-wrap:wrap;gap:8px}.faScope button{border:1px solid #e0c9ca;border-radius:10px;background:#fff;color:#8a1822;padding:10px 15px}.faScope button[aria-pressed=true]{background:#8a1822;color:white}.faScope small,.faNote{font-size:12px;color:#7d6d6e;line-height:1.8}.faPanel h2{font-size:18px;border-left:4px solid #8a1822;padding-left:10px;margin:8px 0 13px}.faTabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;background:#fff;border:1px solid #e9deda;padding:7px;border-radius:15px}.faTabs button{border:0;background:transparent;color:#6c5258;border-radius:10px;padding:13px 7px;font-size:13px}.faTabs button[aria-pressed=true]{background:#8a1822;color:#fff}
      .faStatGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.faStat{background:#fff;border:1px solid #eaded9;border-radius:16px;padding:18px;min-width:0;display:grid;gap:7px;box-shadow:0 4px 15px #6f241008}.faStat>span{font-size:12px;font-weight:750;color:#785f65}.faStat strong{font-size:clamp(23px,3vw,29px);color:#8a1822;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.faStat small{color:#786d68;font-size:11px}.faTwo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.faBars{display:grid;gap:13px;margin-top:15px}.faBar{display:grid;grid-template-columns:minmax(90px,155px) minmax(20px,1fr) 66px;gap:11px;align-items:center;font-size:12px}.faBar>span{overflow-wrap:anywhere;color:#594b4d}.faBar strong{text-align:right;color:#8a1822;white-space:nowrap}.faTrack{height:13px;border-radius:8px;background:#f5e9e7;overflow:hidden}.faTrack>div{height:100%;background:linear-gradient(90deg,#c24d59,#8a1822);border-radius:8px}.faMinor{font-size:14px;margin:10px 0 4px}.faTableScroll{overflow:auto;max-width:100%}.faTable{border-collapse:collapse;width:100%;font-size:13px;min-width:420px}.faTable th,.faTable td{padding:12px 11px;text-align:left;border-bottom:1px solid #eee4df}.faTable th{color:#7c555b;background:#fff9f6}.faTable td:not(:first-child){font-variant-numeric:tabular-nums}.faPanel ul{padding-left:19px;font-size:13px;line-height:1.9;color:#685c5a}.faFooter{margin-top:13px;text-align:center;font-size:11px;color:#83747b}
      @media(max-width:800px){.faHero{flex-direction:column}.faHeroActions{justify-content:flex-start}.faStatGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.faTabs{grid-template-columns:repeat(2,minmax(0,1fr))}.faTwo{grid-template-columns:minmax(0,1fr)}}
      @media(max-width:500px){.faPage{padding:12px 9px 45px}.faHero,.faPanel,.faScope{padding:16px}.faStat{padding:13px}.faBar{grid-template-columns:minmax(75px,110px) minmax(20px,1fr) 54px;gap:7px;font-size:11px}.faTabs button{font-size:12px}}
    `}</style>
  </div></main>;
}