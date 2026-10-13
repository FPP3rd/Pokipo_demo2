"use client";

import { useEffect, useState } from "react";

type JapanTime = {
  date: string;
  weekday: string;
  hour: string;
  minute: string;
  second: string;
};

const formatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getJapanTime(): JapanTime {
  const parts = formatter.formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}/${get("month")}/${get("day")}`,
    weekday: get("weekday"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export default function PokipoLiveClock() {
  const [time, setTime] = useState<JapanTime | null>(null);

  useEffect(() => {
    function updateClock() {
      setTime(getJapanTime());
    }

    updateClock();

    const interval = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="pokipoLiveClock"
      role="timer"
      aria-label={
        time
          ? `日本時間 ${time.date} ${time.hour}時${time.minute}分${time.second}秒`
          : "日本時間を取得中"
      }
    >
      <div className="pokipoClockTop">
        <span className="pokipoClockPulse" />
        <span>JAPAN STANDARD TIME</span>
        <span className="pokipoClockZone">JST</span>
      </div>

      <div className="pokipoClockDate">
        {time ? `${time.date}（${time.weekday}）` : "----/--/--"}
      </div>

      <div className="pokipoClockDigits" aria-hidden="true">
        <span>{time?.hour ?? "--"}</span>
        <i>:</i>
        <span>{time?.minute ?? "--"}</span>
        <i>:</i>
        <span
          key={time?.second ?? "initial"}
          className="pokipoClockSeconds"
        >
          {time?.second ?? "--"}
        </span>
      </div>

      <div className="pokipoClockBottom">
        <span className="pokipoClockLine" />
        <span>LIVE CLOCK</span>
      </div>

      <style jsx>{`
        .pokipoLiveClock {
          width: 100%;
          min-width: 0;
          padding: 13px 17px;
          border: 1px solid rgba(211, 43, 54, 0.18);
          border-radius: 16px;
          background:
            linear-gradient(
              130deg,
              rgba(255, 255, 255, 0.97),
              rgba(255, 244, 239, 0.95)
            );
          box-shadow: 0 7px 24px rgba(115, 48, 44, 0.07);
          animation: clockAppear 0.6s ease-out both;
        }

        .pokipoClockTop {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #8a716e;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .pokipoClockPulse {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #2ead72;
          animation: clockPulse 2s infinite;
        }

        .pokipoClockZone {
          margin-left: auto;
          color: #c32734;
          font-size: 10px;
        }

        .pokipoClockDate {
          margin-top: 9px;
          color: #6d5854;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        .pokipoClockDigits {
          display: flex;
          align-items: baseline;
          justify-content: flex-start;
          gap: 2px;
          margin-top: 1px;
          color: #2b2628;
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 900;
          line-height: 1.35;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          white-space: nowrap;
        }

        .pokipoClockDigits > span {
          display: inline-block;
          min-width: 2ch;
          text-align: center;
        }

        .pokipoClockDigits i {
          font-style: normal;
          color: #be5660;
          animation: colonPulse 1s ease-in-out infinite;
        }

        .pokipoClockSeconds {
          color: #d02b3a;
          animation: secondTick 0.45s ease-out both;
        }

        .pokipoClockBottom {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          color: #a16b6f;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .pokipoClockLine {
          width: 20px;
          height: 2px;
          border-radius: 99px;
          background: #da3544;
        }

        @keyframes clockAppear {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes secondTick {
          from {
            opacity: 0.5;
            transform: translateY(-5px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes clockPulse {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(46, 173, 114, 0.12);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(46, 173, 114, 0);
          }
        }

        @keyframes colonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pokipoLiveClock *,
          .pokipoLiveClock {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}