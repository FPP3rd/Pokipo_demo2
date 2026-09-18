"use client";

import {
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
   INTRO SETTINGS
======================================== */

const INTRO_STORAGE_KEY =
  "pokipo_intro_seen";

const INTRO_VIDEO_PATH =
  "/videos/pokipo-intro.mp4";

/* ========================================
   PAGE
======================================== */

export default function Page() {
  const router =
    useRouter();

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  /* ========================================
     INTRO
  ======================================== */

  const [
    introChecked,
    setIntroChecked,
  ] = useState(false);

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
    introLeaving,
    setIntroLeaving,
  ] = useState(false);

  const [
    videoError,
    setVideoError,
  ] = useState("");

  /* ========================================
     REGISTRATION
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
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* ========================================
     INTRO CHECK
  ======================================== */

  useEffect(() => {
    const alreadySeen =
      localStorage.getItem(
        INTRO_STORAGE_KEY
      ) === "true";

    setShowIntro(
      !alreadySeen
    );

    setIntroChecked(
      true
    );
  }, []);

  /* ========================================
     START INTRO
  ======================================== */

  async function startIntro() {
    setVideoError("");

    setIntroStarted(
      true
    );

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

    try {
      video.currentTime =
        0;

      video.muted =
        false;

      video.volume =
        1;

      await video.play();
    } catch (
      error
    ) {
      console.error(
        "イントロ動画再生エラー:",
        error
      );

      setVideoError(
        "動画を再生できませんでした。もう一度タップしてください。"
      );

      setIntroStarted(
        false
      );
    }
  }

  /* ========================================
     FINISH INTRO
  ======================================== */

  function finishIntro() {
    if (
      curtainClosing ||
      curtainOpening ||
      introLeaving
    ) {
      return;
    }

    const video =
      videoRef.current;

    if (
      video
    ) {
      video.pause();
    }

    /*
      1. カーテンを閉じる
    */
    setCurtainClosing(
      true
    );

    setTimeout(
      () => {
        /*
          初回再生済みとして保存
        */
        localStorage.setItem(
          INTRO_STORAGE_KEY,
          "true"
        );

        /*
          2. 登録画面を見せる準備
        */
        setIntroLeaving(
          true
        );

        /*
          3. カーテンを開く
        */
        setCurtainOpening(
          true
        );

        setTimeout(
          () => {
            setShowIntro(
              false
            );

            setCurtainClosing(
              false
            );

            setCurtainOpening(
              false
            );
          },
          1100
        );
      },
      1050
    );
  }

  /* ========================================
     SKIP INTRO
  ======================================== */

  function skipIntro() {
    finishIntro();
  }

  /* ========================================
     REGISTER
  ======================================== */

  async function registerParticipant() {
    const normalizedNickname =
      nickname.trim();

    if (
      !normalizedNickname
    ) {
      setErrorMessage(
        "ニックネームを入力してください。"
      );

      return;
    }

    if (
      !grade
    ) {
      setErrorMessage(
        "学年を選択してください。"
      );

      return;
    }

    if (
      !department
    ) {
      setErrorMessage(
        "学科を選択してください。"
      );

      return;
    }

    setSubmitting(
      true
    );

    setErrorMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "participants"
          )
          .insert({
            nickname:
              normalizedNickname,

            grade,

            department,
          })
          .select(
            "id"
          )
          .single();

      if (
        error
      ) {
        console.error(
          "参加者登録エラー:",
          error
        );

        setErrorMessage(
          error.message
        );

        return;
      }

      if (
        !data?.id
      ) {
        setErrorMessage(
          "参加者情報を作成できませんでした。"
        );

        return;
      }

      localStorage.setItem(
        "pokipo_participant_id",
        data.id
      );

      localStorage.setItem(
        "pokipo_user_id",
        data.id
      );

      localStorage.setItem(
        "pokipo_nickname",
        normalizedNickname
      );

      localStorage.setItem(
        "pokipo_grade",
        grade
      );

      localStorage.setItem(
        "pokipo_department",
        department
      );

      localStorage.setItem(
        "pokipo_progress",
        "0"
      );

      localStorage.setItem(
        "pokipo_completed",
        "false"
      );

      localStorage.removeItem(
        "pokipo_scans"
      );

      localStorage.removeItem(
        "pokipo_knowledge"
      );

      localStorage.removeItem(
        "pokipo_pre_survey_completed"
      );

      localStorage.removeItem(
        "pokipo_post_survey_completed"
      );

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

      setErrorMessage(
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
    !introChecked
  ) {
    return (
      <main className="shell">
        <section className="card">
          読み込み中...
        </section>
      </main>
    );
  }

  /* ========================================
     VIEW
  ======================================== */

  return (
    <>
      {/* ========================================
          REGISTRATION
      ======================================== */}

      <main className="shell">

        <section className="card">

          <div className="intro">

            <p className="eyebrow">
              POCKY JOURNEY
            </p>

            <h1>
              POKIPO
            </h1>

            <p>
              学内をめぐって、
              ポッキーの魅力を見つけよう。
            </p>

          </div>

          <div className="formGroup">

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
                event
              ) =>
                setNickname(
                  event.target.value
                )
              }
              placeholder="ニックネームを入力"
              maxLength={
                30
              }
            />

          </div>

          <div className="formGroup">

            <label htmlFor="grade">
              学年
            </label>

            <select
              id="grade"
              value={
                grade
              }
              onChange={(
                event
              ) =>
                setGrade(
                  event.target.value
                )
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

          <div className="formGroup">

            <label htmlFor="department">
              学科
            </label>

            <select
              id="department"
              value={
                department
              }
              onChange={(
                event
              ) =>
                setDepartment(
                  event.target.value
                )
              }
            >
              <option value="">
                選択してください
              </option>

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

              <option value="言語文化学科">
                言語文化学科
              </option>

              <option value="経済学科">
                経済学科
              </option>

              <option value="経営学科">
                経営学科
              </option>

              <option value="国際環境経済学科">
                国際環境経済学科
              </option>

              <option value="法律学科">
                法律学科
              </option>

              <option value="国際関係法学科">
                国際関係法学科
              </option>

              <option value="総合政策学科">
                総合政策学科
              </option>

              <option value="その他">
                その他
              </option>

            </select>

          </div>

          {errorMessage && (
            <p className="error">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            className="mainActionButton"
            disabled={
              submitting
            }
            onClick={() =>
              void registerParticipant()
            }
          >

            <span>

              <strong>
                {submitting
                  ? "登録中..."
                  : "次へ進む"}
              </strong>

              {!submitting && (
                <small>
                  参加前アンケートへ
                </small>
              )}

            </span>

            {!submitting && (
              <span className="buttonArrow">
                ›
              </span>
            )}

          </button>

        </section>

      </main>

      {/* ========================================
          INTRO OVERLAY
      ======================================== */}

      {showIntro && (
        <div
          className={[
            "pokipoIntroOverlay",

            introLeaving
              ? "isLeaving"
              : "",
          ].join(
            " "
          )}
        >

          {/* VIDEO */}

          <video
            ref={
              videoRef
            }
            className="pokipoIntroVideo"
            src={
              INTRO_VIDEO_PATH
            }
            playsInline
            preload="auto"
            onEnded={
              finishIntro
            }
            onError={() =>
              setVideoError(
                "動画ファイルを読み込めませんでした。"
              )
            }
          />

          {/* DARK FILTER */}

          <div className="pokipoIntroShade" />

          {/* START SCREEN */}

          {!introStarted &&
            !curtainClosing && (
            <div className="pokipoIntroStart">

              <span className="pokipoIntroBrand">
                POKIPO
              </span>

              <h2>
                ポッキーの旅を、
                <br />
                はじめよう。
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

          {/* SKIP */}

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

          {/* SOUND LABEL */}

          {introStarted &&
            !curtainClosing && (
            <div className="pokipoIntroSound">
              🔊 SOUND ON
            </div>
          )}

          {/* CURTAINS */}

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