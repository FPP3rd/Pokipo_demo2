"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// 日本語の形態素解析を行わず、既存POKIPOワードクラウドと同様に
// 意味を確認できるキーワードの出現回答数を集計する（1回答につき各語1回）。
const TERMS: { term: string; pattern: RegExp }[] = [
  { term: "友達", pattern: /友達|友人|友だち|ともだち/u },
  { term: "家族", pattern: /家族|親|兄弟|姉妹/u },
  { term: "恋人", pattern: /恋人|彼氏|彼女|カップル/u },
  { term: "シェア", pattern: /シェア|分け合|分ける|分けて|お裾分け|おすそわけ/u },
  { term: "一緒に", pattern: /一緒に|いっしょに|共に/u },
  { term: "会話", pattern: /会話|話のきっかけ|コミュニケーション|交流/u },
  { term: "休憩", pattern: /休憩|ひと休み|休み時間/u },
  { term: "昼休み", pattern: /昼休み|お昼休み|ランチ|昼食/u },
  { term: "大学", pattern: /大学|獨協|学内|校内|キャンパス/u },
  { term: "授業", pattern: /授業|講義|ゼミ/u },
  { term: "イベント", pattern: /イベント|企画|催し|雄飛祭/u },
  { term: "スタンプラリー", pattern: /スタンプラリー|スタンプ集め|5か所|５か所/u },
  { term: "スポット巡り", pattern: /スポット|場所を回|巡った|巡り|歩き回|散策/u },
  { term: "QRコード", pattern: /QR|二次元コード/iu },
  { term: "楽しい", pattern: /楽しい|楽しかった|楽しめ|楽しさ|楽しんだ/u },
  { term: "面白い", pattern: /面白|おもしろ|興味深/u },
  { term: "美味しい", pattern: /美味|おいしい|おいしかった/u },
  { term: "かわいい", pattern: /かわいい|可愛い/u },
  { term: "嬉しい", pattern: /嬉し|うれし|喜び/u },
  { term: "学び", pattern: /学び|学べ|勉強にな|知識|理解が深/u },
  { term: "発見", pattern: /発見|初めて知|知らなかった|意外/u },
  { term: "リニューアル", pattern: /リニューアル|新しくなった|改良/u },
  { term: "ポッキー", pattern: /ポッキー|pocky/iu },
  { term: "チョコレート", pattern: /チョコレート|チョコ|カカオ/u },
  { term: "お菓子", pattern: /お菓子|おやつ|菓子/u },
  { term: "食べる", pattern: /食べ|食す/u },
  { term: "購入", pattern: /購入|買いたい|買おう|買った|買う/u },
  { term: "環境", pattern: /環境|エコ|持続可能|SDGs|サステナ/u },
  { term: "特典", pattern: /特典|景品|プレゼント/u },
  { term: "達成感", pattern: /達成感|達成でき|コンプリート|完走|ゴール/u },
  { term: "写真", pattern: /写真|撮影|カメラ/u },
  { term: "SNS", pattern: /SNS|Instagram|インスタ|LINE|投稿/iu },
  { term: "思い出", pattern: /思い出|印象に残|心に残/u },
  { term: "クイズ", pattern: /クイズ|トリビア|豆知識/u },
];

const COLORS = ["#8a1822", "#ad3845", "#a86f23", "#2f6b7f", "#537b64", "#6555a0", "#b05b36"];
const PAGE_SIZE = 36;
type Phase = "flow" | "cloud" | "cards";
type Props = { answers: string[]; label: string };

export default function PokipoPresentationResponses({ answers, label }: Props) {
  const cleaned = useMemo(() => answers.map(v => v.trim()).filter(Boolean), [answers]);
  const [phase, setPhase] = useState<Phase>("flow");
  const [shown, setShown] = useState(0);
  const [page, setPage] = useState(0);
  const [run, setRun] = useState(0);
  const interrupted = useRef(false);
  const words = useMemo(() => {
    const counts = TERMS.map(({ term, pattern }) => ({ term, count: cleaned.filter(text => pattern.test(text.normalize("NFKC"))).length }));
    return counts.filter(x => x.count > 0).sort((a,b)=>b.count-a.count || a.term.localeCompare(b.term,"ja")).slice(0, 28);
  }, [cleaned]);
  const totalPages = Math.max(1, Math.ceil(cleaned.length / PAGE_SIZE));
  const intervalMs = Math.max(75, Math.min(420, Math.floor(22000 / Math.max(1, cleaned.length))));

  useEffect(() => {
    interrupted.current = false;
    setShown(0);
    setPage(0);
    if (!cleaned.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("cloud");
      return;
    }
    setPhase("flow");
    let count = 0;
    let finished = false;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    const id = window.setInterval(() => {
      if (interrupted.current) { finished = true; window.clearInterval(id); return; }
      if (finished) return;
      count += 1;
      setShown(count);
      if (count >= cleaned.length) {
        finished = true;
        window.clearInterval(id);
        endTimer = window.setTimeout(() => setPhase("cloud"), 1500);
      }
    }, intervalMs);
    return () => { finished = true; window.clearInterval(id); if (endTimer) window.clearTimeout(endTimer); };
  }, [cleaned, run, intervalMs]);

  const visibleStart = Math.max(0, shown - Math.ceil(1800 / intervalMs) - 2);
  return <section className="prRoot" aria-label={`${label}の自由記述プレゼン`}>
    <div className="prHeader">
      <div><b>{label}</b><span>記述回答 {cleaned.length.toLocaleString("ja-JP")}件</span></div>
      <div className="prActions">
        {phase === "flow" && <button type="button" onClick={() => { interrupted.current = true; setPhase("cloud"); }}>アニメーションをスキップ</button>}
        {phase !== "flow" && <button type="button" onClick={() => setRun(v => v+1)}>最初から再生</button>}
        {phase !== "cards" && <button type="button" className="prPrimary" onClick={() => { interrupted.current = true; setPage(0); setPhase("cards"); }}>すべての回答を見る</button>}
        {phase === "cards" && <button type="button" onClick={() => setPhase("cloud")}>ワードクラウドに戻る</button>}
      </div>
    </div>

    {phase === "flow" && <div className="prFlow" aria-label={`回答を表示中、${Math.min(shown,cleaned.length)}件目まで`}>
      <div className="prFlowHint">PARTICIPANT VOICES　回答が上へ流れた後、ワードクラウドを表示</div>
      {cleaned.slice(visibleStart, shown).map((answer, i) => <div key={`${run}-${visibleStart+i}`} className="prFlying" style={{left: `${8 + ((visibleStart + i) * 23) % 43}%`, animationDuration: "1.8s"}}>{answer}</div>)}
      <div className="prProgress">{Math.min(shown,cleaned.length)} / {cleaned.length}</div>
    </div>}

    {phase === "cloud" && <div className="prCloudStage">
      {words.length ? <div className="prCloud" aria-label="記述回答のキーワード頻度">
        {words.map((w,i) => <span key={w.term} title={`${w.term}：${w.count}件の回答に出現`} style={{color: COLORS[i % COLORS.length],fontSize:`clamp(13px, ${Math.min(3.3, 1.1 + w.count / Math.max(1, words[0].count) * 2.1)}vw, ${Math.round(16 + w.count / Math.max(1, words[0].count) * 32)}px)`,animationDelay:`${i*45}ms`}}>{w.term}<small>{w.count}</small></span>)}
      </div> : <p className="prNoWords">該当するキーワードがありません。回答全文は「すべての回答を見る」から確認できます。</p>}
      <p className="prMethod">各キーワードを含む回答の件数（同じ回答内の繰り返しは1件）。表記ゆれを統合した辞書式集計で、自由記述の全語を自動抽出した結果ではありません。</p>
    </div>}

    {phase === "cards" && <div className="prCardsStage">
      <div className="prCardsSummary"><span>すべての記述を原文のまま表示・匿名表示</span><strong>{page+1} / {totalPages}ページ</strong></div>
      <div className="prCardGrid">{cleaned.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE).map((answer,i)=><article className="prCard" key={`${page}-${i}`}><small>回答 {String(page*PAGE_SIZE+i+1).padStart(3,"0")}</small><p>{answer}</p></article>)}</div>
      <div className="prPager"><button type="button" disabled={page===0} onClick={() => setPage(p=>Math.max(0,p-1))}>← 前の36件</button><span>{page+1} / {totalPages}</span><button type="button" disabled={page>=totalPages-1} onClick={() => setPage(p=>Math.min(totalPages-1,p+1))}>次の36件 →</button></div>
    </div>}

    <style jsx>{`
      .prRoot{display:flex;flex-direction:column;min-width:0;width:100%;height:100%;min-height:0;border:1px solid #e7d7d2;border-radius:16px;background:#fffdfb;overflow:hidden;color:#3d3335}
      .prHeader{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #eadcda;flex-shrink:0}
      .prHeader>div:first-child{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.prHeader b{color:#8a1822;font-size:13px}.prHeader span{font-size:11px;color:#7f7071}
      .prActions{display:flex;gap:7px;flex-wrap:wrap}.prActions button,.prPager button{border:1px solid #d8bfc1;border-radius:9px;background:#fff5f2;padding:7px 10px;font-size:11px;color:#8a1822;font-weight:800;cursor:pointer}.prActions .prPrimary{background:#8a1822;border-color:#8a1822;color:white}.prPager button:disabled{opacity:.4;cursor:default}
      .prFlow{position:relative;flex:1;min-height:0;overflow:hidden;background:radial-gradient(circle at 50% 110%,#f5d9d6,#fffdfb 67%)}.prFlowHint{position:absolute;top:13px;left:16px;right:16px;text-align:center;color:#9c6872;font-size:12px;font-weight:800;z-index:2}.prFlying{position:absolute;bottom:-13%;max-width:65%;max-height:110px;overflow:hidden;overflow-wrap:anywhere;padding:10px 13px;border-radius:14px;background:#fff;box-shadow:0 5px 26px #8a182226;border:1px solid #eed8d5;font-size:clamp(12px,1.5vw,18px);font-weight:700;line-height:1.4;animation:prFloat 1.8s linear both;pointer-events:none}.prProgress{position:absolute;bottom:8px;right:12px;font-weight:900;color:#8a1822;font-size:12px;z-index:3}
      .prCloudStage{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;padding:12px;overflow:hidden}.prCloud{flex:1;min-height:0;overflow-y:auto;display:flex;align-content:center;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px 18px;padding:12px}.prCloud>span{display:inline-flex;align-items:baseline;gap:4px;font-weight:950;line-height:1.25;animation:prAppear .6s both}.prCloud small{font-size:10px;color:#9e8984}.prMethod{flex-shrink:0;font-size:10px;color:#8a7977;line-height:1.5;margin:0;text-align:center}.prNoWords{margin:auto;color:#745d5d}
      .prCardsStage{flex:1;display:flex;flex-direction:column;min-height:0;padding:9px 10px;gap:7px}.prCardsSummary{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#8d7476}.prCardsSummary strong{color:#8a1822}.prCardGrid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-content:start;gap:6px}.prCard{background:#fff8f3;border:1px solid #ecdcd4;border-radius:10px;padding:7px;min-width:0;min-height:76px;overflow-wrap:anywhere}.prCard:nth-child(5n+2){background:#f6f4fb}.prCard:nth-child(5n+3){background:#f3f9f8}.prCard:nth-child(5n+4){background:#fff8e9}.prCard small{font-size:9px;color:#9c5c65;font-weight:800}.prCard p{font-size:clamp(10px,.93vw,13px);line-height:1.4;margin:5px 0 0;white-space:pre-wrap}.prPager{display:flex;justify-content:center;align-items:center;gap:15px;flex-shrink:0;font-size:11px;color:#8a1822}
      @keyframes prFloat{0%{transform:translateY(0) scale(.85);opacity:0}12%{opacity:1}85%{opacity:1}100%{transform:translateY(-65vh) scale(1.06);opacity:0}}@keyframes prAppear{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:900px){.prCardGrid{grid-template-columns:repeat(4,minmax(0,1fr))}.prCard{min-height:68px}}
      @media(max-width:600px){.prHeader{padding:6px 8px}.prHeader b{font-size:11px}.prActions button{font-size:10px;padding:5px 7px}.prCardGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.prCard p{font-size:11px}.prFlowHint{font-size:10px}.prFlying{max-width:80%}}
      @media(prefers-reduced-motion:reduce){.prFlying,.prCloud>span{animation:none!important}}
    `}</style>
  </section>;
}
