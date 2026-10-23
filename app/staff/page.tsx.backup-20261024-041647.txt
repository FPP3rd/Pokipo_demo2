
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase-client";
import PokipoStaffTicker from "../../components/PokipoStaffTicker";

/* ========================================
   TYPES
======================================== */

type StaffProfile = {
  user_id: string;
  admin_id: string;
  display_name: string;
};

type MenuItem = {
  icon: string;
  label: string;
  title: string;
  description: string;
  href: string;
  variant: string;
  disabled?: boolean;
  ownerOnly?: boolean;
};

type MenuSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: MenuItem[];
};

/* ========================================
   STAFF MENU CONFIG
======================================== */

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "reward",
    eyebrow: "REWARD MANAGEMENT",
    title: "景品交換",
    description:
      "景品交換の受付と交換履歴を管理します。",
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
    description:
      "参加者に表示する情報を管理します。",
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
    description:
      "参加状況・アンケート・システム稼働状況を確認します。",
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
      {
        icon: "OPS",
        label: "OPERATIONS",
        title: "運営チェック・データ出力",
        description:
          "システム稼働確認・参加者機能監視・CSV出力・自動分析レポートを利用します。",
        href: "/staff/operations",
        variant: "",
      },
      {
        icon: "USER",
        label: "PARTICIPANTS",
        title: "参加者一覧・読み取り履歴",
        description:
          "閲覧時はlipost-furuyaによる再ログインが必要です。参加者別のスタンプ取得履歴を確認できます。",
        href: "/staff/participants",
        variant: "",
        ownerOnly: true,
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
        ownerOnly: true,
      },
      {
        icon: "BACK",
        label: "REWARD SUPPORT",
        title: "景品交換の取消・復旧",
        description:
          "誤った景品交換記録を取り消し、未交換の状態に戻します。",
        href: "/staff/support/reward",
        variant: "",
        ownerOnly: true,
      },
    ],
  },

  {
    id: "system-control",
    eyebrow: "SYSTEM CONTROL",
    title: "システム管理",
    description:
      "POKIPOの稼働・停止に関する設定を管理します。",
    items: [
      {
        icon: "SET",
        label: "MAINTENANCE",
        title: "メンテナンス設定",
        description:
          "全体・個別機能の停止設定と、参加者向け案内文を管理します。",
        href: "/staff/maintenance",
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
          "QR読み取り・スタンプ・アンケート・特典交換を検証します。",
        href: "/staff/test",
        variant: "",
        disabled: false,
      },
    ],
  },
];

/* ========================================
   STAFF TOP PAGE
======================================== */

export default function StaffPage() {
  const router = useRouter();

  /* ========================================
     AUTH STATE
  ======================================== */

  const [authLoading, setAuthLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [currentStaffName, setCurrentStaffName] =
    useState("");

  const [currentAdminId, setCurrentAdminId] =
    useState("");

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  /* ========================================
     AUTHENTICATION
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function loadStaff() {
      setAuthLoading(true);
      setProfileLoading(true);
      setMessage("");

      try {
        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (
          sessionError ||
          !sessionData.session
        ) {
          router.replace("/staff/reward");
          return;
        }

        const userId =
          sessionData.session.user.id;

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("staff_profiles")
          .select(
            "user_id, admin_id, display_name"
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (!mounted) return;

        if (
          profileError ||
          !profileData
        ) {
          setAuthenticated(false);

          setMessage(
            "管理者権限を確認できませんでした。"
          );

          router.replace("/staff/reward");
          return;
        }

        const profile =
          profileData as StaffProfile;

        setAuthenticated(true);

        setCurrentStaffName(
          profile.display_name
        );

        setCurrentAdminId(
          profile.admin_id
        );

        setProfileLoading(false);
      } catch (error) {
        console.error(
          "管理者情報取得エラー:",
          error
        );

        if (mounted) {
          setMessage(
            "管理者情報の読み込み中にエラーが発生しました。"
          );
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
          setProfileLoading(false);
        }
      }
    }

    void loadStaff();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session && mounted) {
            setAuthenticated(false);
            router.replace("/staff/reward");
          }
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [router]);

  /* ========================================
     LOGOUT
  ======================================== */

  async function logoutStaff() {
    setMessage("");

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "ログアウトエラー:",
          error
        );

        setMessage(
          "ログアウトできませんでした。"
        );

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
      console.error(
        "ログアウト通信エラー:",
        error
      );

      setMessage(
        "ログアウト中にエラーが発生しました。"
      );
    }
  }

  /* ========================================
     LOADING
  ======================================== */

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

  if (!authenticated) {
    return null;
  }

  /* ========================================
     PAGE VIEW
  ======================================== */

  return (
    <main className="shell">
      <section className="staffMenuPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffMenuHeader">
          <div>
            <span className="staffMenuEyebrow">
              POKIPO STAFF
            </span>

            <h1>
              スタッフメニュー
            </h1>

            <p>
              景品交換・お知らせ管理・リアルタイム分析・
              参加者サポート・システム管理・動作確認を
              ここから操作できます。
            </p>
          </div>

          <button
            type="button"
            className="staffLogoutButton"
            onClick={() =>
              void logoutStaff()
            }
          >
            ログアウト
          </button>
        </header>

        {/* =================================
            POKIPO LIVE NEWS
        ================================= */}

        <PokipoStaffTicker />

        {/* =================================
            LOGIN USER
        ================================= */}

        <section className="staffCurrentUserCard">
          <div className="staffCurrentUserIcon">
            ✓
          </div>

          <div className="staffCurrentUserText">
            <span>LOGIN USER</span>

            <strong>
              {profileLoading
                ? "管理者名を取得中..."
                : currentStaffName ||
                  "管理者名未登録"}
            </strong>

            {currentAdminId && (
              <small>
                管理ID：{currentAdminId}
              </small>
            )}
          </div>

          <div className="staffCurrentUserStatus">
            LOGIN
          </div>
        </section>

        {/* =================================
            MESSAGE
        ================================= */}

        {message && (
          <div
            className="staffMenuMessage"
            role="status"
          >
            {message}
          </div>
        )}

        {/* =================================
            MENU SECTIONS
        ================================= */}

        <div className="staffGroupedMenu">
          {MENU_SECTIONS.map((section) => (
            <section
              key={section.id}
              className="staffMenuCategory"
              aria-labelledby={
                `staff-category-${section.id}`
              }
            >
              <div className="staffMenuCategoryHeader">
                <span
                  className="staffMenuCategoryAccent"
                />

                <div>
                  <span className="staffMenuCategoryEyebrow">
                    {section.eyebrow}
                  </span>

                  <h2
                    id={
                      `staff-category-${section.id}`
                    }
                  >
                    {section.title}
                  </h2>

                  <p>
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="staffMenuGrid staffMenuCategoryGrid">
                {section.items
                  .filter((item) => {
                    const normalizedAdminId =
                      currentAdminId
                        .trim()
                        .toLowerCase();

                    /*
                     * 参加者一覧：
                     * lipost-で始まる管理IDに
                     * ボタンを表示する。
                     *
                     * 閲覧には別途
                     * lipost-furuyaの再認証が必要。
                     */
                    if (
                      item.href ===
                      "/staff/participants"
                    ) {
                      return normalizedAdminId
                        .startsWith("lipost-");
                    }

                    /*
                     * そのほかのownerOnly項目：
                     * 以前と同じ表示条件。
                     */
                    if (item.ownerOnly) {
                      return normalizedAdminId ===
                        "lipost-furuya";
                    }

                    return true;
                  })
                  .map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className={[
                        "staffMenuCard",
                        item.variant,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        router.push(item.href)
                      }
                      disabled={item.disabled}
                      aria-disabled={
                        item.disabled || undefined
                      }
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
                        <span>
                          {item.label}
                        </span>

                        <h3>
                          {item.title}
                        </h3>

                        <p>
                          {item.description}
                        </p>
                      </div>

                      <div className="staffMenuCardArrow">
                        {item.disabled
                          ? "準備中"
                          : "→"}
                      </div>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>

        {/* =================================
            SECURITY NOTICE
        ================================= */}

        <section className="staffMenuSecurity">
          <span>
            STAFF ONLY
          </span>

          <p>
            このページはPOKIPO運営管理者専用です。
            操作終了後はログアウトしてください。
          </p>
        </section>
      </section>
    </main>
  );
}
