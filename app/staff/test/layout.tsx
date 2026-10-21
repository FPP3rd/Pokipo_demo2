"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** 管理者の動作確認メニューにのみ、5個達成演出プレビューへのリンクを追加する。 */
export default function StaffTestLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      {pathname === "/staff/test" && (
        <div style={{ width: "min(calc(100% - 32px), 720px)", margin: "18px auto 0" }}>
          <Link
            href="/staff/test/completion-preview"
            style={{
              display: "block",
              border: "1px solid #e9dcd6",
              borderRadius: 16,
              padding: "16px 18px",
              background: "#fff",
              color: "#8a1822",
              textDecoration: "none",
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            5個達成後の演出を確認する →
            <span style={{ display: "block", color: "#81736d", fontWeight: 500, fontSize: 12, marginTop: 6 }}>
              本番データは変更せず、何度でも再生できます
            </span>
          </Link>
        </div>
      )}
      {children}
    </>
  );
}