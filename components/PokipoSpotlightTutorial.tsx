"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

type SpotlightPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type BubblePosition = {
  top: number;
  left: number;
  width: number;
};

type Props = {
  open: boolean;
  targetRef: RefObject<HTMLElement | null>;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  skipLabel?: string;
  onAction: () => void;
  onSkip?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function PokipoSpotlightTutorial({
  open,
  targetRef,
  title,
  description,
  actionLabel = "進む",
  skipLabel = "閉じる",
  onAction,
  onSkip,
}: Props) {
  const [spotlight, setSpotlight] =
    useState<SpotlightPosition | null>(null);
  const [bubble, setBubble] =
    useState<BubblePosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setSpotlight(null);
      setBubble(null);
      return;
    }

    function updatePosition() {
      const target = targetRef.current;

      if (!target) {
        setSpotlight(null);
        setBubble(null);
        return;
      }

      const rect = target.getBoundingClientRect();

      const padding = 10;
      const top = Math.max(8, rect.top - padding);
      const left = Math.max(8, rect.left - padding);
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;

      setSpotlight({
        top,
        left,
        width,
        height,
      });

      const bubbleWidth = Math.min(
        320,
        window.innerWidth - 32
      );

      const bubbleLeft = clamp(
        rect.left + rect.width / 2 - bubbleWidth / 2,
        16,
        window.innerWidth - bubbleWidth - 16
      );

      let bubbleTop = rect.bottom + 18;

      if (bubbleTop + 170 > window.innerHeight) {
        bubbleTop = Math.max(16, rect.top - 170);
      }

      setBubble({
        top: bubbleTop,
        left: bubbleLeft,
        width: bubbleWidth,
      });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, targetRef]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !spotlight || !bubble) {
    return null;
  }

  return (
    <>
      <div className="pokipoTutorialOverlay" />

      <div
        className="pokipoTutorialSpotlight"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />

      <section
        className="pokipoTutorialBubble"
        style={{
          top: bubble.top,
          left: bubble.left,
          width: bubble.width,
        }}
      >
        <span className="pokipoTutorialLabel">
          TUTORIAL
        </span>

        <h3>{title}</h3>

        <div className="pokipoTutorialDescription">
          {description}
        </div>

        <div className="pokipoTutorialActions">
          {onSkip && (
            <button
              type="button"
              className="pokipoTutorialSkip"
              onClick={onSkip}
            >
              {skipLabel}
            </button>
          )}

          <button
            type="button"
            className="pokipoTutorialAction"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      </section>

      <style jsx>{`
        .pokipoTutorialOverlay {
          position: fixed;
          inset: 0;
          background: rgba(14, 18, 32, 0.68);
          z-index: 1000;
          backdrop-filter: blur(2px);
        }

        .pokipoTutorialSpotlight {
          position: fixed;
          border-radius: 24px;
          z-index: 1001;
          pointer-events: none;
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.95),
            0 0 0 10px rgba(255, 217, 79, 0.18),
            0 0 28px rgba(255, 217, 79, 0.85);
          animation: pokipoTutorialPulse 1.4s ease-in-out infinite;
        }

        .pokipoTutorialBubble {
          position: fixed;
          z-index: 1003;
          background: #ffffff;
          color: #1f2430;
          border-radius: 20px;
          padding: 16px 16px 14px;
          box-shadow: 0 18px 44px rgba(20, 26, 44, 0.28);
        }

        .pokipoTutorialBubble::before {
          content: "";
          position: absolute;
          top: -10px;
          left: 36px;
          width: 18px;
          height: 18px;
          background: #ffffff;
          transform: rotate(45deg);
          border-radius: 4px;
        }

        .pokipoTutorialLabel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #e5484d;
          margin-bottom: 8px;
        }

        .pokipoTutorialBubble h3 {
          margin: 0 0 8px;
          font-size: 18px;
          line-height: 1.4;
        }

        .pokipoTutorialDescription {
          font-size: 14px;
          line-height: 1.7;
          color: #4a5568;
        }

        .pokipoTutorialActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        .pokipoTutorialSkip {
          border: none;
          background: #eef2f7;
          color: #506072;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .pokipoTutorialAction {
          border: none;
          background: linear-gradient(
            135deg,
            #ff646e,
            #ff8a34
          );
          color: #ffffff;
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(255, 100, 110, 0.28);
        }

        @keyframes pokipoTutorialPulse {
          0% {
            transform: scale(1);
            box-shadow:
              0 0 0 2px rgba(255, 255, 255, 0.95),
              0 0 0 10px rgba(255, 217, 79, 0.14),
              0 0 24px rgba(255, 217, 79, 0.55);
          }
          50% {
            transform: scale(1.01);
            box-shadow:
              0 0 0 2px rgba(255, 255, 255, 1),
              0 0 0 14px rgba(255, 217, 79, 0.22),
              0 0 34px rgba(255, 217, 79, 0.88);
          }
          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 2px rgba(255, 255, 255, 0.95),
              0 0 0 10px rgba(255, 217, 79, 0.14),
              0 0 24px rgba(255, 217, 79, 0.55);
          }
        }

        @media (max-width: 640px) {
          .pokipoTutorialBubble {
            padding: 14px 14px 12px;
          }

          .pokipoTutorialBubble h3 {
            font-size: 16px;
          }

          .pokipoTutorialDescription {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}