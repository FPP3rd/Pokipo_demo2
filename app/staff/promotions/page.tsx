"use client";

import {
  ChangeEvent,
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

type Placement =
  | "banner"
  | "fullscreen";

type Promotion = {
  id: string;
  placement: Placement;
  title: string;
  body: string;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type PromotionForm = {
  id: string | null;
  title: string;
  body: string;
  imageUrl: string;
  isActive: boolean;
};

/* ========================================
   EMPTY FORM
======================================== */

const EMPTY_FORM: PromotionForm = {
  id: null,
  title: "",
  body: "",
  imageUrl: "",
  isActive: false,
};

/* ========================================
   PAGE
======================================== */

export default function StaffPromotionsPage() {
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

  /* ========================================
     TAB
  ======================================== */

  const [
    placement,
    setPlacement,
  ] =
    useState<Placement>(
      "banner"
    );

  /* ========================================
     FORMS
  ======================================== */

  const [
    bannerForm,
    setBannerForm,
  ] =
    useState<PromotionForm>({
      ...EMPTY_FORM,
    });

  const [
    fullscreenForm,
    setFullscreenForm,
  ] =
    useState<PromotionForm>({
      ...EMPTY_FORM,
    });

  /* ========================================
     IMAGE
  ======================================== */

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<File | null>(
      null
    );

  const [
    localPreviewUrl,
    setLocalPreviewUrl,
  ] =
    useState("");

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  /* ========================================
     STATE
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* ========================================
     CURRENT FORM
  ======================================== */

  const currentForm =
    placement ===
    "banner"
      ? bannerForm
      : fullscreenForm;

  function setCurrentForm(
    next:
      | PromotionForm
      | (
          (
            current:
              PromotionForm
          ) =>
            PromotionForm
        )
  ) {
    if (
      placement ===
      "banner"
    ) {
      setBannerForm(
        next
      );

      return;
    }

    setFullscreenForm(
      next
    );
  }

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
      } finally {
        setAuthLoading(
          false
        );
      }
    }

    void checkAuth();

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
     LOAD PROMOTIONS
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    async function loadPromotions() {
      setLoading(
        true
      );

      setMessage("");

      setErrorMessage("");

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .select(
              `
                id,
                placement,
                title,
                body,
                image_url,
                is_active,
                display_order,
                created_at,
                updated_at
              `
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            );

        if (
          error
        ) {
          console.error(
            "広告設定取得エラー:",
            error
          );

          setErrorMessage(
            "広告設定を取得できませんでした。"
          );

          return;
        }

        const promotions =
          (
            data ?? []
          ) as Promotion[];

        const banner =
          promotions.find(
            (
              item
            ) =>
              item.placement ===
              "banner"
          );

        const fullscreen =
          promotions.find(
            (
              item
            ) =>
              item.placement ===
              "fullscreen"
          );

        if (
          banner
        ) {
          setBannerForm({
            id:
              banner.id,

            title:
              banner.title,

            body:
              banner.body,

            imageUrl:
              banner.image_url ??
              "",

            isActive:
              banner.is_active,
          });
        }

        if (
          fullscreen
        ) {
          setFullscreenForm({
            id:
              fullscreen.id,

            title:
              fullscreen.title,

            body:
              fullscreen.body,

            imageUrl:
              fullscreen.image_url ??
              "",

            isActive:
              fullscreen.is_active,
          });
        }
      } catch (
        error
      ) {
        console.error(
          "広告設定通信エラー:",
          error
        );

        setErrorMessage(
          "広告設定の読み込み中にエラーが発生しました。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadPromotions();
  }, [
    authenticated,
  ]);

  /* ========================================
     TAB CHANGE
  ======================================== */

  function changePlacement(
    next:
      Placement
  ) {
    setPlacement(
      next
    );

    setSelectedImage(
      null
    );

    setLocalPreviewUrl(
      ""
    );

    setMessage("");

    setErrorMessage("");
  }

  /* ========================================
     IMAGE SELECT
  ======================================== */

  function selectImage(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (
      !file
    ) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "画像ファイルを選択してください。"
      );

      return;
    }

    const maxSize =
      8 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      setErrorMessage(
        "画像は8MB以下にしてください。"
      );

      return;
    }

    if (
      localPreviewUrl
    ) {
      URL.revokeObjectURL(
        localPreviewUrl
      );
    }

    const preview =
      URL.createObjectURL(
        file
      );

    setSelectedImage(
      file
    );

    setLocalPreviewUrl(
      preview
    );

    setErrorMessage("");
  }

  /* ========================================
     UPLOAD IMAGE
  ======================================== */

  async function uploadPromotionImage() {
    if (
      !selectedImage
    ) {
      return currentForm.imageUrl;
    }

    setUploadingImage(
      true
    );

    try {
      const extension =
        selectedImage.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const fileName =
        `${placement}/` +
        `${Date.now()}-` +
        `${crypto.randomUUID()}.` +
        `${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "promotion-images"
          )
          .upload(
            fileName,
            selectedImage,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                selectedImage.type,
            }
          );

      if (
        uploadError
      ) {
        console.error(
          "広告画像アップロードエラー:",
          uploadError
        );

        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "promotion-images"
          )
          .getPublicUrl(
            fileName
          );

      return (
        publicUrlData
          .publicUrl
      );
    } finally {
      setUploadingImage(
        false
      );
    }
  }

  /* ========================================
     SAVE
  ======================================== */

  async function savePromotion() {
    if (
      saving ||
      uploadingImage
    ) {
      return;
    }

    const title =
      currentForm.title.trim();

    const body =
      currentForm.body.trim();

    if (
      !title
    ) {
      setErrorMessage(
        "タイトルを入力してください。"
      );

      return;
    }

    setSaving(
      true
    );

    setMessage("");

    setErrorMessage("");

    try {
      const imageUrl =
        await uploadPromotionImage();

      /*
        公開ONにする場合は、
        同じ掲載場所の他広告をOFF
      */

      if (
        currentForm.isActive
      ) {
        const {
          error:
            disableError,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .update({
              is_active:
                false,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "placement",
              placement
            );

        if (
          disableError
        ) {
          console.error(
            "旧広告停止エラー:",
            disableError
          );

          setErrorMessage(
            "既存広告の公開状態を更新できませんでした。"
          );

          return;
        }
      }

      const updatedAt =
        new Date().toISOString();

      if (
        currentForm.id
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .update({
              title,

              body,

              image_url:
                imageUrl ||
                null,

              is_active:
                currentForm.isActive,

              updated_at:
                updatedAt,
            })
            .eq(
              "id",
              currentForm.id
            );

        if (
          error
        ) {
          console.error(
            "広告設定更新エラー:",
            error
          );

          setErrorMessage(
            "広告設定を保存できませんでした。"
          );

          return;
        }

        setCurrentForm(
          (
            current
          ) => ({
            ...current,

            title,

            body,

            imageUrl:
              imageUrl ||
              "",
          })
        );
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .insert({
              placement,

              title,

              body,

              image_url:
                imageUrl ||
                null,

              is_active:
                currentForm.isActive,

              updated_at:
                updatedAt,
            })
            .select(
              `
                id,
                placement,
                title,
                body,
                image_url,
                is_active,
                display_order,
                created_at,
                updated_at
              `
            )
            .single();

        if (
          error ||
          !data
        ) {
          console.error(
            "広告設定作成エラー:",
            error
          );

          setErrorMessage(
            "広告設定を保存できませんでした。"
          );

          return;
        }

        const created =
          data as Promotion;

        setCurrentForm({
          id:
            created.id,

          title:
            created.title,

          body:
            created.body,

          imageUrl:
            created.image_url ??
            "",

          isActive:
            created.is_active,
        });
      }

      setSelectedImage(
        null
      );

      if (
        localPreviewUrl
      ) {
        URL.revokeObjectURL(
          localPreviewUrl
        );
      }

      setLocalPreviewUrl(
        ""
      );

      setMessage(
        placement ===
        "banner"
          ? "トップバナー設定を保存しました。"
          : "全画面広告設定を保存しました。"
      );
    } catch (
      error
    ) {
      console.error(
        "広告保存通信エラー:",
        error
      );

      setErrorMessage(
        "広告設定の保存中にエラーが発生しました。"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ========================================
     REMOVE IMAGE
  ======================================== */

  function removeCurrentImage() {
    if (
      localPreviewUrl
    ) {
      URL.revokeObjectURL(
        localPreviewUrl
      );
    }

    setSelectedImage(
      null
    );

    setLocalPreviewUrl(
      ""
    );

    setCurrentForm(
      (
        current
      ) => ({
        ...current,

        imageUrl:
          "",
      })
    );
  }

  /* ========================================
     PREVIEW
  ======================================== */

  const previewImage =
    localPreviewUrl ||
    currentForm.imageUrl;

  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffPromotionPage">

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

      <section className="staffPromotionPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffPromotionHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              イベント・広告管理
            </h1>

            <p>
              POKIPO内に表示するイベント告知や
              全画面広告を設定できます。
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
            メニューへ戻る
          </button>

        </header>

        {/* =================================
            TABS
        ================================= */}

        <section className="staffPromotionTabs">

          <button
            type="button"
            className={
              placement ===
              "banner"
                ? "active"
                : ""
            }
            onClick={() =>
              changePlacement(
                "banner"
              )
            }
          >

            <span>
              BANNER
            </span>

            <strong>
              トップバナー
            </strong>

          </button>

          <button
            type="button"
            className={
              placement ===
              "fullscreen"
                ? "active"
                : ""
            }
            onClick={() =>
              changePlacement(
                "fullscreen"
              )
            }
          >

            <span>
              FULLSCREEN
            </span>

            <strong>
              全画面広告
            </strong>

          </button>

        </section>

        {message && (
          <p className="staffPromotionSuccess">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="staffPromotionError">
            {errorMessage}
          </p>
        )}

        {loading ? (
          <div className="staffPromotionLoading">
            広告設定を読み込み中...
          </div>
        ) : (
          <>

            {/* =================================
                EDITOR
            ================================= */}

            <section className="staffPromotionEditor">

              <div className="staffPromotionEditorTitle">

                <div>

                  <span>
                    {placement ===
                    "banner"
                      ? "HOME BANNER"
                      : "OPENING PROMOTION"}
                  </span>

                  <h2>

                    {placement ===
                    "banner"
                      ? "トップ画面バナー"
                      : "全画面広告"}

                  </h2>

                </div>

                <label className="staffPromotionPublishToggle">

                  <input
                    type="checkbox"
                    checked={
                      currentForm.isActive
                    }
                    onChange={(
                      event
                    ) =>
                      setCurrentForm(
                        (
                          current
                        ) => ({
                          ...current,

                          isActive:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  <span>

                    {currentForm.isActive
                      ? "公開中"
                      : "非公開"}

                  </span>

                </label>

              </div>

              {/* TITLE */}

              <div className="staffPromotionField">

                <label htmlFor="promotionTitle">
                  タイトル
                </label>

                <input
                  id="promotionTitle"
                  type="text"
                  value={
                    currentForm.title
                  }
                  maxLength={
                    80
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentForm(
                      (
                        current
                      ) => ({
                        ...current,

                        title:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder={
                    placement ===
                    "banner"
                      ? "例：LiPostイベント開催！"
                      : "例：LiPostからのお知らせ"
                  }
                />

                <small>
                  {currentForm.title.length}
                  /80
                </small>

              </div>

              {/* BODY */}

              <div className="staffPromotionField">

                <label htmlFor="promotionBody">
                  本文
                </label>

                <textarea
                  id="promotionBody"
                  value={
                    currentForm.body
                  }
                  rows={
                    6
                  }
                  maxLength={
                    600
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentForm(
                      (
                        current
                      ) => ({
                        ...current,

                        body:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="イベント内容や開催日時などを入力してください。"
                />

                <small>
                  {currentForm.body.length}
                  /600
                </small>

              </div>

              {/* IMAGE */}

              <div className="staffPromotionField">

                <label htmlFor="promotionImage">
                  画像
                </label>

                <div className="staffPromotionImageUpload">

                  <input
                    id="promotionImage"
                    type="file"
                    accept="image/*"
                    onChange={
                      selectImage
                    }
                  />

                  <p>
                    JPG・PNG・WebPなどの画像をアップロードできます。
                    最大8MBです。
                  </p>

                </div>

              </div>

              {/* IMAGE PREVIEW */}

              {previewImage && (
                <div className="staffPromotionImagePreview">

                  <img
                    src={
                      previewImage
                    }
                    alt="広告画像プレビュー"
                  />

                  <button
                    type="button"
                    onClick={
                      removeCurrentImage
                    }
                  >
                    画像を外す
                  </button>

                </div>
              )}

              {/* SAVE */}

              <button
                type="button"
                className="staffPromotionSaveButton"
                disabled={
                  saving ||
                  uploadingImage
                }
                onClick={() =>
                  void savePromotion()
                }
              >

                {uploadingImage
                  ? "画像アップロード中..."
                  : saving
                  ? "保存中..."
                  : "設定を保存"}

              </button>

            </section>

            {/* =================================
                PREVIEW
            ================================= */}

            <section className="staffPromotionPreviewSection">

              <div className="staffPromotionPreviewTitle">

                <span>
                  PREVIEW
                </span>

                <h2>
                  表示イメージ
                </h2>

              </div>

              {placement ===
              "banner" ? (
                <div className="staffPromotionBannerPreview">

                  {previewImage && (
                    <div className="staffPromotionBannerPreviewImage">

                      <img
                        src={
                          previewImage
                        }
                        alt=""
                      />

                    </div>
                  )}

                  <div>

                    <span>
                      LiPost EVENT
                    </span>

                    <strong>
                      {currentForm.title ||
                        "イベントタイトル"}
                    </strong>

                    <p>
                      {currentForm.body ||
                        "ここにイベントのお知らせ文章が表示されます。"}
                    </p>

                  </div>

                </div>
              ) : (
                <div className="staffPromotionFullscreenPreview">

                  <div className="staffPromotionFullscreenPreviewCard">

                    {previewImage && (
                      <div className="staffPromotionFullscreenPreviewImage">

                        <img
                          src={
                            previewImage
                          }
                          alt=""
                        />

                      </div>
                    )}

                    <span>
                      LiPost INFORMATION
                    </span>

                    <h3>
                      {currentForm.title ||
                        "広告タイトル"}
                    </h3>

                    <p>
                      {currentForm.body ||
                        "ここに広告本文が表示されます。"}
                    </p>

                    <label>

                      <input
                        type="checkbox"
                        disabled
                      />

                      次回から表示しない

                    </label>

                    <button
                      type="button"
                      disabled
                    >
                      閉じる
                    </button>

                  </div>

                </div>
              )}

            </section>

          </>
        )}

      </section>

    </main>
  );
}