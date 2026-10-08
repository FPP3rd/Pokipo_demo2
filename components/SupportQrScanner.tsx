
"use client";

import { useEffect, useId, useRef, useState } from "react";

type SupportQrScannerProps = {
  open: boolean;
  onClose: () => void;
  onDetected: (token: string) => void;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractSupportToken(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("POKIPO_SUPPORT:")) {
    return null;
  }

  const token = trimmed
    .slice("POKIPO_SUPPORT:".length)
    .trim();

  return UUID_PATTERN.test(token) ? token : null;
}

export default function SupportQrScanner({
  open,
  onClose,
  onDetected,
}: SupportQrScannerProps) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const readerId = `pokipo-support-reader-${generatedId}`;

  const onDetectedRef = useRef(onDetected);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let detected = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    setLoading(true);
    setErrorMessage("");

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        const instance = new Html5Qrcode(readerId, {
          verbose: false,
        });

        scanner = instance;

        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: 240,
          },
          (decodedText) => {
            if (cancelled || detected) return;

            const token = extractSupportToken(decodedText);

            if (!token) {
              setErrorMessage(
                "お問い合わせ専用QRではありません。"
              );
              return;
            }

            detected = true;
            onDetectedRef.current(token);
          },
          () => {}
        );

        if (cancelled) {
          await instance.stop().catch(() => undefined);
          instance.clear();
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("QRカメラ起動エラー:", error);

        if (!cancelled) {
          setLoading(false);
          setErrorMessage(
            "カメラを起動できませんでした。カメラの使用を許可してください。"
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      if (scanner) {
        const instance = scanner;

        void instance
          .stop()
          .catch(() => undefined)
          .then(() => {
            try {
              instance.clear();
            } catch {
              // 終了処理中のエラーは無視
            }
          });
      }
    };
  }, [open, readerId]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.8)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="お問い合わせQR読み取り"
        style={{
          width: "min(100%, 440px)",
          padding: 20,
          borderRadius: 18,
          background: "#ffffff",
          color: "#302522",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>
            お問い合わせQR読み取り
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              border: 0,
              background: "#f2eeee",
              borderRadius: 30,
              width: 36,
              height: 36,
              fontSize: 24,
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          参加者のお問い合わせ専用QRを
          カメラに映してください。
        </p>

        <div
          id={readerId}
          style={{
            width: "100%",
            minHeight: 240,
            overflow: "hidden",
            borderRadius: 12,
            background: "#211e1e",
          }}
        />

        {loading && (
          <p style={{ textAlign: "center", fontSize: 12 }}>
            カメラを起動しています...
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            style={{
              color: "#9c2631",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 13,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 800,
          }}
        >
          キャンセル
        </button>
      </section>
    </div>
  );
}
