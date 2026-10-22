"use client";

import { useMemo } from "react";

type Props = {
  answers: string[];
  label?: string;
};

const STOP_WORDS = new Set([
  "する", "した", "して", "している", "いる", "ある", "あった", "なった", "なる",
  "こと", "もの", "ため", "とき", "よう", "それ", "これ", "そこ", "ここ", "自分",
  "思う", "思った", "感じる", "感じた", "できる", "できた", "ない", "ます", "です",
  "だった", "でした", "から", "まで", "より", "など", "とか", "そして", "また",
  "とても", "すごく", "なんか", "ちょっと", "いっぱい", "いろいろ", "やっぱり",
  "ポッキー", "POKIPO", "pokipo", "pocky", "POCKY", "LiPost", "lipost",
]);

const CLEAN = /^[\p{P}\p{S}\p{Z}\p{N}]+$/u;

function getWords(text: string): string[] {
  const input = text.normalize("NFKC").replace(/[\r\n]+/g, " ").trim();
  if (!input) return [];

  // 日本語の辞書分割（ブラウザ標準API）。外部の文章解析サービスへ回答を送らない。
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    return [...segmenter.segment(input)]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment.trim())
      .filter((word) => word.length >= 2 && !CLEAN.test(word) && !STOP_WORDS.has(word));
  }

  return input.split(/[\s、。・！!？?，,．.]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !CLEAN.test(word) && !STOP_WORDS.has(word));
}

export default function PokipoSurveyWordCloud({ answers, label = "記述回答" }: Props) {
  const words = useMemo(() => {
    const counts = new Map<string, number>();
    for (const answer of answers) {
      for (const word of getWords(answer)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
    return [...counts].map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ja"))
      .slice(0, 32);
  }, [answers]);

  const maximum = words[0]?.count ?? 1;
  return (
    <section aria-label={`${label}のワードクラウド`} style={{ width: "100%", minWidth: 0, margin: "14px 0 18px", padding: "18px 14px", border: "1px solid #ede0dd", borderRadius: 18, background: "#fffaf8", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <strong style={{ color: "#8a1822", fontSize: 14 }}>リアルタイム ワードクラウド</strong>
        <small style={{ color: "#80726f", fontSize: 11 }}>回答に合わせて約15秒ごとに更新</small>
      </div>
      {words.length === 0 ? (
        <p style={{ color: "#786f6c", fontSize: 12, margin: 0 }}>集計できる単語がまだありません。</p>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", alignContent: "center", gap: "8px 13px", flexWrap: "wrap", minHeight: 150, overflow: "hidden", padding: "6px 0" }}>
          {words.map(({ word, count }, index) => {
            const weight = Math.sqrt(count / maximum);
            return <span key={word} title={`${word}：${count}回`} style={{ display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere", color: index % 4 === 0 ? "#a51f2c" : index % 4 === 1 ? "#704a47" : index % 4 === 2 ? "#c2674c" : "#8a1822", fontSize: `clamp(12px, ${12 + 17 * weight}px, 29px)`, fontWeight: 700 + Math.round(weight * 200), lineHeight: 1.3, transition: "font-size .4s ease, opacity .4s ease" }}>{word}</span>;
          })}
        </div>
      )}
      <small style={{ display: "block", marginTop: 10, color: "#918682", fontSize: 10 }}>頻出語ほど大きく表示。一般語・企画名などは除外しています。表示は簡易的な語句頻度分析です。</small>
    </section>
  );
}