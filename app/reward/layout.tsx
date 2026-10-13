"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase-client";

type Props = {
  children: ReactNode;
};

type StampRow = {
  spot_id: string;
};

type RewardStatusRow = {
  exchange_token: string | null;
  confirmation_code: string | null;
  status: string | null;
};

function getParticipantId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("pokipo_participant_id") ??
    localStorage.getItem("pokipo_user_id") ??
    ""
  );
}

export default function RewardLayout({
  children,
}: Props) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const checkAccess = useCallback(async () => {
    setChecking(true);
    setAllowed(false);
    setErrorMessage("");

    try {
      const participantId = getParticipantId();

      if (!participantId) {
        // 未登録者に特典画面を開放しない
        router.replace("/");
        return;
      }

      // 現在のスタンプ取得状況を確認
      const {
        data: stampData,
        error: stampError,
      } = await supabase.rpc(
        "get_pokipo_stamps",
        {
          p_participant_id: participantId,
        }
      );

      if (stampError) {
        throw new Error(
          "スタンプ取得状況を確認できませんでした。"
        );
      }

      const requiredIds = new Set([
        "spot1",
        "spot2",
        "spot3",
        "spot4",
        "spot5",
      ]);

      const acquired = new Set(
        ((stampData ?? []) as StampRow[])
          .map((stamp) => stamp.spot_id)
          .filter((id) => requiredIds.has(id))
      );

      // 未達成者も従来の特典画面で進捗を確認できる
      if (acquired.size < 5) {
        setAllowed(true);
        return;
      }

      // 発行済みQRや交換済み記録を確認
      const {
        data: rewardData,
        error: rewardError,
      } = await supabase.rpc(
        "get_reward_exchange_status",
        {
          p_participant_id: participantId,
        }
      );

      if (rewardError) {
        throw new Error(
          "特典QRの発行状況を確認できませんでした。"
        );
      }

      const existingReward = (
        (rewardData ?? []) as RewardStatusRow[]
      )[0];

      // すでに発行されたQR・交換履歴は維持
      if (
        existingReward?.exchange_token &&
        existingReward?.confirmation_code
      ) {
        setAllowed(true);
        return;
      }

      // 未発行者は振り返り回答を確認
      const {
        data: reflectionCompleted,
        error: reflectionError,
      } = await supabase.rpc(
        "has_completed_pokipo_reflection",
        {
          p_participant_id: participantId,
        }
      );

      if (reflectionError) {
        throw new Error(
          "振り返りの回答状況を確認できませんでした。"
        );
      }

      if (reflectionCompleted !== true) {
        // 特典画面のQR発行処理が動く前に移動
        router.replace("/reflection");
        return;
      }

      // 振り返り完了者のみ従来の特典画面へ
      setAllowed(true);
    } catch (error) {
      console.error(
        "特典画面の事前確認エラー:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "特典画面を開けませんでした。"
      );
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  if (checking) {
    return (
      <main className="shell">
        <section
          className="rewardPage"
          style={{
            padding: 30,
            textAlign: "center",
          }}
          role="status"
        >
          <h2>特典情報を確認しています...</h2>
          <p>
            スタンプとアンケートの回答状況を
            確認しています。
          </p>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="shell">
        <section
          className="rewardPage"
          style={{
            padding: 25,
            textAlign: "center",
          }}
        >
          <h2>特典画面を開けませんでした</h2>

          <p role="alert">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void checkAccess()}
          >
            もう一度確認する
          </button>

          <button
            type="button"
            onClick={() => router.push("/home")}
            style={{ marginLeft: 10 }}
          >
            ホームへ戻る
          </button>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="shell">
        <section
          className="rewardPage"
          role="status"
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          振り返り画面へ移動しています...
        </section>
      </main>
    );
  }

  return <>{children}</>;
}