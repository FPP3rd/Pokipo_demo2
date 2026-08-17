"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pokipoSpots } from "../data/pokipo-data";

export default function KnowledgePage() {
  const router = useRouter();

  const [unlockedKnowledge, setUnlockedKnowledge] =
    useState<string[]>([]);

  useEffect(() => {
    const savedKnowledge =
      localStorage.getItem("pokipo_knowledge");

    if (savedKnowledge) {
      try {
        const parsedKnowledge =
          JSON.parse(savedKnowledge);

        if (Array.isArray(parsedKnowledge)) {
          setUnlockedKnowledge(
            parsedKnowledge
          );
        }
      } catch {
        setUnlockedKnowledge([]);
      }
    }
  }, []);

  const unlockedCount =
    unlockedKnowledge.length;

  const percentage =
    Math.min(unlockedCount * 20, 100);

  return (
    <main className="shell">

      <section className="knowledgePage">

        {/* =========================
            HEADER
        ========================== */}

        <header className="knowledgeHeader">

          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push("/home")
            }
          >
            ←
          </button>

          <div>

            <p className="knowledgeEyebrow">
              POCKY COLLECTION
            </p>

            <h1>
              ポッキー豆知識図鑑
            </h1>

          </div>

        </header>

        {/* =========================
            INTRO
        ========================== */}

        <p className="knowledgeIntro">
          スタンプラリーで見つけた豆知識を、
          ここでいつでも見返せます。
        </p>

        {/* =========================
            COLLECTION PROGRESS
        ========================== */}

        <section className="knowledgeProgressCard">

          <div className="knowledgeProgressTop">

            <div>

              <p>
                COLLECTION
              </p>

              <h2>
                {unlockedCount} / 5 解放
              </h2>

            </div>

            <strong>
              {percentage}%
            </strong>

          </div>

          <div className="progressBar">

            <div
              className="progressBarFill"
              style={{
                width: `${percentage}%`,
              }}
            />

          </div>

        </section>

        {/* =========================
            KNOWLEDGE COLLECTION
        ========================== */}

        <section className="knowledgeGrid">

          {pokipoSpots.map((item) => {
            const unlocked =
              unlockedKnowledge.includes(
                item.knowledgeId
              );

            return (
              <article
                key={item.knowledgeId}
                className={
                  unlocked
                    ? "knowledgeCard unlocked"
                    : "knowledgeCard locked"
                }
              >

                {/* 上部 */}

                <div className="knowledgeCardTop">

                  <div className="knowledgeNumber">
                    {item.number}
                  </div>

                  <span className="knowledgeState">
                    {unlocked
                      ? "UNLOCKED"
                      : "LOCKED"}
                  </span>

                </div>

                {/* アイコン */}

                <div
                  className={
                    unlocked
                      ? "knowledgeVisual unlocked"
                      : "knowledgeVisual"
                  }
                >
                  {unlocked
                    ? "!"
                    : "?"}
                </div>

                {/* 内容 */}

                {unlocked ? (
                  <>

                    <h2>
                      {item.knowledgeTitle}
                    </h2>

                    <p>
                      {item.knowledgeText}
                    </p>

                  </>
                ) : (
                  <>

                    <h2>
                      ？？？
                    </h2>

                    <p>
                      スタンプラリーを進めると、
                      新しい豆知識が解放されます。
                    </p>

                  </>
                )}

              </article>
            );
          })}

        </section>

        {/* =========================
            COMPLETE
        ========================== */}

        {unlockedCount === 5 && (
          <section className="knowledgeCompleteCard">

            <div>
              ★
            </div>

            <div>

              <p>
                COLLECTION COMPLETE
              </p>

              <h2>
                豆知識をすべて集めました！
              </h2>

            </div>

          </section>
        )}

      </section>

    </main>
  );
}