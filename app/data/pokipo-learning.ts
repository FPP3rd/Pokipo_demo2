export type PokipoLearningContent = {
  spotId: string;
  theme: string;
  title: string;
  question: string;
  options: readonly string[];
  article: string;
  sources: readonly {
    label: string;
    url: string;
  }[];
};

export const pokipoLearningContents: Record<
  string,
  PokipoLearningContent
> = {
  spot1: {
    spotId: "spot1",
    theme: "商品を支える人",
    title: "おいしさの向こう側",
    question:
      "お菓子の価値を考えるとき、あなたが特に大切だと思うことは？",
    options: [
      "おいしさや食感",
      "手頃な価格",
      "生産者の暮らし",
      "まだ考えたことがない",
    ],
    article:
      "ポッキーをはじめ、身近なお菓子が私たちに届くまでには、原料を育てる人や商品をつくり、運ぶ人など多くの人が関わっています。食べる人にとってのおいしさや価格だけでなく、生産者が安心して暮らせることも、商品を長く楽しむために考えたい視点です。",
    sources: [
      {
        label: "Fairtrade International｜Cocoa farmer income",
        url: "https://www.fairtrade.net/en/get-involved/library/cocoa-household-income-study-2025.html",
      },
    ],
  },

  spot2: {
    spotId: "spot2",
    theme: "農家の所得",
    title: "カカオ農家の暮らし",
    question:
      "カカオ農家の収入が不安定だと、どんな影響があると思いますか？",
    options: [
      "生活費が足りなくなる",
      "子どもの教育費に影響する",
      "農業を続けにくくなる",
      "よくわからない",
    ],
    article:
      "カカオ農家の所得は、収穫量や生産に必要な費用、取引価格などに左右されます。Fairtrade Internationalが紹介するコートジボワールの認証農家に関する調査でも、生活に必要な所得を確保することは課題として示されています。生産者の暮らしに目を向けることも、お菓子の背景を知る一歩です。",
    sources: [
      {
        label: "Fairtrade International｜Living incomes in Côte d'Ivoire",
        url: "https://www.fairtrade.net/us-en/for-media/living-incomes-in-reach-for-more-cocoa-farmers-in-cote-d-ivoire-.html",
      },
    ],
  },

  spot3: {
    spotId: "spot3",
    theme: "児童労働と教育",
    title: "子どもたちに学ぶ時間を",
    question:
      "児童労働を減らすために重要だと思うものは？",
    options: [
      "家庭の所得を支える",
      "学校に通いやすくする",
      "地域の支援体制を整える",
      "一つには絞れない",
    ],
    article:
      "ILOとUNICEFによると、2024年には世界で約1億3,800万人の子どもが児童労働に従事していました。これはカカオ産業だけの人数ではありません。カカオ生産地でも、貧困や教育機会の不足などが課題となっています。家庭の生活支援や教育環境の改善など、複数の対策を考える必要があります。",
    sources: [
      {
        label: "ILO・UNICEF｜Child labour: Global estimates 2024",
        url: "https://www.ilo.org/publications/major-publications/child-labour-global-estimates-2024-trends-and-road-forward",
      },
      {
        label: "International Cocoa Initiative｜Issues",
        url: "https://www.cocoainitiative.org/issues",
      },
    ],
  },

  spot4: {
    spotId: "spot4",
    theme: "解決策",
    title: "誰が、どう解決する？",
    question:
      "社会課題の解決で特に重要な役割を担うのは誰だと思う？",
    options: [
      "農家や地域社会",
      "企業や流通業者",
      "政府や支援団体",
      "さまざまな立場の協力",
    ],
    article:
      "カカオ生産に関わる問題は、誰か一人の努力だけでは解決できません。農家の収入を支え、教育へのアクセスを改善し、危険な児童労働を防ぐためには、地域社会・企業・政府など複数の立場の協力が求められます。解決方法を考えるときは、何が原因なのかにも目を向けることが大切です。",
    sources: [
      {
        label: "International Cocoa Initiative｜What works to tackle child labour",
        url: "https://www.cocoainitiative.org/news/what-works-tackle-child-labour",
      },
    ],
  },

  spot5: {
    spotId: "spot5",
    theme: "責任ある消費",
    title: "あなたの選択、その先へ",
    question:
      "今回の内容から、今後意識してみたいことは？",
    options: [
      "商品の生産背景を調べる",
      "企業の取り組みを知る",
      "家族や友人と話す",
      "今は特にない",
    ],
    article:
      "国連のSDGs目標12は、持続可能な生産と消費を掲げています。私たちが商品を選ぶ際、おいしさや価格だけでなく、原料の生産背景にも関心を持つことは、社会とのつながりを考える一歩になります。ただし、消費者の選択だけで社会課題が解決するわけではありません。まずは知り、考えることから始められます。",
    sources: [
      {
        label: "国際連合｜SDGs目標12",
        url: "https://sdgs.un.org/goals/goal12",
      },
    ],
  },
};

export function getPokipoLearningContent(
  spotId: string
): PokipoLearningContent | null {
  return pokipoLearningContents[spotId] ?? null;
}