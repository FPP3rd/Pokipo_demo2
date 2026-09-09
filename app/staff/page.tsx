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

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data,
      } =
        await supabase.auth.getSession();

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

      setLoading(
        false
      );
    }

    checkAuth();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();

    router.replace(
      "/staff/reward"
    );
  }

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
            HERO
        ================================= */}

        <section className="staffPortalHero">

          <span>
            STAFF CONTROL
          </span>

          <h2>
            POKIPO運営メニュー
          </h2>

          <p>
            利用したい機能を選択してください。
          </p>

        </section>

        {/* =================================
            MENU
        ================================= */}

        <section className="staffPortalMenu">

          {/* DASHBOARD */}

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

          {/* REWARD */}

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

          {/* HISTORY */}

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

        </section>

      </section>

    </main>
  );
}