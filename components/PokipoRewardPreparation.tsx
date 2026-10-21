"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PreparationStatus = {
  stampCount: number;
  postSurveyCompleted: boolean;
  qrIssued: boolean;
  exchanged: boolean;
  loading?: boolean;
};

type Props = PreparationStatus & {
  preview?: boolean;
};

export default function PokipoRewardPreparation({
  stampCount,
  postSurveyCompleted,
  qrIssued,
  exchanged,
  loading = false,
  preview = false,
}: Props) {
  const router = useRouter();
  const [showHint, setShowHint] = useState(false);

  const completed = stampCount >= 5;
  const steps = [
    {
      number: "01",
      title: "5か所のスタンプを集める",
      detail: completed
        ? "5か所コンプリート！"
        : `現在 ${Math.min(5, Math.max(0, stampCount))}/5 か所。すべてのスポットを巡ろう`,
      done: completed,
    },
    {
      number: "02",
      title: "参加後アンケートに回答",
      detail: postSurveyCompleted
        ? "回答済みです。ご協力ありがとうございます！"
        : "回答すると、交換用QRを発行できるようになります",
      done: postSurveyCompleted,
    },
    {
      number: "03",
      title: "交換用QR・確認番号を準備",
      detail: qrIssued
        ? "交換用QRを発行済み。下の景品交換欄で表示できます"
        : "条件を満たすと交換用QRが自動発行されます",
      done: qrIssued,
    },
  ];
  const count = steps.filter((s) => s.done).length;
  const ready = completed && postSurveyCompleted && qrIssued;
  const accent = "#ab3140";

  return (
    <section
      aria-label="特典交換準備チェックリスト"
      style={{
        maxWidth: 760,
        margin: "22px auto",
        padding: "clamp(16px, 4vw, 27px)",
        borderRadius: 22,
        border: "1px solid #eededc",
        background: "linear-gradient(150deg,#fffdfb,#fff7f5)",
        boxShadow: "0 9px 32px rgba(100,34,39,.07)",
        boxSizing: "border-box",
      }}
    >
      <p style={{ color: accent, fontSize: 11, fontWeight: 900, letterSpacing: ".14em", margin: 0 }}>
        REWARD PREPARATION
      </p>
      <h2 style={{ fontSize: "clamp(19px,4.6vw,26px)", margin: "8px 0", color: "#382e30" }}>
        特典交換の準備チェックリスト
      </h2>
      <p style={{ color: "#74666a", fontSize: 13, lineHeight: 1.8, margin: "0 0 17px" }}>
        交換会に来る前に、準備できているか確認しましょう。
      </p>

      {loading ? (
        <div role="status" style={{ padding: 20, color: "#74666a" }}>
          準備状況を確認しています…
        </div>
      ) : exchanged ? (
        <div role="status" style={{ padding: 20, borderRadius: 13, background: "#f0f7f1", color: "#236943", fontWeight: 800 }}>
          ✓ 特典交換は完了しています。ご参加ありがとうございました！
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong style={{ fontSize: 13, color: "#43363a" }}>
              準備状況 {count}/3
            </strong>
            <span style={{ color: ready ? "#26724d" : accent, fontSize: 12, fontWeight: 900 }}>
              {ready ? "交換準備OK！" : "準備を進めましょう"}
            </span>
          </div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={count}
            style={{ margin: "10px 0 17px", height: 9, borderRadius: 99, overflow: "hidden", background: "#eee2df" }}>
            <div style={{ height: "100%", width: `${count / 3 * 100}%`,
              background: ready ? "#32845b" : accent, borderRadius: 99, transition: "width .25s" }} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {steps.map((step) => (
              <div key={step.number} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                background: "#fff", border: `1px solid ${step.done ? "#cce4d3" : "#ecdeda"}`,
                borderRadius: 13, padding: 13
              }}>
                <span aria-label={step.done ? "完了" : "未完了"} style={{
                  display: "grid", placeItems: "center", flexShrink: 0,
                  width: 30, height: 30, borderRadius: "50%",
                  background: step.done ? "#338758" : "#f3e9e6", color: step.done ? "white" : accent,
                  fontSize: 13, fontWeight: 900
                }}>
                  {step.done ? "✓" : step.number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 14, color: "#3d3033" }}>{step.title}</strong>
                  <p style={{ fontSize: 12, color: "#796b6d", lineHeight: 1.6, margin: "4px 0 0" }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!postSurveyCompleted && completed && (
            <button type="button" onClick={() => !preview && router.push("/survey/after")}
              disabled={preview}
              style={{
                width: "100%", border: 0, borderRadius: 11, padding: 13,
                background: accent, color: "white", fontWeight: 900, fontSize: 14,
                marginTop: 14, cursor: preview ? "default" : "pointer", opacity: preview ? .7 : 1
              }}>
              参加後アンケートに回答する →
            </button>
          )}

          {ready && (
            <div role="status" style={{
              marginTop: 14, padding: 15, borderRadius: 12,
              background: "#eff8f1", color: "#216443", fontWeight: 900, fontSize: 14
            }}>
              ✓ 準備完了！当日は下の交換用QRと確認番号をスタッフに提示してください。
            </div>
          )}
        </>
      )}

      <div style={{
        marginTop: 17, padding: 16, borderRadius: 14,
        background: "#fff1eb", border: "1px solid #f0d7cf"
      }}>
        <div style={{ fontWeight: 900, color: "#8d2c39", fontSize: 14 }}>
          10月27日（火）12:35〜16:00
        </div>
        <div style={{ fontWeight: 900, color: "#45353a", marginTop: 4 }}>
          特典交換会場：雄飛ホール
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#76585e", lineHeight: 1.7 }}>
          当日はPOKIPOの特典画面を開き、交換用QRと確認番号をスタッフに提示してください。
          スクリーンショットも推奨します。
        </p>
        <button type="button" onClick={() => setShowHint(!showHint)}
          aria-expanded={showHint}
          style={{ marginTop: 9, background: "transparent", border: 0,
            color: accent, fontWeight: 800, fontSize: 12, padding: "4px 0", cursor: "pointer" }}>
          {showHint ? "案内を閉じる ▲" : "当日の流れを確認する ▼"}
        </button>
        {showHint && (
          <p style={{ fontSize: 12, lineHeight: 1.8, margin: "8px 0 0", color: "#685358" }}>
            ① 特典画面を開く → ② 交換用QRと確認番号を準備 →
            ③ 交換カウンターでスタッフに提示 → ④ スタッフが交換を確定
          </p>
        )}
      </div>
      {preview && (
        <p style={{ textAlign: "center", fontSize: 11, color: "#9b6e75", marginTop: 13 }}>
          STAFF PREVIEW｜これは模擬画面です。本番データは変更されません。
        </p>
      )}
    </section>
  );
}