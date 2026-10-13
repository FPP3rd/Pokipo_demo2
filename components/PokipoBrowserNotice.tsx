"use client";

import { useState } from "react";

type Props = {
  onContinue: () => void;
};

export default function PokipoBrowserNotice({
  onContinue,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const appUrl = "https://pokipo.vercel.app/";

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <main className="browserNoticePage">
      <div className="browserNoticeGlow glowOne" />
      <div className="browserNoticeGlow glowTwo" />

      <section className="browserNoticeCard">
        <div className="browserNoticeEyebrow">
          POKIPO
          <span className="browserNoticeEyebrowDot">●</span>
          BEFORE YOU START
        </div>

        <div className="browserNoticeVisual">
          <div className="browserNoticeOrbit orbitOne" />
          <div className="browserNoticeOrbit orbitTwo" />

          <div className="browserNoticePhone">
            <div className="browserNoticePhoneCamera" />
            <div className="browserNoticePhoneScreen">
              <div className="browserNoticeAppIcons">
                <span>LINE</span>
                <span>IG</span>
              </div>

              <div className="browserNoticeArrow">↑</div>

              <div className="browserNoticeBrowserIcons">
                <span>Chrome</span>
                <span>Safari</span>
              </div>
            </div>
          </div>

          <div className="browserNoticeFloatIcon">
            ↗
          </div>
        </div>

        <div className="browserNoticeHead">
          <span className="browserNoticeTag">
            ご利用前のお願い
          </span>

          <h1>
            ブラウザを確認してから
            <span>POKIPOを始めよう！</span>
          </h1>

          <p className="browserNoticeLead">
            LINE・Instagramなどのアプリ内部ブラウザから
            アクセスいただいた方へ
          </p>
        </div>

        <div className="browserNoticeMessage">
          POKIPOは
          <strong> Chrome または Safari </strong>
          でのご利用を前提に作られています。
          <p>
            アプリ内部のブラウザでは、
            一部の機能が正常に動作しない場合があります。
          </p>
        </div>

        <div className="browserNoticeSteps">
          <div className="browserNoticeStep">
            <div className="browserNoticeStepNumber">01</div>

            <div>
              <strong>URLをコピーする</strong>
              <p>
                下のボタンでPOKIPOのURLをコピーし、
                ChromeまたはSafariのアドレス欄に
                貼り付けてください。
              </p>
            </div>
          </div>

          <div className="browserNoticeOr">
            または
          </div>

          <div className="browserNoticeStep">
            <div className="browserNoticeStepNumber">02</div>

            <div>
              <strong>アプリのメニューから開く</strong>
              <p>
                画面上部や下部の「︙」「…」などを押し、
                「ブラウザで開く」
                「Chromeで開く」
                「Safariで開く」などを選択してください。
              </p>
              <small>
                ※表示される項目はアプリや機種によって異なります。
              </small>
            </div>
          </div>
        </div>

        <div className="browserNoticeCopyArea">
          <div className="browserNoticeUrl">
            {appUrl}
          </div>

          <button
            type="button"
            className={
              copied
                ? "browserNoticeCopyButton copied"
                : "browserNoticeCopyButton"
            }
            onClick={() => void copyUrl()}
          >
            {copied ? "✓ URLをコピーしました" : "URLをコピーする"}
          </button>

          {copyError && (
            <p className="browserNoticeCopyError">
              自動コピーできませんでした。
              上のURLを長押ししてコピーしてください。
            </p>
          )}
        </div>

        <div className="browserNoticeContinueArea">
          <p>
            すでにChrome・Safariで開いている方は
            そのままお進みください。
          </p>

          <button
            type="button"
            className="browserNoticeContinue"
            onClick={onContinue}
          >
            <span>確認しました・次へ進む</span>
            <span className="browserNoticeButtonArrow">→</span>
          </button>

          <small>
            次の画面でPOKIPOのイントロが始まります
          </small>
        </div>
      </section>

      <style jsx>{`
        .browserNoticePage {
          position: relative;
          isolation: isolate;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 26px 15px 48px;
          background: linear-gradient(
            145deg,
            #fff8f3 0%,
            #ffede6 52%,
            #fff9f4 100%
          );
        }

        .browserNoticeGlow {
          position: absolute;
          z-index: -1;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(20px);
          opacity: 0.5;
          pointer-events: none;
        }

        .glowOne {
          top: -130px;
          right: -110px;
          background: #ffb7ae;
          animation: glowMove 7s ease-in-out infinite alternate;
        }

        .glowTwo {
          bottom: -170px;
          left: -120px;
          background: #ffd0ae;
          animation: glowMove 8s ease-in-out infinite alternate-reverse;
        }

        .browserNoticeCard {
          width: 100%;
          max-width: 470px;
          padding: 27px 23px 30px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #f0dad1;
          border-radius: 27px;
          box-shadow: 0 22px 65px rgba(120, 56, 43, 0.11);
          animation: noticeEnter 0.75s cubic-bezier(.2,.8,.2,1) both;
        }

        .browserNoticeEyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #b52a34;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .browserNoticeEyebrowDot {
          font-size: 6px;
          color: #e5a6a2;
        }

        .browserNoticeVisual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 184px;
          margin: 6px 0 20px;
        }

        .browserNoticeOrbit {
          position: absolute;
          width: 165px;
          height: 165px;
          border: 1px dashed #f2aaa7;
          border-radius: 50%;
        }

        .orbitOne {
          animation: orbitSpin 19s linear infinite;
        }

        .orbitTwo {
          width: 200px;
          height: 200px;
          opacity: 0.5;
          animation: orbitSpin 28s linear infinite reverse;
        }

        .browserNoticePhone {
          position: relative;
          width: 116px;
          height: 163px;
          padding: 9px 7px;
          border: 5px solid #422b31;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 15px 28px rgba(71, 32, 40, 0.18);
          transform: rotate(-7deg);
          animation: phoneFloat 3.3s ease-in-out infinite;
        }

        .browserNoticePhoneCamera {
          position: absolute;
          z-index: 2;
          top: 5px;
          left: 50%;
          width: 28px;
          height: 5px;
          background: #422b31;
          border-radius: 10px;
          transform: translateX(-50%);
        }

        .browserNoticePhoneScreen {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          align-items: center;
          padding: 10px 3px;
          border-radius: 14px;
          background: linear-gradient(#fff3f0, #ffe0d7);
        }

        .browserNoticeAppIcons,
        .browserNoticeBrowserIcons {
          display: flex;
          gap: 5px;
        }

        .browserNoticeAppIcons span,
        .browserNoticeBrowserIcons span {
          padding: 5px 6px;
          border-radius: 7px;
          background: white;
          color: #65434a;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .browserNoticeArrow {
          color: #d52938;
          font-size: 35px;
          font-weight: 900;
          animation: arrowJump 1.5s ease-in-out infinite;
        }

        .browserNoticeFloatIcon {
          position: absolute;
          top: 20px;
          right: calc(50% - 102px);
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #d72b38;
          color: white;
          font-size: 24px;
          box-shadow: 0 8px 20px rgba(215, 43, 56, 0.25);
          animation: floatIcon 2.4s ease-in-out infinite;
        }

        .browserNoticeHead {
          text-align: center;
        }

        .browserNoticeTag {
          display: inline-block;
          margin-bottom: 10px;
          padding: 7px 13px;
          color: #c32632;
          background: #fff0ed;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 900;
        }

        .browserNoticeHead h1 {
          margin: 0 0 16px;
          color: #35252a;
          font-size: clamp(22px, 6vw, 28px);
          line-height: 1.55;
          letter-spacing: -0.04em;
        }

        .browserNoticeHead h1 span {
          display: block;
          color: #cf2331;
        }

        .browserNoticeLead {
          margin: 0 0 20px;
          color: #694e49;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.8;
        }

        .browserNoticeMessage {
          padding: 17px 16px;
          background: #fff4ed;
          border-left: 4px solid #d32b36;
          border-radius: 12px;
          font-size: 13px;
          color: #593b36;
          line-height: 1.9;
        }

        .browserNoticeMessage strong {
          color: #c32230;
        }

        .browserNoticeMessage p {
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.8;
        }

        .browserNoticeSteps {
          margin-top: 23px;
          display: grid;
          gap: 13px;
        }

        .browserNoticeStep {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .browserNoticeStepNumber {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          background: #d12a37;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .browserNoticeStep strong {
          display: block;
          margin: 2px 0 5px;
          font-size: 14px;
          color: #35252a;
        }

        .browserNoticeStep p {
          margin: 0;
          font-size: 12px;
          line-height: 1.85;
          color: #79635c;
        }

        .browserNoticeStep small {
          display: block;
          margin-top: 5px;
          color: #98827b;
          font-size: 10px;
          line-height: 1.7;
        }

        .browserNoticeOr {
          margin-left: 47px;
          color: #a58c82;
          font-size: 11px;
          font-weight: 900;
        }

        .browserNoticeCopyArea {
          margin-top: 24px;
          padding: 15px;
          border-radius: 15px;
          background: #f8f5f3;
        }

        .browserNoticeUrl {
          padding: 9px 6px;
          text-align: center;
          color: #594947;
          font-size: 13px;
          font-weight: 800;
          overflow-wrap: anywhere;
          user-select: all;
        }

        .browserNoticeCopyButton {
          display: block;
          width: 100%;
          min-height: 48px;
          margin: 7px 0 0;
          border: 1px solid #d22b38;
          border-radius: 12px;
          background: #fff;
          color: #bd2430;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
        }

        .browserNoticeCopyButton.copied {
          background: #edf8f1;
          border-color: #68a981;
          color: #237744;
        }

        .browserNoticeCopyError {
          margin: 8px 0 0;
          color: #b52b35;
          font-size: 11px;
          line-height: 1.7;
        }

        .browserNoticeContinueArea {
          margin-top: 24px;
          text-align: center;
        }

        .browserNoticeContinueArea p {
          margin: 0 0 12px;
          font-size: 12px;
          color: #87716a;
          line-height: 1.8;
        }

        .browserNoticeContinue {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          width: 100%;
          min-height: 57px;
          margin: 0;
          border: none;
          border-radius: 15px;
          background: linear-gradient(120deg, #ed424b, #bd1428);
          color: white;
          font-weight: 900;
          font-size: 14px;
          box-shadow: 0 12px 26px rgba(198, 29, 44, 0.21);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .browserNoticeContinue:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 29px rgba(198, 29, 44, 0.28);
        }

        .browserNoticeButtonArrow {
          display: inline-block;
          color: white;
          font-size: 23px;
          animation: arrowRight 1.3s ease-in-out infinite;
        }

        .browserNoticeContinueArea small {
          display: block;
          margin-top: 13px;
          color: #aa948c;
          font-size: 11px;
        }

        @keyframes noticeEnter {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes phoneFloat {
          0%, 100% {
            transform: translateY(0) rotate(-7deg);
          }
          50% {
            transform: translateY(-9px) rotate(-3deg);
          }
        }

        @keyframes arrowJump {
          0%, 100% { transform: translateY(4px); }
          50% { transform: translateY(-7px); }
        }

        @keyframes arrowRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0) rotate(-7deg); }
          50% { transform: translateY(-8px) rotate(6deg); }
        }

        @keyframes orbitSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes glowMove {
          to { transform: translate(40px, 25px); }
        }

        @media (max-width: 420px) {
          .browserNoticeCard {
            padding: 22px 16px 25px;
          }
          .browserNoticeVisual {
            height: 155px;
          }
          .browserNoticeOrbit {
            width: 140px;
            height: 140px;
          }
          .orbitTwo {
            width: 174px;
            height: 174px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .browserNoticePage *,
          .browserNoticePage *::before,
          .browserNoticePage *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}