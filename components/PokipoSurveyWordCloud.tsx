"use client";

import { useMemo } from "react";

type Props = {
  answers: string[];
  label?: string;
};

type Term = {
  name: string;
  patterns: RegExp[];
};

// 日本語の途中で切れた断片を除外するため、意味が明確な語句だけを集計する。
// 同義語・表記ゆれは「name」に統一。必要な語句はここに追加できる。
const TERMS: Term[] = [
  { name: "友達", patterns: [/友達|友人|ともだち|友だち|友達同士/iu] },
  { name: "家族", patterns: [/家族|親子|お母さん|お父さん|兄弟|姉妹/iu] },
  { name: "恋人", patterns: [/恋人|彼氏|彼女|カップル/iu] },
  { name: "みんな", patterns: [/みんな|皆で|大勢|複数人/iu] },
  { name: "一緒に", patterns: [/一緒に|いっしょに|共に/iu] },
  { name: "シェア", patterns: [/シェア|分け合|分けて|分ける|おすそわけ|お裾分け/iu] },
  { name: "コミュニケーション", patterns: [/コミュニケーション|会話|話のきっかけ|交流/iu] },
  { name: "楽しい", patterns: [/楽しかった|楽しい|楽しめた|楽しさ|楽しんだ|楽しく/iu] },
  { name: "面白い", patterns: [/面白い|面白かった|おもしろ|興味深い/iu] },
  { name: "嬉しい", patterns: [/嬉し|うれし|喜んだ|喜び/iu] },
  { name: "美味しい", patterns: [/美味し|おいし|美味だった/iu] },
  { name: "かわいい", patterns: [/かわいい|可愛い|可愛かった/iu] },
  { name: "新しい発見", patterns: [/新しい発見|新たな発見|初めて知|知らなかった|初めて分かった|新しいことを知/iu] },
  { name: "学び", patterns: [/学び|学べ|勉強にな|知識を得|理解が深ま|詳しく知/iu] },
  { name: "リニューアル", patterns: [/リニューアル|改良|新しくなった|新しくなって/iu] },
  { name: "価値", patterns: [/価値|魅力|良さ|良いところ/iu] },
  { name: "サステナビリティ", patterns: [/サステナビリティ|サステナブル|持続可能|SDGs/iu] },
  { name: "環境", patterns: [/環境|エコ|リサイクル|資源/iu] },
  { name: "カカオ", patterns: [/カカオ|ココア|チョコレートの原料/iu] },
  { name: "ポッキー", patterns: [/ポッキー|pocky/iu] },
  { name: "お菓子", patterns: [/お菓子|おやつ|菓子/iu] },
  { name: "チョコレート", patterns: [/チョコレート|チョコ/iu] },
  { name: "食べる", patterns: [/食べる|食べた|食べたい|食べて|食べながら|食べられ/iu] },
  { name: "購入", patterns: [/買いたい|買おう|購入|買う|買った|買って/iu] },
  { name: "大学", patterns: [/大学|獨協|学校|学内/iu] },
  { name: "キャンパス", patterns: [/キャンパス|校内/iu] },
  { name: "友人との休憩", patterns: [/友達と休憩|友人と休憩|休み時間|休憩時間/iu] },
  { name: "昼休み", patterns: [/昼休み|お昼休み|昼食|ランチ/iu] },
  { name: "授業", patterns: [/授業|講義|ゼミ/iu] },
  { name: "イベント", patterns: [/イベント|企画|催し|雄飛祭/iu] },
  { name: "スタンプラリー", patterns: [/スタンプラリー|スタンプ集め|スタンプを集め|5か所|５か所/iu] },
  { name: "QRコード", patterns: [/QRコード|QRを読み|QR読み取り|二次元コード/iu] },
  { name: "スポット巡り", patterns: [/スポットを回|スポット巡|場所を回|各所を巡|歩き回|散策/iu] },
  { name: "達成感", patterns: [/達成感|コンプリート|完走|ゴール|達成でき/iu] },
  { name: "特典", patterns: [/特典|景品|プレゼント|交換会/iu] },
  { name: "クイズ", patterns: [/クイズ|問題に答|正解/iu] },
  { name: "豆知識", patterns: [/豆知識|トリビア|雑学/iu] },
  { name: "デザイン", patterns: [/デザイン|見た目|画面|イラスト/iu] },
  { name: "操作", patterns: [/操作|使いやす|簡単に使|わかりやす|分かりやす/iu] },
  { name: "手軽", patterns: [/手軽|気軽|簡単|ラク|楽に/iu] },
  { name: "写真", patterns: [/写真|撮影|カメラ/iu] },
  { name: "SNS", patterns: [/SNS|インスタ|Instagram|LINE|投稿/iu] },
  { name: "思い出", patterns: [/思い出|記念|印象に残|心に残/iu] },
  { name: "驚き", patterns: [/驚|びっくり|意外|予想外/iu] },
  { name: "発見", patterns: [/発見|見つけた|見つかっ/iu] },
  { name: "笑顔", patterns: [/笑顔|笑った|笑い|にこにこ/iu] },
];

// 同じ回答内で同じ用語が何度も現れても、回答者1名として1回だけ数える。
// 共起する別の概念（例：友達 / シェア）はそれぞれ集計する。
function extractTerms(answer: string): string[] {
  const text = answer.normalize("NFKC").trim();
  if (!text) return [];
  return TERMS.filter((term) =>
    term.patterns.some((pattern) => pattern.test(text))
  ).map((term) => term.name);
}

export default function PokipoSurveyWordCloud({
  answers,
  label = "記述回答",
}: Props) {
  const words = useMemo(() => {
    const counts = new Map<string, number>();
    for (const answer of answers) {
      for (const term of extractTerms(answer)) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
    }
    return [...counts]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ja"))
      .slice(0, 32);
  }, [answers]);

  const maximum = words[0]?.count ?? 1;

  return (
    <section
      aria-label={`${label}のワードクラウド`}
      style={{
        width: "100%",
        minWidth: 0,
        margin: "14px 0 18px",
        padding: "18px 14px",
        border: "1px solid #ede0dd",
        borderRadius: 18,
        background: "#fffaf8",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <strong style={{ color: "#8a1822", fontSize: 14 }}>
          リアルタイム ワードクラウド
        </strong>
        <small style={{ color: "#80726f", fontSize: 11 }}>
          回答データに合わせて自動更新
        </small>
      </div>

      {words.length === 0 ? (
        <p style={{ color: "#786f6c", fontSize: 12, margin: 0 }}>
          集計対象の用語がまだありません。
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            alignContent: "center",
            flexWrap: "wrap",
            gap: "8px 13px",
            minHeight: 150,
            overflow: "hidden",
            padding: "6px 0",
          }}
        >
          {words.map(({ word, count }, index) => {
            const weight = Math.sqrt(count / maximum);
            return (
              <span
                key={word}
                title={`${word}：${count}人の回答に登場`}
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                  color:
                    index % 4 === 0 ? "#a51f2c" :
                    index % 4 === 1 ? "#704a47" :
                    index % 4 === 2 ? "#c2674c" : "#8a1822",
                  fontSize: `${12 + 17 * weight}px`,
                  fontWeight: 700 + Math.round(weight * 200),
                  lineHeight: 1.3,
                  transition: "font-size .4s ease, opacity .4s ease",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}
      <small
        style={{
          display: "block",
          marginTop: 10,
          color: "#918682",
          fontSize: 10,
        }}
      >
        意味のある用語を抽出し、表記ゆれを統合しています。数値は回答に登場した人数で集計します。
      </small>
    </section>
  );
}