"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "../lib/supabase-client";

/* ========================================
   INTRO
======================================== */

const INTRO_STORAGE_KEY =
  "pokipo_intro_seen";

const INTRO_VIDEO_PATH =
  "/videos/pokipo-intro.mp4";

/* ========================================
   MAINTENANCE
======================================== */

const DEFAULT_MAINTENANCE_MESSAGE =
  "現在システムメンテナンスを行っています。しばらくしてから再度アクセスしてください。";

/* ========================================
   FULLSCREEN PROMOTION
======================================== */

type FullscreenPromotion = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  updated_at: string;
};

/* ========================================
   PAGE
======================================== */

export default function StartPage() {
  const router =
    useRouter();

  /* ========================================
     MAINTENANCE
  ======================================== */

  const [
    maintenanceChecking,
    setMaintenanceChecking,
  ] = useState(true);

  const [
    maintenanceMode,
    setMaintenanceMode,
  ] = useState(false);

  const [
    maintenanceMessage,
    setMaintenanceMessage,
  ] = useState(
    DEFAULT_MAINTENANCE_MESSAGE
  );

  /* ========================================
     FULLSCREEN PROMOTION
  ======================================== */

  const [
    promotionChecking,
    setPromotionChecking,
  ] = useState(true);

  const [
    fullscreenPromotion,
    setFullscreenPromotion,
  ] =
    useState<FullscreenPromotion | null>(
      null
    );

  const [
    showFullscreenPromotion,
    setShowFullscreenPromotion,
  ] = useState(false);

  const [
    dontShowPromotionAgain,
    setDontShowPromotionAgain,
  ] = useState(false);

  const [
    pendingDestination,
    setPendingDestination,
  ] = useState("");

  const [
    pendingIntro,
    setPendingIntro,
  ] = useState(false);

  /* ========================================
     VIDEO INTRO
  ======================================== */

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const [
    showIntro,
    setShowIntro,
  ] = useState(false);

  const [
    introStarted,
    setIntroStarted,
  ] = useState(false);

  const [
    curtainClosing,
    setCurtainClosing,
  ] = useState(false);

  const [
    curtainOpening,
    setCurtainOpening,
  ] = useState(false);

  const [
    videoError,
    setVideoError,
  ] = useState("");

  const introFinishingRef =
    useRef(false);

  /* ========================================
     FORM
  ======================================== */

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    grade,
    setGrade,
  ] = useState("");

  const [
    department,
    setDepartment,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    checkingRegistration,
    setCheckingRegistration,
  ] = useState(true);

  /* ========================================
     MAINTENANCE CHECK
  ======================================== */

  useEffect(() => {
    async function loadMaintenanceSetting() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "pokipo_app_settings"
          )
          .select(
            "maintenance_mode, maintenance_message"
          )
          .eq(
            "id",
            1
          )
          .single();

      if (
        error
      ) {
        console.error(
          "メンテナンス設定取得エラー:",
          error
        );

        setMaintenanceMode(
          false
        );

        setMaintenanceMessage(
          DEFAULT_MAINTENANCE_MESSAGE
        );

        setMaintenanceChecking(
          false
        );

        return;
      }

      setMaintenanceMode(
        Boolean(
          data?.maintenance_mode
        )
      );

      setMaintenanceMessage(
        data?.maintenance_message?.trim() ||
          DEFAULT_MAINTENANCE_MESSAGE
      );

      setMaintenanceChecking(
        false
      );
    }

    void loadMaintenanceSetting();

    /* ========================================
       MAINTENANCE REALTIME
    ======================================== */

    const maintenanceChannel =
      supabase
        .channel(
          "pokipo-root-maintenance-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "pokipo_app_settings",

            filter:
              "id=eq.1",
          },
          (
            payload
          ) => {
            const newData =
              payload.new as {
                maintenance_mode?:
                  boolean;

                maintenance_message?:
                  string;
              };

            if (
              typeof newData.maintenance_mode ===
              "boolean"
            ) {
              setMaintenanceMode(
                newData.maintenance_mode
              );
            }

            if (
              typeof newData.maintenance_message ===
              "string"
            ) {
              setMaintenanceMessage(
                newData.maintenance_message.trim() ||
                  DEFAULT_MAINTENANCE_MESSAGE
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        maintenanceChannel
      );
    };
  }, []);

  /* ========================================
     FULLSCREEN PROMOTION LOAD
  ======================================== */

  useEffect(() => {
    async function loadFullscreenPromotion() {
      setPromotionChecking(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pokipo_promotions"
            )
            .select(
              "id, title, body, image_url, updated_at"
            )
            .eq(
              "placement",
              "fullscreen"
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "全画面広告取得エラー:",
            error
          );

          setFullscreenPromotion(
            null
          );

          setShowFullscreenPromotion(
            false
          );

          return;
        }

        if (
          !data
        ) {
          setFullscreenPromotion(
            null
          );

          setShowFullscreenPromotion(
            false
          );

          return;
        }

        const promotion =
          data as FullscreenPromotion;

        setFullscreenPromotion(
          promotion
        );

        const hiddenKey =
          `pokipo_promotion_hidden:${promotion.id}:${promotion.updated_at}`;

        const hidden =
          localStorage.getItem(
            hiddenKey
          ) === "true";

        setShowFullscreenPromotion(
          !hidden
        );
      } catch (
        error
      ) {
        console.error(
          "全画面広告通信エラー:",
          error
        );

        setFullscreenPromotion(
          null
        );

        setShowFullscreenPromotion(
          false
        );
      } finally {
        setPromotionChecking(
          false
        );
      }
    }

    void loadFullscreenPromotion();
  }, []);

  /* ========================================
     CLOSE PROMOTION
  ======================================== */

  function closeFullscreenPromotion() {
    if (
      fullscreenPromotion &&
      dontShowPromotionAgain
    ) {
      const hiddenKey =
        `pokipo_promotion_hidden:${fullscreenPromotion.id}:${fullscreenPromotion.updated_at}`;

      localStorage.setItem(
        hiddenKey,
        "true"
      );
    }

    setShowFullscreenPromotion(
      false
    );

    setDontShowPromotionAgain(
      false
    );

    if (
      pendingDestination
    ) {
      const destination =
        pendingDestination;

      setPendingDestination(
        ""
      );

      router.replace(
        destination
      );

      return;
    }

    if (
      pendingIntro
    ) {
      setPendingIntro(
        false
      );

      setShowIntro(
        true
      );
    }
  }

  /* ========================================
     EXISTING PARTICIPANT CHECK
  ======================================== */

  useEffect(() => {
    if (
      maintenanceChecking ||
      promotionChecking
    ) {
      return;
    }

    if (
      maintenanceMode
    ) {
      setCheckingRegistration(
        false
      );

      return;
    }

    async function checkExistingParticipant() {
      const savedParticipantId =
        localStorage.getItem(
          "pokipo_participant_id"
        ) ??
        localStorage.getItem(
          "pokipo_user_id"
        );

      const savedNickname =
        localStorage.getItem(
          "pokipo_nickname"
        );

      /* =================================
         NEW PARTICIPANT
      ================================= */

      if (
        !savedParticipantId ||
        !savedNickname
      ) {
        const introSeen =
          localStorage.getItem(
            INTRO_STORAGE_KEY
          ) === "true";

        if (
          showFullscreenPromotion
        ) {
          setPendingIntro(
            !introSeen
          );

          setShowIntro(
            false
          );
        } else {
          setShowIntro(
            !introSeen
          );
        }

        setCheckingRegistration(
          false
        );

        return;
      }

      /* =================================
         PRE SURVEY CHECK
      ================================= */

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "has_completed_pokipo_pre_survey",
          {
            p_participant_id:
              savedParticipantId,
          }
        );

      let destination =
        "/survey/before";

      if (
        error
      ) {
        console.error(
          "参加前アンケート確認エラー:",
          error
        );
      } else if (
        data === true
      ) {
        destination =
          "/home";
      }

      if (
        showFullscreenPromotion
      ) {
        setPendingDestination(
          destination
        );

        setCheckingRegistration(
          false
        );

        return;
      }

      router.replace(
        destination
      );
    }

    void checkExistingParticipant();
  }, [
    router,
    maintenanceChecking,
    maintenanceMode,
    promotionChecking,
    showFullscreenPromotion,
  ]);

  /* ========================================
     INTRO START
  ======================================== */

  async function startIntro() {
    const video =
      videoRef.current;

    if (
      !video
    ) {
      setVideoError(
        "動画を読み込めませんでした。"
      );

      return;
    }

    setVideoError("");

    try {
      video.currentTime =
        0;

      video.muted =
        false;

      video.volume =
        1;

      await video.play();

      setIntroStarted(
        true
      );
    } catch (
      error
    ) {
      console.error(
        "イントロ動画再生エラー:",
        error
      );

      setVideoError(
        "動画を再生できませんでした。もう一度お試しください。"
      );

      setIntroStarted(
        false
      );
    }
  }

  /* ========================================
     INTRO FINISH
  ======================================== */

  function finishIntro() {
    if (
      introFinishingRef.current
    ) {
      return;
    }

    introFinishingRef.current =
      true;

    const video =
      videoRef.current;

    if (
      video
    ) {
      video.pause();
    }

    setCurtainClosing(
      true
    );

    window.setTimeout(
      () => {
        localStorage.setItem(
          INTRO_STORAGE_KEY,
          "true"
        );

        setCurtainOpening(
          true
        );

        window.setTimeout(
          () => {
            setShowIntro(
              false
            );

            setIntroStarted(
              false
            );

            setCurtainClosing(
              false
            );

            setCurtainOpening(
              false
            );

            introFinishingRef.current =
              false;
          },
          1100
        );
      },
      1050
    );
  }

  /* ========================================
     INTRO SKIP
  ======================================== */

  function skipIntro() {
    finishIntro();
  }

  /* ========================================
     REGISTER PARTICIPANT
  ======================================== */

  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const name =
      nickname.trim();

    if (
      name.length < 2 ||
      name.length > 20
    ) {
      setMessage(
        "ニックネームは2〜20文字で入力してください。"
      );

      return;
    }

    if (
      !grade
    ) {
      setMessage(
        "学年を選択してください。"
      );

      return;
    }

    if (
      !department
    ) {
      setMessage(
        "学科を選択してください。"
      );

      return;
    }

    setSubmitting(
      true
    );

    setMessage("");

    try {
      const participantId =
        crypto.randomUUID();

      const {
        error,
      } =
        await supabase
          .from(
            "participants"
          )
          .insert({
            id:
              participantId,

            nickname:
              name,

            grade,

            department,
          });

      if (
        error
      ) {
        console.error(
          "参加者登録エラー:",
          {
            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,

            code:
              error.code,
          }
        );

        setMessage(
          "参加者情報を登録できませんでした。通信環境を確認して、もう一度お試しください。"
        );

        return;
      }

      /* =================================
         PARTICIPANT DATA
      ================================= */

      localStorage.setItem(
        "pokipo_participant_id",
        participantId
      );

      localStorage.setItem(
        "pokipo_user_id",
        participantId
      );

      localStorage.setItem(
        "pokipo_nickname",
        name
      );

      localStorage.setItem(
        "pokipo_grade",
        grade
      );

      localStorage.setItem(
        "pokipo_department",
        department
      );

      /* =================================
         PROGRESS RESET
      ================================= */

      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify([])
      );

      localStorage.setItem(
        "pokipo_progress",
        "0"
      );

      localStorage.setItem(
        "pokipo_knowledge",
        JSON.stringify([])
      );

      localStorage.setItem(
        "pokipo_completed",
        "false"
      );

      localStorage.removeItem(
        "pokipo_completed_at"
      );

      localStorage.removeItem(
        "pokipo_achievement_rank"
      );

      /* =================================
         REWARD RESET
      ================================= */

      localStorage.setItem(
        "pokipo_reward_exchanged",
        "false"
      );

      localStorage.removeItem(
        "pokipo_reward_exchanged_at"
      );

      localStorage.removeItem(
        "pokipo_reward_token"
      );

      localStorage.removeItem(
        "pokipo_reward_confirmation_code"
      );

      /* =================================
         SURVEY RESET
      ================================= */

      localStorage.removeItem(
        "pokipo_pre_survey_completed"
      );

      localStorage.removeItem(
        "pokipo_post_survey_completed"
      );

      /* =================================
         MOVE TO PRE SURVEY
      ================================= */

      router.push(
        "/survey/before"
      );
    } catch (
      error
    ) {
      console.error(
        "参加者登録通信エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (
    maintenanceChecking ||
    promotionChecking
  ) {
    return (
      <main className="shell">

        <section className="card startPage">

          <div
            style={{
              padding:
                "40px 20px",

              textAlign:
                "center",
            }}
          >
            POKIPOを読み込み中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     MAINTENANCE
  ======================================== */

  if (
    maintenanceMode
  ) {
    return (
      <main className="maintenancePage">

        <section className="maintenanceCard">

          <span className="maintenanceEyebrow">
            POKIPO SYSTEM
          </span>

          <div className="maintenanceIcon">
            !
          </div>

          <h1>
            ただいま
            <br />
            メンテナンス中です
          </h1>

          <p className="maintenanceMessage">
            {maintenanceMessage}
          </p>

          <div className="maintenanceDivider" />

          <p className="maintenanceSubMessage">
            復旧後、このページを再読み込みすると
            POKIPOをご利用いただけます。
          </p>

          <div className="maintenanceBrand">

            <strong>
              POKIPO
            </strong>

            <span>
              高安ゼミ LiPost × POCKY
            </span>

          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     PARTICIPANT CHECK
  ======================================== */

  if (
    checkingRegistration
  ) {
    return (
      <main className="shell">

        <section className="card startPage">

          <div
            style={{
              padding:
                "40px 20px",

              textAlign:
                "center",
            }}
          >
            参加情報を確認中...
          </div>

        </section>

      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <>
      <main className="shell">

        <section className="card startPage">

          {/* =================================
              HERO
          ================================= */}

          <header className="startHero">

            <p className="startEyebrow">
              高安ゼミ LiPost × POCKY
            </p>

            <h1 className="startLogo">
              POKIPO
            </h1>

            <p className="startCatch">
              キャンパスをめぐって、
              <br />
              ポッキーが持つ価値を知ろう。
            </p>

            <div className="startVisual">

              <div className="startPocky pockyOne">
                <div className="startChocolate" />
                <div className="startBiscuit" />
              </div>

              <div className="startPocky pockyTwo">
                <div className="startChocolate" />
                <div className="startBiscuit" />
              </div>

              <div className="startPocky pockyThree">
                <div className="startChocolate" />
                <div className="startBiscuit" />
              </div>

            </div>

          </header>

          {/* =================================
              INTRO
          ================================= */}

          <section className="startIntro">

            <div className="startIntroNumber">
              5
            </div>

            <div>

              <p>
                POKIPO STAMP RALLY
              </p>

              <h2>
                5つのスポットを巡って特典をゲットしよう
              </h2>

              <span>
                学内に散りばめられたQRコードを読み取って、
                スタンプと豆知識を集めよう。
              </span>

            </div>

          </section>

          {/* =================================
              FORM
          ================================= */}

          <form
            className="startForm"
            onSubmit={
              submit
            }
          >

            <div className="startFormTitle">

              <p>
                PLAYER PROFILE
              </p>

              <h2>
                プロフィールを登録
              </h2>

            </div>

            <div className="field">

              <label htmlFor="nickname">
                ニックネーム
              </label>

              <input
                id="nickname"
                type="text"
                value={
                  nickname
                }
                onChange={(
                  e
                ) =>
                  setNickname(
                    e.target.value
                  )
                }
                placeholder="例：ぽっきー"
                maxLength={
                  20
                }
                disabled={
                  submitting
                }
              />

            </div>

            <div className="field">

              <label htmlFor="grade">
                学年
              </label>

              <select
                id="grade"
                value={
                  grade
                }
                onChange={(
                  e
                ) =>
                  setGrade(
                    e.target.value
                  )
                }
                disabled={
                  submitting
                }
              >

                <option value="">
                  選択してください
                </option>

                <option value="1年">
                  1年
                </option>

                <option value="2年">
                  2年
                </option>

                <option value="3年">
                  3年
                </option>

                <option value="4年">
                  4年
                </option>

                <option value="その他">
                  その他
                </option>

              </select>

            </div>

            <div className="field">

              <label htmlFor="department">
                学科
              </label>

              <select
                id="department"
                value={
                  department
                }
                onChange={(
                  e
                ) =>
                  setDepartment(
                    e.target.value
                  )
                }
                disabled={
                  submitting
                }
              >

                <option value="">
                  選択してください
                </option>

                <optgroup label="外国語学部">

                  <option value="ドイツ語学科">
                    ドイツ語学科
                  </option>

                  <option value="英語学科">
                    英語学科
                  </option>

                  <option value="フランス語学科">
                    フランス語学科
                  </option>

                  <option value="交流文化学科">
                    交流文化学科
                  </option>

                </optgroup>

                <optgroup label="国際教養学部">

                  <option value="言語文化学科">
                    言語文化学科
                  </option>

                </optgroup>

                <optgroup label="経済学部">

                  <option value="経済学科">
                    経済学科
                  </option>

                  <option value="経営学科">
                    経営学科
                  </option>

                  <option value="国際環境経済学科">
                    国際環境経済学科
                  </option>

                </optgroup>

                <optgroup label="法学部">

                  <option value="法律学科">
                    法律学科
                  </option>

                  <option value="国際関係法学科">
                    国際関係法学科
                  </option>

                  <option value="総合政策学科">
                    総合政策学科
                  </option>

                </optgroup>

              </select>

            </div>

            {/* =================================
                SURVEY NOTICE
            ================================= */}

            <div className="startSurveyNotice">

              <strong>
                登録後、参加前アンケートがあります
              </strong>

              <p>
                POKIPO体験による変化を確認するため、
                簡単なアンケートへの回答をお願いします。
              </p>

            </div>

            {message && (
              <p className="error">
                {message}
              </p>
            )}

            {/* =================================
                DATA WARNING
            ================================= */}

            <section className="dataWarning">

              <div className="dataWarningText">

                <strong>
                  始める前にチェック！
                </strong>

                <p>
                  スタンプや豆知識などの進捗は、
                  この端末のブラウザにも保存されます。
                </p>

                <p>
                  イベント終了まで、
                  Cookie・サイトデータ・閲覧データを削除しないでください。
                </p>

                <p className="dataWarningImportant">
                  シークレットモード・プライベートブラウズでの参加も避けてください。
                </p>

              </div>

            </section>

            <button
              type="submit"
              className="primaryButton startButton"
              disabled={
                submitting
              }
            >

              <span>

                {submitting
                  ? "登録中..."
                  : "次へ進む"}

              </span>

              <span>
                →
              </span>

            </button>

          </form>

          <p className="startFooter">
            登録した情報は、
            POKIPOの運営・進捗管理・企画分析に使用します。
          </p>

        </section>

      </main>

      {/* ========================================
          FULLSCREEN PROMOTION
      ======================================== */}

      {showFullscreenPromotion &&
        fullscreenPromotion && (
        <div className="pokipoPromotionOverlay">

          <section
            className="pokipoPromotionCard"
            role="dialog"
            aria-modal="true"
            aria-label={
              fullscreenPromotion.title
            }
          >

            {fullscreenPromotion.image_url && (
              <div className="pokipoPromotionImage">

                <img
                  src={
                    fullscreenPromotion.image_url
                  }
                  alt=""
                />

              </div>
            )}

            <div className="pokipoPromotionContent">

              <span className="pokipoPromotionEyebrow">
                LiPost INFORMATION
              </span>

              <h2>
                {fullscreenPromotion.title}
              </h2>

              {fullscreenPromotion.body && (
                <p>
                  {fullscreenPromotion.body}
                </p>
              )}

              <label className="pokipoPromotionDontShow">

                <input
                  type="checkbox"
                  checked={
                    dontShowPromotionAgain
                  }
                  onChange={(
                    event
                  ) =>
                    setDontShowPromotionAgain(
                      event.target.checked
                    )
                  }
                />

                <span>
                  次回から表示しない
                </span>

              </label>

              <button
                type="button"
                className="pokipoPromotionCloseButton"
                onClick={
                  closeFullscreenPromotion
                }
              >
                閉じる
              </button>

            </div>

          </section>

        </div>
      )}

      {/* ========================================
          INTRO VIDEO
      ======================================== */}

      {showIntro &&
        !showFullscreenPromotion && (
        <div className="pokipoIntroOverlay">

          <video
            ref={
              videoRef
            }
            className="pokipoIntroVideo"
            playsInline
            preload="auto"
            onEnded={
              finishIntro
            }
            onError={(
              event
            ) => {
              console.error(
                "動画読み込みエラー:",
                event.currentTarget.error
              );

              setVideoError(
                "動画ファイルを読み込めませんでした。"
              );
            }}
          >

            <source
              src={
                INTRO_VIDEO_PATH
              }
              type="video/mp4"
            />

          </video>

          <div className="pokipoIntroShade" />

          {!introStarted &&
            !curtainClosing && (
            <div className="pokipoIntroStart">

              <span className="pokipoIntroBrand">
                獨協大学高安ゼミ LiPost × 江崎グリコ株式会社
                <br />
                POKIPO
              </span>

              <h2>
                キャンパスを回って
                <br />
                ポッキーを知る旅に出よう。
              </h2>

              <p>
                音声が流れます。
                <br />
                音量をご確認ください。
              </p>

              <button
                type="button"
                className="pokipoIntroStartButton"
                onClick={() =>
                  void startIntro()
                }
              >
                <span>
                  ▶
                </span>

                音声ありでスタート
              </button>

              {videoError && (
                <p className="pokipoIntroError">
                  {videoError}
                </p>
              )}

            </div>
          )}

          {introStarted &&
            !curtainClosing && (
            <button
              type="button"
              className="pokipoIntroSkip"
              onClick={
                skipIntro
              }
            >
              スキップ
            </button>
          )}

          {introStarted &&
            !curtainClosing && (
            <div className="pokipoIntroSound">
              🔊 SOUND ON
            </div>
          )}

          <div
            className={[
              "pokipoCurtain",

              curtainClosing
                ? "closing"
                : "",

              curtainOpening
                ? "opening"
                : "",
            ].join(
              " "
            )}
          >

            <div className="pokipoCurtainLeft">

              <div className="pokipoCurtainFold fold1" />
              <div className="pokipoCurtainFold fold2" />
              <div className="pokipoCurtainFold fold3" />

            </div>

            <div className="pokipoCurtainRight">

              <div className="pokipoCurtainFold fold1" />
              <div className="pokipoCurtainFold fold2" />
              <div className="pokipoCurtainFold fold3" />

            </div>

            <div className="pokipoCurtainCenterLogo">

              <span>
                POKIPO
              </span>

              <small>
                SHARE HAPPINESS
              </small>

            </div>

          </div>

        </div>
      )}

    </>
  );
}