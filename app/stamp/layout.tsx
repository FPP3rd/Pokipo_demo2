"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const SPOTS = [
  { id:"spot1", name:"学生センター" },
  { id:"spot2", name:"東棟2階" },
  { id:"spot3", name:"ラーニングスクエア" },
  { id:"spot4", name:"ゆうちょ銀行ATM" },
  { id:"spot5", name:"セブンイレブン付近掲示板" }
];
function getScans(): string[] {
  try {
    const raw=JSON.parse(localStorage.getItem("pokipo_scans") || "[]");
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((s):s is string=>typeof s==="string" && SPOTS.some(x=>x.id===s)))];
  } catch {return [];}
}
export default function StampLayout({children}:{children:ReactNode}) {
  const router=useRouter();
  const [seen,setSeen]=useState<string[]>([]);
  const [newlyAcquired,setNewlyAcquired]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  const initial=useRef(false);
  const latest=useRef<string[]>([]);

  useEffect(()=>{
    const stored=getScans();
    latest.current=stored;
    setSeen(stored);
    initial.current=true;
    const timer=window.setInterval(()=>{
      if (!initial.current) return;
      const current=getScans();
      const old=latest.current;
      if (current.length>old.length) {
        setNewlyAcquired(true);
        setDismissed(false);
      }
      latest.current=current;
      setSeen(current);
    },900);
    return ()=>window.clearInterval(timer);
  },[]);

  const unseen=SPOTS.filter(x=>!seen.includes(x.id));
  return <>
    {children}
    {newlyAcquired && !dismissed && (
      <aside aria-label="スタンプ取得後の次のステップ" style={{
        position:"fixed",bottom:12,left:12,right:12,zIndex:9990,maxWidth:530,
        margin:"0 auto",borderRadius:16,background:"#fffaf8",border:"2px solid #c34857",
        boxShadow:"0 12px 38px rgba(55,27,35,.24)",padding:17,
        color:"#342d30"
      }}>
        <button type="button" aria-label="案内を閉じる" onClick={()=>setDismissed(true)}
          style={{position:"absolute",top:8,right:9,border:0,background:"transparent",fontSize:20,cursor:"pointer"}}>×</button>
        <p style={{fontSize:11,color:"#ad3344",fontWeight:900,margin:"0 0 7px"}}>STAMP GET! / NEXT STEP</p>
        <h2 style={{fontSize:19,margin:"0 0 7px"}}>{unseen.length===0?"5か所達成！":"スタンプ取得成功！"}</h2>
        <p style={{fontSize:13,lineHeight:1.7,margin:"0 0 13px"}}>
          {unseen.length===0
            ? "特典画面から参加後アンケートと交換用QRを確認しましょう。"
            : `現在 ${seen.length}/5 か所です。次は「${unseen[0].name}」など未取得スポットを巡りましょう。`}
        </p>
        {unseen.length>0 && <p style={{fontSize:11,color:"#78696d",margin:"0 0 10px"}}>
          未取得：{unseen.map(x=>x.name).join("・")}
        </p>}
        <div style={{display:"flex",gap:9}}>
          <button type="button" onClick={()=>router.push(unseen.length===0?"/reward":"/home")}
            style={{border:0,borderRadius:10,padding:"11px 15px",background:"#b03646",color:"#fff",fontWeight:800,cursor:"pointer"}}>
            {unseen.length===0?"特典画面へ進む →":"ホームで進捗を見る →"}
          </button>
          <button type="button" onClick={()=>setDismissed(true)}
            style={{border:"1px solid #dcc5c7",borderRadius:10,padding:"11px 15px",background:"#fff",color:"#5b4c51",fontWeight:800,cursor:"pointer"}}>
            この画面を続ける
          </button>
        </div>
      </aside>
    )}
  </>;
}