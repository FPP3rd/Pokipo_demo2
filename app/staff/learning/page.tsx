"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type AnalyticsRow = {
  category: string;
  question_id: string;
  answer_text: string;
  answer_count: number;
};

type Question = {
  id: string;
  title: string;
  category: "spot" | "reflection";
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    id: "spot1",
    title: "SPOT 1｜おいしさの向こう側",
    category: "spot",
    options: [
      "おいしさや食感",
      "手頃な価格",
      "生産者の暮らし",
      "まだ考えたことがない",
    ],
  },
  {
    id: "spot2",
    title: "SPOT 2｜カカオ農家の暮らし",
    category: "spot",
    options: [
      "生活費が足りなくなる",
      "子どもの教育費に影響する",
      "農業を続けにくくなる",
      "よくわからない",
    ],
  },
  {
    id: "spot3",
    title: "SPOT 3｜子どもたちに学ぶ時間を",
    category: "spot",
    options: [
      "家庭の所得を支える",
      "学校に通いやすくする",
      "地域の支援体制を整える",
      "一つには絞れない",
    ],
  },
  {
    id: "spot4",
    title: "SPOT 4｜誰が、どう解決する？",
    category: "spot",
    options: [
      "農家や地域社会",
      "企業や流通業者",
      "政府や支援団体",
      "さまざまな立場の協力",
    ],
  },
  {
    id: "spot5",
    title: "SPOT 5｜あなたの選択、その先へ",
    category: "spot",
    options: [
      "商品の生産背景を調べる",
      "企業の取り組みを知る",
      "家族や友人と話す",
      "今は特にない",
    ],
  },
  {
    id: "learned_point",
    title: "振り返り①｜最も印象に残ったこと",
    category: "reflection",
    options: [
      "商品のおいしさ以外にも価値があること",
      "カカオ農家の暮らしや所得の課題",
      "児童労働と教育機会の関係",
      "企業や地域社会の取り組み",
      "自分の消費と社会のつながり",
      "まだ整理できていない",
    ],
  },
  {
    id: "personal_action",
    title: "振り返り②｜これから意識したいこと",
    category: "reflection",
    options: [
      "商品の生産背景について調べてみたい",
      "企業の取り組みを確認してみたい",
      "友人や家族と話してみたい",
      "これからの商品選びで意識したい",
      "今のところ特にない",
    ],
  },
];

function sumCounts(rows: AnalyticsRow[]): number {
  return rows.reduce(
    (total, row) => total + row.answer_count,
    0
  );
}

function ChartCard({
  question,
  rows,
}: {
  question: Question;
  rows: AnalyticsRow[];
}) {
  const questionRows = rows.filter(
    (row) =>
      row.category === question.category &&
      row.question_id === question.id
  );

  const total = sumCounts(questionRows);

  const options = [
    ...question.options,
    ...questionRows
      .map((row) => row.answer_text)
      .filter(
        (value) => !question.options.includes(value)
      ),
  ];

  return (
    <article
      style={{
        padding: 20,
        border: "1px solid #eaded8",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 4px 16px rgba(0,0,0,.03)",
        minWidth: 0,
      }}
    >
      <h3
        style={{
          margin: "0 0 7px",
          fontSize: 17,
          color: "#49332c",
        }}
      >
        {question.title}
      </h3>

      <p
        style={{
          margin: "0 0 21px",
          color: "#8a7469",
          fontSize: 12,
        }}
      >
        回答数：{total}件
      </p>

      {total === 0 ? (
        <p
          style={{
            color: "#917f76",
            fontSize: 13,
          }}
        >
          まだ回答がありません。
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          {options.map((option) => {
            const count = questionRows
              .filter(
                (row) => row.answer_text === option
              )
              .reduce(
                (total, row) =>
                  total + row.answer_count,
                0
              );

            const percent =
              total > 0
                ? (count / total) * 100
                : 0;

            return (
              <div key={option}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#59443c",
                      lineHeight: 1.6,
                    }}
                  >
                    {option}
                  </span>

                  <strong
                    style={{
                      flexShrink: 0,
                      fontSize: 12,
                      color: "#442f29",
                    }}
                  >
                    {count}件
                    {" "}
                    ({percent.toFixed(1)}%)
                  </strong>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 13,
                    borderRadius: 20,
                    background: "#f1e6e1",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      borderRadius: 20,
                      background:
                        "linear-gradient(90deg,#ec8589,#ca202c)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function StaffLearningPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [rows, setRows] =
    useState<AnalyticsRow[]>([]);

  const [lastUpdated, setLastUpdated] =
    useState("");

  const [tab, setTab] =
    useState<"spots" | "reflection">("spots");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/staff/reward");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("staff_profiles")
        .select("user_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        router.replace("/staff/reward");
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_pokipo_learning_analytics"
      );

      if (error) {
        throw new Error(error.message);
      }

      const cleaned: AnalyticsRow[] = (
        (data ?? []) as AnalyticsRow[]
      ).map((item) => ({
        category: item.category,
        question_id: item.question_id,
        answer_text: item.answer_text,
        answer_count: Number(item.answer_count) || 0,
      }));

      setRows(cleaned);

      setLastUpdated(
        new Date().toLocaleString("ja-JP")
      );
    } catch (error) {
      console.error(
        "学習分析データ取得エラー:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "集計を取得できませんでした。"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const spotQuestions = useMemo(
    () =>
      QUESTIONS.filter(
        (question) => question.category === "spot"
      ),
    []
  );

  const reflectionQuestions = useMemo(
    () =>
      QUESTIONS.filter(
        (question) =>
          question.category === "reflection"
      ),
    []
  );

  const questionsToShow =
    tab === "spots"
      ? spotQuestions
      : reflectionQuestions;

  const spot1Total = sumCounts(
    rows.filter(
      (row) =>
        row.category === "spot" &&
        row.question_id === "spot1"
    )
  );

  const reflectionTotal = sumCounts(
    rows.filter(
      (row) =>
        row.category === "reflection" &&
        row.question_id === "learned_point"
    )
  );

  const spotAnswerTotal = sumCounts(
    rows.filter(
      (row) => row.category === "spot"
    )
  );

  return (
    <main className="shell">
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "24px 14px 48px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 25,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "#c92330",
                letterSpacing: ".12em",
              }}
            >
              POKIPO ANALYTICS
            </span>

            <h1
              style={{
                margin: "8px 0",
                fontSize: 26,
                color: "#493028",
              }}
            >
              学習・振り返り分析
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#78645d",
              }}
            >
              5地点の意見回答と、完走後の振り返り
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/staff")}
            style={{
              padding: "11px 16px",
              border: "1px solid #e6d8d2",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            スタッフメニューへ
          </button>
        </header>

        {errorMessage && (
          <p
            role="alert"
            style={{
              padding: 16,
              borderRadius: 13,
              background: "#fff1f0",
              color: "#b6202c",
            }}
          >
            {errorMessage}
          </p>
        )}

        {loading ? (
          <section
            style={{
              padding: 30,
              textAlign: "center",
              borderRadius: 16,
              background: "#fff",
            }}
          >
            集計データを読み込んでいます...
          </section>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(160px,1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                {
                  title: "SPOT 1 回答",
                  value: `${spot1Total}件`,
                },
                {
                  title: "5地点の延べ回答",
                  value: `${spotAnswerTotal}件`,
                },
                {
                  title: "振り返り回答",
                  value: `${reflectionTotal}件`,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    borderRadius: 16,
                    padding: 18,
                    border: "1px solid #e9ddd7",
                    background: "#fff",
                  }}
                >
                  <span
                    style={{
                      color: "#7d6b61",
                      fontSize: 12,
                    }}
                  >
                    {item.title}
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: 28,
                      marginTop: 8,
                      color: "#c92230",
                    }}
                  >
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                {
                  value: "spots" as const,
                  label: "5地点の意見回答",
                },
                {
                  value: "reflection" as const,
                  label: "完走後の振り返り",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  style={{
                    flex: 1,
                    padding: "14px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    border:
                      tab === item.value
                        ? "1px solid #c52230"
                        : "1px solid #e8dcd6",
                    background:
                      tab === item.value
                        ? "#c52230"
                        : "#fff",
                    color:
                      tab === item.value
                        ? "#fff"
                        : "#5c443d",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(min(100%,340px),1fr))",
                gap: 16,
              }}
            >
              {questionsToShow.map((question) => (
                <ChartCard
                  key={question.id}
                  question={question}
                  rows={rows}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 24,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#948075",
                }}
              >
                最終取得：{lastUpdated}
              </span>

              <button
                type="button"
                onClick={() => void loadAnalytics()}
                style={{
                  padding: "11px 18px",
                  borderRadius: 12,
                  background: "#fff0ed",
                  color: "#bc202c",
                  fontWeight: 800,
                }}
              >
                最新データに更新
              </button>
            </div>

            <p
              style={{
                marginTop: 18,
                fontSize: 12,
                lineHeight: 1.8,
                color: "#917d73",
              }}
            >
              ※ 各地点の回答数は地点ごとに集計しています。
              延べ回答数は参加者の実人数とは異なります。
              本画面は回答傾向の集計であり、学習による
              因果的な効果を示すものではありません。
            </p>
          </>
        )}
      </section>
    </main>
  );
}