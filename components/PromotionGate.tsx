"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type FullscreenPromotion = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  updated_at: string;
};

type PromotionGateProps = {
  children: ReactNode;
};

/* ========================================
   SESSION KEY
======================================== */

const SESSION_KEY =
  "pokipo_promotion_shown_this_session";

/* ========================================
   COMPONENT
======================================== */

export default function PromotionGate({
  children,
}: PromotionGateProps) {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    promotion,
    setPromotion,
  ] =
    useState<FullscreenPromotion | null>(
      null
    );

  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    dontShowAgain,
    setDontShowAgain,
  ] = useState(false);

  /* ========================================
     LOAD PROMOTION
  ======================================== */

  useEffect(() => {
    async function loadPromotion() {
      setLoading(
        true
      );

      try {
        const alreadyShownThisSession =
          sessionStorage.getItem(
            SESSION_KEY
          ) === "true";

        if (
          alreadyShownThisSession
        ) {
          setVisible(
            false
          );

          return;
        }

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
                title,
                body,
                image_url,
                updated_at
              `
            )
            .eq(
              "placement",
              "fullscreen"
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "全画面広告取得エラー:",
            error
          );

          return;
        }

        if (
          !data
        ) {
          return;
        }

        const currentPromotion =
          data as FullscreenPromotion;

        const hiddenKey =
          `pokipo_promotion_hidden:${currentPromotion.id}:${currentPromotion.updated_at}`;

        const hiddenForever =
          localStorage.getItem(
            hiddenKey
          ) === "true";

        if (
          hiddenForever
        ) {
          return;
        }

        setPromotion(
          currentPromotion
        );

        setVisible(
          true
        );

        sessionStorage.setItem(
          SESSION_KEY,
          "true"
        );
      } catch (
        error
      ) {
        console.error(
          "全画面広告通信エラー:",
          error
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadPromotion();
  }, []);

  /* ========================================
     CLOSE
  ======================================== */

  function closePromotion() {
    if (
      promotion &&
      dontShowAgain
    ) {
      const hiddenKey =
        `pokipo_promotion_hidden:${promotion.id}:${promotion.updated_at}`;

      localStorage.setItem(
        hiddenKey,
        "true"
      );
    }

    setVisible(
      false
    );

    setDontShowAgain(
      false
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <>
      {children}

      {!loading &&
        visible &&
        promotion && (
        <div className="pokipoPromotionOverlay">

          <section
            className="pokipoPromotionCard"
            role="dialog"
            aria-modal="true"
            aria-label={
              promotion.title
            }
          >

            {promotion.image_url && (
              <div className="pokipoPromotionImage">

                <img
                  src={
                    promotion.image_url
                  }
                  alt=""
                />

              </div>
            )}

            <div className="pokipoPromotionContent">

              <span className="pokipoPromotionEyebrow">
                LiPost INFORMATION
              </span>

              <h2>
                {promotion.title}
              </h2>

              {promotion.body && (
                <p>
                  {promotion.body}
                </p>
              )}

              <label className="pokipoPromotionDontShow">

                <input
                  type="checkbox"
                  checked={
                    dontShowAgain
                  }
                  onChange={(
                    event
                  ) =>
                    setDontShowAgain(
                      event.target.checked
                    )
                  }
                />

                <span>
                  次回から表示しない
                </span>

              </label>

              <button
                type="button"
                className="pokipoPromotionCloseButton"
                onClick={
                  closePromotion
                }
              >
                閉じる
              </button>

            </div>

          </section>

        </div>
      )}
    </>
  );
}