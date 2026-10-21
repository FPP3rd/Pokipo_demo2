"use client";

import type { CSSProperties } from "react";

const TITLE = "POKIPO 特典交換会";
const PLACE = "獨協大学 雄飛ホール";
const NOTE = "POKIPO特典交換会。特典画面のQRコードと確認番号をご提示ください。";
const START = "20261027T033500Z"; // 2026年10月27日 12:35 JST
const END = "20261027T070000Z"; // 2026年10月27日 16:00 JST

const googleLink = "https://calendar.google.com/calendar/render?" +
  new URLSearchParams({
    action: "TEMPLATE",
    text: TITLE,
    dates: `${START}/${END}`,
    details: NOTE,
    location: PLACE,
    ctz: "Asia/Tokyo",
  }).toString();

const outlookLink = "https://outlook.live.com/calendar/0/deeplink/compose?" +
  new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: TITLE,
    startdt: "2026-10-27T03:35:00Z",
    enddt: "2026-10-27T07:00:00Z",
    body: NOTE,
    location: PLACE,
  }).toString();

const buttonStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: 46,
  width: "100%",
  margin: 0,
  padding: "10px 12px",
  borderRadius: 13,
  border: "1px solid #e8dfd8",
  background: "#fff",
  color: "#8a1822",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
  boxShadow: "none",
  boxSizing: "border-box",
  cursor: "pointer",
};

function saveCalendarFile() {
  const escapeValue = (input: string) =>
    input.replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\r?\n/g, "\\n");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//POKIPO//Reward Exchange//JA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:pokipo-reward-20261027@pokipo.vercel.app",
    "DTSTAMP:20261021T000000Z",
    `DTSTART:${START}`,
    `DTEND:${END}`,
    `SUMMARY:${escapeValue(TITLE)}`,
    `LOCATION:${escapeValue(PLACE)}`,
    `DESCRIPTION:${escapeValue(NOTE)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  const objectUrl = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "POKIPO_特典交換会_20261027.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export default function PokipoRewardCalendar({ preview = false }: { preview?: boolean }) {
  return (
    <section
      aria-label="特典交換日をカレンダーに追加"
      style={{
        background: "#fff",
        border: "1px solid #eee6df",
        borderRadius: 18,
        padding: "18px 14px",
        marginTop: 16,
        boxShadow: "0 8px 22px rgba(55,35,25,.055)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ color: "#8a1822", fontSize: 10, fontWeight: 900, letterSpacing: ".08em" }}>
        EVENT REMINDER
      </span>
      <h3 style={{ color: "#302a26", fontSize: 18, margin: "7px 0" }}>
        特典交換日をカレンダーに追加
      </h3>
      <p style={{ color: "#786c64", fontSize: 13, lineHeight: 1.75, margin: "0 0 13px" }}>
        <strong>10月27日（火）12:35〜16:00</strong>
        <br />
        獨協大学 雄飛ホール
      </p>
      {preview && (
        <p style={{ fontSize: 12, color: "#8a5b33", margin: "0 0 12px" }}>
          検証モードです。予定は本番と同じ内容で登録されます。
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 9 }}>
        <a href={googleLink} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          Googleカレンダー ↗
        </a>
        <a href={outlookLink} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          Outlookカレンダー ↗
        </a>
        <button type="button" onClick={saveCalendarFile} style={buttonStyle}>
          Apple・その他（.ics）
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#897d74", margin: "12px 0 0", lineHeight: 1.7 }}>
        Google・Outlookは開いた画面で保存してください。
        Appleカレンダーなどはダウンロードした予定ファイルを読み込んでください。
      </p>
    </section>
  );
}