"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase-client";

import MaintenanceGate from "../../../components/MaintenanceGate";

import PokipoSurveyScreen from "../../../components/PokipoSurveyScreen";

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

export default function AfterSurveyPage() {
  const router = useRouter();

  const [checking, setChecking] =
    useState(true);

  const [allowed, setAllowed] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function checkReflection() {
      const participantId = getParticipantId();

      if (!participantId) {
        router.replace("/");
        return;
      }

      try {
        const {
          data: completed,
          error,
        } = await supabase.rpc(
          "has_completed_pokipo_reflection",
          {
            p_participant_id: participantId,
          }
        );

        if (!active) return;

        if (error) {
          throw new Error(
            "振り返りの回答状況を確認できませんでした。"
          );
        }

        if (completed !== true) {
          router.replace("/reflection");
          return;
        }

        setAllowed(true);
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "回答状況を確認できませんでした。"
        );
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkReflection();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <MaintenanceGate page="survey_after">
      {checking ? (
        <main className="shell">
          <section
            className="staffLoadingCard"
            role="status"
          >
            振り返りの回答状況を確認中...
          </section>
        </main>
      ) : errorMessage ? (
        <main className="shell">
          <section
            className="staffLoadingCard"
            role="alert"
          >
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() =>
                router.push("/reward")
              }
            >
              特典画面に戻る
            </button>
          </section>
        </main>
      ) : allowed ? (
        <PokipoSurveyScreen stage="after" />
      ) : (
        <main className="shell">
          <section
            className="staffLoadingCard"
            role="status"
          >
            振り返り画面へ移動しています...
          </section>
        </main>
      )}
    </MaintenanceGate>
  );
}