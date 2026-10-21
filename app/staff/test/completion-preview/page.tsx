"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase-client";
import { pokipoSpots } from "../../../data/pokipo-data";
import PokipoStampGetModal from "../../../../components/PokipoStampGetModal";
import PokipoRewardPreparation from "../../../../components/PokipoRewardPreparation";
import { PokipoRewardQrPanel } from "../../../../components/PokipoRewardShared";

const lastSpot = pokipoSpots[4];
type DemoStage = "intro" | "stamp" | "home" | "survey" | "qr";

function normalizeAnswer(value: string): string {
  return value
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　|\s/g, "")
    .trim()
    .toLowerCase();
}

const actionStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 16px",
  border: 0,
  borderRadius: 13,
  background: "#8a1822",
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

/**
 * スタッフ専用：5個目獲得 → 特典交換準備の案内 → 参加後アンケート（模擬） →
 * QR発行済みの案内、という流れを確認する。
 * 本番/検証テーブルへの INSERT/UPDATE/DELETE/RPC は行わない。
 */
export default function StaffCompletionPreviewPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stage, setStage] = useState<DemoStage>("intro");
  const [quizInput, setQuizInput] = useState("");
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizError, setQuizError] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const { data: auth, error } = await supabase.auth.getUser();
        if (error || !auth.user) {
          if (active) setAuthorized(false);
          return;
        }
        const { data: staff, error: staffError } = await supabase
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (active) setAuthorized(!staffError && Boolean(staff));
      } catch {
        if (active) setAuthorized(false);
      }
    }
    void verify();
    return () => { active = false; };
  }, []);

  function restart() {
    setQuizInput("");
    setQuizCorrect(false);
    setQuizError(false);
    setStage("intro");
  }

  function checkQuiz() {
    if (normalizeAnswer(quizInput) === normalizeAnswer(lastSpot.quizAnswer)) {
      setQuizCorrect(true);
      setQuizError(false);
    } else {
      setQuizError(true);
    }
  }

  if (authorized === null) {
    return <main className="shell" style={{ padding: 24 }}>スタッフ権限を確認中...</main>;
  }
  if (!authorized) {
    return (
      <main className="shell" style={{ padding: 24 }}>
        <h1>スタッフログインが必要です</h1>
        <Link href="/staff">管理者ページに戻る</Link>
      </main>
    );
  }

  const surveyDone = stage === "qr";
  const qrIssued = stage === "qr";

  return (
    <main className="shell" style={{ padding: "28px 16px 70px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <p style={{ color: "#8a1822", fontSize: 12, fontWeight: 900 }}>POKIPO STAFF TEST</p>
        <h1 style={{ color: "#302a26", fontSize: 23, margin: "6px 0" }}>
          5個達成から特典QR発行までの流れ
        </h1>
        <p style={{ color: "#786c64", fontSize: 13, lineHeight: 1.8 }}>
          5個目のスタンプ取得演出から、ホームの特典ボタン強調、参加後アンケート、QR発行後までの表示を順番に確認します。
          アンケート回答とQR発行は模擬操作です。本番データにも検証用データにも保存しません。
        </p>

        <div style={{ background: "#fff", border: "1px solid #eee6df", borderRadius: 17, padding: 18, marginTop: 18 }}>
          <p style={{ color: "#8a1822", fontWeight: 900, fontSize: 12, margin: "0 0 7px" }}>
            {stage === "intro" ? "START" : stage === "stamp" ? "STEP 1 / 4" : stage === "home" ? "STEP 2 / 4" : stage === "survey" ? "STEP 3 / 4" : "STEP 4 / 4"}
          </p>
          {stage === "intro" && (
            <>
              <h2 style={{ fontSize: 19 }}>5個目を取得した瞬間から確認する</h2>
              <button type="button" style={actionStyle} onClick={() => setStage("stamp")}>
                5個達成から一連の案内を再生する
              </button>
            </>
          )}
          {stage === "stamp" && (
            <p style={{ fontSize: 13, color: "#74666a" }}>
              スタンプ取得の実際の演出を再生中です。クイズに正解して「コンプリート！」を押すと、次の案内へ進みます。
            </p>
          )}
          {stage === "survey" && (
            <>
              <h2 style={{ fontSize: 19 }}>5個達成！次は参加後アンケートです</h2>
              <p style={{ color: "#74666a", fontSize: 13, lineHeight: 1.8 }}>
                下は本番の特典交換準備チェックリストと共通の表示です。
                この確認ページでは本物のアンケートには移動せず、回答完了した状態を再現できます。
              </p>
            </>
          )}
          {stage === "qr" && (
            <>
              <h2 style={{ fontSize: 19 }}>参加後アンケート完了 → QR発行済み</h2>
              <p style={{ color: "#74666a", fontSize: 13, lineHeight: 1.8 }}>
                特典QRが発行された状態の表示です。下のQRはプレビュー専用で、交換には使用できません。
              </p>
            </>
          )}
        </div>

        {(stage === "home" || stage === "survey" || stage === "qr") && (
          <>
            {(stage === "survey" || stage === "qr") && (
              <PokipoRewardPreparation
                stampCount={5}
                postSurveyCompleted={surveyDone}
                qrIssued={qrIssued}
                exchanged={false}
                preview
              />
            )}
            {stage === "home" && (
             <>
               <h2 style={{ fontSize: 19 }}>ホーム画面：特典ボタンを押そう！</h2>
               <p style={{ fontSize: 13, color: "#74666a" }}>5か所達成後、周囲が暗くなり、特典ボタンが強調される案内です。</p>
               <div style={{ padding: "22px 12px", borderRadius: 16, background: "#302a30" }}>
                 <p style={{ textAlign: "right", color: "#fff", fontSize: 13, marginBottom: 12 }}>↓ 特典交換の準備をしよう！</p>
                 <div className="visualMenuGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", width: "100%", gap: 8 }}>
                   <div className="visualMenuCard" style={{ opacity: .22, minWidth: 0, pointerEvents: "none" }}><div className="visualMenuIcon bookIcon">?</div><strong>豆知識</strong></div>
                   <div className="visualMenuCard" style={{ opacity: .22, minWidth: 0, pointerEvents: "none" }}><div className="visualMenuIcon routeIcon">✓</div><strong>進捗</strong></div>
                   <button type="button" className="visualMenuCard rewardMenu unlocked" style={{ minWidth:0, zIndex:2, position:"relative", boxShadow:"0 0 0 5px #ffe9e1, 0 0 30px #fff" }} onClick={() => setStage("survey")}><div className="visualMenuIcon rewardMenuIcon">★</div><strong>特典</strong><span>交換OK</span></button>
                 </div>
               </div>
             </>
           )}
           {stage === "survey" && (
              <div style={{ maxWidth: 760, margin: "0 auto 18px", padding: "0 4px" }}>
                <button type="button" style={actionStyle} onClick={() => setStage("qr")}>
                  参加後アンケート回答完了 → QR発行の表示を見る（模擬）
                </button>
              </div>
            )}
            {stage === "qr" && (
              <div style={{ maxWidth: 760, margin: "0 auto 18px" }}>
                <PokipoRewardQrPanel
                  mode="test"
                  status="issued"
                  token="preview-only-not-valid-for-exchange"
                  confirmationCode="DEMO-ONLY"
                />
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
          <button type="button" onClick={restart} style={{ padding: "12px 16px", borderRadius: 12, background: "#fff", border: "1px solid #ded2cb", color: "#47352f", fontWeight: 800, cursor: "pointer" }}>
            最初からやり直す
          </button>
          <Link href="/staff/test" style={{ padding: "12px 16px", borderRadius: 12, background: "#fff", border: "1px solid #ded2cb", color: "#47352f", fontWeight: 800, textDecoration: "none" }}>
            動作確認メニューに戻る
          </Link>
        </div>
      </div>

      {stage === "stamp" && (
        <PokipoStampGetModal
          spotName={lastSpot.spotName}
          stampCount={5}
          triviaReady
          quizQuestion={lastSpot.quizQuestion}
          quizHint={lastSpot.quizHint}
          quizInput={quizInput}
          quizCorrect={quizCorrect}
          quizError={quizError}
          knowledgeTitle={lastSpot.knowledgeTitle}
          knowledgeText={lastSpot.knowledgeText}
          onQuizInputChange={(value) => { setQuizInput(value); setQuizError(false); }}
          onQuizSubmit={checkQuiz}
          onClose={() => setStage("home")}
        />
      )}
    </main>
  );
}