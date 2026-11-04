"use client";

import { useEffect, useRef, useState } from "react";

export type PokipoPresentationRow = { label: string; value: number; secondary?: number };
export type PokipoPresentationKpi = { label: string; value: string; detail?: string };
export type PokipoPresentationSlide = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  kind: "opening" | "donut" | "bars" | "line" | "compare";
  rows?: PokipoPresentationRow[];
  kpis?: PokipoPresentationKpi[];
  note?: string;
  compareLabels?: [string, string];
};

type Props = { slides: PokipoPresentationSlide[]; scopeLabel: string; fetched: string };
const COLORS = ["#921c32", "#e0a04d", "#456c7d", "#71a58b", "#967db2", "#d46b6b", "#5b8cbd", "#bda47d"];
const textNumber = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
const within = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;

function Kpis({ values }: { values: PokipoPresentationKpi[] }) {
  return <div className="fpKpis">{values.map((k, i) => (
    <div className="fpKpi" key={k.label} style={{ animationDelay: `${i * 90}ms` }}>
      <span>{k.label}</span><strong>{k.value}</strong>{k.detail && <small>{k.detail}</small>}
    </div>
  ))}</div>;
}
function Donut({ rows }: { rows: PokipoPresentationRow[] }) {
  const safe = rows.filter(x => x.value > 0);
  const total = safe.reduce((s, x) => s + x.value, 0);
  let cursor = 0;
  const segments = safe.map((item, index) => {
    const start = cursor;
    const fraction = total ? item.value / total : 0;
    cursor += fraction;
    return { ...item, start, fraction, color: COLORS[index % COLORS.length] };
  });
  return <div className="fpDonutLayout">
    <div className="fpDonut" aria-label={rows.map(r => `${r.label} ${r.value}`).join("、")} role="img">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="89" fill="none" stroke="#f1e9e6" strokeWidth="28" />
        {segments.map((s, i) => <circle key={i} cx="120" cy="120" r="89" fill="none" stroke={s.color} strokeWidth="28"
          strokeDasharray={`${s.fraction * 2 * Math.PI * 89} ${2 * Math.PI * 89}`}
          strokeDashoffset={-s.start * 2 * Math.PI * 89} transform="rotate(-90 120 120)" className="fpArc" style={{ animationDelay: `${i * 100}ms` }} />)}
      </svg>
      <div className="fpDonutCenter"><strong>{textNumber(total)}</strong><span>対象人数 / 件数</span></div>
    </div>
    <div className="fpLegend">{rows.map((r, i) => <div key={r.label}>
      <i style={{ background: COLORS[i % COLORS.length] }} /><span>{r.label}</span>
      <strong>{textNumber(r.value)}</strong><small>{total ? `${(100*r.value/total).toFixed(1)}%` : "—"}</small>
    </div>)}</div>
  </div>;
}
function Bars({ rows, compareLabels }: { rows: PokipoPresentationRow[]; compareLabels?: [string, string] }) {
  const hasSecondary = rows.some(x => x.secondary !== undefined);
  const max = Math.max(1, ...rows.flatMap(x => [within(x.value), ...(x.secondary === undefined ? [] : [within(x.secondary)])]));
  return <div className="fpBarChart">
    {compareLabels && <div className="fpSeriesLegend"><span><i style={{ background: COLORS[0] }} />{compareLabels[0]}</span><span><i style={{ background: COLORS[2] }} />{compareLabels[1]}</span></div>}
    {rows.length ? rows.map((r, i) => <div className="fpBarRow" key={`${r.label}-${i}`}>
      <span title={r.label}>{r.label}</span>
      <div className="fpTracks"><div className="fpTrack"><div className="fpBarFill" style={{ width: `${100*within(r.value)/max}%`, background: COLORS[0], animationDelay: `${i*55}ms` }} /></div>
        {hasSecondary && <div className="fpTrack"><div className="fpBarFill" style={{ width: `${100*within(r.secondary ?? 0)/max}%`, background: COLORS[2], animationDelay: `${i*55+100}ms` }} /></div>}
      </div>
      <strong>{textNumber(r.value)}{r.secondary === undefined ? "" : ` / ${textNumber(r.secondary)}`}</strong>
    </div>) : <p className="fpEmpty">対象データはありません。</p>}
  </div>;
}
function Line({ rows }: { rows: PokipoPresentationRow[] }) {
  const max = Math.max(1, ...rows.map(r => within(r.value)));
  const w = 900, h = 310, padX = 36, padY = 30;
  const pts = rows.map((r,i) => ({ x: padX + (rows.length <= 1 ? (w-2*padX)/2 : i*(w-2*padX)/(rows.length-1)), y: h-padY - (within(r.value)/max)*(h-2*padY), ...r }));
  const path = pts.map((p,i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return <div className="fpLineChart">
    {pts.length ? <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={rows.map(r => `${r.label} ${r.value}件`).join("、")}>
        {[0,.25,.5,.75,1].map(v => <line key={v} x1={padX} y1={padY+v*(h-2*padY)} x2={w-padX} y2={padY+v*(h-2*padY)} stroke="#e9dedb" strokeDasharray="5 6" />)}
        <path d={path} fill="none" stroke="#921c32" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="fpLinePath" />
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#921c32" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" className="fpPoint" style={{animationDelay: `${i*45}ms`}} />)}
      </svg>
      <div className="fpLineLabels">{rows.filter((_,i)=>i===0||i===rows.length-1||i%Math.max(1,Math.ceil(rows.length/6))===0).map((r,i)=><span key={`${r.label}-${i}`}>{r.label.slice(5)}</span>)}</div>
      <div className="fpLineSummary">最多：{textNumber(max)}件 ／ 対象：{rows.length}区間</div>
    </> : <p className="fpEmpty">対象データはありません。</p>}
  </div>;
}

export default function PokipoFinalPresentation({ slides, scopeLabel, fetched }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = slides[Math.min(index, Math.max(0,slides.length-1))];
  const close = async () => {
    if (document.fullscreenElement === rootRef.current) { try { await document.exitFullscreen(); } catch { /* browser may reject */ } }
    setOpen(false);
  };
  useEffect(() => {
    const change = () => setBrowserFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { void close(); }
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); setIndex(v => Math.min(slides.length-1,v+1)); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setIndex(v => Math.max(0,v-1)); }
      if (e.key === "Home") { e.preventDefault(); setIndex(0); }
      if (e.key === "End") { e.preventDefault(); setIndex(slides.length-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  // close() only depends on DOM and setter; reattaching for slide count is intentional
  }, [open, slides.length]);
  const requestScreen = async () => {
    try { await rootRef.current?.requestFullscreen(); } catch { /* fullscreen overlay still works */ }
  };
  return <>
    <button type="button" className="fpLaunch" onClick={() => { setIndex(0); setOpen(true); }} aria-label="最終分析のプレゼンモードを開く">
      <span className="fpLaunchIcon">▶</span><span><strong>プレゼンモード</strong><small>グラフで全画面表示</small></span><b>→</b>
    </button>
    {open && <div ref={rootRef} className="fpScreen" role="dialog" aria-modal="true" aria-label="POKIPO 最終分析プレゼンモード">
      <header className="fpTopbar"><div className="fpBrand"><span>POKIPO</span><strong>FINAL REPORT 2026</strong><small>{scopeLabel} ／ 集計取得 {fetched}</small></div>
        <div className="fpTopActions"><button type="button" onClick={() => void requestScreen()} disabled={browserFullscreen} title="ブラウザも全画面表示">⛶ 全画面</button><button type="button" className="fpClose" onClick={() => void close()}>× 閉じる</button></div></header>
      <div key={current.id} className="fpSlide" aria-live="polite">
        <div className="fpSlideHead"><span className="fpSlideEyebrow">{String(index+1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}　{current.eyebrow}</span>
          <h2>{current.title}</h2><p>{current.description}</p></div>
        <div className="fpChartArea">
          {current.kind === "opening" && <div className="fpOpening"><div className="fpOpeningMark">POKIPO<small>2026 FINAL ANALYSIS</small></div><Kpis values={current.kpis ?? []}/></div>}
          {current.kind === "donut" && <Donut rows={current.rows ?? []}/>}
          {current.kind === "bars" && <Bars rows={current.rows ?? []}/>}
          {current.kind === "compare" && <Bars rows={current.rows ?? []} compareLabels={current.compareLabels}/>}
          {current.kind === "line" && <Line rows={current.rows ?? []}/>}
        </div>
        {current.note && <p className="fpFootnote">注：{current.note}</p>}
      </div>
      <footer className="fpBottom"><div className="fpBottomNavigation">
          <button type="button" className="fpMove" disabled={index===0} onClick={()=>setIndex(v=>v-1)} aria-label="前のスライド">‹</button>
          <div className="fpSlidePicker" aria-label="表示する分析項目を選択">
            {slides.map((s,i)=><button type="button" key={s.id} className={i===index?"active":""} aria-current={i===index?"step":undefined} onClick={()=>setIndex(i)}>{String(i+1).padStart(2,"0")} {s.title}</button>)}
          </div><button type="button" className="fpMove" disabled={index===slides.length-1} onClick={()=>setIndex(v=>v+1)} aria-label="次のスライド">›</button>
        </div><div className="fpBottomMeta"><span>← → キーでも切替 ／ Escで閉じる</span><strong>{index+1} / {slides.length}</strong></div></footer>
      <style jsx global>{`
        .fpLaunch{display:flex;align-items:center;gap:12px;width:auto;max-width:100%;min-height:58px;margin:12px 0 0;padding:10px 16px;text-align:left;background:linear-gradient(120deg,#8a1822,#b54152);border:1px solid #7e1525;border-radius:14px;color:#fff;box-shadow:0 7px 20px #8a182229;cursor:pointer}
        .fpLaunchIcon{display:grid;place-items:center;min-width:36px;height:36px;border:1px solid #ffffff88;border-radius:11px;font-size:16px}.fpLaunch>span:nth-child(2){display:grid;gap:2px}.fpLaunch strong,.fpLaunch b{color:#fff}.fpLaunch small{color:#ffe7ea;font-size:11px}.fpLaunch b{margin-left:auto;font-size:20px}
        .fpScreen,.fpScreen *{box-sizing:border-box}.fpScreen{position:fixed;inset:0;z-index:2147483000;display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:100%;height:100dvh;overflow:hidden;background:#fffaf7;color:#302a2a;font-family:inherit}
        .fpScreen button{margin:0;box-shadow:none;min-height:0;width:auto;transform:none}.fpTopbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px clamp(14px,2.5vw,34px);border-bottom:1px solid #eadcda;background:#fff;min-width:0}.fpBrand{display:flex;flex-wrap:wrap;gap:7px 14px;align-items:center;min-width:0}.fpBrand>span{color:#8a1822;font-size:20px;letter-spacing:-.06em;font-weight:950}.fpBrand strong{color:#8a1822;font-size:12px;letter-spacing:.13em}.fpBrand small{color:#827574;font-size:11px}.fpTopActions{display:flex;gap:7px}.fpTopActions button{padding:9px 13px;border-radius:10px;border:1px solid #dfc7c7;background:#fff;color:#8a1822;white-space:nowrap;font-size:12px;font-weight:800;cursor:pointer}.fpTopActions .fpClose{background:#8a1822;border-color:#8a1822;color:#fff}.fpTopActions button:disabled{opacity:.45}
        .fpSlide{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:clamp(14px,2vh,28px);padding:clamp(18px,3vh,34px) clamp(16px,5vw,72px);animation:fpSlideIn .45s both}.fpSlideHead{flex:0 0 auto;max-width:1100px;margin:0 auto;width:100%}.fpSlideEyebrow{color:#a23343;font-size:12px;font-weight:900;letter-spacing:.14em}.fpSlideHead h2{margin:7px 0 8px;font-size:clamp(23px,3.5vw,48px);color:#392f32;line-height:1.26}.fpSlideHead p{font-size:clamp(12px,1.35vw,16px);color:#73666b;margin:0}.fpChartArea{display:flex;align-items:center;justify-content:center;flex:1 0 auto;min-height:0;max-width:1200px;width:100%;margin:0 auto}.fpFootnote{margin:0 auto;max-width:1100px;width:100%;font-size:11px;line-height:1.6;color:#7b6c6c}
        .fpOpening{width:100%;display:grid;gap:28px;text-align:center}.fpOpeningMark{font-weight:950;font-size:clamp(48px,10vw,110px);letter-spacing:-.075em;color:#8a1822;line-height:1}.fpOpeningMark small{display:block;font-size:clamp(12px,1.5vw,18px);letter-spacing:.2em;margin-top:14px;color:#9f5660}.fpKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;width:100%}.fpKpi{padding:18px 12px;background:#fff;border:1px solid #eadfdb;border-top:4px solid #9b293d;border-radius:15px;display:grid;gap:7px;animation:fpSlideIn .55s both}.fpKpi span{font-size:13px;color:#716267}.fpKpi strong{font-size:clamp(28px,3vw,43px);color:#8a1822;overflow-wrap:anywhere}.fpKpi small{font-size:11px;color:#85787b}
        .fpDonutLayout{width:100%;display:grid;grid-template-columns:minmax(210px,1fr) minmax(240px,1fr);gap:clamp(12px,3vw,50px);align-items:center;max-width:980px}.fpDonut{position:relative;max-width:420px;width:100%;aspect-ratio:1;margin:auto}.fpDonut svg{width:100%;height:100%;overflow:visible;animation:fpSlideIn .55s both}.fpArc{transform-origin:center;animation:fpArcIn .8s ease both}.fpDonutCenter{position:absolute;inset:28%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:5px;pointer-events:none}.fpDonutCenter strong{font-size:clamp(29px,4vw,51px);color:#8a1822}.fpDonutCenter span{font-size:11px;color:#857273}.fpLegend{display:grid;gap:12px;max-height:100%;overflow:auto}.fpLegend>div{display:grid;grid-template-columns:12px minmax(0,1fr) 70px 60px;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #eee3df}.fpLegend i{display:block;width:12px;height:12px;border-radius:4px}.fpLegend span{overflow-wrap:anywhere;font-size:14px;color:#544747}.fpLegend strong{text-align:right;color:#8a1822}.fpLegend small{text-align:right;color:#817475}
        .fpBarChart{width:100%;max-width:1040px;max-height:min(65vh,680px);overflow-y:auto;display:grid;align-content:center;gap:clamp(10px,2vh,18px)}.fpBarRow{display:grid;grid-template-columns:minmax(130px,240px) minmax(0,1fr) minmax(68px,128px);gap:12px;align-items:center}.fpBarRow>span{font-size:clamp(12px,1.4vw,16px);font-weight:700;overflow-wrap:anywhere}.fpBarRow strong{color:#8a1822;font-size:clamp(12px,1.3vw,17px);text-align:right;white-space:nowrap}.fpTracks{display:grid;gap:4px}.fpTrack{height:clamp(12px,2.8vh,26px);border-radius:6px;background:#f1e9e6;overflow:hidden}.fpBarFill{height:100%;border-radius:6px;transform-origin:left;animation:fpGrow .85s cubic-bezier(.14,.7,.26,1) both}.fpSeriesLegend{display:flex;gap:18px;justify-content:flex-end;font-size:12px;color:#59484b}.fpSeriesLegend>span{display:flex;gap:6px;align-items:center}.fpSeriesLegend i{width:12px;height:12px;display:inline-block;border-radius:3px}.fpLineChart{width:100%;display:grid;gap:14px}.fpLineChart>svg{width:100%;height:clamp(190px,42vh,420px);overflow:visible}.fpLinePath{stroke-dasharray:1800;stroke-dashoffset:1800;animation:fpDraw 1.4s ease forwards}.fpPoint{opacity:0;animation:fpPointIn .4s ease forwards}.fpLineLabels{display:flex;justify-content:space-between;gap:6px;color:#675f61;font-size:12px}.fpLineSummary{text-align:center;color:#8a1822;font-weight:800}.fpEmpty{color:#897679;text-align:center}
        .fpBottom{padding:8px clamp(10px,2vw,25px) 9px;background:#fff;border-top:1px solid #e4d8d5;box-shadow:0 -6px 28px #2c1b1710;min-height:0}.fpBottomNavigation{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;gap:7px;align-items:center}.fpMove{height:42px;border:1px solid #d6bfc0;border-radius:10px;background:#fff3f1;color:#8a1822;font-size:30px;font-weight:700;cursor:pointer}.fpSlidePicker{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;padding:4px;white-space:nowrap;min-width:0}.fpSlidePicker button{padding:10px 13px;border:1px solid #e1cfce;border-radius:10px;background:#fff;color:#744e58;white-space:nowrap;min-height:40px;font-size:12px;font-weight:800;cursor:pointer}.fpSlidePicker button.active{background:#8a1822;color:#fff;border-color:#8a1822}.fpBottomMeta{display:flex;justify-content:space-between;padding:4px 50px 0;gap:8px;font-size:10px;color:#918081}.fpBottomMeta strong{color:#8a1822}
        @keyframes fpSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fpGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes fpDraw{to{stroke-dashoffset:0}}@keyframes fpPointIn{to{opacity:1}}@keyframes fpArcIn{from{opacity:0;stroke-dasharray:0 560}to{opacity:1}}
        @media(max-width:700px){.fpTopbar{align-items:flex-start}.fpBrand{gap:3px 8px}.fpBrand>span{font-size:17px}.fpBrand small{flex-basis:100%}.fpTopActions button{padding:7px 9px;font-size:11px}.fpSlide{padding:15px 13px;gap:14px}.fpDonutLayout{grid-template-columns:minmax(0,1fr);gap:8px}.fpDonut{max-width:min(260px,31vh)}.fpLegend{gap:4px;max-height:28vh}.fpLegend>div{padding:5px 0;grid-template-columns:11px minmax(0,1fr) 52px 55px;gap:6px}.fpLegend span{font-size:12px}.fpBarChart{max-height:100%;gap:10px}.fpBarRow{grid-template-columns:minmax(72px,110px) minmax(0,1fr) minmax(48px,92px);gap:7px}.fpBarRow>span,.fpBarRow strong{font-size:11px}.fpTrack{height:13px}.fpBottomMeta{padding:3px 4px 0}.fpKpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fpKpi{padding:10px 8px}.fpKpi strong{font-size:25px}.fpOpening{gap:16px}.fpLineLabels{font-size:10px}}
        @media(prefers-reduced-motion:reduce){.fpScreen *{animation:none!important;transition:none!important}.fpLinePath{stroke-dashoffset:0!important}.fpBarFill{transform:none!important}.fpPoint{opacity:1!important}}
      `}</style>
    </div>}
  </>;
}
