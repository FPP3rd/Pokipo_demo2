
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type TestSession = {
  staff_user_id: string;
  nickname: string;
  grade: string;
  department: string;
  pre_survey: unknown;
  post_survey: unknown;
  reward_status: string;
  completed_at: string | null;
};

type TestStamp = {
  spot_id: string;
  acquired_at: string;
};

/* ========================================
   CONFIG
======================================== */

const SPOTS = [
  { id: "spot1", label: "スポット 1" },
  { id: "spot2", label: "スポット 2" },
  { id: "spot3", label: "スポット 3" },
  { id: "spot4", label: "スポット 4" },
  { id: "spot5", label: "スポット 5" },
];

function getRewardLabel(status: string) {
  if (status === "exchanged") return "交換済み";
  if (status === "issued") return "QR発行済み";
  return "未発行";
}

/* ========================================
   PAGE
======================================== */

export default function StaffTestPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [staffName, setStaffName] = useState("");
  const [session, setSession] =
    useState<TestSession | null>(null);
  const [stamps, setStamps] = useState<TestStamp[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* ========================================
     STAFF AUTHENTICATION
  ======================================== */

  const verifyStaff = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error("スタッフログインが必要です。");
    }

    const { data: staff, error: staffError } =
      await supabase
        .from("staff_profiles")
        .select("display_name")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (staffError || !staff) {
      throw new Error("管理者権限がありません。");
    }

    return {
      staffId: data.user.id,
      name: staff.display_name ?? "LiPostスタッフ",
    };
  }, []);

  /* ========================================
     LOAD TEST DATA
  ======================================== */

  const loadTestData = useCallback(async () => {
    const { staffId, name } = await verifyStaff();

    setStaffName(name);

    const { data: existing, error: findError } =
      await supabase
        .from("pokipo_test_sessions")
        .select("staff_user_id")
        .eq("staff_user_id", staffId)
        .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (!existing) {
      const { error: insertError } = await supabase
        .from("pokipo_test_sessions")
        .insert({
          staff_user_id: staffId,
          nickname: "LiPost動作確認",
          grade: "3年",
          department: "検証用",
        });

      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    }

    // 検証専用テーブルのみ読み込む
    const [
      sessionResult,
      stampsResult,
      knowledgeResult,
    ] = await Promise.all([
      supabase
        .from("pokipo_test_sessions")
        .select(
          "staff_user_id,nickname,grade,department,pre_survey,post_survey,reward_status,completed_at"
        )
        .eq("staff_user_id", staffId)
        .single(),

      supabase
        .from("pokipo_test_stamps")
        .select("spot_id,acquired_at")
        .eq("staff_user_id", staffId)
        .order("acquired_at", {
          ascending: true,
        }),

      supabase
        .from("pokipo_test_knowledge")
        .select("knowledge_id")
        .eq("staff_user_id", staffId),
    ]);

    if (sessionResult.error) {
      throw new Error(sessionResult.error.message);
    }

    if (stampsResult.error) {
      throw new Error(stampsResult.error.message);
    }

    if (knowledgeResult.error) {
      throw new Error(knowledgeResult.error.message);
    }

    setSession(sessionResult.data as TestSession);
    setStamps((stampsResult.data ?? []) as TestStamp[]);
    setKnowledgeCount(knowledgeResult.data?.length ?? 0);
  }, [verifyStaff]);

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await loadTestData();
      } catch (error) {
        console.error("動作確認初期化エラー:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "動作確認データを読み込めませんでした。"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadTestData]);

  /* ========================================
     REFRESH
  ======================================== */

  async function refresh() {
    if (refreshing || resetting) return;

    setRefreshing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await loadTestData();
      setSuccessMessage("最新の検証データを取得しました。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "データを更新できませんでした。"
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ========================================
     RESET TEST DATA
  ======================================== */

  async function resetTestData() {
    if (resetting || refreshing || !session) return;

    const confirmed = window.confirm(
      "動作確認データを初期化しますか？\n\n" +
        "以下の検証用データを削除・初期化します。\n" +
        "・スタンプ5か所\n" +
        "・取得した豆知識\n" +
        "・参加前・参加後アンケート\n" +
        "・完走記録\n" +
        "・検証用特典QRと交換状態\n\n" +
        "本番の参加者データには触れません。"
    );

    if (!confirmed) return;

    setResetting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { staffId } = await verifyStaff();

      if (staffId !== session.staff_user_id) {
        throw new Error(
          "ログインしているスタッフが変更されました。"
        );
      }

      const { error: stampError } = await supabase
        .from("pokipo_test_stamps")
        .delete()
        .eq("staff_user_id", staffId);

      if (stampError) {
        throw new Error(
          `スタンプ初期化エラー: ${stampError.message}`
        );
      }

      const { error: knowledgeError } = await supabase
        .from("pokipo_test_knowledge")
        .delete()
        .eq("staff_user_id", staffId);

      if (knowledgeError) {
        throw new Error(
          `豆知識初期化エラー: ${knowledgeError.message}`
        );
      }

      const {
        data: updatedSession,
        error: sessionError,
      } = await supabase
        .from("pokipo_test_sessions")
        .update({
          pre_survey: null,
          post_survey: null,
          reward_token: null,
          reward_confirmation_code: null,
          reward_status: "not_issued",
          reward_exchanged_at: null,
          completed_at: null,
          achievement_rank: null,
          secret_stamp: false,
          updated_at: new Date().toISOString(),
        })
        .eq("staff_user_id", staffId)
        .select("staff_user_id")
        .single();

      if (sessionError || !updatedSession) {
        throw new Error(
          `セッション初期化エラー: ${
            sessionError?.message ??
            "更新対象がありません"
          }`
        );
      }

      await loadTestData();

      setSuccessMessage(
        "検証データを初期化しました。スタンプ0/5から再開できます。"
      );
    } catch (error) {
      console.error("動作確認リセットエラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "初期化に失敗しました。"
      );

      try {
        await loadTestData();
      } catch (refreshError) {
        console.error(
          "リセット後の再取得エラー:",
          refreshError
        );
      }
    } finally {
      setResetting(false);
    }
  }

  /* ========================================
     STATUS
  ======================================== */

  const stampIds = new Set(
    stamps.map((stamp) => stamp.spot_id)
  );

  const progress = Math.min(stampIds.size, 5);
  const progressPercent = (progress / 5) * 100;

  const preCompleted = Boolean(session?.pre_survey);
  const postCompleted = Boolean(session?.post_survey);
  const allStampsCompleted = progress === 5;
  const rewardIssued =
    session?.reward_status === "issued" ||
    session?.reward_status === "exchanged";
  const rewardExchanged =
    session?.reward_status === "exchanged";

  const busy = refreshing || resetting;

  const steps = [
    {
      title: "参加前アンケート",
      done: preCompleted,
    },
    {
      title: "スタンプ5か所",
      done: allStampsCompleted,
    },
    {
      title: "参加後アンケート",
      done: postCompleted,
    },
    {
      title: "特典QR発行",
      done: rewardIssued,
    },
    {
      title: "景品交換確認",
      done: rewardExchanged,
    },
  ];

  const completedSteps =
    steps.filter((step) => step.done).length;

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="shell">
        <div className="testLoading">
          <span className="testLoadingMark">P</span>
          <strong>POKIPO 動作確認</strong>
          <p>管理者認証と検証データを確認中...</p>
        </div>

        <style jsx>{`
          .testLoading {
            min-height: 65vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-align: center;
            color: #413936;
          }
          .testLoadingMark {
            display: grid;
            place-items: center;
            width: 64px;
            height: 64px;
            background: #b72838;
            color: white;
            border-radius: 20px;
            font-size: 32px;
            font-weight: 900;
          }
          .testLoading p {
            color: #827672;
            font-size: 13px;
          }
        `}</style>
      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <main className="shell">
      <div className="testPage">

        {/* HEADER */}
        <header className="testHeader">
          <div className="testTopLine">
            <span className="testEyebrow">
              POKIPO / STAFF TESTING
            </span>
            <span className="testModeTag">
              検証専用
            </span>
          </div>

          <h1>POKIPO動作確認</h1>

          <p className="testHeaderDescription">
            スタンプラリーから特典交換まで、
            一連の操作を確認できます。
          </p>

          <div className="testSafetyNote">
            <span className="testSafetyIcon">✓</span>
            <div>
              <strong>本番データとは分離されています</strong>
              <p>
                この画面の操作は検証専用データに保存されます。
              </p>
            </div>
          </div>
        </header>

        {/* MESSAGES */}
        {errorMessage && (
          <div className="testAlert error" role="alert">
            <strong>エラーが発生しました</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="testAlert success" role="status">
            {successMessage}
          </div>
        )}

        {/* STAFF INFO */}
        {session && (
          <section className="testAccount">
            <div className="testAvatar">
              LP
            </div>

            <div className="testAccountText">
              <span>LOGIN STAFF</span>
              <strong>{staffName}</strong>
              <small>
                {session.nickname} ／ {session.grade}・
                {session.department}
              </small>
            </div>

            <div className="testOnlineDot" title="ログイン中" />
          </section>
        )}

        {session && (
          <>
            {/* MAIN PROGRESS */}
            <section className="testPanel testProgressPanel">
              <div className="testSectionTop">
                <div>
                  <span className="testSectionLabel">
                    STAMP PROGRESS
                  </span>
                  <h2>スタンプ取得状況</h2>
                </div>
                <span className="testProgressNumber">
                  {progress}<small> / 5</small>
                </span>
              </div>

              <div
                className="testProgressTrack"
                role="progressbar"
                aria-label="スタンプ取得進捗"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={5}
              >
                <div
                  className="testProgressFill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="testProgressDescription">
                {allStampsCompleted
                  ? "5か所すべてのスタンプを獲得しました！"
                  : `あと${5 - progress}か所でコンプリートです。`}
              </p>

              <div className="testSpotGrid">
                {SPOTS.map((spot) => {
                  const collected = stampIds.has(spot.id);

                  return (
                    <div
                      key={spot.id}
                      className={
                        collected
                          ? "testSpot acquired"
                          : "testSpot"
                      }
                      title={spot.label}
                    >
                      <span className="testSpotCircle">
                        {collected
                          ? "✓"
                          : spot.id.slice(-1)}
                      </span>
                      <small>
                        {spot.label}
                      </small>
                    </div>
                  );
                })}
              </div>

              <div className="testKnowledgeRow">
                <span>獲得した豆知識</span>
                <strong>{knowledgeCount} / 5</strong>
              </div>
            </section>

            {/* OVERALL STATUS */}
            <section className="testPanel">
              <div className="testSectionTop">
                <div>
                  <span className="testSectionLabel">
                    TEST OVERVIEW
                  </span>
                  <h2>動作確認の進行状況</h2>
                </div>

                <span className="testStepCounter">
                  {completedSteps} / 5
                </span>
              </div>

              <div className="testStepList">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="testStepRow"
                  >
                    <span
                      className={
                        step.done
                          ? "testStepIcon done"
                          : "testStepIcon"
                      }
                    >
                      {step.done ? "✓" : index + 1}
                    </span>

                    <span className="testStepTitle">
                      {step.title}
                    </span>

                    <span
                      className={
                        step.done
                          ? "testStepStatus done"
                          : "testStepStatus"
                      }
                    >
                      {step.done ? "完了" : "未完了"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="testRewardSummary">
                <span>現在の景品交換状態</span>
                <strong>
                  {getRewardLabel(session.reward_status)}
                </strong>
              </div>
            </section>

            {/* MENU INTRO */}
            <div className="testMenuHeading">
              <span className="testSectionLabel">
                TEST OPERATIONS
              </span>
              <h2>動作確認メニュー</h2>
              <p>
                確認したい項目を選択してください。
                進行状況は各画面から戻った後に更新できます。
              </p>
            </div>

            {/* BEFORE SURVEY */}
            <section className="testActionPanel">
              <div className="testActionTop">
                <div className="testActionIcon">
                  01
                </div>

                <div className="testActionHeading">
                  <span>BEFORE SURVEY</span>
                  <h3>参加前アンケート</h3>
                </div>

                <span
                  className={
                    preCompleted
                      ? "testActionStatus done"
                      : "testActionStatus"
                  }
                >
                  {preCompleted ? "回答済み" : "未回答"}
                </span>
              </div>

              <p className="testActionDescription">
                参加者の初期アンケートと回答データの保存を確認します。
              </p>

              <button
                type="button"
                className="testPrimaryButton"
                disabled={busy}
                onClick={() =>
                  router.push("/staff/test/survey/before")
                }
              >
                <span>
                  {preCompleted
                    ? "参加前アンケートを再確認"
                    : "参加前アンケートを確認"}
                </span>
                <span>→</span>
              </button>
            </section>

            {/* STAMP TEST */}
            <section className="testActionPanel">
              <div className="testActionTop">
                <div className="testActionIcon">
                  02
                </div>

                <div className="testActionHeading">
                  <span>STAMP RALLY</span>
                  <h3>スタンプラリー</h3>
                </div>

                <span
                  className={
                    allStampsCompleted
                      ? "testActionStatus done"
                      : "testActionStatus"
                  }
                >
                  {progress} / 5
                </span>
              </div>

              <p className="testActionDescription">
                実際のスポットQRを使用して、
                スタンプ取得・クイズ・豆知識の動作を確認します。
              </p>

              <button
                type="button"
                className="testPrimaryButton"
                disabled={busy}
                onClick={() =>
                  router.push("/staff/test/stamp")
                }
              >
                <span>QR読み取り・スタンプ確認</span>
                <span>→</span>
              </button>
            </section>

            {/* AFTER SURVEY */}
            <section className="testActionPanel">
              <div className="testActionTop">
                <div className="testActionIcon">
                  03
                </div>

                <div className="testActionHeading">
                  <span>AFTER SURVEY</span>
                  <h3>参加後アンケート</h3>
                </div>

                <span
                  className={
                    postCompleted
                      ? "testActionStatus done"
                      : "testActionStatus"
                  }
                >
                  {postCompleted ? "回答済み" : "未回答"}
                </span>
              </div>

              <p className="testActionDescription">
                参加後のアンケート入力と回答保存を確認します。
              </p>

              <button
                type="button"
                className="testPrimaryButton"
                disabled={busy || !preCompleted}
                onClick={() =>
                  router.push("/staff/test/survey/after")
                }
              >
                <span>
                  {postCompleted
                    ? "参加後アンケートを再確認"
                    : "参加後アンケートを確認"}
                </span>
                <span>→</span>
              </button>

              {!preCompleted && (
                <p className="testHint">
                  参加前アンケート回答後に利用できます。
                </p>
              )}
            </section>

            {/* REWARD TEST */}
            <section className="testActionPanel">
              <div className="testActionTop">
                <div className="testActionIcon">
                  04
                </div>

                <div className="testActionHeading">
                  <span>REWARD EXCHANGE</span>
                  <h3>特典交換</h3>
                </div>

                <span
                  className={
                    rewardExchanged
                      ? "testActionStatus done"
                      : "testActionStatus"
                  }
                >
                  {getRewardLabel(session.reward_status)}
                </span>
              </div>

              <p className="testActionDescription">
                検証用の特典QRを発行し、読み取りから
                交換確定までの流れを確認します。
              </p>

              <div className="testButtonStack">
                <button
                  type="button"
                  className="testPrimaryButton"
                  disabled={busy}
                  onClick={() =>
                    router.push("/staff/test/reward")
                  }
                >
                  <span>特典QRを発行・確認する</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  className="testOutlineButton"
                  disabled={busy}
                  onClick={() =>
                    router.push("/staff/test/reward/scan")
                  }
                >
                  <span>検証用QRを読み取る</span>
                  <span>→</span>
                </button>
              </div>

              <p className="testHint">
                QR発行には5か所達成と参加後アンケートの
                回答が必要です。本番の交換履歴やモニターには
                反映されません。
              </p>
            </section>

            {/* RESET */}
            <section className="testResetPanel">
              <div className="testResetTop">
                <div className="testResetIcon">
                  ↺
                </div>
                <div>
                  <span>TEST DATA RESET</span>
                  <h3>動作確認を最初からやり直す</h3>
                </div>
              </div>

              <p>
                スタンプ・アンケート・豆知識・
                完走記録・特典交換状態を初期化します。
                本番データには影響しません。
              </p>

              <button
                type="button"
                className="testResetButton"
                disabled={busy}
                onClick={() => void resetTestData()}
              >
                {resetting
                  ? "検証データを初期化中..."
                  : "動作確認データをリセット"}
              </button>

              <small>
                ※ 実行前に確認画面が表示されます。
                リセットした検証データは元に戻せません。
              </small>
            </section>
          </>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="testBottomActions">
          <button
            type="button"
            className="testRefreshButton"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <span>↻</span>
            {refreshing
              ? "更新中..."
              : "検証データを更新"}
          </button>

          <button
            type="button"
            className="testBackButton"
            onClick={() => router.push("/staff")}
          >
            管理画面へ戻る
          </button>
        </div>

        <footer className="testFooter">
          POKIPO STAFF TESTING
          <p>
            検証専用テーブルのみ操作します。
            本番の参加者・スタンプ・アンケート・
            景品交換記録は変更しません。
          </p>
        </footer>

      </div>

      {/* ========================================
          PAGE-SCOPED CSS
          本番画面のCSSには影響しない
      ======================================== */}

      <style jsx>{`
        .testPage {
          --test-red: #b72838;
          --test-red-dark: #91212f;
          --test-text: #302b2a;
          --test-muted: #756e6b;
          --test-border: #e9e3df;
          --test-bg: #fffaf6;

          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          padding: 22px 0 64px;
          color: var(--test-text);
        }

        .testPage * {
          box-sizing: border-box;
        }

        .testHeader {
          padding: 27px 25px;
          background: linear-gradient(
            135deg,
            #ba2c3e 0%,
            #942333 100%
          );
          border-radius: 22px;
          color: white;
          margin-bottom: 17px;
          box-shadow: 0 8px 24px rgba(139, 26, 42, 0.13);
        }

        .testTopLine,
        .testSectionTop,
        .testActionTop,
        .testResetTop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .testTopLine {
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .testEyebrow,
        .testSectionLabel {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .testEyebrow {
          color: #ffe3df;
        }

        .testModeTag {
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.17);
          border: 1px solid rgba(255, 255, 255, 0.32);
          font-size: 11px;
          font-weight: 800;
        }

        .testHeader h1 {
          color: white;
          font-size: clamp(24px, 5vw, 32px);
          line-height: 1.35;
          letter-spacing: -0.025em;
          margin: 19px 0 9px;
        }

        .testHeaderDescription {
          font-size: 13px;
          line-height: 1.9;
          color: #fff0ed;
          margin: 0;
        }

        .testSafetyNote {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 22px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.23);
          background: rgba(255, 255, 255, 0.12);
          border-radius: 13px;
        }

        .testSafetyIcon {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: white;
          color: var(--test-red);
          font-size: 14px;
          font-weight: 900;
        }

        .testSafetyNote strong {
          display: block;
          color: white;
          font-size: 12px;
        }

        .testSafetyNote p {
          color: #ffe9e7;
          font-size: 11px;
          line-height: 1.7;
          margin: 4px 0 0;
        }

        .testAccount {
          display: flex;
          align-items: center;
          gap: 13px;
          border-radius: 16px;
          padding: 17px 19px;
          background: white;
          border: 1px solid var(--test-border);
          margin-bottom: 16px;
        }

        .testAvatar {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #fae8e8;
          color: var(--test-red);
          font-size: 16px;
          font-weight: 900;
        }

        .testAccountText {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          flex: 1;
        }

        .testAccountText span {
          color: var(--test-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .testAccountText strong {
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .testAccountText small {
          font-size: 11px;
          color: var(--test-muted);
          overflow-wrap: anywhere;
        }

        .testOnlineDot {
          width: 10px;
          height: 10px;
          background: #299565;
          border-radius: 50%;
          flex: 0 0 10px;
        }

        .testPanel,
        .testActionPanel {
          background: white;
          border: 1px solid var(--test-border);
          border-radius: 19px;
          padding: 23px;
          margin-bottom: 16px;
          box-shadow: 0 3px 14px rgba(51, 37, 31, 0.025);
        }

        .testProgressPanel {
          background: #fffefd;
        }

        .testSectionTop {
          justify-content: space-between;
          align-items: center;
        }

        .testSectionLabel {
          color: #a04b51;
        }

        .testSectionTop h2,
        .testMenuHeading h2 {
          font-size: 19px;
          letter-spacing: -0.025em;
          margin: 7px 0 0;
        }

        .testProgressNumber {
          color: var(--test-red);
          font-weight: 900;
          font-size: 35px;
          letter-spacing: -0.04em;
          white-space: nowrap;
        }

        .testProgressNumber small {
          color: #a19a95;
          font-size: 15px;
        }

        .testProgressTrack {
          height: 11px;
          overflow: hidden;
          border-radius: 999px;
          background: #f0e8e5;
          margin-top: 25px;
        }

        .testProgressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #db4e5a,
            #b72838
          );
          transition: width 350ms ease;
        }

        .testProgressDescription {
          color: var(--test-muted);
          font-size: 12px;
          line-height: 1.7;
          margin: 11px 0 23px;
        }

        .testSpotGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 9px;
        }

        .testSpot {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          text-align: center;
        }

        .testSpotCircle {
          display: grid;
          place-items: center;
          width: min(100%, 52px);
          aspect-ratio: 1;
          border-radius: 15px;
          background: #f4f1ee;
          color: #918782;
          border: 1px solid #e5dfda;
          font-weight: 850;
          font-size: 19px;
        }

        .testSpot.acquired .testSpotCircle {
          background: #e4f5eb;
          border-color: #a4ddbe;
          color: #20784d;
        }

        .testSpot small {
          font-size: 10px;
          color: var(--test-muted);
          white-space: nowrap;
        }

        .testKnowledgeRow,
        .testRewardSummary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f0eae6;
        }

        .testKnowledgeRow span,
        .testRewardSummary span {
          color: var(--test-muted);
          font-size: 12px;
        }

        .testKnowledgeRow strong,
        .testRewardSummary strong {
          color: var(--test-red);
          font-size: 14px;
          text-align: right;
        }

        .testStepCounter {
          font-size: 13px;
          font-weight: 850;
          color: var(--test-red);
          padding: 7px 11px;
          border-radius: 10px;
          background: #fff1f1;
        }

        .testStepList {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 16px;
        }

        .testStepRow {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 51px;
          border-bottom: 1px solid #f2efec;
        }

        .testStepRow:last-child {
          border-bottom: none;
        }

        .testStepIcon {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          border-radius: 9px;
          flex: 0 0 27px;
          background: #f2f0ed;
          color: #88817a;
          font-size: 12px;
          font-weight: 850;
        }

        .testStepIcon.done {
          background: #e1f3e7;
          color: #1b7b4f;
        }

        .testStepTitle {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          font-weight: 650;
        }

        .testStepStatus,
        .testActionStatus {
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 800;
          border-radius: 999px;
          background: #f4f0ed;
          color: #817872;
          white-space: nowrap;
        }

        .testStepStatus.done,
        .testActionStatus.done {
          background: #e2f4e8;
          color: #1d774d;
        }

        .testMenuHeading {
          padding: 17px 3px 7px;
          margin-top: 13px;
          margin-bottom: 13px;
        }

        .testMenuHeading h2 {
          font-size: 22px;
          margin-top: 6px;
        }

        .testMenuHeading p {
          color: var(--test-muted);
          font-size: 12px;
          line-height: 1.8;
          margin: 8px 0 0;
        }

        .testActionTop {
          align-items: flex-start;
        }

        .testActionIcon {
          display: grid;
          place-items: center;
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #fbeaec;
          color: var(--test-red);
          font-size: 15px;
          font-weight: 900;
          flex: 0 0 45px;
        }

        .testActionHeading {
          flex: 1;
          min-width: 0;
        }

        .testActionHeading span,
        .testResetTop span {
          display: block;
          color: #a44c54;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
          margin: 3px 0 5px;
        }

        .testActionHeading h3 {
          font-size: 17px;
          letter-spacing: -0.025em;
          line-height: 1.5;
          margin: 0;
        }

        .testActionStatus {
          margin-top: 7px;
        }

        .testActionDescription {
          font-size: 12px;
          line-height: 1.9;
          color: var(--test-muted);
          margin: 17px 0 20px;
        }

        .testButtonStack {
          display: grid;
          gap: 10px;
        }

        .testPrimaryButton,
        .testOutlineButton,
        .testResetButton,
        .testRefreshButton,
        .testBackButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          min-height: 51px;
          padding: 13px 17px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
          transition:
            background 150ms ease,
            transform 150ms ease;
        }

        .testPrimaryButton {
          justify-content: space-between;
          border: 1px solid var(--test-red);
          color: white;
          background: var(--test-red);
        }

        .testPrimaryButton:hover:not(:disabled) {
          background: var(--test-red-dark);
        }

        .testOutlineButton {
          justify-content: space-between;
          color: var(--test-red);
          background: white;
          border: 1px solid #dba7aa;
        }

        .testOutlineButton:hover:not(:disabled) {
          background: #fff5f5;
        }

        .testHint {
          font-size: 11px;
          line-height: 1.8;
          color: #847b77;
          margin: 12px 0 0;
        }

        .testResetPanel {
          background: #fff9f7;
          border: 1px solid #eac7c6;
          border-radius: 19px;
          padding: 23px;
          margin: 21px 0;
        }

        .testResetTop {
          align-items: center;
        }

        .testResetIcon {
          display: grid;
          place-items: center;
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          border-radius: 13px;
          color: #ad4147;
          background: #fae9e8;
          font-size: 26px;
        }

        .testResetTop h3 {
          font-size: 16px;
          margin: 0;
          line-height: 1.55;
        }

        .testResetPanel p {
          color: #766763;
          font-size: 12px;
          line-height: 1.9;
          margin: 18px 0;
        }

        .testResetButton {
          background: white;
          border: 1px solid #ce7378;
          color: #a42b37;
        }

        .testResetButton:hover:not(:disabled) {
          background: #fff0f0;
        }

        .testResetPanel small {
          display: block;
          color: #a66868;
          margin-top: 13px;
          font-size: 10px;
          line-height: 1.8;
        }

        .testBottomActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
          margin-top: 18px;
        }

        .testRefreshButton,
        .testBackButton {
          background: white;
          border: 1px solid var(--test-border);
          color: #504642;
        }

        .testRefreshButton:hover:not(:disabled),
        .testBackButton:hover:not(:disabled) {
          background: #f8f3ef;
        }

        .testRefreshButton span {
          font-size: 20px;
          line-height: 0.5;
        }

        .testPrimaryButton:disabled,
        .testOutlineButton:disabled,
        .testResetButton:disabled,
        .testRefreshButton:disabled,
        .testBackButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .testAlert {
          padding: 16px 18px;
          border: 1px solid;
          border-radius: 14px;
          margin-bottom: 16px;
          font-size: 12px;
          line-height: 1.8;
        }

        .testAlert p {
          margin: 5px 0 0;
        }

        .testAlert.error {
          background: #fff4f3;
          color: #9b2929;
          border-color: #eab9b8;
        }

        .testAlert.success {
          background: #effaf3;
          color: #1c7047;
          border-color: #badcc8;
        }

        .testFooter {
          padding: 25px 7px 0;
          text-align: center;
          color: #9b8c86;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .testFooter p {
          max-width: 470px;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: normal;
          line-height: 1.8;
          margin: 9px auto 0;
        }

        @media (max-width: 560px) {
          .testPage {
            padding-top: 12px;
            padding-bottom: 50px;
          }

          .testHeader {
            padding: 23px 19px;
            border-radius: 17px;
          }

          .testPanel,
          .testActionPanel,
          .testResetPanel {
            padding: 19px 16px;
            border-radius: 16px;
          }

          .testAccount {
            padding: 15px;
          }

          .testActionIcon {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .testActionHeading h3 {
            font-size: 15px;
          }

          .testSpotGrid {
            gap: 5px;
          }

          .testSpotCircle {
            border-radius: 12px;
          }

          .testSpot small {
            font-size: 9px;
          }

          .testBottomActions {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .testPage *,
          .testPage *::before,
          .testPage *::after {
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
