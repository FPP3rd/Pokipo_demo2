"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 動作確認画面の通常メニューを先に表示し、
 * 追加の演出プレビューを画面の下側に配置する。
 * データ取得・更新処理は一切行わない。
 */
export default function StaffTestLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const linkStyle = {
    display: "block",
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid #e9dcd6",
    background: "#ffffff",
    color: "#8a1822",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.5,
    textAlign: "left" as const,
  };

  return (
    <>
      {children}

      {pathname === "/staff/test" && (
        <section
          aria-label="追加の演出プレビュー"
          style={{
            width: "min(calc(100% - 32px), 720px)",
            margin: "0 auto 32px",
            padding: "18px 16px",
            borderRadius: 18,
            border: "1px solid #eee6df",
            background: "#fffaf7",
            boxSizing: "border-box",
          }}
        >
          <p style={{ fontSize: 11, color: "#8a1822", fontWeight: 900, letterSpacing: ".08em", margin: "0 0 6px" }}>
            EXTRA PREVIEW
          </p>
          <h2 style={{ color: "#302a26", fontSize: 18, margin: "0 0 8px" }}>
            演出プレビュー
          </h2>
          <p style={{ color: "#786c64", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>
            通常の動作確認とは別に、演出のみを何度でも再生できます。本番の参加者データは変更しません。
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/staff/test/reward-guide-preview" style={linkStyle}>
              特典交換スポットライト演出を確認 →
              <span style={{ display: "block", color: "#81736d", fontWeight: 500, fontSize: 12, marginTop: 5 }}>
                周囲を暗くして、押すボタンを強調する案内
              </span>
            </Link>
            <Link href="/staff/test/completion-preview" style={linkStyle}>
              5個達成後の流れを確認する →
              <span style={{ display: "block", color: "#81736d", fontWeight: 500, fontSize: 12, marginTop: 5 }}>
                スタンプ獲得から模擬QR発行まで
              </span>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}