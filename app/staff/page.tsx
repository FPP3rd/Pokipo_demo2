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

export default function StaffPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (
          error
        ) {
          console.error(
            "スタッフ認証確認エラー:",
            error
          );

          router.replace(
            "/staff/reward"
          );

          return;
        }

        if (
          !data.session
        ) {
          router.replace(
            "/staff/reward"
          );

          return;
        }

        setAuthenticated(
          true
        );
      } catch (
        error
      ) {
        console.error(
          "スタッフ認証通信エラー:",
          error
        );

        router.replace(
          "/staff/reward"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void checkAuth();

    /* ========================================
       AUTH CHANGE
    ======================================== */

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

            return;
          }

          setAuthenticated(
            true
          );
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

  async function logout() {
    try {
      await supabase.auth.signOut();

      setAuthenticated(
        false
      );

      router.replace(
        "/staff/reward"
      );
    } catch (
      error
    ) {
      console.error(
        "スタッフログアウトエラー:",
        error
      );
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    loading ||
    !authenticated
  ) {
    return (
      <main className="shell">

        <section className="staffPortalPage">

          <div className="staffLoadingCard">
            スタッフ情報を確認中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="staffPortalPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffPortalHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              スタッフメニュー
            </h1>

            <p>
              管理・景品交換をここから操作できます。
            </p>

          </div>

          <button
            type="button"
            onClick={
              logout
            }
          >
            ログアウト
          </button>

        </header>

        {/* =================================
            MENU
        ================================= */}

        <section className="staffPortalMenu">

          {/* =================================
              DASHBOARD
          ================================= */}

          <button
            type="button"
            className="staffPortalCard"
            onClick={() =>
              router.push(
                "/staff/dashboard"
              )
            }
          >

            <div className="staffPortalIcon">
              LIVE
            </div>

            <div>

              <span>
                MANAGEMENT
              </span>

              <h2>
                管理ダッシュボード
              </h2>

              <p>
                参加者数・完走者数・交換状況を確認
              </p>

            </div>

            <strong>
              →
            </strong>

          </button>

          {/* =================================
              REWARD
          ================================= */}

          <button
            type="button"
            className="staffPortalCard reward"
            onClick={() =>
              router.push(
                "/staff/reward"
              )
            }
          >

            <div className="staffPortalIcon">
              QR
            </div>

            <div>

              <span>
                REWARD EXCHANGE
              </span>

              <h2>
                特典交換
              </h2>

              <p>
                参加者の交換用QRを読み取る
              </p>

            </div>

            <strong>
              →
            </strong>

          </button>

          {/* =================================
              HISTORY
          ================================= */}

          <button
            type="button"
            className="staffPortalCard"
            onClick={() =>
              router.push(
                "/staff/reward/history"
              )
            }
          >

            <div className="staffPortalIcon">
              LOG
            </div>

            <div>

              <span>
                EXCHANGE HISTORY
              </span>

              <h2>
                交換履歴
              </h2>

              <p>
                これまでの景品交換を確認
              </p>

            </div>

            <strong>
              →
            </strong>

          </button>

          {/* =================================
              ANNOUNCEMENTS
          ================================= */}

          <button
            type="button"
            className="staffPortalCard"
            onClick={() =>
              router.push(
                "/staff/announcements"
              )
            }
          >

            <div className="staffPortalIcon">
              NEWS
            </div>

            <div>

              <span>
                LiPost NEWS
              </span>

              <h2>
                お知らせ管理
              </h2>

              <p>
                参加者ホームのお知らせを投稿・編集
              </p>

            </div>

            <strong>
              →
            </strong>

          </button>

        </section>

      </section>

    </main>
  );
}