
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase-client";

type StaffProfile = {
  user_id: string;
  admin_id: string;
  display_name: string;
};

type MaintenanceKey =
  | "maintenance_home"
  | "maintenance_stamp"
  | "maintenance_knowledge"
  | "maintenance_progress"
  | "maintenance_reward"
  | "maintenance_survey_before"
  | "maintenance_survey_after";

type MaintenanceTargets = Record<MaintenanceKey, boolean>;

const DEFAULT_MAINTENANCE_MESSAGE =
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
  { key: "maintenance_home", label: "トップ画面", path: "/home" },
  { key: "maintenance_stamp", label: "QR読み取り・スタンプ", path: "/stamp" },
  { key: "maintenance_knowledge", label: "豆知識", path: "/knowledge" },
  { key: "maintenance_progress", label: "進捗", path: "/progress" },
  { key: "maintenance_reward", label: "特典・景品交換", path: "/reward" },
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

type MenuItem = {
  icon: string;
  label: string;
  title: string;
  description: string;
  href: string;
  variant: string;
  disabled?: boolean;
};

type MenuSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "reward",
    eyebrow: "REWARD MANAGEMENT",
    title: "景品交換",
    description: "景品交換の受付と交換履歴を管理します。",
    items: [
      {
        icon: "QR",
        label: "REWARD",
        title: "景品交換",
        description:
          "QR読み取り端末・モニター端末の設定と景品交換を行います。",
        href: "/staff/reward",
        variant: "reward",
      },
      {
        icon: "LOG",
        label: "HISTORY",
        title: "景品交換履歴",
        description:
          "過去の景品交換日時や担当管理者を確認します。",
        href: "/staff/reward/history",
        variant: "",
      },
    ],
  },
  {
    id: "notice",
    eyebrow: "CONTENT MANAGEMENT",
    title: "お知らせ管理",
    description: "参加者に表示する情報を管理します。",
    items: [
      {
        icon: "NEWS",
        label: "NOTICE",
        title: "LiPostからのお知らせ",
        description:
          "参加者ホームに表示するお知らせを更新します。",
        href: "/staff/announcements",
        variant: "",
      },
      {
        icon: "AD",
        label: "PROMOTION",
        title: "イベント・広告管理",
        description:
          "イベントバナーやアプリ起動時の広告を設定します。",
        href: "/staff/promotions",
        variant: "promotion",
      },
    ],
  },
  {
    id: "analytics",
    eyebrow: "REAL-TIME ANALYTICS",
    title: "リアルタイム分析",
    description: "参加状況やアンケート結果を確認します。",
    items: [
      {
        icon: "LIVE",
        label: "DASHBOARD",
        title: "管理ダッシュボード",
        description:
          "参加人数・完走者数・スポット別QR読み取り状況を確認します。",
        href: "/staff/dashboard",
        variant: "",
      },
      {
        icon: "DATA",
        label: "SURVEY",
        title: "アンケート分析",
        description:
          "参加前・参加後アンケートの回答結果を分析します。",
        href: "/staff/surveys",
        variant: "",
      },
    ],
  },
  {
    id: "support",
    eyebrow: "PARTICIPANT SUPPORT",
    title: "参加者サポート",
    description:
      "お問い合わせへの対応と参加者データの修正を行います。",
    items: [
      {
        icon: "HELP",
        label: "STAMP SUPPORT",
        title: "スタンプ修正・参加者照会",
        description:
          "問い合わせ番号で参加者を検索し、スタンプを手動付与・削除します。",
        href: "/staff/support",
        variant: "",
      },
      {
        icon: "BACK",
        label: "REWARD SUPPORT",
        title: "景品交換の取消・復旧",
        description:
          "誤った景品交換記録を取り消し、未交換の状態に戻します。",
        href: "/staff/support/reward",
        variant: "",
      },
    ],
  },
  {
    id: "testing",
    eyebrow: "SYSTEM TESTING",
    title: "動作確認",
    description:
      "一般参加者と同じ最新版のPOKIPOを、安全な検証データで確認します。",
    items: [
      {
        icon: "TEST",
        label: "STAFF TESTING",
        title: "POKIPO動作確認",
        description:
          "QR読み取り・スタンプ・アンケート・特典交換を検証します。現在は接続準備中です。",
        href: "/staff/test",
        variant: "",
        disabled: false,
      },
    ],
  },
];

export default function StaffPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentStaffName, setCurrentStaffName] = useState("");
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] =
    useState(DEFAULT_MAINTENANCE_MESSAGE);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceTargets, setMaintenanceTargets] =
    useState<MaintenanceTargets>({ ...DEFAULT_TARGETS });

  useEffect(() => {
    let mounted = true;

    async function loadStaff() {
      setAuthLoading(true);
      setProfileLoading(true);
      setMaintenanceLoading(true);
      setMessage("");

      try {
        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError || !sessionData.session) {
          router.replace("/staff/reward");
          return;
        }

        const userId = sessionData.session.user.id;

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("staff_profiles")
          .select("user_id, admin_id, display_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        if (profileError || !profileData) {
          setAuthenticated(false);
          setMessage("管理者権限を確認できませんでした。");
          router.replace("/staff/reward");
          return;
        }

        const profile = profileData as StaffProfile;

        setAuthenticated(true);
        setCurrentStaffName(profile.display_name);
        setCurrentAdminId(profile.admin_id);

        const {
          data: settings,
          error: maintenanceError,
        } = await supabase
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

        if (!mounted) return;

        if (maintenanceError) {
          console.error(
            "メンテナンス設定取得エラー:",
            maintenanceError
          );
          setMessage("メンテナンス設定を取得できませんでした。");
        } else if (settings) {
          setMaintenanceMode(Boolean(settings.maintenance_mode));
          setMaintenanceMessage(
            settings.maintenance_message?.trim() ||
              DEFAULT_MAINTENANCE_MESSAGE
          );
          setMaintenanceTargets({
            maintenance_home: Boolean(settings.maintenance_home),
            maintenance_stamp: Boolean(settings.maintenance_stamp),
            maintenance_knowledge: Boolean(settings.maintenance_knowledge),
            maintenance_progress: Boolean(settings.maintenance_progress),
            maintenance_reward: Boolean(settings.maintenance_reward),
            maintenance_survey_before: Boolean(
              settings.maintenance_survey_before
            ),
            maintenance_survey_after: Boolean(
              settings.maintenance_survey_after
            ),
          });
        }
      } catch (error) {
        console.error("管理者情報取得エラー:", error);

        if (mounted) {
          setMessage("管理者情報の読み込み中にエラーが発生しました。");
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
          setProfileLoading(false);
          setMaintenanceLoading(false);
        }
      }
    }

    void loadStaff();

    const { data: authListener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session && mounted) {
          setAuthenticated(false);
          router.replace("/staff/reward");
        }
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  function updateMaintenanceTarget(
    key: MaintenanceKey,
    checked: boolean
  ) {
    setMaintenanceTargets((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function selectAllMaintenanceTargets() {
    setMaintenanceTargets({
      maintenance_home: true,
      maintenance_stamp: true,
      maintenance_knowledge: true,
      maintenance_progress: true,
      maintenance_reward: true,
      maintenance_survey_before: true,
      maintenance_survey_after: true,
    });
  }

  function clearAllMaintenanceTargets() {
    setMaintenanceTargets({ ...DEFAULT_TARGETS });
  }

  async function saveMaintenanceSettings() {
    if (maintenanceSaving || maintenanceLoading) return;

    setMaintenanceSaving(true);
    setMessage("");

    try {
      const finalMessage =
        maintenanceMessage.trim() ||
        DEFAULT_MAINTENANCE_MESSAGE;

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
        console.error("メンテナンス設定保存エラー:", error);
        setMessage("メンテナンス設定を保存できませんでした。");
        return;
      }

      setMaintenanceMessage(finalMessage);
      setMessage("メンテナンス設定を保存しました。");
    } catch (error) {
      console.error("メンテナンス設定通信エラー:", error);
      setMessage(
        "メンテナンス設定の保存中にエラーが発生しました。"
      );
    } finally {
      setMaintenanceSaving(false);
    }
  }

  async function logoutStaff() {
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("ログアウトエラー:", error);
        setMessage("ログアウトできませんでした。");
        return;
      }

      sessionStorage.removeItem(
        "pokipo_staff_reward_device_mode"
      );

      setAuthenticated(false);
      setCurrentStaffName("");
      setCurrentAdminId("");

      router.replace("/staff/reward");
    } catch (error) {
      console.error("ログアウト通信エラー:", error);
      setMessage("ログアウト中にエラーが発生しました。");
    }
  }

  if (authLoading) {
    return (
      <main className="shell">
        <section className="staffMenuPage">
          <div className="staffLoadingCard">
            管理者情報を確認中...
          </div>
        </section>
      </main>
    );
  }

  if (!authenticated) return null;

  return (
    <main className="shell">
      <section className="staffMenuPage">
        <header className="staffMenuHeader">
          <div>
            <span className="staffMenuEyebrow">
              POKIPO STAFF
            </span>
            <h1>スタッフメニュー</h1>
            <p>
              景品交換・お知らせ管理・リアルタイム分析・
              参加者サポート・動作確認をここから操作できます。
            </p>
          </div>

          <button
            type="button"
            className="staffLogoutButton"
            onClick={() => void logoutStaff()}
          >
            ログアウト
          </button>
        </header>

        <section className="staffCurrentUserCard">
          <div className="staffCurrentUserIcon">✓</div>

          <div className="staffCurrentUserText">
            <span>LOGIN USER</span>
            <strong>
              {profileLoading
                ? "管理者名を取得中..."
                : currentStaffName || "管理者名未登録"}
            </strong>
            {currentAdminId && (
              <small>管理ID：{currentAdminId}</small>
            )}
          </div>

          <div className="staffCurrentUserStatus">
            LOGIN
          </div>
        </section>

        {message && (
          <div className="staffMenuMessage" role="status">
            {message}
          </div>
        )}

        <div className="staffGroupedMenu">
          {MENU_SECTIONS.map((section) => (
            <section
              key={section.id}
              className="staffMenuCategory"
              aria-labelledby={`staff-category-${section.id}`}
            >
              <div className="staffMenuCategoryHeader">
                <span className="staffMenuCategoryAccent" />

                <div>
                  <span className="staffMenuCategoryEyebrow">
                    {section.eyebrow}
                  </span>

                  <h2 id={`staff-category-${section.id}`}>
                    {section.title}
                  </h2>

                  <p>{section.description}</p>
                </div>
              </div>

              <div className="staffMenuGrid staffMenuCategoryGrid">
                {section.items.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    className={[
                      "staffMenuCard",
                      item.variant,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => router.push(item.href)}
                    disabled={item.disabled}
                    aria-disabled={item.disabled || undefined}
                    style={
                      item.disabled
                        ? {
                            opacity: 0.65,
                            cursor: "not-allowed",
                          }
                        : undefined
                    }
                  >
                    <div className="staffMenuCardIcon">
                      {item.icon}
                    </div>

                    <div className="staffMenuCardBody">
                      <span>{item.label}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>

                    <div className="staffMenuCardArrow">
                      {item.disabled ? "準備中" : "→"}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="staffMaintenanceCard">
          <div className="staffMaintenanceHeader">
            <div>
              <span className="staffMaintenanceEyebrow">
                SYSTEM CONTROL
              </span>
              <h2>メンテナンス設定</h2>
              <p>
                POKIPO全体、または特定の機能だけを
                一時的に停止できます。
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

          {maintenanceLoading ? (
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
                      onClick={selectAllMaintenanceTargets}
                    >
                      すべて選択
                    </button>

                    <button
                      type="button"
                      onClick={clearAllMaintenanceTargets}
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
                          updateMaintenanceTarget(
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
                  placeholder="例：現在システム調整を行っています。14:30頃の復旧を予定しています。"
                />

                <div className="staffMaintenanceMessageBottom">
                  <span>{maintenanceMessage.length}/500</span>
                </div>
              </div>

              <button
                type="button"
                className="staffMaintenanceSaveButton"
                disabled={maintenanceSaving}
                onClick={() =>
                  void saveMaintenanceSettings()
                }
              >
                {maintenanceSaving
                  ? "保存中..."
                  : "メンテナンス設定を保存"}
              </button>
            </>
          )}
        </section>

        <section className="staffMenuSecurity">
          <span>STAFF ONLY</span>
          <p>
            このページはPOKIPO運営管理者専用です。
            操作終了後はログアウトしてください。
          </p>
        </section>
      </section>
    </main>
  );
}
