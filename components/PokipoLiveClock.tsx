"use client";

import { useEffect, useState } from "react";

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

function getTime() {
  const parts = formatter.formatToParts(new Date());

  const find = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${find("year")}/${find("month")}/${find("day")}`,
    weekday: find("weekday"),
    time: `${find("hour")}:${find("minute")}:${find("second")}`,
  };
}

export default function PokipoLiveClock() {
  const [clock, setClock] = useState<ReturnType<
    typeof getTime
  > | null>(null);

  useEffect(() => {
    const update = () => setClock(getTime());

    update();

    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pokipoCompactClock">
      <div className="pokipoCompactClockDate">
        {clock
          ? `${clock.date}（${clock.weekday}）`
          : "----/--/--"}
      </div>

      <div className="pokipoCompactClockTime">
        {clock?.time ?? "--:--:--"}
      </div>

      <style jsx>{`
        .pokipoCompactClock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 2px;
          width: max-content;
          max-width: 100%;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          text-align: right;
          white-space: nowrap;
        }

        .pokipoCompactClockDate {
          color: #837974;
          font-family: Arial, "Noto Sans JP", sans-serif;
          font-size: 10px;
          font-weight: 500;
          line-height: 1.3;
        }

        .pokipoCompactClockTime {
          color: #3a3432;
          font-family: Arial, "Noto Sans JP", sans-serif;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: 0.02em;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }

        @media (max-width: 640px) {
          .pokipoCompactClockDate {
            font-size: 9px;
          }

          .pokipoCompactClockTime {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}