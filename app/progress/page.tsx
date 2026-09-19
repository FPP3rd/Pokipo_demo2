"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  pokipoSpots,
} from "../data/pokipo-data";

import MaintenanceGate
  from "../../components/MaintenanceGate";

export default function ProgressPage() {
  const router =
    useRouter();

  const [
    progress,
    setProgress,
  ] = useState(0);

  useEffect(() => {
    const savedProgress =
      Number(
        localStorage.getItem(
          "pokipo_progress"
        ) ?? "0"
      );

    setProgress(
      savedProgress
    );
  }, []);

  const completed =
    progress >= 5;

  return (
    <MaintenanceGate>

      <main className="shell">

        <section className="card progressPage">

          {/* ヘッダー */}

          <header className="progressHeader">

            <button
              type="button"
              className="backButton"
              onClick={() =>
                router.push(
                  "/home"
                )
              }
            >
              ←
            </button>

            <div>

              <p className="progressEyebrow">
                POCKY JOURNEY
              </p>

              <h1>
                ポッキー完成まで
              </h1>

            </div>

          </header>

          {/* 全体進捗 */}

          <section className="progressSummary">

            <div>

              <p>
                CURRENT PROGRESS
              </p>

              <h2>
                {progress} / 5 STEP
              </h2>

            </div>

            <strong>
              {progress * 20}%
            </strong>

            <div className="progressBar">

              <div
                className="progressBarFill"
                style={{
                  width:
                    `${progress * 20}%`,
                }}
              />

            </div>

          </section>

          {/* 5工程 */}

          <section className="processList">

            {pokipoSpots.map(
              (
                step
              ) => {
                const done =
                  step.number <=
                  progress;

                const current =
                  step.number ===
                    progress + 1 &&
                  !completed;

                return (
                  <article
                    key={
                      step.number
                    }
                    className={[
                      "processCard",

                      done
                        ? "done"
                        : "",

                      current
                        ? "current"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )}
                  >

                    <div className="processNumber">

                      {done
                        ? "✓"
                        : step.number}

                    </div>

                    <div className="processContent">

                      <p>
                        {step.stepTitle}
                      </p>

                      <h2>
                        {step.stepName}
                      </h2>

                      <span>

                        {done
                          ? "この工程はクリア済みです。"
                          : current
                          ? "次に進む工程です。"
                          : step.stepDescription}

                      </span>

                    </div>

                    <div className="processStatus">

                      {done
                        ? "DONE"
                        : current
                        ? "NEXT"
                        : "LOCK"}

                    </div>

                  </article>
                );
              }
            )}

          </section>

          {completed && (
            <section className="processCompleteCard">

              <div>
                ★
              </div>

              <div>

                <p>
                  ALL STEPS COMPLETE
                </p>

                <h2>
                  ポッキー完成！
                </h2>

                <span>
                  5つの工程をすべてクリアしました。
                </span>

              </div>

            </section>
          )}

          {!completed && (
            <button
              type="button"
              className="mainActionButton"
              onClick={() =>
                router.push(
                  "/stamp"
                )
              }
            >

              <span>

                <strong>
                  次のスタンプを集める
                </strong>

                <small>
                  スタンプラリーへ進む
                </small>

              </span>

              <span className="buttonArrow">
                ›
              </span>

            </button>
          )}

        </section>

      </main>

    </MaintenanceGate>
  );
}