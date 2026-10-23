"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase-client";

import PokipoBrowserNotice from "../components/PokipoBrowserNotice";

const INTRO_STORAGE_KEY = "pokipo_intro_seen";
const BROWSER_NOTICE_STORAGE_KEY =
  "pokipo_browser_notice_seen";
const INTRO_VIDEO_PATH = "/videos/pokipo-intro.mp4";
// 授業期間中はfalse。元の動画へ戻す場合はtrueに変更。
const ENABLE_INTRO_VIDEO = false;

const DEFAULT_MAINTENANCE_MESSAGE =
  "現在システムメンテナンスを行っています。しばらくしてから再度アクセスしてください。";

export default function StartPage() {
  const router = useRouter();

  // メンテナンス
  const [maintenanceChecking, setMaintenanceChecking] =
    useState(true);
  const [maintenanceMode, setMaintenanceMode] =
    useState(false);
  const [maintenanceMessage, setMaintenanceMessage] =
    useState(DEFAULT_MAINTENANCE_MESSAGE);

  // 初回ブラウザ案内・イントロ
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const introFinishingRef = useRef(false);

  const [showIntro, setShowIntro] = useState(false);
  const [
    browserNoticeDismissed,
    setBrowserNoticeDismissed,
  ] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [curtainClosing, setCurtainClosing] = useState(false);
  const [curtainOpening, setCurtainOpening] = useState(false);
  const [videoError, setVideoError] = useState("");

  // 参加者登録
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingRegistration, setCheckingRegistration] =
    useState(true);

  // 利用規約
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // メンテナンス状態の取得
  useEffect(() => {
    async function loadMaintenanceSetting() {
      const { data, error } = await supabase
        .from("pokipo_app_settings")
        .select("maintenance_mode, maintenance_message")
        .eq("id", 1)
        .single();

      if (error) {
        console.error(
          "メンテナンス設定取得エラー:",
          error
        );
        setMaintenanceMode(false);
        setMaintenanceMessage(
          DEFAULT_MAINTENANCE_MESSAGE
        );
      } else {
        setMaintenanceMode(
          Boolean(data?.maintenance_mode)
        );
        setMaintenanceMessage(
          data?.maintenance_message?.trim() ||
            DEFAULT_MAINTENANCE_MESSAGE
        );
      }

      setMaintenanceChecking(false);
    }

    void loadMaintenanceSetting();

    const maintenanceChannel = supabase
      .channel("pokipo-root-maintenance-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pokipo_app_settings",
          filter: "id=eq.1",
        },
        (payload) => {
          const newData = payload.new as {
            maintenance_mode?: boolean;
            maintenance_message?: string;
          };

          if (
            typeof newData.maintenance_mode === "boolean"
          ) {
            setMaintenanceMode(newData.maintenance_mode);
          }

          if (
            typeof newData.maintenance_message === "string"
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
      void supabase.removeChannel(maintenanceChannel);
    };
  }, []);

  // 登録済み参加者の確認
  useEffect(() => {
    if (maintenanceChecking) return;

    if (maintenanceMode) {
      setCheckingRegistration(false);
      return;
    }

    let active = true;

    async function checkExistingParticipant() {
      const savedParticipantId =
        localStorage.getItem("pokipo_participant_id") ??
        localStorage.getItem("pokipo_user_id");

      const savedNickname =
        localStorage.getItem("pokipo_nickname");

      if (!savedParticipantId || !savedNickname) {
        const introSeen =
          localStorage.getItem(INTRO_STORAGE_KEY) ===
          "true";

        // イントロを初めて見る人だけに表示する
        if (active) {
          setShowIntro(!introSeen);

          // 既存の参加者IDがある場合は、
          // ブラウザ切り替え案内を表示しない
          setBrowserNoticeDismissed(
            Boolean(savedParticipantId) ||
              introSeen ||
              sessionStorage.getItem(
                BROWSER_NOTICE_STORAGE_KEY
              ) === "true"
          );

          setCheckingRegistration(false);
        }

        return;
      }

      // 以下の登録済み参加者の処理は変更しない
      const { data, error } = await supabase.rpc(
        "has_completed_pokipo_pre_survey",
        {
          p_participant_id: savedParticipantId,
        }
      );

      if (!active) return;

      if (error) {
        console.error(
          "参加前アンケート確認エラー:",
          error
        );
        router.replace("/survey/before");
        return;
      }

      if (data === true) {
        router.replace("/home");
        return;
      }

      router.replace("/survey/before");
    }

    void checkExistingParticipant();

    return () => {
      active = false;
    };
  }, [
    router,
    maintenanceChecking,
    maintenanceMode,
  ]);

  // イントロ動画の開始
  async function startIntro() {
    if (!ENABLE_INTRO_VIDEO) {
      finishIntro();
      return;
    }
    const video = videoRef.current;

    if (!video) {
      setVideoError(
        "動画を読み込めませんでした。"
      );
      return;
    }

    setVideoError("");

    try {
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;

      await video.play();
      setIntroStarted(true);
    } catch (error) {
      console.error(
        "イントロ動画再生エラー:",
        error
      );
      setVideoError(
        "動画を再生できませんでした。もう一度お試しください。"
      );
      setIntroStarted(false);
    }
  }

  // イントロ動画終了時のカーテン演出
  function finishIntro() {
    if (introFinishingRef.current) return;

    introFinishingRef.current = true;

    const video = videoRef.current;

    if (video) {
      video.pause();
    }

    setCurtainClosing(true);

    window.setTimeout(() => {
      localStorage.setItem(
        INTRO_STORAGE_KEY,
        "true"
      );

      setCurtainOpening(true);

      window.setTimeout(() => {
        setShowIntro(false);
        setIntroStarted(false);
        setCurtainClosing(false);
        setCurtainOpening(false);
        introFinishingRef.current = false;
      }, 1100);
    }, 1050);
  }

  function skipIntro() {
    finishIntro();
  }

  // 参加者登録
  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const name = nickname.trim();

    if (name.length < 2 || name.length > 20) {
      setMessage(
        "ニックネームは2〜20文字で入力してください。"
      );
      return;
    }

    if (!grade) {
      setMessage("学年・所属を選択してください。");
      return;
    }

    if (grade !== "教職員" && !department) {
      setMessage("学科を選択してください。");
      return;
    }

    if (!termsAccepted) {
      setMessage(
        "利用規約・プライバシーポリシーへの同意が必要です。"
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const participantId = crypto.randomUUID();

      const { error } = await supabase
        .from("participants")
        .insert({
          id: participantId,
          nickname: name,
          grade,
          department: grade === "教職員" ? null : department,
        });

      if (error) {
        console.error(
          "参加者登録エラー:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        setMessage(
          "参加者情報を登録できませんでした。通信環境を確認して、もう一度お試しください。"
        );
        return;
      }

      // 参加者データ
      localStorage.setItem(
        "pokipo_participant_id",
        participantId
      );
      localStorage.setItem(
        "pokipo_user_id",
        participantId
      );
      localStorage.setItem("pokipo_nickname", name);
      localStorage.setItem("pokipo_grade", grade);
      localStorage.setItem(
        "pokipo_department",
        grade === "教職員" ? "" : department
      );
      localStorage.setItem(
        "pokipo_terms_accepted",
        "true"
      );

      // 進捗の初期化（新規登録時のみ）
      localStorage.setItem(
        "pokipo_scans",
        JSON.stringify([])
      );
      localStorage.setItem("pokipo_progress", "0");
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

      // 特典関連
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

      // アンケート関連
      localStorage.removeItem(
        "pokipo_pre_survey_completed"
      );
      localStorage.removeItem(
        "pokipo_post_survey_completed"
      );

      router.push("/survey/before");
    } catch (error) {
      console.error(
        "参加者登録通信エラー:",
        error
      );
      setMessage(
        "通信中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // メンテナンス設定取得中
  if (maintenanceChecking) {
    return (
      <main className="shell">
        <section className="card startPage">
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            POKIPOを読み込み中...
          </div>
        </section>
      </main>
    );
  }

  // メンテナンス中
  if (maintenanceMode) {
    return (
      <main className="maintenancePage">
        <section className="maintenanceCard">
          <span className="maintenanceEyebrow">
            POKIPO SYSTEM
          </span>

          <div className="maintenanceIcon">!</div>

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
            <strong>POKIPO</strong>
            <span>
              高安ゼミ LiPost × POCKY
            </span>
          </div>
        </section>
      </main>
    );
  }

  // 参加者の登録状態を確認中
  if (checkingRegistration) {
    return (
      <main className="shell">
        <section className="card startPage">
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            参加情報を確認中...
          </div>
        </section>
      </main>
    );
  }

  // 初回イントロより前にブラウザ案内
  if (showIntro && !browserNoticeDismissed) {
    return (
      <PokipoBrowserNotice
        onContinue={() => {
          sessionStorage.setItem(
            BROWSER_NOTICE_STORAGE_KEY,
            "true"
          );
          setBrowserNoticeDismissed(true);
        }}
      />
    );
  }

  return (
    
      <>
        <main className="shell">
          <section className="card startPage">
            {/* HERO */}
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

              <div className="startVisual approvedStartPockyVisual">
                <img
                  src="/images/pocky/pocky-100.png"
                  alt="ポッキー"
                  className="approvedStartPockyImage"
                  draggable={false}
                />
              </div>
            </header>

            {/* スタンプラリー説明 */}
            <section className="startIntro">
              <div className="startIntroNumber">
                5
              </div>

              <div>
                <p>POKIPO STAMP RALLY</p>

                <h2>
                  5つのスポットを巡って特典をゲットしよう
                </h2>

                <span>
                  学内に散りばめられたQRコードを読み取って、
                  スタンプと豆知識を集めよう。
                </span>
              </div>
            </section>

            {/* 参加者登録フォーム */}
            <form
              className="startForm"
              onSubmit={submit}
            >
              <div className="startFormTitle">
                <p>PLAYER PROFILE</p>
                <h2>プロフィールを登録</h2>
              </div>

              <div className="field">
                <label htmlFor="nickname">
                  ニックネーム
                </label>

                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) =>
                    setNickname(e.target.value)
                  }
                  placeholder="例：ぽっきー"
                  maxLength={20}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <label htmlFor="grade">
                  学年・所属
                </label>

                <select
                  id="grade"
                  value={grade}
                  onChange={(e) =>
                    (setGrade(e.target.value),
                     e.target.value === "教職員" && setDepartment(""))
                  }
                  disabled={submitting}
                >
                  <option value="">
                    選択してください
                  </option>
                  <option value="1年">1年</option>
                  <option value="2年">2年</option>
                  <option value="3年">3年</option>
                  <option value="4年">4年</option>
                  <option value="教職員">教職員</option>
                  <option value="その他">
                    その他
                  </option>
                </select>
              </div>

              {grade !== "教職員" && (
              <div className="field">
                <label htmlFor="department">
                  学科
                </label>

                <select
                  id="department"
                  value={department}
                  onChange={(e) =>
                    setDepartment(e.target.value)
                  }
                  disabled={submitting}
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
              )}

              {/* 参加前アンケートの案内 */}
              <div className="startSurveyNotice">
                <strong>
                  登録後、参加前アンケートがあります
                </strong>
                <p>
                  POKIPO体験による変化を確認するため、
                  簡単なアンケートへの回答をお願いします。
                </p>
              </div>

              {/* データ保存の注意 */}
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

              {/* 利用規約 */}
              <section className="pokipoTermsAgreement">
                <div className="pokipoTermsAgreementHeader">
                  <div>
                    <span>PRIVACY & TERMS</span>
                    <strong>
                      利用規約・プライバシーポリシー
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="pokipoTermsOpenButton"
                    onClick={() => setShowTerms(true)}
                  >
                    内容を確認
                  </button>
                </div>

                <p>
                  POKIPOで取得する情報や、
                  利用目的・管理方法についてご確認ください。
                </p>

                <label className="pokipoTermsCheck">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) =>
                      setTermsAccepted(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    利用規約・プライバシーポリシーに同意します
                  </span>
                </label>
              </section>

              {message && (
                <p className="error">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="primaryButton startButton"
                disabled={
                  submitting || !termsAccepted
                }
              >
                <span>
                  {submitting
                    ? "登録中..."
                    : termsAccepted
                      ? "次へ進む"
                      : "規約への同意が必要です"}
                </span>
                <span>→</span>
              </button>
            </form>

            <p className="startFooter">
              登録した情報は、
              POKIPOの運営・進捗管理・企画分析に使用します。
            </p>
          </section>
        </main>

        {/* 利用規約モーダル */}
        {showTerms && (
          <div className="pokipoTermsOverlay">
            <section
              className="pokipoTermsModal"
              role="dialog"
              aria-modal="true"
              aria-label="POKIPO 利用規約・プライバシーポリシー"
            >
              <header className="pokipoTermsModalHeader">
                <div>
                  <span>
                    POKIPO PRIVACY & TERMS
                  </span>
                  <h2>
                    利用規約・
                    <br />
                    プライバシーポリシー
                  </h2>
                </div>

                <button
                  type="button"
                  className="pokipoTermsCloseIcon"
                  onClick={() => setShowTerms(false)}
                  aria-label="閉じる"
                >
                  ×
                </button>
              </header>

              <div className="pokipoTermsModalBody">
                <section>
                  <h3>1. POKIPOについて</h3>
                  <p>
                    POKIPOは、獨協大学内で実施するスタンプラリー企画の運営、
                    参加状況の確認、企画効果の分析などを目的として提供するWebサービスです。
                  </p>
                </section>

                <section>
                  <h3>2. 取得する情報</h3>
                  <p>
                    POKIPOでは、企画運営に必要な範囲で以下の情報を取得します。
                  </p>
                  <ul>
                    <li>ニックネーム</li>
                    <li>学年・所属</li>
                    <li>学科</li>
                    <li>スタンプの取得状況</li>
                    <li>豆知識の取得状況</li>
                    <li>POKIPOの達成状況</li>
                    <li>
                      参加前・参加後アンケートの回答内容
                    </li>
                    <li>
                      特典交換に必要な確認番号、QRコードに関する情報
                    </li>
                    <li>特典交換の実施状況</li>
                  </ul>
                </section>

                <section className="pokipoTermsImportant">
                  <strong>
                    POKIPOでは個人を直接特定する情報は取得しません
                  </strong>
                  <p>
                    また、住所、電話番号、個人のメールアドレスなど、
                    参加者本人を直接特定することを目的とした情報は取得しません。
                  </p>
                </section>

                <section>
                  <h3>3. 情報の利用目的</h3>
                  <p>
                    取得した情報は、以下の目的で利用します。
                  </p>
                  <ul>
                    <li>POKIPOの運営</li>
                    <li>
                      参加状況やスタンプ進捗の確認
                    </li>
                    <li>特典交換の確認</li>
                    <li>アンケート結果の分析</li>
                    <li>企画の効果測定</li>
                    <li>
                      運営上必要なトラブル対応
                    </li>
                  </ul>
                  <p>
                    取得した情報を、これらの目的と関係のない用途で利用することはありません。
                  </p>
                </section>

                <section>
                  <h3>4. ブラウザ内に保存される情報</h3>
                  <p>
                    POKIPOでは、スタンプや豆知識などの一部の進捗情報を、
                    利用している端末のブラウザ内にも保存します。
                  </p>
                  <p>
                    Cookie、サイトデータ、閲覧データなどを削除した場合や、
                    シークレットモード・プライベートブラウズを利用した場合、
                    進捗情報が正しく引き継がれない場合があります。
                  </p>
                </section>

                <section>
                  <h3>5. 情報の保存・管理</h3>
                  <p>
                    参加情報、スタンプ取得状況、アンケート回答、
                    特典交換状況などの一部の情報は、
                    POKIPOのシステム上に保存されます。
                  </p>
                  <p>
                    これらの情報は、POKIPOの運営メンバーが、
                    企画運営上必要な範囲で確認する場合があります。
                  </p>
                  <p>
                    情報の漏えい、紛失、不正アクセスなどを防止するため、
                    適切な管理に努めます。
                  </p>
                </section>

                <section>
                  <h3>6. 第三者への提供</h3>
                  <p>
                    取得した情報を、参加者本人の同意なく、
                    POKIPOの運営目的と関係のない第三者へ提供することはありません。
                  </p>
                  <p>
                    ただし、法令に基づく場合や、
                    システムの安全確保のために必要な場合を除きます。
                  </p>
                </section>

                <section>
                  <h3>7. 情報の保管期間</h3>
                  <p>
                    取得した情報は、企画終了後も、
                    企画結果の分析や報告に必要な範囲で一定期間保管する場合があります。
                  </p>
                  <p>
                    企画運営上の必要性がなくなった情報については、
                    適切に削除または管理します。
                  </p>
                </section>

                <section>
                  <h3>8. セキュリティについて</h3>
                  <p>
                    POKIPOでは、取得した情報を安全に取り扱うため、
                    適切なセキュリティ対策と管理に努めます。
                  </p>
                  <p>
                    ただし、インターネットを利用したサービスであるため、
                    通信環境や利用端末の状態などにより、
                    完全な安全性を保証できない場合があります。
                  </p>
                </section>

                <section>
                  <h3>9. 利用について</h3>
                  <p>
                    参加者は、本規約およびプライバシーポリシーの内容を確認し、
                    同意したうえでPOKIPOを利用するものとします。
                  </p>
                </section>
              </div>

              <div className="pokipoTermsModalFooter">
                <label className="pokipoTermsModalCheck">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) =>
                      setTermsAccepted(
                        event.target.checked
                      )
                    }
                  />
                  <span>
                    内容を確認し、同意します
                  </span>
                </label>

                <button
                  type="button"
                  className="pokipoTermsAgreeButton"
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowTerms(false);
                    setMessage("");
                  }}
                >
                  同意して閉じる
                </button>

                <button
                  type="button"
                  className="pokipoTermsBackButton"
                  onClick={() => setShowTerms(false)}
                >
                  閉じる
                </button>
              </div>
            </section>
          </div>
        )}

        {/* 既存イントロ動画・カーテン演出 */}
        {showIntro && (
          <div className="pokipoIntroOverlay">
            <video
              ref={videoRef}
              className="pokipoIntroVideo"
              playsInline
              preload={ENABLE_INTRO_VIDEO ? "auto" : "none"}
              onEnded={finishIntro}
              onError={(event) => {
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
                src={INTRO_VIDEO_PATH}
                type="video/mp4"
              />
            </video>

            <div className="pokipoIntroShade" />

            {!introStarted && !curtainClosing && (
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

                <p>スタートして、POKIPOの世界へ進もう。</p>

                <button
                  type="button"
                  className="pokipoIntroStartButton"
                  onClick={() => void startIntro()}
                >
                  <span>▶</span>
                  スタート
                </button>

                {videoError && (
                  <p className="pokipoIntroError">
                    {videoError}
                  </p>
                )}
              </div>
            )}

            {introStarted && !curtainClosing && (
              <button
                type="button"
                className="pokipoIntroSkip"
                onClick={skipIntro}
              >
                スキップ
              </button>
            )}

            {introStarted && !curtainClosing && (
              <div className="pokipoIntroSound">
                🔊 SOUND ON
              </div>
            )}

            <div
              className={[
                "pokipoCurtain",
                curtainClosing ? "closing" : "",
                curtainOpening ? "opening" : "",
              ].join(" ")}
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
                <span>POKIPO</span>
                <small>SHARE HAPPINESS</small>
              </div>
            </div>
          </div>
        )}
      </>
    
  );
}