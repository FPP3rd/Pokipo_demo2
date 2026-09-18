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
} from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type PreSurvey = {
  id: string;
  participant_id: string;
  gender: string | null;
  pocky_frequency: string | null;
  knew_renewal: boolean | null;
  has_shared_pocky: boolean | null;
  share_situation: string | null;
  interest_score: number | null;
  eat_intent_score: number | null;
  share_intent_score: number | null;
  created_at: string;
};

type PostSurvey = {
  id: string;
  participant_id: string;
  interest_score: number | null;
  eat_intent_score: number | null;
  share_intent_score: number | null;
  renewal_understanding_score:
    number | null;
  memorable_point: string | null;
  created_at: string;
};

type Participant = {
  id: string;
  nickname: string;
  grade: string | null;
  department: string | null;
};

type ComparisonRow = {
  participantId: string;
  nickname: string;
  grade: string | null;
  department: string | null;

  gender: string | null;
  frequency: string | null;
  knewRenewal: boolean | null;
  hasShared: boolean | null;

  preInterest: number | null;
  postInterest: number | null;

  preEat: number | null;
  postEat: number | null;

  preShare: number | null;
  postShare: number | null;

  renewalUnderstanding:
    number | null;

  memorablePoint:
    string | null;
};

/* ========================================
   PAGE
======================================== */

export default function StaffSurveysPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    participants,
    setParticipants,
  ] =
    useState<Participant[]>(
      []
    );

  const [
    preSurveys,
    setPreSurveys,
  ] =
    useState<PreSurvey[]>(
      []
    );

  const [
    postSurveys,
    setPostSurveys,
  ] =
    useState<PostSurvey[]>(
      []
    );

  /* ========================================
     FILTERS
  ======================================== */

  const [
    genderFilter,
    setGenderFilter,
  ] = useState("all");

  const [
    frequencyFilter,
    setFrequencyFilter,
  ] = useState("all");

  const [
    renewalFilter,
    setRenewalFilter,
  ] = useState("all");

  const [
    shareFilter,
    setShareFilter,
  ] = useState("all");

  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    async function loadData() {
      setLoading(
        true
      );

      setMessage("");

      try {
        const {
          data:
            sessionData,
        } =
          await supabase.auth.getSession();

        if (
          !sessionData.session
        ) {
          router.replace(
            "/staff/reward"
          );

          return;
        }

        const [
          participantResult,
          preResult,
          postResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "participants"
              )
              .select(
                "id, nickname, grade, department"
              ),

            supabase
              .from(
                "pokipo_pre_surveys"
              )
              .select(
                "id, participant_id, gender, pocky_frequency, knew_renewal, has_shared_pocky, share_situation, interest_score, eat_intent_score, share_intent_score, created_at"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "pokipo_post_surveys"
              )
              .select(
                "id, participant_id, interest_score, eat_intent_score, share_intent_score, renewal_understanding_score, memorable_point, created_at"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          participantResult.error
        ) {
          console.error(
            "参加者取得エラー:",
            participantResult.error
          );
        }

        if (
          preResult.error
        ) {
          console.error(
            "参加前アンケート取得エラー:",
            preResult.error
          );
        }

        if (
          postResult.error
        ) {
          console.error(
            "参加後アンケート取得エラー:",
            postResult.error
          );
        }

        setParticipants(
          (
            participantResult.data ??
            []
          ) as Participant[]
        );

        setPreSurveys(
          (
            preResult.data ??
            []
          ) as PreSurvey[]
        );

        setPostSurveys(
          (
            postResult.data ??
            []
          ) as PostSurvey[]
        );
      } catch (
        error
      ) {
        console.error(
          "アンケート分析読み込みエラー:",
          error
        );

        setMessage(
          "アンケートデータを読み込めませんでした。"
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    void loadData();
  }, [
    router,
  ]);

  /* ========================================
     LATEST DATA
  ======================================== */

  const latestPreMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            PreSurvey
          >();

        for (
          const survey
          of preSurveys
        ) {
          if (
            !map.has(
              survey.participant_id
            )
          ) {
            map.set(
              survey.participant_id,
              survey
            );
          }
        }

        return map;
      },
      [
        preSurveys,
      ]
    );

  const latestPostMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            PostSurvey
          >();

        for (
          const survey
          of postSurveys
        ) {
          if (
            !map.has(
              survey.participant_id
            )
          ) {
            map.set(
              survey.participant_id,
              survey
            );
          }
        }

        return map;
      },
      [
        postSurveys,
      ]
    );

  /* ========================================
     COMPARISON
  ======================================== */

  const comparisonRows =
    useMemo(
      () => {
        return participants
          .map(
            (
              participant
            ): ComparisonRow | null => {
              const pre =
                latestPreMap.get(
                  participant.id
                );

              const post =
                latestPostMap.get(
                  participant.id
                );

              if (
                !pre
              ) {
                return null;
              }

              return {
                participantId:
                  participant.id,

                nickname:
                  participant.nickname,

                grade:
                  participant.grade,

                department:
                  participant.department,

                gender:
                  pre.gender,

                frequency:
                  pre.pocky_frequency,

                knewRenewal:
                  pre.knew_renewal,

                hasShared:
                  pre.has_shared_pocky,

                preInterest:
                  pre.interest_score,

                postInterest:
                  post?.interest_score ??
                  null,

                preEat:
                  pre.eat_intent_score,

                postEat:
                  post?.eat_intent_score ??
                  null,

                preShare:
                  pre.share_intent_score,

                postShare:
                  post?.share_intent_score ??
                  null,

                renewalUnderstanding:
                  post?.renewal_understanding_score ??
                  null,

                memorablePoint:
                  post?.memorable_point ??
                  null,
              };
            }
          )
          .filter(
            (
              row
            ): row is ComparisonRow =>
              row !==
              null
          );
      },
      [
        participants,
        latestPreMap,
        latestPostMap,
      ]
    );

  /* ========================================
     FILTERED
  ======================================== */

  const filteredRows =
    useMemo(
      () => {
        return comparisonRows.filter(
          (
            row
          ) => {
            if (
              genderFilter !==
                "all" &&
              row.gender !==
                genderFilter
            ) {
              return false;
            }

            if (
              frequencyFilter !==
                "all" &&
              row.frequency !==
                frequencyFilter
            ) {
              return false;
            }

            if (
              renewalFilter ===
                "yes" &&
              row.knewRenewal !==
                true
            ) {
              return false;
            }

            if (
              renewalFilter ===
                "no" &&
              row.knewRenewal !==
                false
            ) {
              return false;
            }

            if (
              shareFilter ===
                "yes" &&
              row.hasShared !==
                true
            ) {
              return false;
            }

            if (
              shareFilter ===
                "no" &&
              row.hasShared !==
                false
            ) {
              return false;
            }

            return true;
          }
        );
      },
      [
        comparisonRows,
        genderFilter,
        frequencyFilter,
        renewalFilter,
        shareFilter,
      ]
    );

  /* ========================================
     HELPERS
  ======================================== */

  function average(
    values:
      (
        | number
        | null
      )[]
  ) {
    const valid =
      values.filter(
        (
          value
        ): value is number =>
          typeof value ===
          "number"
      );

    if (
      valid.length ===
      0
    ) {
      return null;
    }

    return (
      valid.reduce(
        (
          total,
          value
        ) =>
          total +
          value,
        0
      ) /
      valid.length
    );
  }

  function formatAverage(
    value:
      number | null
  ) {
    if (
      value ===
      null
    ) {
      return "—";
    }

    return value.toFixed(
      2
    );
  }

  function diff(
    before:
      number | null,
    after:
      number | null
  ) {
    if (
      before ===
        null ||
      after ===
        null
    ) {
      return null;
    }

    return (
      after -
      before
    );
  }

  function formatDiff(
    value:
      number | null
  ) {
    if (
      value ===
      null
    ) {
      return "—";
    }

    if (
      value >
      0
    ) {
      return `+${value.toFixed(
        2
      )}`;
    }

    return value.toFixed(
      2
    );
  }

  function getChangeLabel(
    before:
      number | null,
    after:
      number | null
  ) {
    if (
      before ===
        null ||
      after ===
        null
    ) {
      return "未回答";
    }

    if (
      after >
      before
    ) {
      return "改善";
    }

    if (
      after <
      before
    ) {
      return "低下";
    }

    return "変化なし";
  }

  /* ========================================
     METRICS
  ======================================== */

  const comparisonCompleteRows =
    filteredRows.filter(
      (
        row
      ) =>
        row.postInterest !==
        null &&
        row.postEat !==
        null &&
        row.postShare !==
        null
    );

  const preInterestAverage =
    average(
      filteredRows.map(
        (
          row
        ) =>
          row.preInterest
      )
    );

  const postInterestAverage =
    average(
      comparisonCompleteRows.map(
        (
          row
        ) =>
          row.postInterest
      )
    );

  const preEatAverage =
    average(
      filteredRows.map(
        (
          row
        ) =>
          row.preEat
      )
    );

  const postEatAverage =
    average(
      comparisonCompleteRows.map(
        (
          row
        ) =>
          row.postEat
      )
    );

  const preShareAverage =
    average(
      filteredRows.map(
        (
          row
        ) =>
          row.preShare
      )
    );

  const postShareAverage =
    average(
      comparisonCompleteRows.map(
        (
          row
        ) =>
          row.postShare
      )
    );

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">

      <section className="staffSurveyPage">

        <header className="staffSurveyHeader">

          <div>

            <span>
              POKIPO ANALYTICS
            </span>

            <h1>
              アンケート分析
            </h1>

            <p>
              POKIPO参加前後の
              意識変化を確認できます。
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff"
              )
            }
          >
            メニューへ戻る
          </button>

        </header>

        {/* SUMMARY */}

        <section className="staffSurveySummary">

          <article>

            <span>
              BEFORE
            </span>

            <strong>
              {
                latestPreMap.size
              }
            </strong>

            <p>
              参加前回答
            </p>

          </article>

          <article>

            <span>
              AFTER
            </span>

            <strong>
              {
                latestPostMap.size
              }
            </strong>

            <p>
              参加後回答
            </p>

          </article>

          <article>

            <span>
              COMPARE
            </span>

            <strong>
              {
                comparisonCompleteRows.length
              }
            </strong>

            <p>
              前後比較可能
            </p>

          </article>

          <article>

            <span>
              FILTERED
            </span>

            <strong>
              {
                filteredRows.length
              }
            </strong>

            <p>
              現在の分析対象
            </p>

          </article>

        </section>

        {/* FILTER */}

        <section className="staffSurveyFilters">

          <div>

            <label>
              性別
            </label>

            <select
              value={
                genderFilter
              }
              onChange={(
                event
              ) =>
                setGenderFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                すべて
              </option>

              <option value="男性">
                男性
              </option>

              <option value="女性">
                女性
              </option>

              <option value="回答しない">
                回答しない
              </option>

            </select>

          </div>

          <div>

            <label>
              食べる頻度
            </label>

            <select
              value={
                frequencyFilter
              }
              onChange={(
                event
              ) =>
                setFrequencyFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                すべて
              </option>

              <option value="毎日食べる">
                毎日食べる
              </option>

              <option value="週1回">
                週1回
              </option>

              <option value="月1〜2回">
                月1〜2回
              </option>

              <option value="半年に1回">
                半年に1回
              </option>

              <option value="食べない">
                食べない
              </option>

            </select>

          </div>

          <div>

            <label>
              リニューアル認知
            </label>

            <select
              value={
                renewalFilter
              }
              onChange={(
                event
              ) =>
                setRenewalFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                すべて
              </option>

              <option value="yes">
                知っていた
              </option>

              <option value="no">
                知らなかった
              </option>

            </select>

          </div>

          <div>

            <label>
              シェア経験
            </label>

            <select
              value={
                shareFilter
              }
              onChange={(
                event
              ) =>
                setShareFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                すべて
              </option>

              <option value="yes">
                あり
              </option>

              <option value="no">
                なし
              </option>

            </select>

          </div>

          <button
            type="button"
            onClick={() => {
              setGenderFilter(
                "all"
              );

              setFrequencyFilter(
                "all"
              );

              setRenewalFilter(
                "all"
              );

              setShareFilter(
                "all"
              );
            }}
          >
            フィルター解除
          </button>

        </section>

        {/* METRICS */}

        <section className="staffSurveyMetricGrid">

          <article>

            <span>
              INTEREST
            </span>

            <h2>
              ポッキーへの興味
            </h2>

            <div>

              <p>
                参加前
                <strong>
                  {formatAverage(
                    preInterestAverage
                  )}
                </strong>
              </p>

              <p>
                参加後
                <strong>
                  {formatAverage(
                    postInterestAverage
                  )}
                </strong>
              </p>

            </div>

            <b>
              前後差：
              {formatDiff(
                diff(
                  preInterestAverage,
                  postInterestAverage
                )
              )}
            </b>

          </article>

          <article>

            <span>
              EAT INTENT
            </span>

            <h2>
              食べたい気持ち
            </h2>

            <div>

              <p>
                参加前
                <strong>
                  {formatAverage(
                    preEatAverage
                  )}
                </strong>
              </p>

              <p>
                参加後
                <strong>
                  {formatAverage(
                    postEatAverage
                  )}
                </strong>
              </p>

            </div>

            <b>
              前後差：
              {formatDiff(
                diff(
                  preEatAverage,
                  postEatAverage
                )
              )}
            </b>

          </article>

          <article>

            <span>
              SHARE INTENT
            </span>

            <h2>
              シェア意向
            </h2>

            <div>

              <p>
                参加前
                <strong>
                  {formatAverage(
                    preShareAverage
                  )}
                </strong>
              </p>

              <p>
                参加後
                <strong>
                  {formatAverage(
                    postShareAverage
                  )}
                </strong>
              </p>

            </div>

            <b>
              前後差：
              {formatDiff(
                diff(
                  preShareAverage,
                  postShareAverage
                )
              )}
            </b>

          </article>

        </section>

        {/* PARTICIPANTS */}

        <section className="staffSurveyComparison">

          <div className="staffSurveySectionTitle">

            <span>
              INDIVIDUAL
            </span>

            <h2>
              一人ひとりの前後比較
            </h2>

          </div>

          {loading ? (
            <div className="staffSurveyEmpty">
              読み込み中...
            </div>
          ) : filteredRows.length ===
            0 ? (
            <div className="staffSurveyEmpty">
              対象となる回答がありません。
            </div>
          ) : (
            <div className="staffSurveyComparisonList">

              {filteredRows.map(
                (
                  row
                ) => (
                  <article
                    key={
                      row.participantId
                    }
                    className="staffSurveyPersonCard"
                  >

                    <div className="staffSurveyPersonHeader">

                      <div>

                        <span>
                          PARTICIPANT
                        </span>

                        <h3>
                          {row.nickname}
                        </h3>

                        <p>
                          {row.grade ??
                            "学年未設定"}
                          {" / "}
                          {row.department ??
                            "学科未設定"}
                        </p>

                      </div>

                      <div>
                        {row.postInterest ===
                        null
                          ? "参加後未回答"
                          : "前後回答済"}
                      </div>

                    </div>

                    <div className="staffSurveyPersonMetrics">

                      <div>

                        <span>
                          興味
                        </span>

                        <strong>
                          {row.preInterest ??
                            "—"}
                          →
                          {row.postInterest ??
                            "—"}
                        </strong>

                        <small>
                          {getChangeLabel(
                            row.preInterest,
                            row.postInterest
                          )}
                        </small>

                      </div>

                      <div>

                        <span>
                          食べたい
                        </span>

                        <strong>
                          {row.preEat ??
                            "—"}
                          →
                          {row.postEat ??
                            "—"}
                        </strong>

                        <small>
                          {getChangeLabel(
                            row.preEat,
                            row.postEat
                          )}
                        </small>

                      </div>

                      <div>

                        <span>
                          シェア
                        </span>

                        <strong>
                          {row.preShare ??
                            "—"}
                          →
                          {row.postShare ??
                            "—"}
                        </strong>

                        <small>
                          {getChangeLabel(
                            row.preShare,
                            row.postShare
                          )}
                        </small>

                      </div>

                    </div>

                    {row.renewalUnderstanding !==
                      null && (
                      <div className="staffSurveyUnderstanding">

                        <span>
                          リニューアル理解度
                        </span>

                        <strong>
                          {row.renewalUnderstanding}
                          /4
                        </strong>

                      </div>
                    )}

                    {row.memorablePoint && (
                      <div className="staffSurveyComment">

                        <span>
                          印象に残ったこと
                        </span>

                        <p>
                          {row.memorablePoint}
                        </p>

                      </div>
                    )}

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {message && (
          <p className="staffSurveyMessage">
            {message}
          </p>
        )}

      </section>

    </main>
  );
}