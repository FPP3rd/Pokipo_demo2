"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../../../lib/supabase-client";
import PokipoRewardCalendar from "../../../../components/PokipoRewardCalendar";

/**
 * スタッフ検証の特典QR発行状態だけを読み取って、
 * QR発行後に本番と同じカレンダー登録UIを表示する。
 * 本番参加者テーブルへの読み書きは行わない。
 */
export default function StaffTestRewardLayout({ children }: { children: ReactNode }) {
  const [showCalendar, setShowCalendar] = useState(false);

  const check = useCallback(async () => {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const staffId = auth.user?.id;
      if (authError || !staffId) {
        setShowCalendar(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("user_id")
        .eq("user_id", staffId)
        .maybeSingle();

      if (profileError || !profile) {
        setShowCalendar(false);
        return;
      }

      const { data: session, error } = await supabase
        .from("pokipo_test_sessions")
        .select("reward_status,reward_token,reward_confirmation_code")
        .eq("staff_user_id", staffId)
        .maybeSingle();

      if (error || !session) {
        setShowCalendar(false);
        return;
      }

      setShowCalendar(
        session.reward_status === "issued" &&
        Boolean(session.reward_token) &&
        Boolean(session.reward_confirmation_code)
      );
    } catch (error) {
      console.error("検証用カレンダー表示判定エラー", error);
      setShowCalendar(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 3000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  return (
    <>
      {children}
      {showCalendar && (
        <div style={{ width: "min(calc(100% - 36px), 720px)", margin: "0 auto 28px" }}>
          <PokipoRewardCalendar preview />
        </div>
      )}
    </>
  );
}