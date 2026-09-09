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
} from "../../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type RewardExchange = {
  id: string;
  participant_id: string;
  student_number: string;
  status: string;
  exchanged_at: string | null;
  exchanged_by: string | null;
};

type Participant = {
  id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
};

type HistoryItem = {
  rewardId: string;
  participantId: string;
  nickname: string;
  grade: string;
  department: string;
  studentNumber: string;
  exchangedAt: string;
  exchangedBy: string | null;
};

export default function RewardHistoryPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  /* ========================================
     HISTORY
  ======================================== */

  const [
    history,
    setHistory,
  ] = useState<HistoryItem[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkAuth() {
      const {
        data,
      } =
        await supabase.auth.getSession();

      if (
        !data.session
      ) {
        setAuthenticated(
          false
        );

        setAuthLoading(
          false
        );

        router.replace(
          "/staff/reward"
        );

        return;
      }

      setAuthenticated(
        true
      );

      setAuthLoading(
        false
      );
    }

    checkAuth();
  }, [router]);

  /* ========================================
     LOAD HISTORY
  ======================================== */

  useEffect(() => {
    if (
      !authenticated
    ) {
      return;
    }

    async function loadHistory() {
      setLoading(
        true
      );

      setMessage("");

      try {
        /* =================================
           交換済みデータ
        ================================= */

        const {
          data:
            rewardData,

          error:
            rewardError,
        } =
          await supabase
            .from(
              "reward_exchanges"
            )
            .select(
              "id, participant_id, student_number, status, exchanged_at, exchanged_by"
            )
            .eq(
              "status",
              "exchanged"
            )
            .order(
              "exchanged_at",
              {
                ascending:
                  false,
              }
            );

        if (
          rewardError
        ) {
          console.error(
            "交換履歴取得エラー:",
            rewardError
          );

          setMessage(
            "交換履歴を取得できませんでした。"
          );

          return;
        }

        const rewards =
          (
            rewardData ??
            []
          ) as RewardExchange[];

        if (
          rewards.length ===
          0
        ) {
          setHistory(
            []
          );

          return;
        }

        /* =================================
           participant IDs
        ================================= */

        const participantIds =
          Array.from(
            new Set(
              rewards.map(
                (
                  reward
                ) =>
                  reward.participant_id
              )
            )
          );

        /* =================================
           参加者情報
        ================================= */

        const {
          data:
            participantData,

          error:
            participantError,
        } =
          await supabase
            .from(
              "participants"
            )
            .select(
              "id, nickname, grade, department"
            )
            .in(
              "id",
              participantIds
            );

        if (
          participantError
        ) {
          console.error(
            "参加者情報取得エラー:",
            participantError
          );

          setMessage(
            "参加者情報を取得できませんでした。"
          );

          return;
        }

        const participants =
          (
            participantData ??
            []
          ) as Participant[];

        /* =================================
           結合
        ================================= */

        const combined:
          HistoryItem[] =
          rewards.map(
            (
              reward
            ) => {
              const participant =
                participants.find(
                  (
                    item
                  ) =>
                    item.id ===
                    reward.participant_id
                );

              return {
                rewardId:
                  reward.id,

                participantId:
                  reward.participant_id,

                nickname:
                  participant?.nickname ??
                  "不明",

                grade:
                  participant?.grade ??
                  "未設定",

                department:
                  participant?.department ??
                  "未設定",

                studentNumber:
                  reward.student_number,

                exchangedAt:
                  reward.exchanged_at ??
                  "",

                exchangedBy:
                  reward.exchanged_by,
              };
            }
          );

        setHistory(
          combined
        );
      } catch (
        error
      ) {
        console.error(
          "履歴読み込みエラー:",
          error
        );

        setMessage(
          "通信中にエラーが発生しました。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadHistory();

    /* ========================================
       REALTIME
       新しい交換があれば自動更新
    ======================================== */

    const channel =
      supabase
        .channel(
          "staff-reward-history"
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "reward_exchanges",
          },
          () => {
            loadHistory();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    authenticated,
  ]);

  /* ========================================
     FORMAT DATE
  ======================================== */

  function formatDate(
    value: string
  ) {
    if (
      !value
    ) {
      return "----";
    }

    return new Date(
      value
    ).toLocaleString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }

  /* ========================================
     TODAY
  ======================================== */

  const todayString =
    new Date().toLocaleDateString(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",
      }
    );

  const todayCount =
    history.filter(
      (
        item
      ) => {
        if (
          !item.exchangedAt
        ) {
          return false;
        }

        const exchangeDate =
          new Date(
            item.exchangedAt
          ).toLocaleDateString(
            "ja-JP",
            {
              timeZone:
                "Asia/Tokyo",
            }
          );

        return (
          exchangeDate ===
          todayString
        );
      }
    ).length;

  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoadingCard">
            スタッフ情報を確認中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="staffRewardPage">

        {/* =================================
            HEADER
        ================================= */}

        <header className="staffHistoryHeader">

          <button
            type="button"
            className="staffHistoryBack"
            onClick={() =>
              router.push(
                "/staff/reward"
              )
            }
          >
            ←
          </button>

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              景品交換履歴
            </h1>

          </div>

        </header>

        {/* =================================
            STATS
        ================================= */}

        <section className="staffHistoryStats">

          <div className="staffHistoryStatCard">

            <span>
              TODAY
            </span>

            <strong>
              {todayCount}
            </strong>

            <small>
              本日の交換
            </small>

          </div>

          <div className="staffHistoryStatCard">

            <span>
              TOTAL
            </span>

            <strong>
              {history.length}
            </strong>

            <small>
              累計交換
            </small>

          </div>

        </section>

        {/* =================================
            TITLE
        ================================= */}

        <div className="staffHistoryTitle">

          <div>

            <span>
              EXCHANGE HISTORY
            </span>

            <h2>
              交換済み一覧
            </h2>

          </div>

          <strong>
            {history.length}件
          </strong>

        </div>

        {/* =================================
            LOADING
        ================================= */}

        {loading && (
          <div className="staffHistoryEmpty">
            交換履歴を読み込み中...
          </div>
        )}

        {/* =================================
            EMPTY
        ================================= */}

        {!loading &&
          history.length ===
            0 && (
            <div className="staffHistoryEmpty">

              <div>
                🎁
              </div>

              <strong>
                まだ交換履歴はありません
              </strong>

              <p>
                景品交換が完了すると
                ここに自動で表示されます。
              </p>

            </div>
          )}

        {/* =================================
            HISTORY
        ================================= */}

        {!loading &&
          history.length >
            0 && (
            <div className="staffHistoryList">

              {history.map(
                (
                  item,
                  index
                ) => (
                  <article
                    key={
                      item.rewardId
                    }
                    className="staffHistoryCard"
                  >

                    {/* NUMBER */}

                    <div className="staffHistoryNumber">

                      {history.length -
                        index}

                    </div>

                    {/* PARTICIPANT */}

                    <div className="staffHistoryParticipant">

                      <span>
                        PARTICIPANT
                      </span>

                      <h3>
                        {item.nickname}
                        <small>
                          さん
                        </small>
                      </h3>

                    </div>

                    {/* INFORMATION */}

                    <div className="staffHistoryInfo">

                      <div>

                        <span>
                          学籍番号
                        </span>

                        <strong>
                          {item.studentNumber}
                        </strong>

                      </div>

                      <div>

                        <span>
                          学年
                        </span>

                        <strong>
                          {item.grade}
                        </strong>

                      </div>

                      <div>

                        <span>
                          学科
                        </span>

                        <strong>
                          {item.department}
                        </strong>

                      </div>

                    </div>

                    {/* TIME */}

                    <div className="staffHistoryTime">

                      <span>
                        EXCHANGED AT
                      </span>

                      <strong>
                        {formatDate(
                          item.exchangedAt
                        )}
                      </strong>

                    </div>

                    {/* STAFF */}

                    {item.exchangedBy && (
                      <div className="staffHistoryStaff">

                        <span>
                          STAFF ID
                        </span>

                        <strong>
                          {item.exchangedBy.slice(
                            0,
                            8
                          )}
                          …
                        </strong>

                      </div>
                    )}

                  </article>
                )
              )}

            </div>
          )}

        {/* =================================
            MESSAGE
        ================================= */}

        {message && (
          <p className="staffMessage">
            {message}
          </p>
        )}

      </section>

    </main>
  );
}