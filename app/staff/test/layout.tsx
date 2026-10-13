"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type Props = {
  children: ReactNode;
};

export default function StaffTestLayout({
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [staffVerified, setStaffVerified] = useState(false);

  const isTestMenu =
    pathname === "/staff/test" ||
    pathname === "/staff/test/";

  useEffect(() => {
    if (!isTestMenu) {
      setStaffVerified(false);
      return;
    }

    let active = true;

    async function verifyStaff() {
      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (!active || error || !data.user) return;

        const { data: profile, error: profileError } =
          await supabase
            .from("staff_profiles")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (!active) return;

        setStaffVerified(
          !profileError && Boolean(profile)
        );
      } catch (error) {
        console.error(
          "動作確認メニュー権限確認エラー:",
          error
        );
      }
    }

    void verifyStaff();

    return () => {
      active = false;
    };
  }, [isTestMenu]);

  return (
    <>
      {children}

      {isTestMenu && staffVerified && (
        <section
          style={{
            maxWidth: 760,
            margin: "0 auto 36px",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              padding: 22,
              background:
                "linear-gradient(135deg, #fffaf5, #fff0e8)",
              border: "1px solid #efdbce",
              borderRadius: 20,
              boxShadow:
                "0 5px 20px rgba(75, 35, 20, 0.05)",
            }}
          >
            <span
              style={{
                color: "#bd2632",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.12em",
              }}
            >
              REFLECTION PREVIEW
            </span>

            <h2
              style={{
                margin: "9px 0",
                fontSize: 20,
                color: "#472e27",
              }}
            >
              完走後の振り返り
            </h2>

            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: "#745d52",
                margin: "0 0 18px",
              }}
            >
              「その一本の向こう側へ。」の
              振り返り画面を確認できます。
              スタンプ未達成でもプレビューでき、
              本番参加者のデータには保存しません。
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/staff/test/reflection")
              }
              style={{
                width: "100%",
                minHeight: 50,
                padding: "13px 16px",
                border: "none",
                borderRadius: 13,
                background: "#c92330",
                color: "#fff",
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              振り返り画面をプレビューする →
            </button>
          </div>
        </section>
      )}
    </>
  );
}