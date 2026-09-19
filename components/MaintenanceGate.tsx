"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase-client";

/* ========================================
   DEFAULT MESSAGE
======================================== */

const DEFAULT_MAINTENANCE_MESSAGE =
  "現在システムメンテナンスを行っています。しばらくしてから再度アクセスしてください。";

/* ========================================
   PAGE TYPE
======================================== */

type MaintenancePage =
  | "home"
  | "stamp"
  | "knowledge"
  | "progress"
  | "reward"
  | "survey_before"
  | "survey_after";

type MaintenanceGateProps = {
  children: ReactNode;
  page: MaintenancePage;
};

/* ========================================
   SETTINGS TYPE
======================================== */

type MaintenanceSettings = {
  maintenance_mode: boolean;
  maintenance_message: string;

  maintenance_home: boolean;
  maintenance_stamp: boolean;
  maintenance_knowledge: boolean;
  maintenance_progress: boolean;
  maintenance_reward: boolean;
  maintenance_survey_before: boolean;
  maintenance_survey_after: boolean;
};

/* ========================================
   COMPONENT
======================================== */

export default function MaintenanceGate({
  children,
  page,
}: MaintenanceGateProps) {
  const [
    checking,
    setChecking,
  ] = useState(true);

  const [
    maintenanceActive,
    setMaintenanceActive,
  ] = useState(false);

  const [
    maintenanceMessage,
    setMaintenanceMessage,
  ] = useState(
    DEFAULT_MAINTENANCE_MESSAGE
  );

  /* ========================================
     PAGE CHECK
  ======================================== */

  function isPageMaintenance(
    settings: MaintenanceSettings
  ) {
    /*
      全体メンテナンスONなら
      無条件ですべて停止
    */

    if (
      settings.maintenance_mode
    ) {
      return true;
    }

    /*
      全体OFFなら
      ページ別設定を見る
    */

    switch (
      page
    ) {
      case "home":
        return Boolean(
          settings.maintenance_home
        );

      case "stamp":
        return Boolean(
          settings.maintenance_stamp
        );

      case "knowledge":
        return Boolean(
          settings.maintenance_knowledge
        );

      case "progress":
        return Boolean(
          settings.maintenance_progress
        );

      case "reward":
        return Boolean(
          settings.maintenance_reward
        );

      case "survey_before":
        return Boolean(
          settings.maintenance_survey_before
        );

      case "survey_after":
        return Boolean(
          settings.maintenance_survey_after
        );

      default:
        return false;
    }
  }

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    let mounted =
      true;

    async function loadMaintenance() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "pokipo_app_settings"
          )
          .select(
            `
              maintenance_mode,
              maintenance_message,
              maintenance_home,
              maintenance_stamp,
              maintenance_knowledge,
              maintenance_progress,
              maintenance_reward,
              maintenance_survey_before,
              maintenance_survey_after
            `
          )
          .eq(
            "id",
            1
          )
          .single();

      /*
        取得失敗時は
        POKIPOを止めない
      */

      if (
        error
      ) {
        console.error(
          "メンテナンス設定取得エラー:",
          error
        );

        if (
          mounted
        ) {
          setMaintenanceActive(
            false
          );

          setChecking(
            false
          );
        }

        return;
      }

      if (
        !mounted ||
        !data
      ) {
        return;
      }

      const settings =
        data as MaintenanceSettings;

      setMaintenanceMessage(
        settings.maintenance_message?.trim() ||
          DEFAULT_MAINTENANCE_MESSAGE
      );

      setMaintenanceActive(
        isPageMaintenance(
          settings
        )
      );

      setChecking(
        false
      );
    }

    void loadMaintenance();

    /* ========================================
       REALTIME
    ======================================== */

    const channel =
      supabase
        .channel(
          `participant-maintenance-${page}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "pokipo_app_settings",

            filter:
              "id=eq.1",
          },
          (
            payload
          ) => {
            const newData =
              payload.new as MaintenanceSettings;

            if (
              !newData
            ) {
              return;
            }

            setMaintenanceMessage(
              newData.maintenance_message?.trim() ||
                DEFAULT_MAINTENANCE_MESSAGE
            );

            setMaintenanceActive(
              isPageMaintenance(
                newData
              )
            );
          }
        )
        .subscribe();

    return () => {
      mounted =
        false;

      supabase.removeChannel(
        channel
      );
    };
  }, [
    page,
  ]);

  /* ========================================
     CHECKING
  ======================================== */

  if (
    checking
  ) {
    return (
      <main className="shell">

        <section className="card startPage">

          <div
            style={{
              padding:
                "40px 20px",

              textAlign:
                "center",
            }}
          >
            POKIPOを読み込み中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     MAINTENANCE
  ======================================== */

  if (
    maintenanceActive
  ) {
    return (
      <main className="maintenancePage">

        <section className="maintenanceCard">

          <span className="maintenanceEyebrow">
            POKIPO SYSTEM
          </span>

          <div className="maintenanceIcon">
            !
          </div>

          <h1>
            ただいま
            <br />
            メンテナンス中です
          </h1>

          <p className="maintenanceMessage">
            {maintenanceMessage}
          </p>

          <div className="maintenanceDivider" />

          <p className="maintenanceSubMessage">
            復旧後、このページを再読み込みすると
            POKIPOをご利用いただけます。
          </p>

          <div className="maintenanceBrand">

            <strong>
              POKIPO
            </strong>

            <span>
              高安ゼミ LiPost × POCKY
            </span>

          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     NORMAL
  ======================================== */

  return (
    <>
      {children}
    </>
  );
}