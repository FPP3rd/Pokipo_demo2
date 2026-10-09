
import { supabase } from "./supabase-client";

/*
  POKIPO 動作確認専用データ処理

  本番用テーブル:
  participants
  participant_stamps
  participant_knowledge
  participant_completions
  pokipo_pre_surveys
  pokipo_post_surveys
  reward_exchanges

  上記のテーブルには書き込まない。
*/

export type PokipoTestSession = {
  staff_user_id: string;
  nickname: string;
  grade: string;
  department: string;
  pre_survey: Record<string, unknown> | null;
  post_survey: Record<string, unknown> | null;
  reward_token: string | null;
  reward_confirmation_code: string | null;
  reward_status: "not_issued" | "issued" | "exchanged";
  reward_exchanged_at: string | null;
  completed_at: string | null;
  achievement_rank: number | null;
  secret_stamp: boolean;
};

export type PokipoTestStamp = {
  spot_id: string;
  acquired_at: string;
};

const VALID_SPOTS = [
  "spot1",
  "spot2",
  "spot3",
  "spot4",
  "spot5",
] as const;

const VALID_KNOWLEDGE = [
  "knowledge1",
  "knowledge2",
  "knowledge3",
  "knowledge4",
  "knowledge5",
] as const;

/*
  管理者権限を毎回確認する。
  ブラウザのフラグだけで権限を判断しない。
*/
export async function getVerifiedTestStaffId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("スタッフログインが必要です。");
  }

  const staffId = data.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("user_id")
    .eq("user_id", staffId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("管理者権限を確認できませんでした。");
  }

  return staffId;
}

/*
  動作確認専用セッションを取得する。
  この関数では新しいセッションは作成しない。
*/
export async function getPokipoTestSession():
  Promise<PokipoTestSession> {
  const staffId = await getVerifiedTestStaffId();

  const { data, error } = await supabase
    .from("pokipo_test_sessions")
    .select("*")
    .eq("staff_user_id", staffId)
    .single();

  if (error || !data) {
    throw new Error(
      "検証専用データが見つかりません。管理画面の動作確認を開いてください。"
    );
  }

  return data as PokipoTestSession;
}

/*
  検証専用のスタンプを取得する。
*/
export async function getPokipoTestStamps():
  Promise<PokipoTestStamp[]> {
  const staffId = await getVerifiedTestStaffId();

  const { data, error } = await supabase
    .from("pokipo_test_stamps")
    .select("spot_id, acquired_at")
    .eq("staff_user_id", staffId)
    .order("acquired_at", { ascending: true });

  if (error) {
    throw new Error(
      `検証スタンプ取得エラー: ${error.message}`
    );
  }

  return (data ?? []) as PokipoTestStamp[];
}

/*
  検証専用のスタンプを保存する。
  通常参加者の record_pokipo_stamp は呼ばない。
*/
export async function recordPokipoTestStamp(
  spotId: string
): Promise<void> {
  if (!VALID_SPOTS.some((id) => id === spotId)) {
    throw new Error("スポットIDが正しくありません。");
  }

  // セッションの存在とスタッフ権限を確認
  const session = await getPokipoTestSession();

  const { error } = await supabase
    .from("pokipo_test_stamps")
    .upsert(
      {
        staff_user_id: session.staff_user_id,
        spot_id: spotId,
      },
      {
        onConflict: "staff_user_id,spot_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(
      `検証スタンプ保存エラー: ${error.message}`
    );
  }
}

/*
  検証専用の豆知識を保存する。
*/
export async function recordPokipoTestKnowledge(
  knowledgeId: string
): Promise<void> {
  if (!VALID_KNOWLEDGE.some((id) => id === knowledgeId)) {
    throw new Error("豆知識IDが正しくありません。");
  }

  const session = await getPokipoTestSession();

  const { error } = await supabase
    .from("pokipo_test_knowledge")
    .upsert(
      {
        staff_user_id: session.staff_user_id,
        knowledge_id: knowledgeId,
      },
      {
        onConflict: "staff_user_id,knowledge_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(
      `検証豆知識保存エラー: ${error.message}`
    );
  }
}

/*
  検証専用の進捗を取得する。
*/
export async function getPokipoTestProgress(): Promise<number> {
  const stamps = await getPokipoTestStamps();

  return Math.min(
    new Set(stamps.map((stamp) => stamp.spot_id)).size,
    5
  );
}

/*
  検証専用の完走記録を保存する。
  本番の達成順位は取得・更新しない。
*/
export async function recordPokipoTestCompletion():
  Promise<void> {
  const session = await getPokipoTestSession();
  const progress = await getPokipoTestProgress();

  if (progress < 5) {
    throw new Error("5つのスタンプが必要です。");
  }

  if (session.completed_at) {
    return;
  }

  const { error } = await supabase
    .from("pokipo_test_sessions")
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("staff_user_id", session.staff_user_id)
    .is("completed_at", null);

  if (error) {
    throw new Error(
      `検証完走記録エラー: ${error.message}`
    );
  }
}
