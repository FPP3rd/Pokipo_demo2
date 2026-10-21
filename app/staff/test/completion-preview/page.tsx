"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase-client";
import { pokipoSpots } from "../../../data/pokipo-data";
import PokipoStampGetModal from "../../../../components/PokipoStampGetModal";

const lastSpot = pokipoSpots[4];

function normalizeAnswer(value: string): string {
  return value
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　|\s/g, "")
    .trim()
    .toLowerCase();
}

/** スタンプ5/5の表示だけを再現する。参加者DBや検証用DBへの書き込みなし。 */
export default function StaffCompletionPreviewPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [quizInput, setQuizInput] = useState("");
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizError, setQuizError] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
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
    }
    void verify();
    return () => { active = false; };
  }, []);

  function replay() {
    setQuizInput("");
    setQuizCorrect(false);
    setQuizError(false);
    setFinished(false);
    setPlaying(true);
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

  return (
    <main className="shell" style={{ padding: "30px 18px 64px" }}>
      <div style={{ maxWidth: 650, margin: "0 auto" }}>
        <p style={{ color: "#8a1822", fontSize: 12, fontWeight: 800 }}>POKIPO STAFF TEST</p>
        <h1 style={{ color: "#302a26", fontSize: 24 }}>5個達成後の演出プレビュー</h1>
        <p style={{ color: "#786c64", lineHeight: 1.8 }}>
          本番で使われているスタンプ取得演出をそのまま表示します。
          5個目の獲得演出、トリビアの回答、コンプリートまでの流れを確認できます。
        </p>
        <section style={{ background: "#fff", border: "1px solid #eee6df", borderRadius: 18, padding: 22, margin: "22px 0" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#8a1822" }}>DEMO ONLY · 5 / 5</div>
          <h2 style={{ fontSize: 19, color: "#302a26" }}>
            {finished ? "5個達成の演出が完了しました" : "5個目のスタンプ取得を再現"}
          </h2>
          <p style={{ color: "#786c64", fontSize: 13 }}>
            この操作では本番・検証用いずれのスタンプ記録も変更しません。
          </p>
          <button type="button" onClick={replay} style={{ width: "100%", minHeight: 46, border: 0, borderRadius: 12, background: "#8a1822", color: "white", fontWeight: 800, cursor: "pointer" }}>
            {finished ? "最初からもう一度見る" : "5個達成の演出を再生する"}
          </button>
        </section>
        <button type="button" onClick={() => router.push("/staff/test")} style={{ padding: "12px 16px", border: "1px solid #ded2cb", borderRadius: 12, background: "white", color: "#47352f", cursor: "pointer" }}>
          動作確認に戻る
        </button>
      </div>
      {playing && (
        <PokipoStampGetModal
          spotName={lastSpot.spotName}
          stampCount={5}
          triviaReady={true}
          quizQuestion={lastSpot.quizQuestion}
          quizHint={lastSpot.quizHint}
          quizInput={quizInput}
          quizCorrect={quizCorrect}
          quizError={quizError}
          knowledgeTitle={lastSpot.knowledgeTitle}
          knowledgeText={lastSpot.knowledgeText}
          onQuizInputChange={(value) => { setQuizInput(value); setQuizError(false); }}
          onQuizSubmit={checkQuiz}
          onClose={() => { setPlaying(false); setFinished(true); }}
        />
      )}
    </main>
  );
}