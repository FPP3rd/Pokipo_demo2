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

/* ========================================
   TYPES
======================================== */

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string;
  updated_at: string;
};

/* ========================================
   PAGE
======================================== */

export default function StaffAnnouncementsPage() {
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
    authLoading,
    setAuthLoading,
  ] = useState(true);

  /* ========================================
     FORM
  ======================================== */

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    body,
    setBody,
  ] = useState("");

  const [
    isPublished,
    setIsPublished,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* ========================================
     EDIT
  ======================================== */

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null
  );

  /* ========================================
     LIST
  ======================================== */

  const [
    announcements,
    setAnnouncements,
  ] = useState<Announcement[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkAuth() {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (
        error ||
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

      setAuthLoading(
        false
      );
    }

    void checkAuth();
  }, [
    router,
  ]);

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    async function loadAnnouncements() {
      setLoading(
        true
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "lipost_announcements"
          )
          .select(
            "id, title, body, is_published, published_at, updated_at"
          )
          .order(
            "published_at",
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

        setLoading(
          false
        );

        return;
      }

      setAnnouncements(
        (
          data ?? []
        ) as Announcement[]
      );

      setLoading(
        false
      );
    }

    void loadAnnouncements();

    const channel =
      supabase
        .channel(
          "staff-announcements-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "lipost_announcements",
          },
          () => {
            void loadAnnouncements();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    authenticated,
  ]);

  /* ========================================
     RESET FORM
  ======================================== */

  function resetForm() {
    setTitle("");

    setBody("");

    setIsPublished(
      true
    );

    setEditingId(
      null
    );

    setMessage("");
  }

  /* ========================================
     SAVE
  ======================================== */

  async function saveAnnouncement() {
    const normalizedTitle =
      title.trim();

    const normalizedBody =
      body.trim();

    if (
      !normalizedTitle
    ) {
      setMessage(
        "タイトルを入力してください。"
      );

      return;
    }

    if (
      !normalizedBody
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
      /* =================================
         EDIT
      ================================= */

      if (
        editingId
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "lipost_announcements"
            )
            .update({
              title:
                normalizedTitle,

              body:
                normalizedBody,

              is_published:
                isPublished,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              editingId
            );

        if (
          error
        ) {
          console.error(
            "お知らせ更新エラー:",
            error
          );

          setMessage(
            "お知らせを更新できませんでした。"
          );

          return;
        }

        resetForm();

        setMessage(
          "お知らせを更新しました。"
        );

        return;
      }

      /* =================================
         NEW
      ================================= */

      const {
        error,
      } =
        await supabase
          .from(
            "lipost_announcements"
          )
          .insert({
            title:
              normalizedTitle,

            body:
              normalizedBody,

            is_published:
              isPublished,

            published_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          });

      if (
        error
      ) {
        console.error(
          "お知らせ投稿エラー:",
          error
        );

        setMessage(
          "お知らせを投稿できませんでした。"
        );

        return;
      }

      resetForm();

      setMessage(
        "お知らせを投稿しました。"
      );
    } catch (
      error
    ) {
      console.error(
        "お知らせ保存通信エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ========================================
     EDIT START
  ======================================== */

  function startEdit(
    announcement: Announcement
  ) {
    setEditingId(
      announcement.id
    );

    setTitle(
      announcement.title
    );

    setBody(
      announcement.body
    );

    setIsPublished(
      announcement.is_published
    );

    setMessage("");

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  /* ========================================
     TOGGLE PUBLISHED
  ======================================== */

  async function togglePublished(
    announcement: Announcement
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "lipost_announcements"
        )
        .update({
          is_published:
            !announcement.is_published,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          announcement.id
        );

    if (
      error
    ) {
      console.error(
        "公開状態変更エラー:",
        error
      );

      setMessage(
        "公開状態を変更できませんでした。"
      );

      return;
    }

    setMessage(
      announcement.is_published
        ? "お知らせを非公開にしました。"
        : "お知らせを公開しました。"
    );
  }

  /* ========================================
     DELETE
  ======================================== */

  async function deleteAnnouncement(
    announcement: Announcement
  ) {
    const confirmed =
      window.confirm(
        `「${announcement.title}」を削除しますか？`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "lipost_announcements"
        )
        .delete()
        .eq(
          "id",
          announcement.id
        );

    if (
      error
    ) {
      console.error(
        "お知らせ削除エラー:",
        error
      );

      setMessage(
        "お知らせを削除できませんでした。"
      );

      return;
    }

    if (
      editingId ===
      announcement.id
    ) {
      resetForm();
    }

    setMessage(
      "お知らせを削除しました。"
    );
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
     AUTH LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffAnnouncementPage">

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

      <section className="staffAnnouncementPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffAnnouncementHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              お知らせ管理
            </h1>

            <p>
              参加者ホームに表示する
              LiPostからのお知らせを管理します。
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff"
              )
            }
          >
            メニューへ
          </button>

        </header>

        {/* =================================
            FORM
        ================================= */}

        <section className="staffAnnouncementForm">

          <div className="staffAnnouncementFormTitle">

            <span>

              {editingId
                ? "EDIT ANNOUNCEMENT"
                : "NEW ANNOUNCEMENT"}

            </span>

            <h2>

              {editingId
                ? "お知らせを編集"
                : "新しいお知らせ"}

            </h2>

          </div>

          {/* TITLE */}

          <div className="staffAnnouncementField">

            <label htmlFor="announcementTitle">
              タイトル
            </label>

            <input
              id="announcementTitle"
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
              maxLength={
                80
              }
              placeholder="例：特典交換について"
            />

          </div>

          {/* BODY */}

          <div className="staffAnnouncementField">

            <label htmlFor="announcementBody">
              本文
            </label>

            <textarea
              id="announcementBody"
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
              maxLength={
                500
              }
              rows={
                6
              }
              placeholder="参加者に伝えたい内容を入力してください。"
            />

            <div className="staffAnnouncementCounter">
              {body.length}/500
            </div>

          </div>

          {/* PUBLISHED */}

          <label className="staffAnnouncementPublishSwitch">

            <input
              type="checkbox"
              checked={
                isPublished
              }
              onChange={(
                event
              ) =>
                setIsPublished(
                  event.target.checked
                )
              }
            />

            <div>

              <strong>
                公開する
              </strong>

              <span>
                ONにすると参加者ホームに表示されます。
              </span>

            </div>

          </label>

          {/* BUTTONS */}

          <div className="staffAnnouncementFormActions">

            {editingId && (
              <button
                type="button"
                className="cancel"
                onClick={
                  resetForm
                }
              >
                編集をキャンセル
              </button>
            )}

            <button
              type="button"
              className="save"
              onClick={
                saveAnnouncement
              }
              disabled={
                saving
              }
            >

              {saving
                ? "保存中..."
                : editingId
                ? "変更を保存"
                : "お知らせを投稿"}

            </button>

          </div>

        </section>

        {/* =================================
            MESSAGE
        ================================= */}

        {message && (
          <p className="staffAnnouncementMessage">
            {message}
          </p>
        )}

        {/* =================================
            LIST TITLE
        ================================= */}

        <div className="staffAnnouncementListTitle">

          <div>

            <span>
              ANNOUNCEMENTS
            </span>

            <h2>
              登録済みのお知らせ
            </h2>

          </div>

          <strong>
            {announcements.length}件
          </strong>

        </div>

        {/* =================================
            LOADING
        ================================= */}

        {loading && (
          <div className="staffAnnouncementEmpty">
            お知らせを読み込み中...
          </div>
        )}

        {/* =================================
            EMPTY
        ================================= */}

        {!loading &&
          announcements.length ===
            0 && (
            <div className="staffAnnouncementEmpty">

              <strong>
                まだお知らせはありません
              </strong>

              <p>
                上のフォームから
                最初のお知らせを投稿してください。
              </p>

            </div>
          )}

        {/* =================================
            LIST
        ================================= */}

        {!loading &&
          announcements.length >
            0 && (
            <div className="staffAnnouncementList">

              {announcements.map(
                (
                  announcement
                ) => (
                  <article
                    key={
                      announcement.id
                    }
                    className="staffAnnouncementCard"
                  >

                    <div className="staffAnnouncementCardTop">

                      <span
                        className={
                          announcement.is_published
                            ? "published"
                            : "hidden"
                        }
                      >

                        {announcement.is_published
                          ? "公開中"
                          : "非公開"}

                      </span>

                      <time>
                        {formatDate(
                          announcement.published_at
                        )}
                      </time>

                    </div>

                    <h3>
                      {announcement.title}
                    </h3>

                    <p>
                      {announcement.body}
                    </p>

                    <div className="staffAnnouncementCardActions">

                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            announcement
                          )
                        }
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void togglePublished(
                            announcement
                          )
                        }
                      >

                        {announcement.is_published
                          ? "非公開にする"
                          : "公開する"}

                      </button>

                      <button
                        type="button"
                        className="delete"
                        onClick={() =>
                          void deleteAnnouncement(
                            announcement
                          )
                        }
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

    </main>
  );
}