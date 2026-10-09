
"use client";

import type { ReactNode } from "react";
import { pokipoSpots } from "../app/data/pokipo-data";

/* ========================================
   TYPES
======================================== */

type Props = {
  scans: string[];
  cameraOpen: boolean;
  cameraError: string;
  message: string;

  onStartCamera: () => void;
  onStopCamera: () => void | Promise<void>;
  onBack: () => void;

  cameraReaderId: string;

  testMode?: boolean;
  disabled?: boolean;

  children?: ReactNode;
};

/* ========================================
   CAMPUS MAP
======================================== */

const mapPins = [
  {
    id: "spot1",
    number: 1,
    label: "学生センター 1F",
    top: "38%",
    left: "50%",
  },
  {
    id: "spot2",
    number: 2,
    label: "東棟 2F",
    top: "54%",
    left: "50%",
  },
  {
    id: "spot3",
    number: 3,
    label: "中央棟 1F",
    top: "52%",
    left: "36.5%",
  },
  {
    id: "spot4",
    number: 4,
    label: "西棟 3F",
    top: "56%",
    left: "18%",
  },
  {
    id: "spot5",
    number: 5,
    label: "35周年記念館 1F",
    top: "78%",
    left: "62.5%",
  },
];

/* ========================================
   SHARED SCREEN
======================================== */

export default function PokipoStampScreen({
  scans,
  cameraOpen,
  cameraError,
  message,
  onStartCamera,
  onStopCamera,
  onBack,
  cameraReaderId,
  testMode = false,
  disabled = false,
  children,
}: Props) {
  const collectedIds = new Set(scans);

  const count = Math.min(
    collectedIds.size,
    5
  );

  const completed = count >= 5;

  function showMapSpot(spotId: string) {
    const spot = pokipoSpots.find(
      (item) => item.id === spotId
    );

    if (spot) {
      window.alert(
        `${spot.number}番：${spot.spotName}`
      );
    }
  }

  return (
    <section className="card stampPage">
      {/* HEADER */}
      <header className="stampHeader">
        <button
          type="button"
          className="backButton"
          onClick={onBack}
        >
          ←
        </button>

        <div>
          <p className="stampEyebrow">
            POCKY JOURNEY
          </p>

          <h1>スタンプラリー</h1>
        </div>

        <div className="stampCountBadge">
          {count}/5
        </div>
      </header>

      {/* TEST MODE NOTICE */}
      {testMode && (
        <section
          style={{
            padding: 16,
            borderRadius: 14,
            background: "#fff4e9",
            border: "1px solid #efc89b",
            marginBottom: 20,
            lineHeight: 1.8,
          }}
        >
          <strong>LiPost 動作確認モード</strong>
          <p style={{ margin: "6px 0 0" }}>
            本番参加者と同じ画面を使用しています。
            スタンプの保存先は検証専用です。
          </p>
        </section>
      )}

      {/* PROGRESS */}
      <section className="stampProgressCard">
        <div className="stampProgressTop">
          <div>
            <p>現在の進捗</p>

            <h2>
              {completed
                ? "全スポット制覇！"
                : `あと${5 - count}か所`}
            </h2>
          </div>

          <strong>{count * 20}%</strong>
        </div>

        <div className="progressBar">
          <div
            className="progressBarFill"
            style={{
              width: `${count * 20}%`,
            }}
          />
        </div>
      </section>

      {/* QR SCANNER */}
      <section className="qrScannerSection">
        {!cameraOpen ? (
          <button
            type="button"
            className="qrCameraButton"
            onClick={onStartCamera}
            disabled={disabled}
          >
            <span className="qrCameraIcon">
              QR
            </span>

            <span>
              <strong>
                QRコードを読み取る
              </strong>

              <small>
                5か所どこからでもOK
              </small>
            </span>

            <span className="buttonArrow">
              ›
            </span>
          </button>
        ) : (
          <div className="qrCameraPanel">
            <div className="qrCameraHeader">
              <div>
                <p>QR SCANNER</p>
                <h2>
                  QRを枠内に合わせてください
                </h2>
              </div>

              <button
                type="button"
                className="qrCloseButton"
                onClick={() => {
                  void onStopCamera();
                }}
              >
                ×
              </button>
            </div>

            <div
              id={cameraReaderId}
              className="qrReader"
            />

            <p className="qrCameraHelp">
              QRコード全体が枠内に入るようにしてください。
            </p>
          </div>
        )}

        {cameraError && (
          <div
            className="qrScanMessage errorMessage"
            role="alert"
          >
            <span className="qrScanMessageIcon">
              !
            </span>

            <div>
              <span>CAMERA ERROR</span>
              <strong>{cameraError}</strong>
            </div>
          </div>
        )}

        {message && (
          <div
            className="qrScanMessage"
            role="status"
          >
            <span className="qrScanMessageIcon">
              !
            </span>

            <div>
              <span>QR MESSAGE</span>
              <strong>{message}</strong>
            </div>
          </div>
        )}
      </section>

      {/* CAMPUS MAP */}
      <section className="stampMapSection">
        <div className="stampMapHeader">
          <div>
            <p className="stampMapEyebrow">
              CAMPUS MAP
            </p>

            <h2>スポットマップ</h2>
          </div>

          <span className="stampMapNote">
            ①〜⑤の掲示場所
          </span>
        </div>

        <div className="stampMapCard">
          <div className="stampMapImageWrap">
            <img
              src="/images/pokipo-campus-map.png"
              alt="POKIPO スタンプラリーキャンパスマップ"
              className="stampMapImage"
            />

            {mapPins.map((pin) => {
              const collected =
                collectedIds.has(pin.id);

              return (
                <button
                  key={pin.id}
                  type="button"
                  className={
                    collected
                      ? "stampMapPin collected"
                      : "stampMapPin"
                  }
                  style={{
                    top: pin.top,
                    left: pin.left,
                  }}
                  onClick={() =>
                    showMapSpot(pin.id)
                  }
                >
                  <span className="stampMapPinNumber">
                    <span>
                      {collected
                        ? "✓"
                        : pin.number}
                    </span>
                  </span>

                  <span className="stampMapPinLabel">
                    {pin.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SPOT LIST */}
      <section className="spotList">
        {pokipoSpots.map((spot) => {
          const collected =
            collectedIds.has(spot.id);

          return (
            <article
              key={spot.id}
              className={[
                "spotCard",
                collected
                  ? "collected"
                  : "available",
              ].join(" ")}
            >
              <div className="spotTimeline">
                <div className="spotCircle">
                  {collected
                    ? "✓"
                    : spot.number}
                </div>

                {spot.number < 5 && (
                  <div className="spotLine" />
                )}
              </div>

              <div className="spotContent">
                <p className="spotStatus">
                  {collected
                    ? "STAMP GET!"
                    : "AVAILABLE"}
                </p>

                <h2>{spot.spotName}</h2>

                <p>
                  {collected
                    ? "このスポットはクリア済みです。"
                    : "この場所のQRコードを見つけて読み込もう！"}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* COMPLETE */}
      {completed && (
        <button
          type="button"
          className="mainActionButton"
          onClick={onBack}
        >
          <span>
            <strong>
              コンプリート！
            </strong>

            <small>
              {testMode
                ? "動作確認メニューで結果を確認しよう"
                : "トップ画面で特典を確認しよう"}
            </small>
          </span>

          <span className="buttonArrow">
            ›
          </span>
        </button>
      )}

      {children}
    </section>
  );
}
