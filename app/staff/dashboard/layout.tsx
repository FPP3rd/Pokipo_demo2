"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/**
 * 既存の管理ダッシュボードに、グラフ分析ボタンと同じ形式で
 * 「参加動向分析」をその直前に配置する。
 * dashboard/page.tsxは変更しない。
 */
export default function StaffDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const insertion = document.createElement("section");
    insertion.className = "staffDashboardActions pokipoTrendsDashboardLink";
    let mounted = true;

    function place() {
      if (!mounted) return;
      const root = document.querySelector(".staffDashboardPage");
      const graphActions = root?.querySelector(".staffDashboardActions:not(.pokipoTrendsDashboardLink)");
      if (!root || !graphActions?.parentNode) return;
      if (insertion.parentNode !== graphActions.parentNode || insertion.nextSibling !== graphActions) {
        graphActions.parentNode.insertBefore(insertion, graphActions);
      }
      setSlot(current => current === insertion ? current : insertion);
    }

    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      mounted = false;
      observer.disconnect();
      insertion.remove();
    };
  }, []);

  return (
    <>
      {children}
      {slot && createPortal(
        <button type="button" onClick={() => router.push("/staff/trends")}>
          <span>DATA</span>
          <div>
            <strong>参加動向分析</strong>
            <small>前時間帯との比較・参加登録・完走・アンケート・特典交換の推移</small>
          </div>
          <b>→</b>
        </button>,
        slot
      )}
    </>
  );
}