import type { ReactNode } from "react";

// POKIPO スタッフ動作確認用レイアウト
//
// 振り返りは参加後アンケートに統合したため、
// 独立した振り返りプレビューの案内を解除する。
//
// 動作確認メニューや既存の検証機能は
// 変更せず、そのまま利用する。

type Props = {
  children: ReactNode;
};

export default function StaffTestLayout({
  children,
}: Props) {
  return <>{children}</>;
}