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
   TYPE
======================================== */

type MaintenanceGateProps = {
  children: ReactNode;
};

/* ========================================
   COMPONENT
======================================== */

export default function MaintenanceGate({
  children,
}: MaintenanceGateProps) {
  const [
    checking,
    setChecking,
  ] = useState(true);

  const [
    maintenanceMode,
    setMaintenanceMode,
  ] = useState(false);

  const [
    maintenanceMessage,
    setMaintenanceMessage,
  ] = useState(
    DEFAULT_MAINTENANCE_MESSAGE
  );

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
            "maintenance_mode, maintenance_message"
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
          setMaintenanceMode(
            false
          );

          setChecking(
            false
          );
        }

        return;
      }

      if (
        !mounted
      ) {
        return;
      }

      setMaintenanceMode(
        Boolean(
          data?.maintenance_mode
        )
      );

      setMaintenanceMessage(
        data?.maintenance_message?.trim() ||
          DEFAULT_MAINTENANCE_MESSAGE
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
          "participant-maintenance-gate"
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
              payload.new as {
                maintenance_mode?:
                  boolean;

                maintenance_message?:
                  string;
              };

            if (
              typeof newData.maintenance_mode ===
              "boolean"
            ) {
              setMaintenanceMode(
                newData.maintenance_mode
              );
            }

            if (
              typeof newData.maintenance_message ===
              "string"
            ) {
              setMaintenanceMessage(
                newData.maintenance_message.trim() ||
                  DEFAULT_MAINTENANCE_MESSAGE
              );
            }
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
  }, []);

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
    maintenanceMode
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