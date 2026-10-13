"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  value: number | null;
  duration?: number;
};

export default function PokipoAnimatedNumber({
  value,
  duration = 1400,
}: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const [ready, setReady] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [effectKey, setEffectKey] = useState(0);

  const currentRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // 読み込み中も前回の表示を維持
    if (value === null || !Number.isFinite(value)) {
      return;
    }

    const target = Math.max(0, Math.round(value));

    // 同じ数値なら再演出しない
    if (targetRef.current === target) {
      return;
    }

    targetRef.current = target;
    setReady(true);
    setEffectKey((previous) => previous + 1);

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const startValue = currentRef.current;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion || startValue === target) {
      currentRef.current = target;
      setDisplayValue(target);
      setAnimating(false);
      return;
    }

    setAnimating(true);

    const startTime = performance.now();
    const animationDuration = Math.max(200, duration);

    // 速く動き出し、最後は滑らかに停止
    function easeOutExpo(progress: number) {
      if (progress >= 1) return 1;

      return 1 - Math.pow(2, -10 * progress);
    }

    function animate(now: number) {
      const elapsed = now - startTime;

      const progress = Math.min(
        elapsed / animationDuration,
        1
      );

      const eased = easeOutExpo(progress);

      const nextValue = Math.round(
        startValue + (target - startValue) * eased
      );

      currentRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current =
          requestAnimationFrame(animate);
      } else {
        currentRef.current = target;
        setDisplayValue(target);
        setAnimating(false);
        frameRef.current = null;
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, duration]);

  return (
    <span
      className={[
        "pokipoDigitalNumber",
        animating ? "isAnimating" : "",
      ].join(" ")}
      aria-label={
        ready
          ? `${displayValue.toLocaleString("ja-JP")}`
          : "読み込み中"
      }
    >
      <span
        className="pokipoDigitalValue"
        aria-hidden="true"
      >
        {ready
          ? displayValue.toLocaleString("ja-JP")
          : "—"}
      </span>

      {animating && (
        <span
          key={effectKey}
          className="pokipoDigitalSweep"
          aria-hidden="true"
        />
      )}

      <style jsx>{`
        .pokipoDigitalNumber {
          position: relative;
          display: inline-flex;
          align-items: baseline;
          justify-content: flex-start;
          width: max-content;
          max-width: 100%;
          isolation: isolate;

          color: inherit;
          font: inherit;
          line-height: inherit;

          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";

          white-space: nowrap;
          vertical-align: baseline;
        }

        .pokipoDigitalValue {
          position: relative;
          z-index: 1;

          display: inline-block;
          color: inherit;
          font: inherit;
          line-height: inherit;

          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";

          white-space: nowrap;

          transition:
            color 0.3s ease,
            filter 0.3s ease,
            transform 0.3s ease;
        }

        /* 数字が変化しているとき */
        .pokipoDigitalNumber.isAnimating
        .pokipoDigitalValue {
          color: #d82939;

          filter:
            drop-shadow(
              0 0 7px rgba(224, 47, 63, 0.22)
            );

          animation:
            pokipoDigitalLift 1.1s
            cubic-bezier(0.18, 0.8, 0.24, 1)
            both;
        }

        /* 数字が浮き上がって戻る */
        @keyframes pokipoDigitalLift {
          0% {
            transform: translateY(5px) scale(0.96);
            filter: blur(3px);
            opacity: 0.65;
          }

          25% {
            transform: translateY(-3px) scale(1.065);
            filter: blur(0);
            opacity: 1;
          }

          65% {
            transform: translateY(0) scale(1.025);
            filter: blur(0);
            opacity: 1;
          }

          100% {
            transform: translateY(0) scale(1);
            filter: blur(0);
            opacity: 1;
          }
        }

        /* 数字の上を横切る光 */
        .pokipoDigitalSweep {
          position: absolute;
          z-index: 2;
          inset: -8px -4px;
          overflow: hidden;
          border-radius: 8px;
          pointer-events: none;
        }

        .pokipoDigitalSweep::after {
          content: "";
          position: absolute;

          top: -20%;
          left: -65%;

          width: 42%;
          height: 145%;

          transform: skewX(-22deg);

          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.85),
            rgba(255, 191, 195, 0.55),
            transparent
          );

          animation:
            pokipoDigitalLightSweep
            0.85s ease-out forwards;
        }

        @keyframes pokipoDigitalLightSweep {
          0% {
            left: -65%;
            opacity: 0;
          }

          15% {
            opacity: 0.9;
          }

          100% {
            left: 150%;
            opacity: 0;
          }
        }

        /* 数字の下に短く光るアクセント */
        .pokipoDigitalNumber::after {
          content: "";
          position: absolute;
          z-index: 0;

          bottom: -4px;
          left: 0;

          width: 100%;
          height: 2px;

          border-radius: 999px;

          background: linear-gradient(
            90deg,
            transparent,
            #f34b59,
            transparent
          );

          opacity: 0;
          transform: scaleX(0.15);

          transition:
            opacity 0.3s ease,
            transform 0.65s
              cubic-bezier(0.18, 0.85, 0.25, 1);
        }

        .pokipoDigitalNumber.isAnimating::after {
          opacity: 0.75;
          transform: scaleX(1);
        }

        @media (prefers-reduced-motion: reduce) {
          .pokipoDigitalNumber,
          .pokipoDigitalValue,
          .pokipoDigitalSweep,
          .pokipoDigitalSweep::after,
          .pokipoDigitalNumber::after {
            animation: none !important;
            transition: none !important;
          }

          .pokipoDigitalNumber::after {
            display: none;
          }
        }
      `}</style>
    </span>
  );
}