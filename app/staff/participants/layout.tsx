
"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Props = {
  children: ReactNode;
};

export default function ParticipantsLayout({
  children,
}: Props) {
  const router = useRouter();

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkStaffSession() {
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
          .select("admin_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (!active) return;

      if (
        profileError ||
        !profile?.admin_id?.startsWith("lipost-")
      ) {
        router.replace("/staff");
        return;
      }

      setChecking(false);
    }

    void checkStaffSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function reauthenticate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    if (adminId.trim().toLowerCase() !== "lipost-furuya") {
      setMessage(
        "参加者一覧の閲覧には lipost-furuya の再ログインが必要です。"
      );
      return;
    }

    if (!password) {
      setMessage("パスワードを入力してください。");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: "lipost-furuya@pokipo.staff",
          password,
        });

      if (error || !data.user) {
        setMessage(
          "管理IDまたはパスワードが正しくありません。"
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("staff_profiles")
          .select("admin_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (
        profileError ||
        profile?.admin_id !== "lipost-furuya"
      ) {
        setMessage(
          "参加者一覧の閲覧権限を確認できませんでした。"
        );
        setVerified(false);
        return;
      }

      setPassword("");
      setVerified(true);
    } catch (error) {
      console.error("参加者一覧の再認証エラー:", error);

      setMessage(
        "再認証中にエラーが発生しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="shell">
        <section
          className="card"
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          管理者権限を確認しています...
        </section>
      </main>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <main className="shell">
      <section
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "32px auto",
          padding: 24,
          boxSizing: "border-box",
          borderRadius: 18,
        }}
      >
        <div
          style={{
            color: "#a22736",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.12em",
          }}
        >
          POKIPO STAFF SECURITY
        </div>

        <h1
          style={{
            fontSize: 23,
            margin: "10px 0",
          }}
        >
          参加者一覧の再認証
        </h1>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            color: "#685e5c",
          }}
        >
          参加者情報を保護するため、
          既に管理者としてログインしている場合も
          lipost-furuyaによる再ログインが必要です。
        </p>

        <form
          onSubmit={(event) => void reauthenticate(event)}
          style={{
            display: "grid",
            gap: 14,
            marginTop: 22,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 6,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            管理ID

            <input
              type="text"
              autoComplete="username"
              value={adminId}
              onChange={(event) =>
                setAdminId(event.target.value)
              }
              placeholder="lipost-furuya"
              required
              disabled={submitting}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                border: "1px solid #d8cbca",
                borderRadius: 9,
                fontSize: 16,
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 6,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            パスワード

            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              disabled={submitting}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                border: "1px solid #d8cbca",
                borderRadius: 9,
                fontSize: 16,
              }}
            />
          </label>

          {message && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "#ae2432",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: 13,
              border: "none",
              borderRadius: 10,
              background: "#a52737",
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {submitting
              ? "確認中..."
              : "再ログインして参加者一覧を開く"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/staff")}
            style={{
              padding: 10,
              background: "transparent",
              color: "#685e5c",
              border: "none",
              cursor: "pointer",
            }}
          >
            スタッフメニューに戻る
          </button>
        </form>
      </section>
    </main>
  );
}
