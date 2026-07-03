"use client";

import { useEffect, useState } from "react";

// DISP-04 フルスクリーンモード切替
export default function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // フルスクリーン非対応環境（iOS Safari 等）では何もしない
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
    >
      {isFullscreen ? "全画面を終了" : "全画面表示"}
    </button>
  );
}
