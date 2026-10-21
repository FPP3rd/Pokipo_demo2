import type { ReactNode } from "react";

// カレンダー表示は共通の PokipoRewardQrPanel 内で判定します。
// 本番・検証の両方でQR発行後のみ表示するため、ここでは二重表示しません。
export default function StaffTestRewardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}