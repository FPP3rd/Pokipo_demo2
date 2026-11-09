"use client";

import { flushSync } from "react-dom";

type Slide = {
  id: string;
  title: string;
  freeResponses?: string[];
};

type Options = {
  root: HTMLDivElement;
  slides: Slide[];
  select: (index: number) => void;
  progress: (completed: number) => void;
};

/**
 * 現行プレゼン画面をそのまま１ページずつキャプチャし、静止画スライドにする。
 * DOMの既存デザインを使うためグラフの再作図・架空の値の生成はしない。
 */
export async function downloadPokipoPresentationPptx({ root, slides, select, progress }: Options): Promise<void> {
  if (!slides.length) throw new Error("出力するスライドがありません。");

  // ボタンクリック後だけライブラリを読み込む。通常の参加者画面には影響しない。
  const [{ toPng }, pptxModule] = await Promise.all([
    import("html-to-image"),
    import("pptxgenjs"),
  ]);
  const PptxGenJS = pptxModule.default;
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.author = "POKIPO / LiPost";
  deck.subject = "POKIPO FINAL REPORT 2026 — プレゼンモードの静止画出力";
  deck.title = "POKIPO FINAL REPORT 2026";

  await document.fonts.ready;
  const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  for (let i = 0; i < slides.length; i += 1) {
    // 既存のスライドをそのまま再表示。キャプチャ中はアニメーション最終状態を利用する。
    flushSync(() => select(i));
    await nextPaint();

    // 同一オリジンの地図画像を含めて１ページを16:9でキャプチャする。
    const image = await toPng(root, {
      backgroundColor: "#fffaf7",
      pixelRatio: 1,
      cacheBust: false,
      width: 1280,
      height: 720,
      style: {
        width: "1280px",
        height: "720px",
        minWidth: "1280px",
        maxWidth: "1280px",
        minHeight: "720px",
        maxHeight: "720px",
        position: "relative",
        inset: "auto",
        overflow: "hidden",
      },
    });
    const page = deck.addSlide();
    page.background = { color: "FFFAF7" };
    page.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
    progress(i + 1);
  }

  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  await deck.writeFile({ fileName: `POKIPO_Final_Report_${slides.length}slides_${day}.pptx` });
}
