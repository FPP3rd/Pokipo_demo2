"use client";

import {
  useEffect,
  useMemo,
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
  confirmation_code: string;
  status: string;
  created_at: string;
  exchanged_at: string | null;
  exchanged_by: string | null;
};

type Participant = {
  id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
};

type StaffProfile = {
  user_id: string;
  display_name: string;
};

type HistoryRow = {
  id: string;
  nickname: string;
  confirmationCode: string;
  grade: string | null;
  department: string | null;
  exchangedAt: string | null;
  exchangedBy: string | null;
  staffName: string;
};

/* ========================================
   PAGE
======================================== */

export default function RewardHistoryPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    exchanges,
    setExchanges,
  ] = useState<RewardExchange[]>(
    []
  );

  const [
    participants,
    setParticipants,
  ] = useState<Participant[]>(
    []
  );

  const [
    staffProfiles,
    setStaffProfiles,
  ] = useState<StaffProfile[]>(
    []
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  /* ========================================
     AUTH
  ======================================== */

  useEffect(() => {
    async function checkAuth() {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (
        error ||
        !data.session
      ) {
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

    void checkAuth();
  }, [
    router,
  ]);

  /* ========================================
     LOAD
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
        const {
          data:
            exchangeData,
          error:
            exchangeError,
        } =
          await supabase
            .from(
              "reward_exchanges"
            )
            .select(
              "id, participant_id, confirmation_code, status, created_at, exchanged_at, exchanged_by"
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
          exchangeError
        ) {
          console.error(
            "交換履歴取得エラー:",
            exchangeError
          );

          setMessage(
            "交換履歴を取得できませんでした。"
          );

          return;
        }

        const typedExchanges =
          (
            exchangeData ??
            []
          ) as RewardExchange[];

        const participantIds =
          Array.from(
            new Set(
              typedExchanges.map(
                (
                  item
                ) =>
                  item.participant_id
              )
            )
          );

        let participantData:
          Participant[] = [];

        if (
          participantIds.length >
          0
        ) {
          const {
            data,
            error,
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
            error
          ) {
            console.error(
              "参加者情報取得エラー:",
              error
            );
          } else {
            participantData =
              (
                data ??
                []
              ) as Participant[];
          }
        }

        const staffIds =
          Array.from(
            new Set(
              typedExchanges
                .map(
                  (
                    item
                  ) =>
                    item.exchanged_by
                )
                .filter(
                  (
                    value
                  ): value is string =>
                    Boolean(
                      value
                    )
                )
            )
          );

        let profileData:
          StaffProfile[] = [];

        if (
          staffIds.length >
          0
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "staff_profiles"
              )
              .select(
                "user_id, display_name"
              )
              .in(
                "user_id",
                staffIds
              );

          if (
            error
          ) {
            console.error(
              "管理者名取得エラー:",
              error
            );
          } else {
            profileData =
              (
                data ??
                []
              ) as StaffProfile[];
          }
        }

        setExchanges(
          typedExchanges
        );

        setParticipants(
          participantData
        );

        setStaffProfiles(
          profileData
        );
      } catch (
        error
      ) {
        console.error(
          "交換履歴通信エラー:",
          error
        );

        setMessage(
          "交換履歴の読み込み中にエラーが発生しました。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadHistory();
  }, [
    authenticated,
  ]);

  /* ========================================
     ROWS
  ======================================== */

  const historyRows =
    useMemo(
      () => {
        return exchanges.map(
          (
            exchange
          ): HistoryRow => {
            const participant =
              participants.find(
                (
                  item
                ) =>
                  item.id ===
                  exchange.participant_id
              );

            const staff =
              staffProfiles.find(
                (
                  item
                ) =>
                  item.user_id ===
                  exchange.exchanged_by
              );

            return {
              id:
                exchange.id,

              nickname:
                participant?.nickname ??
                "不明",

              confirmationCode:
                exchange.confirmation_code,

              grade:
                participant?.grade ??
                null,

              department:
                participant?.department ??
                null,

              exchangedAt:
                exchange.exchanged_at,

              exchangedBy:
                exchange.exchanged_by,

              staffName:
                staff?.display_name ??
                (
                  exchange.exchanged_by
                    ? "管理者名未登録"
                    : "不明"
                ),
            };
          }
        );
      },
      [
        exchanges,
        participants,
        staffProfiles,
      ]
    );

  /* ========================================
     SEARCH
  ======================================== */

  const filteredRows =
    useMemo(
      () => {
        const keyword =
          searchText
            .trim()
            .toLowerCase();

        if (
          !keyword
        ) {
          return historyRows;
        }

        return historyRows.filter(
          (
            row
          ) =>
            [
              row.nickname,
              row.confirmationCode,
              row.grade ?? "",
              row.department ?? "",
              row.staffName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                keyword
              )
        );
      },
      [
        historyRows,
        searchText,
      ]
    );

  /* ========================================
     DATE
  ======================================== */

  function formatDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "日時不明";
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
     LOADING
  ======================================== */

  if (
    authLoading
  ) {
    return (
      <main className="shell">

        <section className="staffRewardHistoryPage">

          <div className="staffLoadingCard">
            管理者情報を確認中...
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

      <section className="staffRewardHistoryPage">

        <header className="staffRewardHistoryHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              景品交換履歴
            </h1>

            <p>
              景品交換日時・確認番号・担当管理者を確認できます。
            </p>

          </div>

          <div className="staffRewardHistoryHeaderActions">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/staff/reward"
                )
              }
            >
              景品交換へ
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/staff"
                )
              }
            >
              メニュー
            </button>

          </div>

        </header>

        <section className="staffRewardHistorySummary">

          <article>

            <span>
              TOTAL
            </span>

            <strong>
              {loading
                ? "—"
                : historyRows.length}
            </strong>

            <p>
              交換済み件数
            </p>

          </article>

          <article>

            <span>
              STAFF
            </span>

            <strong>
              {
                new Set(
                  historyRows
                    .map(
                      (
                        row
                      ) =>
                        row.staffName
                    )
                    .filter(
                      (
                        name
                      ) =>
                        name !==
                        "不明"
                    )
                ).size
              }
            </strong>

            <p>
              担当管理者数
            </p>

          </article>

        </section>

        <section className="staffRewardHistorySearch">

          <label htmlFor="rewardHistorySearch">
            履歴検索
          </label>

          <input
            id="rewardHistorySearch"
            type="search"
            value={
              searchText
            }
            onChange={(
              event
            ) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="名前・確認番号・担当管理者で検索"
          />

        </section>

        {message && (
          <p className="staffRewardHistoryMessage">
            {message}
          </p>
        )}

        <section className="staffRewardHistoryList">

          {loading ? (
            <div className="staffRewardHistoryEmpty">
              交換履歴を読み込み中...
            </div>
          ) : filteredRows.length ===
            0 ? (
            <div className="staffRewardHistoryEmpty">

              {searchText
                ? "検索条件に一致する交換履歴はありません。"
                : "まだ景品交換履歴はありません。"}

            </div>
          ) : (
            filteredRows.map(
              (
                row,
                index
              ) => (
                <article
                  key={
                    row.id
                  }
                  className="staffRewardHistoryCard"
                >

                  <div className="staffRewardHistoryCardTop">

                    <div>

                      <span>
                        EXCHANGE #{historyRows.length - index}
                      </span>

                      <h2>
                        {row.nickname}
                        <small>
                          さん
                        </small>
                      </h2>

                    </div>

                    <div className="staffRewardHistoryStatus">
                      交換済み
                    </div>

                  </div>

                  <div className="staffRewardHistoryInfo">

                    <div>

                      <span>
                        確認番号
                      </span>

                      <strong>
                        {row.confirmationCode}
                      </strong>

                    </div>

                    <div>

                      <span>
                        学年
                      </span>

                      <strong>
                        {row.grade ??
                          "未設定"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        学科
                      </span>

                      <strong>
                        {row.department ??
                          "未設定"}
                      </strong>

                    </div>

                  </div>

                  <div className="staffRewardHistoryMeta">

                    <div>

                      <span>
                        交換日時
                      </span>

                      <strong>
                        {formatDate(
                          row.exchangedAt
                        )}
                      </strong>

                    </div>

                    <div className="staffRewardHistoryStaff">

                      <span>
                        交換担当者
                      </span>

                      <strong>
                        {row.staffName}
                      </strong>

                    </div>

                  </div>

                </article>
              )
            )
          )}

        </section>

      </section>

    </main>
  );
}