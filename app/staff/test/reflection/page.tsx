"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";

const learnedOptions = [
  "商品のおいしさ以外にも価値があること",
  "カカオ農家の暮らしや所得の課題",
  "児童労働と教育機会の関係",
  "企業や地域社会の取り組み",
  "自分の消費と社会のつながり",
  "まだ整理できていない",
];

const actionOptions = [
  "商品の生産背景について調べてみたい",
  "企業の取り組みを確認してみたい",
  "友人や家族と話してみたい",
  "これからの商品選びで意識したい",
  "今のところ特にない",
];

export default function TestReflectionPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [learnedPoint, setLearnedPoint] = useState("");
  const [personalAction, setPersonalAction] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkStaff() {
      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/staff/reward");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("staff_profiles")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (!active) return;

        if (profileError || !profile) {
          router.replace("/staff/reward");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("スタッフ確認エラー:", error);
        if (active) router.replace("/staff/reward");
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkStaff();

    return () => {
      active = false;
    };
  }, [router]);

  function resetPreview() {
    setLearnedPoint("");
    setPersonalAction("");
    setCompleted(false);
  }

  function renderQuestion(
    title: string,
    description: string,
    options: string[],
    value: string,
    onChange: (value: string) => void
  ) {
    return (
      <section
        style={{
          padding: 20,
          marginBottom: 20,
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #eadbd4",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            margin: "0 0 10px",
            color: "#493029",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            margin: "0 0 18px",
            color: "#80685e",
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {options.map((option) => {
            const selected = value === option;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(option)}
                style={{
                  padding: "15px 14px",
                  borderRadius: 13,
                  border: selected
                    ? "2px solid #c52230"
                    : "1px solid #e8dcd5",
                  background: selected
                    ? "#fff0ef"
                    : "#ffffff",
                  color: selected
                    ? "#b91d29"
                    : "#544039",
                  fontWeight: selected ? 800 : 500,
                  textAlign: "left",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {selected ? "✓ " : ""}
                {option}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (checking || !authorized) {
    return (
      <main className="shell">
        <section style={{ padding: 30, textAlign: "center" }}>
          スタッフ権限を確認しています...
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "24px 16px 50px",
        }}
      >
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            borderRadius: 14,
            border: "1px solid #efc89b",
            background: "#fff4e9",
          }}
        >
          <strong>LiPost 動作確認モード</strong>

          <p
            style={{
              margin: "6px 0 12px",
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            本番の振り返り画面を再現しています。
            回答を操作してもSupabaseには保存されません。
          </p>

          <button
            type="button"
            onClick={() => router.push("/staff/test")}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid #dfbd95",
              background: "#fff",
              color: "#70451e",
              fontWeight: 700,
            }}
          >
            ← 動作確認メニューに戻る
          </button>
        </div>

        <header
          style={{
            marginBottom: 25,
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              marginBottom: 12,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.12em",
              color: "#c92734",
            }}
          >
            POKIPO REFLECTION
          </span>

          <h1
            style={{
              fontSize: 27,
              lineHeight: 1.4,
              color: "#472a26",
              margin: "0 0 12px",
            }}
          >
            その一本の向こう側へ。
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.9,
              color: "#735b51",
            }}
          >
            5か所のスタンプラリー達成、
            おめでとうございます！
            <br />
            今回知ったことや感じたことを
            振り返ってみましょう。
          </p>
        </header>

        {completed ? (
          <section
            style={{
              padding: 24,
              borderRadius: 18,
              background: "#fff",
              border: "1px solid #eadbd4",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 38,
                color: "#c52230",
                marginBottom: 12,
              }}
            >
              ✓
            </div>

            <h2>振り返り回答完了！</h2>

            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: "#735b51",
              }}
            >
              プレビューでの回答操作が完了しました。
              実際の回答データは保存していません。
            </p>

            <div
              style={{
                display: "grid",
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="mainActionButton"
                onClick={() =>
                  router.push("/staff/test/survey/after")
                }
              >
                参加後アンケートの動作確認へ →
              </button>

              <button
                type="button"
                onClick={resetPreview}
                style={{
                  padding: 14,
                  borderRadius: 13,
                  border: "1px solid #e4d5ce",
                  background: "#fff",
                }}
              >
                もう一度プレビューする
              </button>

              <button
                type="button"
                onClick={() => router.push("/staff/test")}
                style={{
                  padding: 12,
                  background: "transparent",
                  color: "#80685e",
                }}
              >
                動作確認メニューに戻る
              </button>
            </div>
          </section>
        ) : (
          <>
            {renderQuestion(
              "Q1. 最も印象に残ったこと",
              "今回のスタンプラリーで、最も印象に残った内容を一つ選んでください。正解・不正解はありません。",
              learnedOptions,
              learnedPoint,
              setLearnedPoint
            )}

            {renderQuestion(
              "Q2. これから意識してみたいこと",
              "今回の体験を通じて、今後意識してみたいことに最も近いものを一つ選んでください。",
              actionOptions,
              personalAction,
              setPersonalAction
            )}

            <button
              type="button"
              className="mainActionButton"
              disabled={!learnedPoint || !personalAction}
              onClick={() => setCompleted(true)}
              style={{
                width: "100%",
                justifyContent: "center",
                opacity:
                  learnedPoint && personalAction ? 1 : 0.55,
              }}
            >
              回答して参加後アンケートへ
            </button>

            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                lineHeight: 1.8,
                color: "#917b70",
                textAlign: "center",
              }}
            >
              プレビュー専用のため、回答データは保存しません。
            </p>
          </>
        )}
      </section>
    </main>
  );
}