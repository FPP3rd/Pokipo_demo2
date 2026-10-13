import { redirect } from "next/navigation";

// 開発経済学の独立した振り返り機能を廃止。
// 古いURLにアクセスした参加者は、
// 参加後アンケートへ案内する。
//
// 参加登録・スタンプ・回答履歴などの
// Supabaseデータは変更しない。

export default function ReflectionPage() {
  redirect("/survey/after");
}