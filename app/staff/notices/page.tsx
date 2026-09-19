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
} from "../../../lib/supabase-client";

type Notice = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export default function StaffNoticesPage() {
  const router = useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    body,
    setBody,
  ] = useState("");

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [
    currentNotice,
    setCurrentNotice,
  ] = useState<Notice | null>(
    null
  );

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     AUTH + LOAD
  ======================================== */

  useEffect(() => {
    async function loadPage() {
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

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_notices"
            )
            .select(
              "id, title, body, is_active, created_at, updated_at"
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            );

        if (
          error
        ) {
          console.error(
            "お知らせ取得エラー:",
            error
          );

          setMessage(
            "現在のお知らせを取得できませんでした。"
          );

          return;
        }

        if (
          data &&
          data.length >
            0
        ) {
          const notice =
            data[0] as Notice;

          setCurrentNotice(
            notice
          );

          setTitle(
            notice.title
          );

          setBody(
            notice.body
          );

          setIsActive(
            notice.is_active
          );
        }
      } catch (
        error
      ) {
        console.error(
          "お知らせ画面読み込みエラー:",
          error
        );

        setMessage(
          "読み込み中にエラーが発生しました。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadPage();
  }, [
    router,
  ]);

  /* ========================================
     SAVE
  ======================================== */

  async function saveNotice() {
    const trimmedTitle =
      title.trim();

    const trimmedBody =
      body.trim();

    if (
      !trimmedTitle
    ) {
      setMessage(
        "お知らせのタイトルを入力してください。"
      );

      return;
    }

    if (
      !trimmedBody
    ) {
      setMessage(
        "お知らせ本文を入力してください。"
      );

      return;
    }

    setSaving(
      true
    );

    setMessage("");

    try {
      if (
        currentNotice
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_notices"
            )
            .update({
              title:
                trimmedTitle,

              body:
                trimmedBody,

              is_active:
                isActive,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              currentNotice.id
            )
            .select(
              "id, title, body, is_active, created_at, updated_at"
            )
            .single();

        if (
          error
        ) {
          console.error(
            "お知らせ更新エラー:",
            error
          );

          setMessage(
            error.message
          );

          return;
        }

        setCurrentNotice(
          data as Notice
        );

        setMessage(
          "お知らせを更新しました。"
        );
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_notices"
            )
            .insert({
              title:
                trimmedTitle,

              body:
                trimmedBody,

              is_active:
                isActive,
            })
            .select(
              "id, title, body, is_active, created_at, updated_at"
            )
            .single();

        if (
          error
        ) {
          console.error(
            "お知らせ登録エラー:",
            error
          );

          setMessage(
            error.message
          );

          return;
        }

        setCurrentNotice(
          data as Notice
        );

        setMessage(
          "お知らせを公開しました。"
        );
      }
    } catch (
      error
    ) {
      console.error(
        "お知らせ保存通信エラー:",
        error
      );

      setMessage(
        "保存中にエラーが発生しました。"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ========================================
     VIEW
  ======================================== */

  if (
    loading
  ) {
    return (
      <main className="shell">

        <section className="staffMenuPage">

          <div className="staffLoadingCard">
            お知らせ情報を確認中...
          </div>

        </section>

      </main>
    );
  }

  return (
    <main className="shell">

      <section className="staffMenuPage">

        <header className="staffMenuHeader">

          <div>

            <span className="staffMenuEyebrow">
              POKIPO STAFF
            </span>

            <h1>
              LiPostからのお知らせ
            </h1>

            <p>
              参加者ホームに表示する
              お知らせを編集します。
            </p>

          </div>

          <button
            type="button"
            className="staffLogoutButton"
            onClick={() =>
              router.push(
                "/staff"
              )
            }
          >
            メニューへ戻る
          </button>

        </header>

        <section className="staffCurrentUserCard">

          <div className="staffCurrentUserIcon">
            NEWS
          </div>

          <div className="staffCurrentUserText">

            <span>
              PARTICIPANT NOTICE
            </span>

            <strong>
              参加者向けお知らせ
            </strong>

            <small>
              ホーム画面の
              「みんなの参加状況」の下に表示
            </small>

          </div>

          <div className="staffCurrentUserStatus">
            EDIT
          </div>

        </section>

        <section
          className="staffMenuSecurity"
          style={{
            marginTop:
              "16px",
          }}
        >

          <label
            htmlFor="noticeTitle"
            style={{
              display:
                "block",

              fontWeight:
                900,

              marginBottom:
                "6px",
            }}
          >
            タイトル
          </label>

          <input
            id="noticeTitle"
            type="text"
            value={
              title
            }
            onChange={(
              event
            ) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="例：特典交換について"
            style={{
              width:
                "100%",

              boxSizing:
                "border-box",

              padding:
                "12px",

              border:
                "1px solid #ded3cc",

              borderRadius:
                "12px",

              fontSize:
                "14px",
            }}
          />

          <label
            htmlFor="noticeBody"
            style={{
              display:
                "block",

              fontWeight:
                900,

              marginTop:
                "16px",

              marginBottom:
                "6px",
            }}
          >
            本文
          </label>

          <textarea
            id="noticeBody"
            value={
              body
            }
            onChange={(
              event
            ) =>
              setBody(
                event.target.value
              )
            }
            placeholder="参加者に伝えたい内容を入力してください。"
            rows={
              7
            }
            style={{
              width:
                "100%",

              boxSizing:
                "border-box",

              padding:
                "12px",

              border:
                "1px solid #ded3cc",

              borderRadius:
                "12px",

              fontSize:
                "14px",

              lineHeight:
                1.7,

              resize:
                "vertical",
            }}
          />

          <label
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "8px",

              marginTop:
                "16px",

              fontWeight:
                900,
            }}
          >

            <input
              type="checkbox"
              checked={
                isActive
              }
              onChange={(
                event
              ) =>
                setIsActive(
                  event.target.checked
                )
              }
            />

            参加者画面に表示する

          </label>

          {message && (
            <div
              className="staffMenuMessage"
              style={{
                marginTop:
                  "14px",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="button"
            className="primaryButton"
            disabled={
              saving
            }
            onClick={() =>
              void saveNotice()
            }
            style={{
              width:
                "100%",

              marginTop:
                "18px",
            }}
          >
            {saving
              ? "保存中..."
              : "お知らせを保存する"}
          </button>

        </section>

      </section>

    </main>
  );
}