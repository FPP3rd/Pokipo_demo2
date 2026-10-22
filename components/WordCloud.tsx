"use client";

import { useMemo, useState } from "react";

type WordCloudProps = { answers: string[]; maxWords?: number };
type WordEntry = { word: string; count: number };

const STOP_WORDS = new Set([
  "です", "ます", "でした", "ました", "ません", "ない", "ある", "いる", "なる",
  "する", "した", "して", "こと", "もの", "ため", "よう", "そう", "それ",
  "これ", "あれ", "ここ", "そこ", "どこ", "とても", "すごく", "本当に",
  "自分", "今回", "感じ", "思い", "思う", "思っ", "いただき", "でき", "できる",
  "だった", "あった", "あまり", "もっと", "少し", "とても", "そして", "でも",
  "また", "ので", "から", "まで", "など", "とか", "だけ", "なら", "けど",
  "について", "という", "ところ", "とき", "時", "人", "的", "何", "事"
]);

const NORMALIZE: Record<string, string> = {
  "楽しい": "楽しい", "楽しかっ": "楽しい", "楽しさ": "楽しい", "楽しめ": "楽しい",
  "面白かっ": "面白い", "面白い": "面白い", "おもしろい": "面白い",
  "ポッキー": "ポッキー", "ぽっきー": "ポッキー"
};

function extractWords(text: string): string[] {
  const cleaned = text.normalize("NFKC").replace(/[\r\n\t]/g, " ");
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, opts: { granularity: "word" }) => { segment: (s: string) => Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
  if (!Segmenter) {
    // 古いブラウザ用の簡易フォールバック。日本語の分かち書き精度は限定的です。
    return (cleaned.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]{2,}|[a-zA-Z]{2,}/gu) ?? [])
      .map((w) => NORMALIZE[w] ?? w.toLowerCase())
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  }
  return Array.from(new Segmenter("ja", { granularity: "word" }).segment(cleaned))
    .filter((part) => part.isWordLike)
    .map((part) => part.segment.trim())
    .filter((word) => /[\p{L}\p{N}]/u.test(word) && word.length >= 2)
    .map((word) => NORMALIZE[word] ?? word.toLowerCase())
    .filter((word) => !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function aggregate(answers: string[]): WordEntry[] {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    // 出現「回答件数」を示す：同じ回答内に何度書かれても1件として数える。
    for (const word of new Set(extractWords(answer))) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts].map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ja"));
}

export default function WordCloud({ answers, maxWords = 40 }: WordCloudProps) {
  const [selected, setSelected] = useState<WordEntry | null>(null);
  const words = useMemo(() => aggregate(answers.filter((x): x is string => typeof x === "string" && x.trim().length > 0)).slice(0, maxWords), [answers, maxWords]);
  const largest = Math.max(1, ...words.map((x) => x.count));
  const palette = ["#c83e53", "#8f4655", "#d37d61", "#53748c", "#87759c", "#799078"];

  return (
    <section style={{ border: "1px solid #e6dce0", borderRadius: 18, padding: 20, background: "#fff" }} aria-label="自由記述ワードクラウド">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#343039" }}>自由記述ワードクラウド</h3>
        <span style={{ fontSize: 12, color: "#807680" }}>回答に多く登場した言葉を大きく表示</span>
      </div>
      {words.length === 0 ? (
        <p style={{ color: "#817982", padding: "24px 0" }}>集計対象の自由記述回答がありません。</p>
      ) : (
        <div style={{ minHeight: 220, padding: "22px 8px", display: "flex", flexWrap: "wrap", alignItems: "center", alignContent: "center", justifyContent: "center", gap: "12px 18px" }}>
          {words.map(({ word, count }, index) => (
            <button key={word} type="button" onClick={() => setSelected({ word, count })}
              title={`${word}：${count}件の回答`}
              style={{ padding: "4px 2px", border: 0, background: "transparent", cursor: "pointer", fontWeight: index < 10 ? 750 : 600, color: palette[index % palette.length], fontSize: `clamp(13px, ${14 + Math.round(25 * Math.sqrt(count / largest))}px, 39px)`, lineHeight: 1.2 }}>
              {word}
            </button>
          ))}
        </div>
      )}
      <div style={{ borderTop: "1px solid #f0e8eb", paddingTop: 12, color: "#665e67", fontSize: 13 }}>
        {selected ? `「${selected.word}」を含む回答：${selected.count}件` : "単語をタップすると回答件数を確認できます。"}
      </div>
      <p style={{ fontSize: 11, color: "#938a93", marginBottom: 0 }}>※ 単語分割は簡易解析です。文脈や感情の正確な判定をするものではありません。</p>
    </section>
  );
}