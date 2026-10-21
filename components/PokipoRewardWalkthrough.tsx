"use client";

import { useEffect, useState } from "react";

/** 参加者用。保存済みデータは一切変更せず、DOMのボタンをスポットライト表示します。 */
type Props = { mode: "home" | "reward" };
const KEY = "pokipo_reward_walkthrough_v1";
const DONE = "pokipo_reward_walkthrough_done_v1";

function findTarget(mode: Props["mode"]): { element: HTMLElement; text: string; finish: boolean } | null {
  const progress = Number(localStorage.getItem("pokipo_progress") ?? "0");
  if (progress < 5 || localStorage.getItem(DONE) === "true") return null;
  if (localStorage.getItem("pokipo_reward_exchanged") === "true") return null;
  if (mode === "home") {
    const target = document.querySelector<HTMLElement>(".visualMenuCard.rewardMenu");
    return target ? { element: target, text: "特典交換の準備をしよう！ ここを押してね。", finish: false } : null;
  }
  const qr = document.querySelector<HTMLElement>(".rewardQrCard");
  if (qr) return { element: qr, text: "QRコードと確認番号を保存しよう！ 交換当日にスタッフへ提示してね。", finish: true };
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const survey = buttons.find(b => (b.textContent ?? "").includes("参加後アンケートに回答する") && !b.disabled);
  return survey ? { element: survey, text: "次は参加後アンケート！ ここを押して回答しよう。", finish: false } : null;
}

export default function PokipoRewardWalkthrough({ mode }: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const [finish, setFinish] = useState(false);
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      const t = findTarget(mode);
      setTarget(t?.element ?? null);
      setMessage(t?.text ?? "");
      setFinish(t?.finish ?? false);
      setBounds(t?.element.getBoundingClientRect() ?? null);
    };
    update();
    const id = window.setInterval(update, 650);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { active = false; window.clearInterval(id); window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [mode]);

  useEffect(() => {
    if (!target) return;
    // 選択された実物のボタンだけを暗幕より上に配置する。
    const oldPosition = target.style.position;
    const oldZ = target.style.zIndex;
    const oldShadow = target.style.boxShadow;
    const oldIsolation = target.style.isolation;
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    target.style.zIndex = "100002";
    target.style.isolation = "isolate";
    target.style.boxShadow = "0 0 0 5px #fff5ed, 0 0 0 11px rgba(138,24,34,.7), 0 0 25px rgba(255,255,255,.9)";
    return () => { target.style.position = oldPosition; target.style.zIndex = oldZ; target.style.boxShadow = oldShadow; target.style.isolation = oldIsolation; };
  }, [target]);

  if (!target || !bounds) return null;
  const close = () => { localStorage.setItem(DONE, "true"); setTarget(null); };
  const top = Math.max(20, Math.min(window.innerHeight - 125, bounds.top - 86));
  const left = Math.max(12, Math.min(window.innerWidth - 292, bounds.left + bounds.width / 2 - 140));
  return (
    <>
      <div aria-hidden="true" style={{ position:"fixed", inset:0, background:"rgba(29,20,23,.75)", zIndex:100000, pointerEvents:"auto" }} />
      <div role="status" aria-live="polite" style={{position:"fixed",top,left,zIndex:100003,width:280,maxWidth:"calc(100vw - 24px)",padding:"13px 16px",borderRadius:15,background:"#fffdfb",color:"#8a1822",boxShadow:"0 6px 30px rgba(0,0,0,.3)",fontSize:14,fontWeight:900,lineHeight:1.6,boxSizing:"border-box"}}>
        {message}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button type="button" onClick={close} style={{border:0,background:"transparent",color:"#74666a",fontSize:12,cursor:"pointer"}}>{finish ? "確認した・閉じる" : "あとで確認する"}</button>
        </div>
      </div>
    </>
  );
}