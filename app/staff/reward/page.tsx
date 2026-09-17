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
  Html5Qrcode,
} from "html5-qrcode";

import {
  supabase,
} from "../../../lib/supabase-client";

/* ========================================
   TYPES
======================================== */

type RewardExchange = {
  id: string;

  participant_id: string;

  student_number: string;

  exchange_token: string;

  status: string;

  created_at: string;

  exchanged_at:
    | string
    | null;

  exchanged_by:
    | string
    | null;
};

type Participant = {
  id: string;

  nickname: string;

  grade:
    | string
    | null;

  department:
    | string
    | null;

  created_at: string;
};

type DuplicateExchange = {
  id: string;

  student_number: string;

  status: string;

  exchanged_at:
    | string
    | null;

  created_at: string;
};

/* ========================================
   PAGE
======================================== */

export default function StaffRewardPage() {
  const router =
    useRouter();

  /* ========================================
     AUTH
  ======================================== */

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  /* ========================================
     CAMERA
  ======================================== */

  const [
    cameraOpen,
    setCameraOpen,
  ] = useState(false);

  const [
    cameraError,
    setCameraError,
  ] = useState("");

  const scannerRef =
    useRef<Html5Qrcode | null>(
      null
    );

  const scanningRef =
    useRef(false);

  const processingRef =
    useRef(false);

  /* ========================================
     REWARD
  ======================================== */

  const [
    reward,
    setReward,
  ] =
    useState<RewardExchange | null>(
      null
    );

  const [
    participant,
    setParticipant,
  ] =
    useState<Participant | null>(
      null
    );

  const [
    loadingReward,
    setLoadingReward,
  ] = useState(false);

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  /* ========================================
     DUPLICATE CHECK
  ======================================== */

  const [
    duplicateExchanges,
    setDuplicateExchanges,
  ] =
    useState<DuplicateExchange[]>(
      []
    );

  const [
    checkingDuplicate,
    setCheckingDuplicate,
  ] = useState(false);

  const [
    showDuplicateWarning,
    setShowDuplicateWarning,
  ] = useState(false);

  /* ========================================
     AUTH CHECK
  ======================================== */

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (
          error
        ) {
          console.error(
            "スタッフ認証確認エラー:",
            error
          );

          setAuthenticated(
            false
          );

          return;
        }

        setAuthenticated(
          Boolean(
            data.session
          )
        );
      } finally {
        setAuthLoading(
          false
        );
      }
    }

    void checkSession();

    const {
      data:
        authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          setAuthenticated(
            Boolean(
              session
            )
          );
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ========================================
     LOGIN
  ======================================== */

  async function loginStaff() {
    const normalizedEmail =
      email.trim();

    if (
      !normalizedEmail ||
      !password
    ) {
      setMessage(
        "メールアドレスとパスワードを入力してください。"
      );

      return;
    }

    setLoginLoading(
      true
    );

    setMessage("");

    try {
      const {
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            normalizedEmail,

          password,
        });

      if (
        error
      ) {
        console.error(
          "スタッフログインエラー:",
          error
        );

        setMessage(
          "ログインできませんでした。メールアドレスとパスワードを確認してください。"
        );

        return;
      }

      setAuthenticated(
        true
      );

      setPassword("");

      router.replace(
        "/staff"
      );
    } catch (
      error
    ) {
      console.error(
        "スタッフログイン通信エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setLoginLoading(
        false
      );
    }
  }

  /* ========================================
     LOGOUT
  ======================================== */

  async function logoutStaff() {
    await stopQrScanner();

    await supabase.auth.signOut();

    setAuthenticated(
      false
    );

    setReward(
      null
    );

    setParticipant(
      null
    );

    setDuplicateExchanges(
      []
    );

    setShowDuplicateWarning(
      false
    );

    setMessage("");

    router.replace(
      "/staff/reward"
    );
  }

  /* ========================================
     CAMERA EFFECT
  ======================================== */

  useEffect(() => {
    if (
      !cameraOpen ||
      !authenticated
    ) {
      return;
    }

    let cancelled =
      false;

    async function startCamera() {
      const readerElement =
        document.getElementById(
          "staff-reward-qr-reader"
        );

      if (
        !readerElement
      ) {
        setCameraError(
          "QR読み取りエリアを表示できませんでした。"
        );

        setCameraOpen(
          false
        );

        return;
      }

      try {
        const scanner =
          new Html5Qrcode(
            "staff-reward-qr-reader"
          );

        scannerRef.current =
          scanner;

        scanningRef.current =
          true;

        processingRef.current =
          false;

        await scanner.start(
          {
            facingMode:
              "environment",
          },

          {
            fps:
              10,

            qrbox: {
              width:
                240,

              height:
                240,
            },
          },

          async (
            decodedText
          ) => {
            if (
              cancelled ||
              processingRef.current
            ) {
              return;
            }

            processingRef.current =
              true;

            const qrValue =
              decodedText.trim();

            await stopQrScanner();

            await readRewardQr(
              qrValue
            );
          },

          () => {
            /*
              読み取り途中のエラーは
              表示しない
            */
          }
        );
      } catch (
        error
      ) {
        console.error(
          "スタッフQRカメラエラー:",
          error
        );

        scannerRef.current =
          null;

        scanningRef.current =
          false;

        processingRef.current =
          false;

        setCameraOpen(
          false
        );

        setCameraError(
          "カメラを起動できませんでした。ブラウザのカメラ使用を許可してください。"
        );
      }
    }

    void startCamera();

    return () => {
      cancelled =
        true;
    };
  }, [
    cameraOpen,
    authenticated,
  ]);

  /* ========================================
     START CAMERA
  ======================================== */

  function startQrScanner() {
    setReward(
      null
    );

    setParticipant(
      null
    );

    setDuplicateExchanges(
      []
    );

    setShowDuplicateWarning(
      false
    );

    setMessage("");

    setCameraError("");

    processingRef.current =
      false;

    setCameraOpen(
      true
    );
  }

  /* ========================================
     STOP CAMERA
  ======================================== */

  async function stopQrScanner() {
    const scanner =
      scannerRef.current;

    scannerRef.current =
      null;

    if (
      !scanner
    ) {
      scanningRef.current =
        false;

      setCameraOpen(
        false
      );

      return;
    }

    try {
      if (
        scanningRef.current
      ) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (
      error
    ) {
      console.error(
        "スタッフQR停止エラー:",
        error
      );
    } finally {
      scanningRef.current =
        false;

      processingRef.current =
        false;

      setCameraOpen(
        false
      );
    }
  }

  /* ========================================
     DUPLICATE HISTORY
  ======================================== */

  async function loadDuplicateExchangeHistory(
    studentNumber: string,
    currentRewardId: string
  ) {
    setCheckingDuplicate(
      true
    );

    setDuplicateExchanges(
      []
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "reward_exchanges"
          )
          .select(
            "id, student_number, status, exchanged_at, created_at"
          )
          .eq(
            "student_number",
            studentNumber
          )
          .eq(
            "status",
            "exchanged"
          )
          .neq(
            "id",
            currentRewardId
          )
          .order(
            "exchanged_at",
            {
              ascending:
                false,
            }
          );

      if (
        error
      ) {
        console.error(
          "重複交換履歴確認エラー:",
          error
        );

        setMessage(
          "同一学籍番号の過去交換履歴を確認できませんでした。交換前に管理者へ確認してください。"
        );

        return;
      }

      setDuplicateExchanges(
        (
          data ?? []
        ) as DuplicateExchange[]
      );
    } catch (
      error
    ) {
      console.error(
        "重複交換履歴通信エラー:",
        error
      );

      setMessage(
        "過去の交換履歴確認中に通信エラーが発生しました。"
      );
    } finally {
      setCheckingDuplicate(
        false
      );
    }
  }

  /* ========================================
     READ QR
  ======================================== */

  async function readRewardQr(
    qrValue: string
  ) {
    const prefix =
      "POKIPO_REWARD:";

    setDuplicateExchanges(
      []
    );

    setShowDuplicateWarning(
      false
    );

    if (
      !qrValue.startsWith(
        prefix
      )
    ) {
      setMessage(
        "POKIPOの特典交換QRではありません。"
      );

      return;
    }

    const token =
      qrValue.slice(
        prefix.length
      );

    if (
      !token
    ) {
      setMessage(
        "QRコードの情報を確認できませんでした。"
      );

      return;
    }

    setLoadingReward(
      true
    );

    setMessage("");

    try {
      /* =================================
         REWARD
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
            "id, participant_id, student_number, exchange_token, status, created_at, exchanged_at, exchanged_by"
          )
          .eq(
            "exchange_token",
            token
          )
          .single();

      if (
        rewardError ||
        !rewardData
      ) {
        console.error(
          "交換QR検索エラー:",
          rewardError
        );

        setMessage(
          "この交換用QRを確認できませんでした。"
        );

        return;
      }

      /* =================================
         PARTICIPANT
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
            "id, nickname, grade, department, created_at"
          )
          .eq(
            "id",
            rewardData.participant_id
          )
          .single();

      if (
        participantError ||
        !participantData
      ) {
        console.error(
          "参加者検索エラー:",
          participantError
        );

        setMessage(
          "参加者情報を確認できませんでした。"
        );

        return;
      }

      setReward(
        rewardData as RewardExchange
      );

      setParticipant(
        participantData as Participant
      );

      /* =================================
         DUPLICATE CHECK
      ================================= */

      await loadDuplicateExchangeHistory(
        rewardData.student_number,
        rewardData.id
      );
    } catch (
      error
    ) {
      console.error(
        "QR確認エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setLoadingReward(
        false
      );
    }
  }

  /* ========================================
     CONFIRM BUTTON
  ======================================== */

  function confirmExchange() {
    if (
      !reward ||
      !participant
    ) {
      return;
    }

    if (
      reward.status ===
      "exchanged"
    ) {
      setMessage(
        "このQRはすでに景品交換済みです。"
      );

      return;
    }

    if (
      checkingDuplicate
    ) {
      setMessage(
        "過去の交換履歴を確認中です。少し待ってから再度お試しください。"
      );

      return;
    }

    if (
      duplicateExchanges.length >
      0
    ) {
      setShowDuplicateWarning(
        true
      );

      return;
    }

    void performExchange();
  }

  /* ========================================
     ACTUAL EXCHANGE
  ======================================== */

  async function performExchange() {
    if (
      !reward ||
      !participant
    ) {
      return;
    }

    if (
      reward.status ===
      "exchanged"
    ) {
      setMessage(
        "このQRはすでに景品交換済みです。"
      );

      return;
    }

    setConfirming(
      true
    );

    setMessage("");

    try {
      const {
        data:
          userData,
      } =
        await supabase.auth.getUser();

      const staffId =
        userData.user?.id ??
        null;

      const exchangedAt =
        new Date().toISOString();

      const {
        data:
          updatedData,

        error,
      } =
        await supabase
          .from(
            "reward_exchanges"
          )
          .update({
            status:
              "exchanged",

            exchanged_at:
              exchangedAt,

            exchanged_by:
              staffId,
          })
          .eq(
            "id",
            reward.id
          )
          .eq(
            "status",
            "issued"
          )
          .select(
            "id"
          );

      if (
        error
      ) {
        console.error(
          "景品交換更新エラー:",
          error
        );

        setMessage(
          "景品交換を記録できませんでした。"
        );

        return;
      }

      /* =================================
         同時操作対策
      ================================= */

      if (
        !updatedData ||
        updatedData.length ===
          0
      ) {
        setMessage(
          "このQRはすでに交換処理されています。"
        );

        setReward({
          ...reward,

          status:
            "exchanged",
        });

        return;
      }

      setReward({
        ...reward,

        status:
          "exchanged",

        exchanged_at:
          exchangedAt,

        exchanged_by:
          staffId,
      });

      setShowDuplicateWarning(
        false
      );

      if (
        duplicateExchanges.length >
        0
      ) {
        setMessage(
          `${participant.nickname}さんの景品交換を記録しました。同一学籍番号の過去交換履歴がある状態で交換されています。`
        );
      } else {
        setMessage(
          `${participant.nickname}さんの景品交換を記録しました。`
        );
      }
    } catch (
      error
    ) {
      console.error(
        "景品交換エラー:",
        error
      );

      setMessage(
        "通信中にエラーが発生しました。"
      );
    } finally {
      setConfirming(
        false
      );
    }
  }

  /* ========================================
     RESET
  ======================================== */

  function resetScanner() {
    setReward(
      null
    );

    setParticipant(
      null
    );

    setDuplicateExchanges(
      []
    );

    setShowDuplicateWarning(
      false
    );

    setCheckingDuplicate(
      false
    );

    setMessage("");

    startQrScanner();
  }

  /* ========================================
     DATE
  ======================================== */

  function formatExchangeDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "交換日時不明";
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
     AUTH LOADING
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
     LOGIN
  ======================================== */

  if (
    !authenticated
  ) {
    return (
      <main className="shell">

        <section className="staffRewardPage">

          <div className="staffLoginCard">

            <span>
              POKIPO STAFF
            </span>

            <h1>
              スタッフログイン
            </h1>

            <p>
              POKIPO運営スタッフ専用ページです。
              ログイン後、スタッフメニューへ移動します。
            </p>

            <div className="staffLoginField">

              <label htmlFor="staffEmail">
                メールアドレス
              </label>

              <input
                id="staffEmail"
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="username"
                placeholder="staff@example.com"
              />

            </div>

            <div className="staffLoginField">

              <label htmlFor="staffPassword">
                パスワード
              </label>

              <input
                id="staffPassword"
                type="password"
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void loginStaff();
                  }
                }}
              />

            </div>

            <button
              type="button"
              className="staffLoginButton"
              onClick={
                loginStaff
              }
              disabled={
                loginLoading
              }
            >

              {loginLoading
                ? "ログイン中..."
                : "スタッフログイン"}

            </button>

            {message && (
              <p className="staffError">
                {message}
              </p>
            )}

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

        <header className="staffRewardHeader">

          <div>

            <span>
              POKIPO STAFF
            </span>

            <h1>
              景品交換
            </h1>

          </div>

          <div className="staffRewardHeaderActions">

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

            <button
              type="button"
              onClick={
                logoutStaff
              }
            >
              ログアウト
            </button>

          </div>

        </header>

        {/* =================================
            NAV
        ================================= */}

        <section className="staffRewardQuickNav">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff/dashboard"
              )
            }
          >

            <span>
              LIVE
            </span>

            <strong>
              管理ダッシュボード
            </strong>

          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/staff/reward/history"
              )
            }
          >

            <span>
              LOG
            </span>

            <strong>
              交換履歴
            </strong>

          </button>

        </section>

        {/* =================================
            SCANNER
        ================================= */}

        {!reward &&
          !participant && (
            <section className="staffScannerCard">

              <div className="staffScannerIcon">
                QR
              </div>

              <span>
                REWARD SCANNER
              </span>

              <h2>
                参加者のQRを読み取る
              </h2>

              <p>
                参加者の特典交換画面に表示されている
                QRコードを読み取ってください。
              </p>

              {!cameraOpen ? (
                <button
                  type="button"
                  className="staffScannerButton"
                  onClick={
                    startQrScanner
                  }
                >
                  QRカメラを起動
                </button>
              ) : (
                <>

                  <div
                    id="staff-reward-qr-reader"
                    className="staffQrReader"
                  />

                  <button
                    type="button"
                    className="staffScannerCancel"
                    onClick={
                      stopQrScanner
                    }
                  >
                    カメラを閉じる
                  </button>

                </>
              )}

              {cameraError && (
                <p className="staffError">
                  {cameraError}
                </p>
              )}

              {loadingReward && (
                <p className="staffLoadingText">
                  QR情報を確認中...
                </p>
              )}

            </section>
          )}

        {/* =================================
            PARTICIPANT
        ================================= */}

        {reward &&
          participant && (
            <section className="staffParticipantCard">

              <div
                className={
                  reward.status ===
                  "exchanged"
                    ? "staffExchangeStatus exchanged"
                    : "staffExchangeStatus ready"
                }
              >

                {reward.status ===
                "exchanged"
                  ? "交換済み"
                  : "交換可能"}

              </div>

              <span className="staffParticipantEyebrow">
                PARTICIPANT
              </span>

              <h2>
                {participant.nickname}
                <small>
                  さん
                </small>
              </h2>

              {/* INFORMATION */}

              <div className="staffParticipantInfo">

                <div>

                  <span>
                    学籍番号
                  </span>

                  <strong>
                    {reward.student_number}
                  </strong>

                </div>

                <div>

                  <span>
                    学年
                  </span>

                  <strong>
                    {participant.grade ??
                      "未設定"}
                  </strong>

                </div>

                <div>

                  <span>
                    学科
                  </span>

                  <strong>
                    {participant.department ??
                      "未設定"}
                  </strong>

                </div>

              </div>

              {/* DUPLICATE CHECK LOADING */}

              {checkingDuplicate && (
                <div className="staffDuplicateChecking">
                  同じ学籍番号の過去交換履歴を確認中...
                </div>
              )}

              {/* DUPLICATE ALERT */}

              {!checkingDuplicate &&
                duplicateExchanges.length >
                  0 && (
                  <section className="staffDuplicateAlert">

                    <span>
                      DUPLICATE WARNING
                    </span>

                    <h3>
                      同じ学籍番号の交換履歴があります
                    </h3>

                    <p>
                      学籍番号
                      <strong>
                        {reward.student_number}
                      </strong>
                      は、過去にも景品交換が行われています。
                    </p>

                    <div className="staffDuplicateHistory">

                      {duplicateExchanges.map(
                        (
                          exchange,
                          index
                        ) => (
                          <div
                            key={
                              exchange.id
                            }
                          >

                            <span>
                              過去の交換
                              {index + 1}
                            </span>

                            <strong>
                              {formatExchangeDate(
                                exchange.exchanged_at
                              )}
                            </strong>

                          </div>
                        )
                      )}

                    </div>

                    <p className="staffDuplicateAlertImportant">
                      誤って2回目の景品を渡さないよう、
                      本人確認を行ってください。
                    </p>

                  </section>
                )}

              {/* EXCHANGED */}

              {reward.status ===
              "exchanged" ? (
                <div className="staffAlreadyExchanged">

                  <div>
                    ✓
                  </div>

                  <span>
                    REWARD EXCHANGED
                  </span>

                  <h3>
                    このQRは交換済みです
                  </h3>

                  {reward.exchanged_at && (
                    <p>
                      交換日時：
                      {formatExchangeDate(
                        reward.exchanged_at
                      )}
                    </p>
                  )}

                </div>
              ) : (
                <div className="staffExchangeConfirm">

                  <p>
                    学籍番号と参加者名を確認し、
                    景品を渡す直前に交換を確定してください。
                  </p>

                  {duplicateExchanges.length >
                    0 && (
                    <p className="staffExchangeDuplicateNotice">
                      ⚠ 同じ学籍番号の過去交換履歴があります。
                      確定時にもう一度確認画面が表示されます。
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={
                      confirmExchange
                    }
                    disabled={
                      confirming ||
                      checkingDuplicate
                    }
                  >

                    {confirming
                      ? "交換を記録中..."
                      : checkingDuplicate
                      ? "履歴確認中..."
                      : duplicateExchanges.length >
                        0
                      ? "警告を確認して交換へ進む"
                      : "景品交換を確定する"}

                  </button>

                </div>
              )}

              {/* NEXT */}

              <button
                type="button"
                className="staffNextScanButton"
                onClick={
                  resetScanner
                }
              >
                次のQRを読み取る
              </button>

            </section>
          )}

        {/* =================================
            DUPLICATE CONFIRM MODAL
        ================================= */}

        {showDuplicateWarning &&
          reward &&
          participant && (
            <div
              className="staffDuplicateModal"
              role="dialog"
              aria-modal="true"
              aria-label="重複交換警告"
            >

              <div className="staffDuplicateModalCard">

                <div className="staffDuplicateModalIcon">
                  !
                </div>

                <span>
                  DUPLICATE EXCHANGE
                </span>

                <h2>
                  本当に景品を交換しますか？
                </h2>

                <p>
                  この学籍番号では、
                  過去に
                  <strong>
                    {" "}
                    {duplicateExchanges.length}
                    件
                    {" "}
                  </strong>
                  の交換履歴があります。
                </p>

                <div className="staffDuplicateModalStudent">

                  <span>
                    今回の学籍番号
                  </span>

                  <strong>
                    {reward.student_number}
                  </strong>

                </div>

                <div className="staffDuplicateModalHistory">

                  {duplicateExchanges.map(
                    (
                      exchange,
                      index
                    ) => (
                      <div
                        key={
                          exchange.id
                        }
                      >

                        <span>
                          過去の交換
                          {index + 1}
                        </span>

                        <strong>
                          {formatExchangeDate(
                            exchange.exchanged_at
                          )}
                        </strong>

                      </div>
                    )
                  )}

                </div>

                <p className="staffDuplicateModalWarning">
                  本人確認を行い、
                  例外的にもう一度景品を渡してよいと判断した場合のみ
                  「確認して交換する」を押してください。
                </p>

                <div className="staffDuplicateModalActions">

                  <button
                    type="button"
                    className="cancel"
                    disabled={
                      confirming
                    }
                    onClick={() =>
                      setShowDuplicateWarning(
                        false
                      )
                    }
                  >
                    キャンセル
                  </button>

                  <button
                    type="button"
                    className="confirm"
                    disabled={
                      confirming
                    }
                    onClick={() => {
                      setShowDuplicateWarning(
                        false
                      );

                      void performExchange();
                    }}
                  >

                    {confirming
                      ? "交換処理中..."
                      : "確認して交換する"}

                  </button>

                </div>

              </div>

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