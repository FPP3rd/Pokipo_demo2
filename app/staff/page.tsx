"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type StaffProfile = {
  user_id: string;
  admin_id: string;
  display_name: string;
};

/* ========================================
   PAGE
======================================== */

export default function StaffPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    currentStaffName,
    setCurrentStaffName,
  ] = useState("");

  const [
    currentAdminId,
    setCurrentAdminId,
  ] = useState("");

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     AUTH + PROFILE
  ======================================== */

  useEffect(() => {
    async function loadStaff() {
      setAuthLoading(
        true
      );

      setProfileLoading(
        true
      );

      setMessage("");

      try {
        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !sessionData.session
        ) {
          router.replace(
            "/staff/reward"
          );

          return;
        }

        setAuthenticated(
          true
        );

        const userId =
          sessionData.session.user.id;

        const {
          data:
            profileData,
          error:
            profileError,
        } =
          await supabase
            .from(
              "staff_profiles"
            )
            .select(
              "user_id, admin_id, display_name"
            )
            .eq(
              "user_id",
              userId
            )
            .single();

        if (
          profileError
        ) {
          console.error(
            "管理者プロフィール取得エラー:",
            profileError
          );

          setMessage(
            "ログイン中の管理者名を取得できませんでした。"
          );

          return;
        }

        if (
          profileData
        ) {
          const typedProfile =
            profileData as StaffProfile;

          setCurrentStaffName(
            typedProfile.display_name
          );

          setCurrentAdminId(
            typedProfile.admin_id
          );
        }
      } catch (
        error
      ) {
        console.error(
          "管理者情報取得エラー:",
          error
        );

        setMessage(
          "管理者情報の読み込み中にエラーが発生しました。"
        );
      } finally {
        setAuthLoading(
          false
        );

        setProfileLoading(
          false
        );
      }
    }

    void loadStaff();

    const {
      data:
        authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          if (
            !session
          ) {
            setAuthenticated(
              false
            );

            router.replace(
              "/staff/reward"
            );
          }
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [
    router,
  ]);

  /* ========================================
     LOGOUT
  ======================================== */

  async function logoutStaff() {
    setMessage("");

    try {
      const {
        error,
      } =
        await supabase.auth.signOut();

      if (
        error
      ) {
        console.error(
          "ログアウトエラー:",
          error
        );

        setMessage(
          "ログアウトできませんでした。"
        );

        return;
      }

      setAuthenticated(
        false
      );

      setCurrentStaffName("");

      setCurrentAdminId("");

      router.replace(
        "/staff/reward"
      );
    } catch (
      error
    ) {
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

  if (
    authLoading
  ) {
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

  if (
    !authenticated
  ) {
    return null;
  }

  /* ========================================
     VIEW
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
              管理・景品交換・お知らせ・
              アンケート分析をここから操作できます。
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
            CURRENT USER
        ================================= */}

        <section className="staffCurrentUserCard">

          <div className="staffCurrentUserIcon">
            ✓
          </div>

          <div className="staffCurrentUserText">

            <span>
              LOGIN USER
            </span>

            <strong>

              {profileLoading
                ? "管理者名を取得中..."
                : currentStaffName ||
                  "管理者名未登録"}

            </strong>

            {currentAdminId && (
              <small>
                管理ID：
                {currentAdminId}
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
          <div className="staffMenuMessage">
            {message}
          </div>
        )}

        {/* =================================
            MAIN MENU
        ================================= */}

        <section className="staffMenuGrid">

          {/* DASHBOARD */}

          <button
            type="button"
            className="staffMenuCard"
            onClick={() =>
              router.push(
                "/staff/dashboard"
              )
            }
          >

            <div className="staffMenuCardIcon">
              LIVE
            </div>

            <div className="staffMenuCardBody">

              <span>
                DASHBOARD
              </span>

              <h2>
                管理ダッシュボード
              </h2>

              <p>
                POKIPOの現在の参加状況や
                スタンプ進捗を確認します。
              </p>

            </div>

            <div className="staffMenuCardArrow">
              →
            </div>

          </button>

          {/* REWARD */}

          <button
            type="button"
            className="staffMenuCard reward"
            onClick={() =>
              router.push(
                "/staff/reward"
              )
            }
          >

            <div className="staffMenuCardIcon">
              QR
            </div>

            <div className="staffMenuCardBody">

              <span>
                REWARD
              </span>

              <h2>
                景品交換
              </h2>

              <p>
                参加者の特典交換QRを読み取り、
                景品交換を記録します。
              </p>

            </div>

            <div className="staffMenuCardArrow">
              →
            </div>

          </button>

          {/* HISTORY */}

          <button
            type="button"
            className="staffMenuCard"
            onClick={() =>
              router.push(
                "/staff/reward/history"
              )
            }
          >

            <div className="staffMenuCardIcon">
              LOG
            </div>

            <div className="staffMenuCardBody">

              <span>
                HISTORY
              </span>

              <h2>
                景品交換履歴
              </h2>

              <p>
                過去の景品交換日時や、
                交換を担当した管理者を確認します。
              </p>

            </div>

            <div className="staffMenuCardArrow">
              →
            </div>

          </button>

          {/* =================================
              NOTICE
          ================================= */}

          <button
            type="button"
            className="staffMenuCard"
            onClick={() =>
              router.push(
                "/staff/notices"
              )
            }
          >

            <div className="staffMenuCardIcon">
              NEWS
            </div>

            <div className="staffMenuCardBody">

              <span>
                NOTICE
              </span>

              <h2>
                LiPostからのお知らせ
              </h2>

              <p>
                参加者ホームに表示する
                お知らせ内容を更新します。
              </p>

            </div>

            <div className="staffMenuCardArrow">
              →
            </div>

          </button>

          {/* SURVEY */}

          <button
            type="button"
            className="staffMenuCard"
            onClick={() =>
              router.push(
                "/staff/surveys"
              )
            }
          >

            <div className="staffMenuCardIcon">
              DATA
            </div>

            <div className="staffMenuCardBody">

              <span>
                SURVEY
              </span>

              <h2>
                アンケート分析
              </h2>

              <p>
                参加前・参加後アンケートの
                回答結果や変化を分析します。
              </p>

            </div>

            <div className="staffMenuCardArrow">
              →
            </div>

          </button>

        </section>

        {/* =================================
            SECURITY
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