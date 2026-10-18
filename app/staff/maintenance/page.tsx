
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

type MaintenanceKey =
  | "maintenance_home"
  | "maintenance_stamp"
  | "maintenance_knowledge"
  | "maintenance_progress"
  | "maintenance_reward"
  | "maintenance_survey_before"
  | "maintenance_survey_after";

type MaintenanceTargets = Record<MaintenanceKey, boolean>;

const DEFAULT_MESSAGE =
  "現在システムメンテナンスを行っています。しばらくしてから再度アクセスしてください。";

const DEFAULT_TARGETS: MaintenanceTargets = {
  maintenance_home: false,
  maintenance_stamp: false,
  maintenance_knowledge: false,
  maintenance_progress: false,
  maintenance_reward: false,
  maintenance_survey_before: false,
  maintenance_survey_after: false,
};

const MAINTENANCE_ITEMS: {
  key: MaintenanceKey;
  label: string;
  path: string;
}[] = [
  {
    key: "maintenance_home",
    label: "トップ画面",
    path: "/home",
  },
  {
    key: "maintenance_stamp",
    label: "QR読み取り・スタンプ",
    path: "/stamp",
  },
  {
    key: "maintenance_knowledge",
    label: "豆知識",
    path: "/knowledge",
  },
  {
    key: "maintenance_progress",
    label: "進捗",
    path: "/progress",
  },
  {
    key: "maintenance_reward",
    label: "特典・景品交換",
    path: "/reward",
  },
  {
    key: "maintenance_survey_before",
    label: "参加前アンケート",
    path: "/survey/before",
  },
  {
    key: "maintenance_survey_after",
    label: "参加後アンケート",
    path: "/survey/after",
  },
];

export default function StaffMaintenancePage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maintenanceMode, setMaintenanceMode] =
    useState(false);

  const [maintenanceMessage, setMaintenanceMessage] =
    useState(DEFAULT_MESSAGE);

  const [maintenanceTargets, setMaintenanceTargets] =
    useState<MaintenanceTargets>({
      ...DEFAULT_TARGETS,
    });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError || !authData.user) {
          setMessageType("error");
          setMessage("スタッフログインが必要です。");
          setAuthLoading(false);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("staff_profiles")
            .select("user_id")
            .eq("user_id", authData.user.id)
            .maybeSingle();

        if (!active) return;

        if (profileError || !profile) {
          setMessageType("error");
          setMessage("スタッフ権限がありません。");
          setAuthLoading(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);
        setAuthLoading(false);

        const { data: settings, error: settingsError } =
          await supabase
            .from("pokipo_app_settings")
            .select(`
              maintenance_mode,
              maintenance_message,
              maintenance_home,
              maintenance_stamp,
              maintenance_knowledge,
              maintenance_progress,
              maintenance_reward,
              maintenance_survey_before,
              maintenance_survey_after
            `)
            .eq("id", 1)
            .single();

        if (!active) return;

        if (settingsError || !settings) {
          console.error(
            "メンテナンス設定取得エラー:",
            settingsError
          );
          setMessageType("error");
          setMessage(
            "メンテナンス設定を取得できませんでした。"
          );
          return;
        }

        setMaintenanceMode(
          Boolean(settings.maintenance_mode)
        );

        setMaintenanceMessage(
          settings.maintenance_message?.trim() ||
            DEFAULT_MESSAGE
        );

        setMaintenanceTargets({
          maintenance_home: Boolean(settings.maintenance_home),
          maintenance_stamp: Boolean(settings.maintenance_stamp),
          maintenance_knowledge: Boolean(
            settings.maintenance_knowledge
          ),
          maintenance_progress: Boolean(
            settings.maintenance_progress
          ),
          maintenance_reward: Boolean(
            settings.maintenance_reward
          ),
          maintenance_survey_before: Boolean(
            settings.maintenance_survey_before
          ),
          maintenance_survey_after: Boolean(
            settings.maintenance_survey_after
          ),
        });
      } catch (error) {
        console.error("メンテナンス設定通信エラー:", error);

        if (active) {
          setMessageType("error");
          setMessage(
            "メンテナンス設定の読み込み中にエラーが発生しました。"
          );
        }
      } finally {
        if (active) {
          setAuthLoading(false);
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateTarget(
    key: MaintenanceKey,
    checked: boolean
  ) {
    setMaintenanceTargets((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function selectAll() {
    setMaintenanceTargets(
      Object.fromEntries(
        MAINTENANCE_ITEMS.map((item) => [
          item.key,
          true,
        ])
      ) as MaintenanceTargets
    );
  }

  function clearAll() {
    setMaintenanceTargets({
      ...DEFAULT_TARGETS,
    });
  }

  async function saveSettings() {
    if (saving || loading || !authorized) return;

    setSaving(true);
    setMessage("");

    try {
      const finalMessage =
        maintenanceMessage.trim() ||
        DEFAULT_MESSAGE;

      const { error } = await supabase
        .from("pokipo_app_settings")
        .update({
          maintenance_mode: maintenanceMode,
          maintenance_message: finalMessage,
          ...maintenanceTargets,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) {
        throw error;
      }

      setMaintenanceMessage(finalMessage);
      setMessageType("success");
      setMessage("メンテナンス設定を保存しました。");
    } catch (error) {
      console.error("メンテナンス設定保存エラー:", error);
      setMessageType("error");
      setMessage(
        "メンテナンス設定を保存できませんでした。"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <section className="staffMenuPage">
        <header className="staffMenuHeader">
          <div>
            <span className="staffMenuEyebrow">
              POKIPO STAFF / SYSTEM CONTROL
            </span>

            <h1>メンテナンス設定</h1>

            <p>
              POKIPO全体または個別機能の停止状態を管理します。
            </p>
          </div>

          <button
            type="button"
            className="staffLogoutButton"
            onClick={() => router.push("/staff")}
          >
            ← スタッフメニューに戻る
          </button>
        </header>

        {message && (
          <div
            className="staffMenuMessage"
            role={messageType === "error" ? "alert" : "status"}
          >
            {message}
          </div>
        )}

        {authLoading ? (
          <div className="staffLoadingCard">
            スタッフ権限を確認中...
          </div>
        ) : !authorized ? (
          <div className="staffLoadingCard">
            メンテナンス設定を表示する権限がありません。
          </div>
        ) : (
          <section className="staffMaintenanceCard">
            <div className="staffMaintenanceHeader">
              <div>
                <span className="staffMaintenanceEyebrow">
                  SYSTEM CONTROL
                </span>

                <h2>メンテナンス管理</h2>

                <p>
                  設定を変更した後、
                  保存すると反映されます。
                </p>
              </div>

              <div
                className={
                  maintenanceMode
                    ? "staffMaintenanceStatus active"
                    : "staffMaintenanceStatus"
                }
              >
                {maintenanceMode ? "ALL ON" : "NORMAL"}
              </div>
            </div>

            {loading ? (
              <div className="staffMaintenanceLoading">
                設定を読み込み中...
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={
                    maintenanceMode
                      ? "staffMaintenanceToggle active"
                      : "staffMaintenanceToggle"
                  }
                  aria-pressed={maintenanceMode}
                  onClick={() =>
                    setMaintenanceMode((current) => !current)
                  }
                >
                  <span className="staffMaintenanceToggleTrack">
                    <span className="staffMaintenanceToggleKnob" />
                  </span>

                  <div>
                    <strong>
                      {maintenanceMode
                        ? "全体メンテナンス ON"
                        : "全体メンテナンス OFF"}
                    </strong>

                    <small>
                      {maintenanceMode
                        ? "参加者向けページをすべて停止します"
                        : "個別に停止するページを選択できます"}
                    </small>
                  </div>
                </button>

                <div className="staffMaintenanceTargets">
                  <div className="staffMaintenanceTargetsTitle">
                    <div>
                      <strong>個別に停止するページ</strong>

                      <span>
                        全体メンテナンスOFF時に使用します
                      </span>
                    </div>

                    <div className="staffMaintenanceTargetActions">
                      <button
                        type="button"
                        onClick={selectAll}
                      >
                        すべて選択
                      </button>

                      <button
                        type="button"
                        onClick={clearAll}
                      >
                        すべて解除
                      </button>
                    </div>
                  </div>

                  <div className="staffMaintenanceTargetList">
                    {MAINTENANCE_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="staffMaintenanceTarget"
                      >
                        <input
                          type="checkbox"
                          checked={maintenanceTargets[item.key]}
                          onChange={(event) =>
                            updateTarget(
                              item.key,
                              event.target.checked
                            )
                          }
                        />

                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.path}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="staffMaintenanceMessageField">
                  <label htmlFor="maintenanceMessage">
                    参加者に表示する案内文
                  </label>

                  <textarea
                    id="maintenanceMessage"
                    value={maintenanceMessage}
                    onChange={(event) =>
                      setMaintenanceMessage(event.target.value)
                    }
                    rows={5}
                    maxLength={500}
                    placeholder="メンテナンス中の案内文"
                  />

                  <div className="staffMaintenanceMessageBottom">
                    <span>
                      {maintenanceMessage.length}/500
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="staffMaintenanceSaveButton"
                  disabled={saving}
                  onClick={() => void saveSettings()}
                >
                  {saving
                    ? "保存中..."
                    : "メンテナンス設定を保存"}
                </button>
              </>
            )}
          </section>
        )}

        <section className="staffMenuSecurity">
          <span>STAFF ONLY</span>

          <p>
            メンテナンス設定は参加者向けの利用状態に
            影響します。変更内容を確認して保存してください。
          </p>
        </section>
      </section>
    </main>
  );
}
