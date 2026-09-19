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
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    notices,
    setNotices,
  ] = useState<Notice[]>(
    []
  );

  const [
    editingNotice,
    setEditingNotice,
  ] = useState<Notice | null>(
    null
  );

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
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     LOAD
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

        await loadNotices();
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

  async function loadNotices() {
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
        );

    if (
      error
    ) {
      console.error(
        "お知らせ取得エラー:",
        error
      );

      setMessage(
        "お知らせを取得できませんでした。"
      );

      return;
    }

    setNotices(
      (
        data ??
        []
      ) as Notice[]
    );
  }

  /* ========================================
     NEW
  ======================================== */

  function startNewNotice() {
    setEditingNotice(
      null
    );

    setTitle("");

    setBody("");

    setIsActive(
      true
    );

    setMessage("");
  }

  /* ========================================
     EDIT
  ======================================== */

  function startEditNotice(
    notice: Notice
  ) {
    setEditingNotice(
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

    setMessage("");
  }

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
        "タイトルを入力してください。"
      );

      return;
    }

    if (
      !trimmedBody
    ) {
      setMessage(
        "本文を入力してください。"
      );

      return;
    }

    setSaving(
      true
    );

    setMessage("");

    try {
      if (
        editingNotice
      ) {
        const {
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
              editingNotice.id
            );

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

        setMessage(
          "お知らせを更新しました。"
        );
      } else {
        const {
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
            });

        if (
          error
        ) {
          console.error(
            "お知らせ作成エラー:",
            error
          );

          setMessage(
            error.message
          );

          return;
        }

        setMessage(
          "新しいお知らせを作成しました。"
        );
      }

      await loadNotices();

      setEditingNotice(
        null
      );

      setTitle("");

      setBody("");

      setIsActive(
        true
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ========================================
     TOGGLE ACTIVE
  ======================================== */

  async function toggleNotice(
    notice: Notice
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "pokipo_notices"
        )
        .update({
          is_active:
            !notice.is_active,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          notice.id
        );

    if (
      error
    ) {
      console.error(
        "表示状態更新エラー:",
        error
      );

      setMessage(
        "表示状態を変更できませんでした。"
      );

      return;
    }

    await loadNotices();
  }

  /* ========================================
     DELETE
  ======================================== */

  async function deleteNotice(
    notice: Notice
  ) {
    const confirmed =
      window.confirm(
        `「${notice.title}」を削除しますか？\nこの操作は取り消せません。`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeleting(
      true
    );

    setMessage("");

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "pokipo_notices"
          )
          .delete()
          .eq(
            "id",
            notice.id
          );

      if (
        error
      ) {
        console.error(
          "お知らせ削除エラー:",
          error
        );

        setMessage(
          error.message
        );

        return;
      }

      if (
        editingNotice?.id ===
        notice.id
      ) {
        startNewNotice();
      }

      await loadNotices();

      setMessage(
        "お知らせを削除しました。"
      );
    } finally {
      setDeleting(
        false
      );
    }
  }

  /* ========================================
     DATE
  ======================================== */

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }

  /* ========================================
     LOADING
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

  /* ========================================
     VIEW
  ======================================== */

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
              お知らせを管理します。
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

        {/* =================================
            EDITOR
        ================================= */}

        <section
          className="staffMenuSecurity"
          style={{
            marginTop:
              "16px",
          }}
        >

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                "12px",
            }}
          >

            <div>

              <span>
                {editingNotice
                  ? "EDIT NOTICE"
                  : "NEW NOTICE"}
              </span>

              <h2
                style={{
                  margin:
                    "4px 0 0",
                }}
              >
                {editingNotice
                  ? "お知らせを編集"
                  : "新しいお知らせ"}
              </h2>

            </div>

            {editingNotice && (
              <button
                type="button"
                className="staffLogoutButton"
                onClick={
                  startNewNotice
                }
              >
                新規作成へ
              </button>
            )}

          </div>

          <label
            htmlFor="noticeTitle"
            style={{
              display:
                "block",

              marginTop:
                "16px",

              marginBottom:
                "6px",

              fontWeight:
                900,
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
            }}
          />

          <label
            htmlFor="noticeBody"
            style={{
              display:
                "block",

              marginTop:
                "16px",

              marginBottom:
                "6px",

              fontWeight:
                900,
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
            rows={
              7
            }
            placeholder="参加者に伝えたい内容を入力"
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
              : editingNotice
              ? "変更を保存する"
              : "お知らせを作成する"}
          </button>

        </section>

        {/* =================================
            MESSAGE
        ================================= */}

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

        {/* =================================
            NOTICE LIST
        ================================= */}

        <section
          style={{
            marginTop:
              "20px",
          }}
        >

          <div
            style={{
              marginBottom:
                "10px",
            }}
          >

            <span className="staffMenuEyebrow">
              NOTICE LIST
            </span>

            <h2
              style={{
                margin:
                  "4px 0 0",
              }}
            >
              お知らせ一覧
            </h2>

          </div>

          {notices.length ===
          0 ? (
            <div className="staffLoadingCard">
              まだお知らせはありません。
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",

                gap:
                  "10px",
              }}
            >

              {notices.map(
                (
                  notice
                ) => (
                  <article
                    key={
                      notice.id
                    }
                    className="staffMenuSecurity"
                    style={{
                      marginTop:
                        0,
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        alignItems:
                          "flex-start",

                        gap:
                          "12px",
                      }}
                    >

                      <div>

                        <span
                          style={{
                            color:
                              notice.is_active
                                ? "#317a4a"
                                : "#8a7e75",

                            fontSize:
                              "8px",

                            fontWeight:
                              900,
                          }}
                        >
                          {notice.is_active
                            ? "公開中"
                            : "非表示"}
                        </span>

                        <h3
                          style={{
                            margin:
                              "5px 0 0",
                          }}
                        >
                          {notice.title}
                        </h3>

                      </div>

                      <small>
                        {formatDate(
                          notice.updated_at ??
                          notice.created_at
                        )}
                      </small>

                    </div>

                    <p
                      style={{
                        marginTop:
                          "10px",

                        whiteSpace:
                          "pre-wrap",

                        lineHeight:
                          1.7,
                      }}
                    >
                      {notice.body}
                    </p>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(3, minmax(0, 1fr))",

                        gap:
                          "8px",

                        marginTop:
                          "14px",
                      }}
                    >

                      <button
                        type="button"
                        className="staffLogoutButton"
                        onClick={() =>
                          startEditNotice(
                            notice
                          )
                        }
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        className="staffLogoutButton"
                        onClick={() =>
                          void toggleNotice(
                            notice
                          )
                        }
                      >
                        {notice.is_active
                          ? "非表示"
                          : "再公開"}
                      </button>

                      <button
                        type="button"
                        className="staffLogoutButton"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          void deleteNotice(
                            notice
                          )
                        }
                        style={{
                          color:
                            "#a52730",
                        }}
                      >
                        削除
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </section>

    </main>
  );
}