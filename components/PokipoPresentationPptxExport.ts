"use client";

/**
 * POKIPO FINAL REPORT / PowerPoint向けネイティブレイアウト。
 * Web画面を切り抜くのではなく、同じ集計データから16:9の資料を組み立てる。
 * 画面側の既存スライドやデータベースには変更を加えない。
 */
type Row = { label: string; value: number; secondary?: number };
type Kpi = { label: string; value: string; detail?: string };
type Slide = {
  id: string;
  kind: "opening" | "donut" | "bars" | "compare" | "line" | "map" | "responses";
  title: string;
  eyebrow: string;
  description: string;
  category?: string;
  rows?: Row[];
  kpis?: Kpi[];
  note?: string;
  compareLabels?: [string, string];
  freeResponses?: string[];
  insight?: string;
};
type Options = {
  root: HTMLDivElement; // 呼出元との互換性のために残す。画面キャプチャには使用しない。
  slides: Slide[];
  select: (index: number) => void; // 既存インターフェースと互換
  progress: (completed: number) => void;
  scopeLabel?: string;
};

const C = {
  bg: "FFFAF7", white: "FFFFFF", wine: "8A1822", dark: "352D2E",
  muted: "756A69", pale: "F7EFEC", border: "E7D9D4", gold: "D89B4C",
  teal: "426C7B", green: "5B8A73", purple: "9270A0", gray: "B5AAA6",
};
const PALETTE = ["921C32", "D89B4C", "426C7B", "5B8A73", "9270A0", "D46B6B", "6E8FC3", "B2A184"];
const W = 13.333333;
const H = 7.5;
const FONT = "Yu Gothic";
const str = (s: unknown) => String(s ?? "");
const num = (n: number) => Number.isFinite(n) ? n.toLocaleString("ja-JP", { maximumFractionDigits: 2 }) : "–";
const shortened = (s: string, length = 105) => s.length > length ? `${s.slice(0, length - 1)}…` : s;

function addText(slide: any, text: string, x: number, y: number, w: number, h: number, options: Record<string, unknown> = {}) {
  slide.addText(text, {
    x, y, w, h, fontFace: FONT, fontSize: 12, color: C.dark,
    margin: 0, breakLine: false, valign: "mid", fit: "shrink",
    ...options,
  });
}

function addPanel(slide: any, pptx: any, x: number, y: number, w: number, h: number, fill = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.13,
    radius: 0.13, line: { color: C.border, width: 0.7 },
    fill: { color: fill },
  });
}

function addFrame(slide: any, pptx: any, item: Slide, index: number, total: number, scopeLabel: string) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, line: { color: C.wine }, fill: { color: C.wine } });
  addText(slide, "POKIPO", 0.66, 0.30, 2.4, 0.34, { fontSize: 19, bold: true, color: C.wine, charSpacing: 1.0 });
  addText(slide, "FINAL REPORT 2026", 3.1, 0.34, 3.4, 0.23, { fontSize: 9, color: C.muted, bold: true, charSpacing: 1.1 });
  addText(slide, `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 11.62, 0.30, 1.05, 0.32, { align: "right", fontSize: 13, color: C.wine, bold: true });
  addText(slide, item.eyebrow.toUpperCase(), 0.68, 0.89, 7.7, 0.25, { color: C.wine, fontSize: 10, bold: true, charSpacing: 1.3 });
  addText(slide, item.title, 0.66, 1.17, 12.0, 0.48, { fontSize: item.title.length > 25 ? 23 : 27, color: C.dark, bold: true });
  addText(slide, shortened(item.description, 180), 0.69, 1.72, 11.95, 0.34, { fontSize: 11.5, color: C.muted });
  slide.addShape(pptx.ShapeType.line, { x: 0.68, y: 6.24, w: 11.96, h: 0, line: { color: C.border, width: 1 } });
  addText(slide, "POKIPO 自動分析", 0.73, 6.40, 2.25, 0.25, { fontSize: 10, color: C.wine, bold: true });
  addText(slide, shortened(item.insight || "集計したデータを表示しています。", 350), 0.74, 6.68, 11.88, 0.38, { fontSize: 12, color: C.dark, valign: "mid", breakLine: false });
  if (item.note) addText(slide, shortened(`注：${item.note}`, 170), 0.74, 7.14, 10.6, 0.17, { fontSize: 7.2, color: C.muted });
  addText(slide, scopeLabel, 11.06, 7.14, 1.56, 0.17, { fontSize: 7.4, color: C.muted, align: "right" });
}

function addOpening(slide: any, pptx: any, values: Kpi[]) {
  const items = values.slice(0, 6);
  const cols = items.length > 4 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const gapX = 0.22, gapY = 0.22, x0 = 0.75, y0 = 2.28;
  const totalW = 11.86, totalH = 3.55;
  const cw = (totalW - gapX * (cols - 1)) / cols;
  const ch = (totalH - gapY * (rows - 1)) / rows;
  items.forEach((k, i) => {
    const x = x0 + (i % cols) * (cw + gapX), y = y0 + Math.floor(i / cols) * (ch + gapY);
    addPanel(slide, pptx, x, y, cw, ch);
    addText(slide, k.label, x + 0.24, y + 0.17, cw - 0.48, 0.35, { fontSize: 13, color: C.muted, bold: true });
    addText(slide, k.value, x + 0.24, y + 0.56, cw - 0.48, Math.min(0.77, ch - 0.66), { fontSize: 30, color: C.wine, bold: true });
    if (k.detail && ch > 1.4) addText(slide, k.detail, x + 0.24, y + ch - 0.38, cw - 0.48, 0.24, { fontSize: 10, color: C.muted });
  });
}

function addDonut(slide: any, pptx: any, rows: Row[]) {
  const valid = rows.filter(r => Number.isFinite(r.value) && r.value > 0);
  if (!valid.length) return addEmpty(slide);
  addPanel(slide, pptx, 0.73, 2.21, 7.14, 3.66);
  slide.addChart(pptx.ChartType.doughnut, [{
    name: "参加者", labels: valid.map(r => r.label), values: valid.map(r => r.value),
  }], {
    x: 1.58, y: 2.46, w: 5.40, h: 3.18, holeSize: 66,
    chartColors: PALETTE, showLegend: false, showTitle: false, showValue: false,
    showBorder: false, showPercent: false, showCategoryName: false,
    showMarker: false, showLeaderLines: false,
    showCatName: false, showValAxis: false, showCatAxis: false,
    showPlotArea: false,
  });
  addPanel(slide, pptx, 8.08, 2.21, 4.54, 3.66);
  const total = valid.reduce((n, r) => n + r.value, 0);
  addText(slide, `集計対象：${num(total)}件`, 8.37, 2.43, 3.85, 0.34, { fontSize: 12, bold: true, color: C.wine });
  const lineH = Math.min(0.52, 2.75 / valid.length);
  valid.slice(0, 9).forEach((r, i) => {
    const y = 2.90 + i * lineH;
    slide.addShape(pptx.ShapeType.rect, { x: 8.40, y: y + 0.11, w: 0.15, h: 0.15, line: { color: PALETTE[i % PALETTE.length] }, fill: { color: PALETTE[i % PALETTE.length] } });
    addText(slide, shortened(r.label, 20), 8.68, y + 0.02, 2.22, 0.28, { fontSize: 10 });
    addText(slide, `${num(r.value)} (${Math.round(r.value / total * 1000) / 10}%)`, 10.94, y + 0.02, 1.30, 0.28, { fontSize: 10, color: C.wine, bold: true, align: "right" });
  });
}

function addBars(slide: any, pptx: any, rows: Row[], compare = false, compareLabels?: [string, string]) {
  const valid = rows.filter(r => Number.isFinite(r.value));
  if (!valid.length) return addEmpty(slide);
  addPanel(slide, pptx, 0.73, 2.21, 11.89, 3.66);
  const categories = valid.map(r => shortened(r.label, 33));
  const vals = valid.map(r => Math.max(0, r.value));
  const series: { name: string; labels: string[]; values: number[] }[] = [{ name: compareLabels?.[0] || "人数・件数", labels: categories, values: vals }];
  if (compare) series.push({ name: compareLabels?.[1] || "比較対象", labels: categories, values: valid.map(r => Math.max(0, r.secondary ?? 0)) });
  const max = Math.max(1, ...vals, ...(compare ? valid.map(r => Math.max(0, r.secondary ?? 0)) : []));
  slide.addChart(pptx.ChartType.bar, series, {
    x: 0.95, y: 2.39, w: 11.38, h: 3.25,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: valid.length > 15 ? 6.5 : valid.length > 9 ? 8 : 10,
    valAxisLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: undefined,
    showCatName: false, showLegend: compare, legendPos: "b", legendFontSize: 9,
    showValue: valid.length <= 12, dataLabelPosition: "outEnd", dataLabelColor: C.dark,
    showTitle: false, showBorder: false, showMarker: false,
    showShadow: false, chartColors: compare ? [C.wine, C.teal] : [C.wine],
    catAxisLabelColor: C.dark, valAxisLabelColor: C.muted,
    showValAxisTitle: false, showCatAxisTitle: false,
    showValAxis: true, showCatAxis: true,
    valGridLine: { color: "EFE8E5", width: 0.5 },
    showPlotArea: false,
    showSerName: false,
    showPercent: false,
    showDataLabelLegendKey: false,
    grouping: compare ? "clustered" : "standard",
    overlap: compare ? 0 : 100,
    gapWidthPct: valid.length > 16 ? 35 : 70,
  });
  addText(slide, `最大値：${num(max)}　/　比較項目：${valid.length}`, 9.55, 5.74, 2.65, 0.14, { fontSize: 7.5, align: "right", color: C.muted });
}

function addLine(slide: any, pptx: any, rows: Row[]) {
  const valid = rows.filter(r => Number.isFinite(r.value));
  if (!valid.length) return addEmpty(slide);
  addPanel(slide, pptx, 0.73, 2.21, 11.89, 3.66);
  const labels = valid.map((r, i) => valid.length > 14 && i % Math.max(1, Math.ceil(valid.length / 10)) !== 0 && i !== valid.length - 1 ? "" : shortened(r.label, 16));
  slide.addChart(pptx.ChartType.line, [{ name: "推移", labels, values: valid.map(r => Math.max(0, r.value)) }], {
    x: 1.04, y: 2.36, w: 11.23, h: 3.18,
    chartColors: [C.wine], showLegend: false, showTitle: false, showBorder: false,
    showValue: false, showMarker: valid.length < 35,
    lineSize: 3.3, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 8.5,
    valAxisLabelFontSize: 9, valAxisMinVal: 0, valAxisLabelColor: C.muted,
    catAxisLabelColor: C.dark, valGridLine: { color: "EFE8E5", width: 0.5 },
    showShadow: false, showPlotArea: false,
  });
  const best = Math.max(...valid.map(r => r.value));
  addText(slide, `最多 ${num(best)}件　/　対象 ${valid.length}区間`, 8.95, 5.74, 3.3, 0.15, { fontSize: 8.5, align: "right", color: C.muted });
}

async function readImageData(url: string): Promise<{ data: string; ratio: number }> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error("地図画像を読み込めませんでした。");
  const blob = await res.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("地図画像の変換に失敗しました。"));
    reader.readAsDataURL(blob);
  });
  const ratio = await new Promise<number>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth / Math.max(1, image.naturalHeight));
    image.onerror = () => resolve(1.4);
    image.src = data;
  });
  return { data, ratio };
}

function addMap(slide: any, pptx: any, rows: Row[], map: { data: string; ratio: number } | null) {
  addPanel(slide, pptx, 0.73, 2.21, 6.69, 3.66);
  if (map) {
    const boxW = 6.38, boxH = 3.31;
    const w = Math.min(boxW, boxH * map.ratio), h = Math.min(boxH, boxW / map.ratio);
    slide.addImage({ data: map.data, x: 0.89 + (boxW - w) / 2, y: 2.36 + (boxH - h) / 2, w, h });
  } else {
    addText(slide, "獨協大学キャンパス地図", 1.2, 3.55, 5.8, 0.4, { align: "center", color: C.muted, fontSize: 18 });
  }
  addPanel(slide, pptx, 7.62, 2.21, 5.0, 3.66);
  const ranked = [...rows].filter(r => Number.isFinite(r.value)).sort((a, b) => b.value - a.value);
  addText(slide, "SPOT RANKING", 7.92, 2.43, 3.6, 0.32, { fontSize: 12, color: C.wine, bold: true });
  const spacing = Math.min(0.53, 2.7 / Math.max(1, ranked.length));
  ranked.slice(0, 10).forEach((r, i) => {
    const y = 2.89 + spacing * i;
    addText(slide, `${i + 1}`.padStart(2, "0"), 7.98, y, 0.40, 0.25, { fontSize: 11, color: C.gold, bold: true });
    addText(slide, shortened(r.label, 24), 8.48, y, 2.85, 0.25, { fontSize: 10 });
    addText(slide, num(r.value), 11.35, y, 0.96, 0.25, { fontSize: 11, color: C.wine, bold: true, align: "right" });
  });
  addText(slide, "地図は場所の参照用。順位・実績は右側の数値を示します。", 7.93, 5.61, 4.3, 0.17, { fontSize: 7.5, color: C.muted });
}

const KEYWORDS: { name: string; test: RegExp }[] = [
  { name: "友達", test: /友達|友人|友だち|ともだち/u }, { name: "家族", test: /家族|親|兄弟|姉妹/u },
  { name: "シェア", test: /シェア|分け合|分ける|分けて/u }, { name: "楽しい", test: /楽し/u },
  { name: "面白い", test: /面白|おもしろ|興味深/u }, { name: "嬉しい", test: /嬉し|うれし/u },
  { name: "発見", test: /発見|初めて知|知らなかった/u }, { name: "学び", test: /学び|学べ|勉強にな|知識/u },
  { name: "ポッキー", test: /ポッキー|pocky/iu }, { name: "スタンプラリー", test: /スタンプラリー|スタンプ集め/u },
  { name: "特典", test: /特典|景品|プレゼント/u }, { name: "大学", test: /大学|獨協|学内|キャンパス/u },
  { name: "授業", test: /授業|講義|ゼミ/u }, { name: "お菓子", test: /お菓子|おやつ/u },
  { name: "チョコ", test: /チョコ|カカオ/u }, { name: "休憩", test: /休憩|ひと休み/u },
  { name: "食べる", test: /食べ/u }, { name: "イベント", test: /イベント|企画|雄飛祭/u },
  { name: "QRコード", test: /QR|二次元コード/iu }, { name: "達成感", test: /達成感|完走|コンプリート/u },
  { name: "写真", test: /写真|撮影/u }, { name: "リニューアル", test: /リニューアル|改良/u },
  { name: "思い出", test: /思い出|印象に残/u }, { name: "交流", test: /交流|会話|コミュニケーション/u },
];

function addResponses(slide: any, pptx: any, responses: string[]) {
  const answers = responses.map(v => v.trim()).filter(Boolean);
  addPanel(slide, pptx, 0.73, 2.21, 8.46, 3.66);
  addPanel(slide, pptx, 9.40, 2.21, 3.22, 3.66);
  const terms = KEYWORDS.map(k => ({ name: k.name, n: answers.filter(a => k.test.test(a.normalize("NFKC"))).length }))
    .filter(v => v.n > 0).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "ja")).slice(0, 20);
  addText(slide, `記述回答 ${num(answers.length)}件から抽出したキーワード`, 1.02, 2.44, 7.8, 0.28, { fontSize: 12, color: C.wine, bold: true });
  if (!terms.length) addText(slide, "集計対象のキーワードがありません。", 1.28, 3.61, 7.1, 0.5, { fontSize: 15, color: C.muted });
  terms.forEach((t, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 1.00 + col * 1.99, y = 2.93 + row * 0.51;
    addText(slide, t.name, x, y, 1.87, 0.35, {
      fontSize: Math.max(10, Math.min(24, 11 + 13 * t.n / Math.max(1, terms[0].n))),
      color: PALETTE[i % PALETTE.length], bold: i < 6, align: "center",
    });
  });
  addText(slide, "実際の記述から", 9.69, 2.47, 2.7, 0.24, { fontSize: 11, color: C.wine, bold: true });
  const examples = answers.slice(0, 3);
  examples.forEach((answer, i) => {
    const y = 2.90 + i * 0.89;
    addText(slide, `VOICE ${String(i+1).padStart(2,"0")}`, 9.70, y, 2.55, 0.18, { fontSize: 8, color: C.gold, bold: true });
    addText(slide, shortened(answer, 80), 9.70, y+0.22, 2.55, 0.61, { fontSize: 9.5, valign: "top", breakLine: false });
  });
  addText(slide, "キーワードは辞書式集計。1回答につき同一語は1件として計上。", 1.0, 5.56, 7.85, 0.17, { fontSize: 8, color: C.muted });
}

function addEmpty(slide: any) {
  addText(slide, "この条件では表示できるデータがありません。", 1.20, 3.75, 10.9, 0.4, { align: "center", color: C.muted, fontSize: 17 });
}

export async function downloadPokipoPresentationPptx({ slides, progress, scopeLabel = "全期間" }: Options): Promise<void> {
  if (!slides.length) throw new Error("出力するスライドがありません。");
  const module = await import("pptxgenjs");
  const PptxGenJS = module.default;
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.author = "POKIPO / LiPost";
  deck.subject = "POKIPO FINAL REPORT 2026（PowerPoint最適化版）";
  deck.title = "POKIPO FINAL REPORT 2026";
  // PPTXの本文・グラフは編集可能。日本語対応フォントを指定。
  deck.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: "ja-JP" };

  let campusMap: { data: string; ratio: number } | null = null;
  if (slides.some(s => s.kind === "map")) {
    try { campusMap = await readImageData("/images/pokipo-campus-map.png"); }
    catch (error) { console.warn("POKIPO: 地図画像を取得できず、ラベルのみ表示します。", error); }
  }

  for (let index = 0; index < slides.length; index += 1) {
    const item = slides[index];
    const slide = deck.addSlide();
    addFrame(slide, deck, item, index, slides.length, scopeLabel);
    if (item.kind === "opening") addOpening(slide, deck, item.kpis ?? []);
    else if (item.kind === "donut") addDonut(slide, deck, item.rows ?? []);
    else if (item.kind === "bars") addBars(slide, deck, item.rows ?? []);
    else if (item.kind === "compare") addBars(slide, deck, item.rows ?? [], true, item.compareLabels);
    else if (item.kind === "line") addLine(slide, deck, item.rows ?? []);
    else if (item.kind === "map") addMap(slide, deck, item.rows ?? [], campusMap);
    else if (item.kind === "responses") addResponses(slide, deck, item.freeResponses ?? []);
    progress(index + 1);
    // レンダリングの進行表示を更新可能にし、ブラウザのフリーズ感を軽減。
    if ((index + 1) % 8 === 0) await new Promise<void>(resolve => window.setTimeout(resolve, 0));
  }

  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  await deck.writeFile({ fileName: `POKIPO_Final_Report_${slides.length}slides_${date}.pptx` });
}
