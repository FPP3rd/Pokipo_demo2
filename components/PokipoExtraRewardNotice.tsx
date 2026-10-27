"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export default function PokipoExtraRewardNotice() {
  const pathname = usePathname() || "/";
  const [details, setDetails] = useState(false);
  if (pathname.startsWith("/staff") || pathname.startsWith("/api")) return null;
  return (
    <aside aria-label="追加特典交換会のお知らせ" style={{width:"min(100% - 24px, 820px)",margin:"12px auto",padding:"15px 17px",border:"2px solid #a32839",borderRadius:16,background:"#fff8f5",color:"#462329",boxShadow:"0 5px 20px rgba(80,20,30,.07)",fontFamily:"inherit"}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:".08em",color:"#9d3444"}}>POKIPO / SPECIAL INFORMATION</div>
      <div style={{fontSize:13,marginTop:6,color:"#6d5f5f"}}>10月27日（火）の特典交換会は終了しました。</div>
      <strong style={{display:"block",marginTop:7,fontSize:"clamp(17px,4.3vw,23px)",lineHeight:1.45,color:"#8a1822"}}>11月4日（水）追加の特典交換会が決定！</strong>
      <div style={{fontWeight:850,marginTop:6}}>12:35〜16:00 ／ 雄飛ホール</div>
      <button type="button" onClick={()=>setDetails(x=>!x)} aria-expanded={details} style={{marginTop:11,padding:"9px 13px",borderRadius:10,border:"1px solid #c58c93",background:"#fff",color:"#8a1822",fontWeight:750,cursor:"pointer"}}>{details?"案内を閉じる":"受け取り条件を確認"}</button>
      {details && <div style={{fontSize:13,lineHeight:1.85,marginTop:10,borderTop:"1px solid #ecd1d3",paddingTop:9}}>5か所のスタンプ獲得後、参加後アンケートに回答し、特典交換QRを表示して会場で提示してください。10月27日に交換済みの方は重複交換できません。特典交換は先着360名の条件に従い、在庫・交換資格がある場合に限ります。</div>}
    </aside>
  );
}