import { redirect } from "next/navigation";

// POKIPO 管理者モード
//
// 開発経済学の導入に伴って追加した
// 「学習・振り返り分析」画面を無効化する。
//
// 以前のURLにアクセスした場合は
// 管理者メニューへ戻す。
//
// 既存の参加者データ、スタンプ履歴、
// アンケート回答、特典QR、交換履歴は
// 削除・変更しない。

export default function StaffLearningPage() {
  redirect("/staff");
}