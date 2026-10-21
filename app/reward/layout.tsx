"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase-client";
import PokipoRewardPreparation, {
  type PreparationStatus
} from "../../components/PokipoRewardPreparation";
import PokipoRewardWalkthrough from "../../components/PokipoRewardWalkthrough";

function getParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pokipo_participant_id")
    ?? localStorage.getItem("pokipo_user_id");
}

export default function RewardLayout({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PreparationStatus>({
    stampCount: 0, postSurveyCompleted: false, qrIssued: false, exchanged: false, loading: true
  });
  const [foundParticipant, setFoundParticipant] = useState(false);

  const load = useCallback(async () => {
    const id = getParticipantId();
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      setFoundParticipant(false);
      return;
    }
    setFoundParticipant(true);
    try {
      const [stamps, survey, reward] = await Promise.all([
        supabase.rpc("get_pokipo_stamps", { p_participant_id: id }),
        supabase.rpc("has_completed_pokipo_post_survey", { p_participant_id: id }),
        supabase.rpc("get_reward_exchange_status", { p_participant_id: id })
      ]);
      if (stamps.error || survey.error || reward.error) {
        console.error("準備状況取得エラー", stamps.error, survey.error, reward.error);
        setStatus(v => ({ ...v, loading: false }));
        return;
      }
      const stampIds = new Set(
        (Array.isArray(stamps.data) ? stamps.data : [])
          .map((v: {spot_id?: string}) => v.spot_id)
          .filter((v: string | undefined) => /^spot[1-5]$/.test(v ?? ""))
      );
      const item = Array.isArray(reward.data) && reward.data.length ? reward.data[0] : null;
      setStatus({
        stampCount: stampIds.size,
        postSurveyCompleted: survey.data === true,
        qrIssued: Boolean(item?.exchange_token && item?.confirmation_code),
        exchanged: item?.status === "exchanged",
        loading: false
      });
    } catch (error) {
      console.error("準備状況取得通信エラー", error);
      setStatus(v => ({ ...v, loading: false }));
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <>
      {foundParticipant && <PokipoRewardPreparation {...status} />}
      {children}
      <PokipoRewardWalkthrough mode="reward" />
    </>
  );
}