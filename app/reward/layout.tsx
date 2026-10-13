import type { ReactNode } from "react";

// POKIPO 特典画面レイアウト
//
// 独立した振り返り画面への強制転送は廃止。
// 振り返りは参加後アンケートに統合済み。
//
// 特典QRの発行条件は、既存の特典画面と
// Supabaseのissue_reward_qr関数で確認する。
//
// 発行済みQR・交換済み履歴には変更を加えない。

type Props = {
  children: ReactNode;
};

export default function RewardLayout({
  children,
}: Props) {
  return <>{children}</>;
}