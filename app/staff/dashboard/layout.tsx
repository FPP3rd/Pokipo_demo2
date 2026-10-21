"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * 管理ダッシュボードに参加動向分析への導線を追加。
 * 既存の app/staff/dashboard/page.tsx の表示・集計処理は変更しません。
 */
export default function StaffDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      {children}

      <nav
        aria-label="管理ダッシュボードの分析メニュー"
        style={{
          width: "min(100% - 32px, 860px)",
          margin: "16px auto 32px",
          padding: "18px",
          background: "#fffaf8",
          border: "1px solid #eed9db",
          borderRadius: 16,
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#a52f42",
            margin: "0 0 6px",
          }}
        >
          DATA ANALYSIS
        </p>
        <h2
          style={{
            fontSize: 19,
            color: "#403034",
            margin: "0 0 6px",
          }}
        >
          参加動向分析
        </h2>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: "#716367",
            margin: "0 0 14px",
          }}
        >
          前時間帯との比較や、参加登録・5か所達成・アンケート回答・
          特典交換の推移を確認できます。
        </p>
        <button
          type="button"
          onClick={() => router.push("/staff/trends")}
          style={{
            border: 0,
            borderRadius: 11,
            background: "#a93243",
            color: "#fff",
            fontWeight: 800,
            padding: "13px 20px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          参加動向分析を開く →
        </button>
      </nav>
    </>
  );
}