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
} from "../../lib/supabase-client";

/* ========================================
   KNOWLEDGE DATA
======================================== */

const knowledgeItems = [
  {
    id:
      "knowledge1",

    number:
      1,

    title:
      "10年ぶりの大改良！素材から見直した「究極の品質」",

    text:
      "ポッキーは長年愛されている商品ですが、よりおいしく楽しんでもらうために、プレッツェルやチョコレートなど細かな部分まで見直しながら進化しています。",
  },

  {
    id:
      "knowledge2",

    number:
      2,

    title:
      "名前にも込められたポッキーらしさ",

    text:
      "ポッキーという商品名は、食べた時の軽快な音をイメージした名前です。見た目だけでなく、食感や音までを含めて楽しめることも、長く親しまれてきた魅力のひとつです。",
  },

  {
    id:
      "knowledge3",

    number:
      3,

    title:
      "心の距離をぐっと縮める「コミュニケーションツール」",

    text:
      "ポッキーは1本ずつ手に取りやすく、みんなで分けやすい形をしています。そのため、お菓子としてだけでなく、人と人の会話を生むきっかけにもなっています。",
  },

  {
    id:
      "knowledge4",

    number:
      4,

    title:
      "誰も取り残さない「シェアハピネス」の精神",

    text:
      "ポッキーには、みんなで分け合って楽しむ『Share happiness!』という考え方があります。おいしさを共有することで、楽しい時間そのものを届けることを大切にしています。",
  },

  {
    id:
      "knowledge5",

    number:
      5,

    title:
      "獨協生の誇り！5年連続日本一を支える「圧倒的な団結力」",

    text:
      "ポッキーを囲んで一緒に楽しむことは、仲間同士の一体感にもつながります。POKIPOでは、獨協大学の学生同士がキャンパスを巡りながら楽しめる体験を目指しています。",
  },
];

/* ========================================
   KNOWLEDGE PAGE
======================================== */

export default function KnowledgePage() {
  const router =
    useRouter();

  /* ========================================
     UNLOCKED KNOWLEDGE
  ======================================== */

  const [
    unlockedKnowledge,
    setUnlockedKnowledge,
  ] = useState<string[]>([]);

  /* ========================================
     LOADING
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ========================================
     MESSAGE
  ======================================== */

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    async function loadKnowledge() {
      const participantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      /* =================================
         participant IDなし
         localStorageのみ
      ================================= */

      if (
        !participantId
      ) {
        loadFromLocalStorage();

        setLoading(
          false
        );

        return;
      }

      /* =================================
         SUPABASE
      ================================= */

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_pokipo_knowledge",
          {
            p_participant_id:
              participantId,
          }
        );

      /* =================================
         ERROR
         localStorageへフォールバック
      ================================= */

      if (
        error
      ) {
        console.error(
          "豆知識取得エラー:",
          error
        );

        loadFromLocalStorage();

        setMessage(
          "通信状況により端末内の豆知識情報を表示しています。"
        );

        setLoading(
          false
        );

        return;
      }

      /* =================================
         SERVER DATA
      ================================= */

      const serverKnowledge =
        (
          data ?? []
        ).map(
          (
            item: {
              knowledge_id:
                string;
            }
          ) =>
            item.knowledge_id
        );

      setUnlockedKnowledge(
        serverKnowledge
      );

      /* =================================
         localStorageへ同期
      ================================= */

      localStorage.setItem(
        "pokipo_knowledge",
        JSON.stringify(
          serverKnowledge
        )
      );

      setLoading(
        false
      );
    }

    /* ========================================
       LOCAL STORAGE
    ======================================== */

    function loadFromLocalStorage() {
      const savedKnowledge =
        localStorage.getItem(
          "pokipo_knowledge"
        );

      if (
        !savedKnowledge
      ) {
        setUnlockedKnowledge(
          []
        );

        return;
      }

      try {
        const parsed =
          JSON.parse(
            savedKnowledge
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          setUnlockedKnowledge(
            parsed
          );
        } else {
          setUnlockedKnowledge(
            []
          );
        }
      } catch {
        setUnlockedKnowledge(
          []
        );
      }
    }

    loadKnowledge();
  }, []);

  /* ========================================
     STATUS
  ======================================== */

  const unlockedCount =
    unlockedKnowledge.length;

  const complete =
    unlockedCount >= 5;

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="card knowledgePage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="knowledgeHeader">

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

            <p className="knowledgeEyebrow">
              POCKY KNOWLEDGE
            </p>

            <h1>
              ポッキー豆知識
            </h1>

          </div>

          <div className="knowledgeCountBadge">
            {unlockedCount}/5
          </div>

        </header>

        {/* =================================
            HERO
        ================================= */}

        <section
          className={
            complete
              ? "knowledgeHero complete"
              : "knowledgeHero"
          }
        >

          <span className="knowledgeHeroMini">
            KNOWLEDGE COLLECTION
          </span>

          <div className="knowledgeHeroIcon">
            ?
          </div>

          <h2>

            {complete
              ? "豆知識コンプリート！"
              : "集めた豆知識を見てみよう"}

          </h2>

          <p>

            {complete
              ? "5つすべての豆知識を集めました！"
              : `現在 ${unlockedCount}/5。スタンプラリーを進めて豆知識を集めよう。`}

          </p>

        </section>

        {/* =================================
            PROGRESS
        ================================= */}

        <section className="knowledgeProgressCard">

          <div className="knowledgeProgressTop">

            <span>
              COLLECTION
            </span>

            <strong>
              {unlockedCount}/5
            </strong>

          </div>

          <div className="knowledgeProgressBar">

            <div
              className="knowledgeProgressFill"
              style={{
                width:
                  `${Math.min(
                    unlockedCount *
                      20,
                    100
                  )}%`,
              }}
            />

          </div>

        </section>

        {/* =================================
            LOADING
        ================================= */}

        {loading && (
          <section className="knowledgeLoadingCard">

            <span>
              読み込み中...
            </span>

          </section>
        )}

        {/* =================================
            KNOWLEDGE LIST
        ================================= */}

        {!loading && (
          <section className="knowledgeList">

            {knowledgeItems.map(
              (
                item
              ) => {
                const unlocked =
                  unlockedKnowledge.includes(
                    item.id
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className={
                      unlocked
                        ? "knowledgeCard unlocked"
                        : "knowledgeCard locked"
                    }
                  >

                    {/* =========================
                        NUMBER
                    ========================== */}

                    <div className="knowledgeNumber">

                      {unlocked
                        ? item.number
                        : "?"}

                    </div>

                    {/* =========================
                        CONTENT
                    ========================== */}

                    <div className="knowledgeContent">

                      <span className="knowledgeStatus">

                        {unlocked
                          ? "UNLOCKED"
                          : "LOCKED"}

                      </span>

                      {unlocked ? (
                        <>

                          <h2>
                            {item.title}
                          </h2>

                          <p>
                            {item.text}
                          </p>

                        </>
                      ) : (
                        <>

                          <h2>
                            まだ解放されていません
                          </h2>

                          <p>
                            QRコードを読み取って、
                            トリビアに正解すると
                            この豆知識が解放されます。
                          </p>

                        </>
                      )}

                    </div>

                    {/* =========================
                        ICON
                    ========================== */}

                    <div
                      className={
                        unlocked
                          ? "knowledgeLockIcon unlocked"
                          : "knowledgeLockIcon"
                      }
                    >

                      {unlocked
                        ? "✓"
                        : "🔒"}

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

        {/* =================================
            COMPLETE
        ================================= */}

        {complete && (
          <section className="knowledgeCompleteCard">

            <div>
              ★
            </div>

            <span>
              COMPLETE!
            </span>

            <h2>
              全豆知識コンプリート！
            </h2>

            <p>
              5つすべてのポッキー豆知識を集めました。
            </p>

          </section>
        )}

        {/* =================================
            MESSAGE
        ================================= */}

        {message && (
          <p className="knowledgeMessage">
            {message}
          </p>
        )}

        {/* =================================
            HOME BUTTON
        ================================= */}

        <button
          type="button"
          className="knowledgeHomeButton"
          onClick={() =>
            router.push(
              "/home"
            )
          }
        >
          トップへ戻る
        </button>

      </section>

    </main>
  );
}