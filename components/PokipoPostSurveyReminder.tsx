"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase-client";

type Props = {
  progress: number;
  rewardExchanged: boolean;
};

export default function PokipoPostSurveyReminder({ progress, rewardExchanged }: Props) {
  const router = useRouter();
  const [surveyCompleted, setSurveyCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (progress < 5 || rewardExchanged) {
      setSurveyCompleted(null);
      return;
    }

    let active = true;
    async function checkSurvey() {
      const participantId =
        localStorage.getItem("pokipo_participant_id") ??
        localStorage.getItem("pokipo_user_id");
      if (!participantId) {
        if (active) setSurveyCompleted(null);
        return;
      }

      const { data, error } = await supabase.rpc(
        "has_completed_pokipo_post_survey",
        { p_participant_id: participantId }
      );
      if (!active) return;
      if (error) {
        console.error("参加後アンケートの状態確認に失敗:", error);
        setSurveyCompleted(null); // 確認できない場合は未回答と決めつけない
        return;
      }
      setSurveyCompleted(data === true);
    }

    void checkSurvey();
    function onFocus() { void checkSurvey(); }
    function onVisible() {
      if (document.visibilityState === "visible") void checkSurvey();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void checkSurvey(), 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [progress, rewardExchanged]);

  if (progress < 5 || rewardExchanged || surveyCompleted !== false) return null;

  return (
    <section
      aria-label="参加後アンケート回答のお願い"
      style={{
        margin: "14px 0",
        padding: "18px 16px",
        background: "#fff6f4",
        border: "1px solid #dfbbb5",
        borderRadius: 17,
        boxSizing: "border-box",
      }}
    >
      <span style={{ color: "#922b37", fontSize: 10, letterSpacing: ".09em", fontWeight: 900 }}>
        REQUIRED BEFORE EXCHANGE
      </span>
      <h2 style={{ margin: "7px 0", fontSize: 18, lineHeight: 1.5, color: "#6d202b" }}>
        特典交換には参加後アンケートへの回答が必須です
      </h2>
      <p style={{ margin: "0 0 12px", color: "#665d59", fontSize: 13, lineHeight: 1.75 }}>
        スタンプ5か所達成おめでとうございます！
        特典交換用QRを発行するには、参加後アンケートへの回答を完了してください。
      </p>
      <button
        type="button"
        onClick={() => router.push("/survey/after")}
        style={{
          display: "block",
          width: "100%",
          background: "#9f2938",
          color: "#fff",
          padding: "13px 12px",
          border: 0,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        参加後アンケートに回答する →
      </button>
    </section>
  );
}