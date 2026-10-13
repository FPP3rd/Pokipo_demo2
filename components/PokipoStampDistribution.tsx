"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";

type StampRow = {
  stamp_count: number;
  participant_count: number;
};

const LEVELS = [0, 1, 2, 3, 4, 5];

export default function PokipoStampDistribution() {
  const [rows, setRows] = useState<StampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const total = rows.reduce(
    (sum, row) => sum + row.participant_count,
    0
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "get_pokipo_stamp_distribution"
      );

      if (!active) return;

      if (rpcError) {
        console.error(
          "スタンプ内訳取得エラー:",
          rpcError
        );

        setError(
          "取得数別の集計を読み込めませんでした。"
        );
        setLoading(false);
        return;
      }

      const results = (data ?? []) as Array<{
        stamp_count: number | string;
        participant_count: number | string;
      }>;

      setRows(
        results.map((item) => ({
          stamp_count: Number(item.stamp_count),
          participant_count: Number(item.participant_count),
        }))
      );

      setError("");
      setLoading(false);
    }

    void load();

    const timer = window.setInterval(
      () => void load(),
      30000
    );

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, []);

  return (
    <section
      className="stampDistribution"
      aria-labelledby="stamp-distribution-title"
    >
      <div className="stampDistributionHead">
        <div>
          <span>STAMP PROGRESS</span>

          <h2 id="stamp-distribution-title">
            スタンプ取得数別の参加者内訳
          </h2>

          <p>
            0〜5個の取得数ごとに、
            登録参加者の人数を集計しています。
          </p>
        </div>

        <div className="stampDistributionTotal">
          <small>参加者合計</small>

          <strong>
            {loading ? "—" : total}人
          </strong>
        </div>
      </div>

      {error ? (
        <p
          className="stampDistributionError"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <div className="stampDistributionList">
          {LEVELS.map((level) => {
            const count =
              rows.find(
                (row) => row.stamp_count === level
              )?.participant_count ?? 0;

            const percent = total
              ? (count / total) * 100
              : 0;

            return (
              <div
                className="stampDistributionItem"
                key={level}
              >
                <div className="stampDistributionRow">
                  <strong>
                    {level === 5
                      ? "5個・完走"
                      : `${level}個取得`}
                  </strong>

                  <span>
                    {loading
                      ? "—"
                      : `${count}人（${Math.round(
                          percent
                        )}%）`}
                  </span>
                </div>

                <div
                  className="stampDistributionTrack"
                  role="progressbar"
                  aria-label={`${level}個取得`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percent)}
                >
                  <div
                    className={
                      level === 5
                        ? "stampDistributionFill completed"
                        : "stampDistributionFill"
                    }
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="stampDistributionFoot">
        約30秒ごとに自動更新／5個取得が完走者です。
      </p>

      <style jsx>{`
        .stampDistribution {
          margin: 24px 0;
          padding: 20px;
          background: white;
          border: 1px solid #eddfd9;
          border-radius: 20px;
          box-shadow: 0 7px 25px rgba(88, 45, 37, 0.06);
          animation: stampDistEnter 0.65s ease both;
        }

        .stampDistributionHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 24px;
        }

        .stampDistributionHead > div:first-child {
          flex: 1;
          min-width: 0;
        }

        .stampDistributionHead span {
          font-size: 10px;
          font-weight: 900;
          color: #ac6e72;
          letter-spacing: 0.12em;
        }

        .stampDistributionHead h2 {
          margin: 6px 0;
          font-size: clamp(17px, 3vw, 21px);
          color: #382b2c;
          line-height: 1.45;
          word-break: keep-all;
        }

        .stampDistributionHead p,
        .stampDistributionFoot {
          font-size: 11px;
          color: #87756f;
          line-height: 1.75;
        }

        .stampDistributionHead p {
          margin: 0;
        }

        .stampDistributionTotal {
          flex: 0 0 auto;
          text-align: right;
        }

        .stampDistributionTotal small {
          display: block;
          color: #8b7872;
          font-size: 10px;
        }

        .stampDistributionTotal strong {
          display: block;
          margin-top: 4px;
          color: #c62835;
          font-size: 20px;
          white-space: nowrap;
        }

        .stampDistributionList {
          display: grid;
          gap: 15px;
        }

        .stampDistributionRow {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 7px;
        }

        .stampDistributionRow strong {
          font-size: 13px;
          color: #453332;
        }

        .stampDistributionRow span {
          font-size: 12px;
          color: #5b4441;
          font-variant-numeric: tabular-nums;
        }

        .stampDistributionTrack {
          height: 10px;
          border-radius: 999px;
          background: #f2e6e1;
          overflow: hidden;
        }

        .stampDistributionFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #f1aca3,
            #cd7770
          );
          transition: width 0.8s
            cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .stampDistributionFill.completed {
          background: linear-gradient(
            90deg,
            #ef4e58,
            #b81b2a
          );
        }

        .stampDistributionFoot {
          margin: 17px 0 0;
        }

        .stampDistributionError {
          font-size: 13px;
          color: #bd2634;
        }

        @keyframes stampDistEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 450px) {
          .stampDistribution {
            padding: 16px;
          }

          .stampDistributionHead {
            flex-wrap: wrap;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .stampDistribution,
          .stampDistributionFill {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}