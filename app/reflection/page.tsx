"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase-client";

import MaintenanceGate from "../../components/MaintenanceGate";

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

function getParticipantId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("pokipo_participant_id") ??
    localStorage.getItem("pokipo_user_id") ??
    ""
  );
}

export default function ReflectionPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  const [alreadyAnswered, setAlreadyAnswered] =
    useState(false);

  const [learnedPoint, setLearnedPoint] =
    useState("");

  const [personalAction, setPersonalAction] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const participantId = getParticipantId();

        if (!participantId) {
          router.replace("/");
          return;
        }

        const { data: stamps, error: stampError } =
          await supabase.rpc(
            "get_pokipo_stamps",
            {
              p_participant_id: participantId,
            }
          );

        if (stampError) {
          throw new Error(
            "スタンプの取得状況を確認できませんでした。"
          );
        }

        const validSpotIds = new Set([
          "spot1",
          "spot2",
          "spot3",
          "spot4",
          "spot5",
        ]);

        const collectedIds = new Set(
          (
            (stamps ?? []) as {
              spot_id: string;
            }[]
          )
            .map((item) => item.spot_id)
            .filter((id) => validSpotIds.has(id))
        );

        if (collectedIds.size < 5) {
          router.replace("/reward");
          return;
        }

        const {
          data: reflectionCompleted,
          error: reflectionError,
        } = await supabase.rpc(
          "has_completed_pokipo_reflection",
          {
            p_participant_id: participantId,
          }
        );

        if (reflectionError) {
          throw new Error(
            "振り返りの回答状況を確認できませんでした。"
          );
        }

        if (!active) return;

        if (reflectionCompleted === true) {
          setAlreadyAnswered(true);

          localStorage.setItem(
            "pokipo_reflection_completed",
            "true"
          );
        }

        setReady(true);
      } catch (error) {
        if (!active) return;

        console.error(
          "振り返り初期化エラー:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "情報を取得できませんでした。"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  async function submitReflection() {
    if (
      saving ||
      !learnedPoint ||
      !personalAction
    ) {
      return;
    }

    const participantId = getParticipantId();

    if (!participantId) {
      setMessage(
        "参加者情報が確認できません。"
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data, error } =
        await supabase.rpc(
          "submit_pokipo_reflection",
          {
            p_participant_id: participantId,
            p_learned_point: learnedPoint,
            p_personal_action: personalAction,
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data !== true) {
        throw new Error(
          "保存結果を確認できませんでした。"
        );
      }

      const {
        data: completed,
        error: checkError,
      } = await supabase.rpc(
        "has_completed_pokipo_reflection",
        {
          p_participant_id: participantId,
        }
      );

      if (checkError || completed !== true) {
        throw new Error(
          "保存状態を確認できませんでした。"
        );
      }

      localStorage.setItem(
        "pokipo_reflection_completed",
        "true"
      );

      router.replace("/survey/after");
    } catch (error) {
      console.error(
        "振り返り保存エラー:",
        error
      );

      setMessage(
        "振り返りを保存できませんでした。通信環境を確認してもう一度お試しください。"
      );
    } finally {
      setSaving(false);
    }
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
                disabled={saving}
                onClick={() => onChange(option)}
                aria-pressed={selected}
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
                  fontWeight: selected
                    ? 800
                    : 500,
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

  return (
    <MaintenanceGate page="survey_after">
      <main className="shell">
        <section
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "24px 16px 50px",
          }}
        >
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

          {loading ? (
            <div
              className="staffLoadingCard"
              role="status"
            >
              回答状況を確認しています...
            </div>
          ) : !ready ? (
            <section
              style={{
                padding: 20,
                borderRadius: 16,
                background: "#fff3ee",
              }}
            >
              <p role="alert">
                {message ||
                  "振り返りを開始できませんでした。"}
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/reward")
                }
              >
                特典画面に戻る
              </button>
            </section>
          ) : alreadyAnswered ? (
            <section
              style={{
                padding: 24,
                borderRadius: 18,
                background: "#fff",
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

              <h2>
                振り返り回答済み
              </h2>

              <p>
                ご回答ありがとうございます。
                続いて参加後アンケートに進んでください。
              </p>

              <button
                type="button"
                className="mainActionButton"
                onClick={() =>
                  router.push("/survey/after")
                }
              >
                参加後アンケートへ進む →
              </button>
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

              {message && (
                <p
                  role="alert"
                  style={{
                    color: "#c52230",
                    marginBottom: 15,
                  }}
                >
                  {message}
                </p>
              )}

              <button
                type="button"
                className="mainActionButton"
                disabled={
                  !learnedPoint ||
                  !personalAction ||
                  saving
                }
                onClick={() =>
                  void submitReflection()
                }
                style={{
                  width: "100%",
                  justifyContent: "center",
                  opacity:
                    !learnedPoint ||
                    !personalAction ||
                    saving
                      ? 0.55
                      : 1,
                }}
              >
                {saving
                  ? "保存中..."
                  : "回答して参加後アンケートへ"}
              </button>

              <p
                style={{
                  marginTop: 16,
                  color: "#917b70",
                  fontSize: 12,
                  lineHeight: 1.8,
                  textAlign: "center",
                }}
              >
                回答は企画の振り返り・分析に利用します。
                個人を特定する形で公開しません。
              </p>
            </>
          )}
        </section>
      </main>
    </MaintenanceGate>
  );
}