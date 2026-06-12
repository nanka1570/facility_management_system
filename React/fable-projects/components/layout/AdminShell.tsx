"use client";

import { useEffect, useState, type ReactNode } from "react";
import Header from "@/components/layout/Header";
import AdminSidebar from "@/components/layout/AdminSidebar";

// 管理画面の外枠: Header + AdminSidebar + main を合成し、
// サイドバーの折りたたみ / スマホのオーバーレイ開閉の状態を持つ
type Props = {
  isDeveloper: boolean;
  reserveEnabled: boolean;
  children: ReactNode;
};

export default function AdminShell({ isDeveloper, reserveEnabled, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // デフォルト状態（画面設計書 §3.2）: PC=展開 / タブレット=折りたたみ
  // matchMedia はクライアントでしか評価できず、useState 初期値で読むと
  // SSR とのハイドレーション不一致になるため、マウント後の effect で初期化する
  useEffect(() => {
    const isTablet = window.matchMedia(
      "(min-width: 768px) and (max-width: 1279px)",
    ).matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isTablet) setCollapsed(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        isAdminUser
        reserveEnabled={reserveEnabled}
        onMenuClick={() => setMobileOpen(true)}
      />
      <div className="flex flex-1">
        <AdminSidebar
          isDeveloper={isDeveloper}
          reserveEnabled={reserveEnabled}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
