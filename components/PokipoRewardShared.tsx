
"use client";

import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

/* ========================================
   REWARD QR TYPES
======================================== */

export type PokipoRewardMode = "production" | "test";

export type PokipoRewardStatus =
  | "not_issued"
  | "issued"
  | "exchanged";

type RewardQrProps = {
  mode: PokipoRewardMode;
  status: PokipoRewardStatus;
  token: string | null;
  confirmationCode: string | null;
  exchangedAt?: string | null;
};

/* ========================================
   QR PAYLOAD

   本番と検証ではQRの形式を分離
======================================== */

export function createPokipoRewardQrValue(
  token: string,
  mode: PokipoRewardMode
): string {
  const prefix =
    mode === "test"
      ? "POKIPO_TEST_REWARD:"
      : "POKIPO_REWARD:";

  return `${prefix}${token}`;
}

/* ========================================
   QR DISPLAY
======================================== */

export function PokipoRewardQrPanel({
  mode,
  status,
  token,
  confirmationCode,
  exchangedAt,
}: RewardQrProps): ReactNode {
  const testMode = mode === "test";

  if (status === "exchanged") {
    return (
      <div className="rewardExchangeComplete">
        <div className="rewardCompleteCheck">
          ✓
        </div>

        <span>
          {testMode
            ? "TEST REWARD EXCHANGED"
            : "REWARD EXCHANGED"}
        </span>

        <h3>
          {testMode
            ? "検証用の交換が完了しました！"
            : "景品交換完了！"}
        </h3>

        {confirmationCode && (
          <p>
            確認番号：{confirmationCode}
          </p>
        )}

        {exchangedAt && (
          <p>
            交換日時：{exchangedAt}
          </p>
        )}

        {testMode && (
          <p>
            この交換結果は検証専用データに
            記録されています。
          </p>
        )}
      </div>
    );
  }

  if (
    status !== "issued" ||
    !token ||
    !confirmationCode
  ) {
    return (
      <div className="rewardExchangeCard">
        <h3>交換用QRコードを準備中です</h3>

        <p>
          画面を再読み込みしても表示されない場合は、
          スタッフまでお声がけください。
        </p>
      </div>
    );
  }

  const qrValue = createPokipoRewardQrValue(
    token,
    mode
  );

  return (
    <div className="rewardExchangeCard rewardQrCard">
      <div className="rewardQrStatus">
        {testMode
          ? "TEST MODE - NOT VALID FOR REWARD"
          : "READY TO EXCHANGE"}
      </div>

      <h3>
        {testMode
          ? "検証用QRコード"
          : "スタッフにQRを見せてください"}
      </h3>

      <p>
        {testMode
          ? "動作確認専用・本番の景品交換には使用できません"
          : "交換日は10月27日（火）です"}
      </p>

      <div className="rewardQrBox">
        <QRCodeSVG
          value={qrValue}
          size={190}
          level="H"
          includeMargin
        />
      </div>

      <div className="rewardConfirmationCode">
        <span>CONFIRMATION NUMBER</span>

        <small>確認番号</small>

        <strong>
          {confirmationCode}
        </strong>

        <p>
          {testMode
            ? "検証用スタッフの読み取り画面で確認してください。"
            : "QRコードとあわせてスタッフに提示してください。"}
        </p>
      </div>
    </div>
  );
}

/* ========================================
   STAFF VERIFICATION TYPES
======================================== */

type StaffVerificationProps = {
  mode: PokipoRewardMode;
  nickname: string;
  confirmationCode: string;
  status: "issued" | "exchanged";

  grade?: string | null;
  department?: string | null;
  exchangedAt?: string | null;

  confirming?: boolean;
  message?: string;
  monitorInfo?: ReactNode;

  onConfirm: () => void;
  onNextScan: () => void;
};

/* ========================================
   STAFF VERIFICATION DISPLAY

   交換確定処理は外部から渡す
======================================== */

export function PokipoStaffRewardVerification({
  mode,
  nickname,
  confirmationCode,
  status,
  grade,
  department,
  exchangedAt,
  confirming = false,
  message,
  monitorInfo,
  onConfirm,
  onNextScan,
}: StaffVerificationProps): ReactNode {
  const testMode = mode === "test";
  const exchanged = status === "exchanged";

  return (
    <section className="staffParticipantCard">
      <div
        className={
          exchanged
            ? "staffExchangeStatus exchanged"
            : "staffExchangeStatus ready"
        }
      >
        {exchanged ? "交換済み" : "交換可能"}
      </div>

      <span className="staffParticipantEyebrow">
        {testMode
          ? "TEST PARTICIPANT"
          : "PARTICIPANT"}
      </span>

      <h2>
        {nickname}
        <small>さん</small>
      </h2>

      {testMode && (
        <p
          style={{
            color: "#bd2838",
            fontWeight: 800,
          }}
        >
          検証専用・本番の交換には使用できません
        </p>
      )}

      {!testMode && monitorInfo}

      <div className="staffConfirmationCode">
        <span>CONFIRMATION NUMBER</span>

        <small>確認番号</small>

        <strong>{confirmationCode}</strong>
      </div>

      {(grade || department) && (
        <div className="staffParticipantInfo">
          <div>
            <span>学年</span>
            <strong>
              {grade ?? "未設定"}
            </strong>
          </div>

          <div>
            <span>学科</span>
            <strong>
              {department ?? "未設定"}
            </strong>
          </div>
        </div>
      )}

      {exchanged ? (
        <div className="staffAlreadyExchanged">
          <div>✓</div>

          <span>REWARD EXCHANGED</span>

          <h3>
            {testMode
              ? "検証用の交換が完了しています"
              : "このQRは交換済みです"}
          </h3>

          {exchangedAt && (
            <p>
              交換日時：{exchangedAt}
            </p>
          )}
        </div>
      ) : (
        <div className="staffExchangeConfirm">
          <p>
            {testMode
              ? "検証用の確認番号を照合して、交換確定の動作を確認してください。本番の景品交換記録や会場モニターは変更しません。"
              : "参加者画面に表示されている確認番号と一致していることを確認し、景品を渡す直前に交換を確定してください。"}
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming
              ? "交換を記録中..."
              : testMode
              ? "検証用の交換を確定する"
              : "景品交換を確定する"}
          </button>
        </div>
      )}

      <button
        type="button"
        className="staffNextScanButton"
        onClick={onNextScan}
        disabled={confirming}
      >
        次のQRを読み取る
      </button>

      {message && (
        <p
          className="staffMessage"
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  );
}
