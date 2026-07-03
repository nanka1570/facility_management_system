"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 管理画面用サイドバー（画面設計書 §3.2）
// - グループ見出し付き。「システム」グループは developer のみ表示
// - 折りたたみ時はアイコンのみ表示
// - 設計書のグループ構成に無い A-06 備品管理は「施設・予約」、A-07 問い合わせ管理は
//   「ユーザー」グループに配置した（補正: README 参照）。無効モジュールの項目は非表示
type NavItem = { href: string; icon: string; label: string };

type Props = {
  isDeveloper: boolean;
  reserveEnabled: boolean;
  itemEnabled: boolean;
  inquiryEnabled: boolean;
  themeEnabled: boolean;
  tenantEnabled: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  // スマホのオーバーレイ表示用
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function AdminSidebar({
  isDeveloper,
  reserveEnabled,
  itemEnabled,
  inquiryEnabled,
  themeEnabled,
  tenantEnabled,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: Props) {
  const pathname = usePathname();

  const facilityItems: NavItem[] = [
    { href: "/admin/facilities", icon: "📍", label: "施設管理" },
    { href: "/admin/categories", icon: "📁", label: "カテゴリ管理" },
    ...(reserveEnabled
      ? [{ href: "/admin/reservations", icon: "📅", label: "予約管理" }]
      : []),
    ...(itemEnabled
      ? [{ href: "/admin/items", icon: "📦", label: "備品管理" }]
      : []),
  ];

  const userItems: NavItem[] = [
    { href: "/admin/users", icon: "👥", label: "ユーザー管理" },
    ...(inquiryEnabled
      ? [{ href: "/admin/inquiries", icon: "💬", label: "問い合わせ管理" }]
      : []),
  ];

  const itemClass = (href: string) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
      pathname === href
        ? "bg-blue-50 font-medium text-blue-600"
        : "text-gray-700 hover:bg-gray-100"
    } ${collapsed ? "justify-center px-2" : ""}`;

  const renderItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={itemClass(item.href)}
      title={collapsed ? item.label : undefined}
      onClick={onMobileClose}
    >
      <span aria-hidden="true">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  const groupLabel = (label: string) =>
    !collapsed && (
      <p className="mt-4 mb-1 px-3 text-xs font-medium text-gray-400">{label}</p>
    );

  const nav = (
    <nav className="flex h-full flex-col p-3">
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "メニューを展開" : "メニューを折りたたむ"}
        className="mb-2 hidden self-end rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 md:block"
      >
        {collapsed ? "▶" : "◀"}
      </button>

      {renderItem({ href: "/admin/dashboard", icon: "📊", label: "ダッシュボード" })}

      {groupLabel("施設・予約")}
      {collapsed && <div className="my-2 border-t border-gray-200" />}
      {facilityItems.map(renderItem)}

      {groupLabel("ユーザー")}
      {collapsed && <div className="my-2 border-t border-gray-200" />}
      {userItems.map(renderItem)}

      {isDeveloper && (
        <>
          {groupLabel("システム")}
          {collapsed && <div className="my-2 border-t border-gray-200" />}
          {renderItem({
            href: "/admin/settings",
            icon: "⚙️",
            label: "モジュール設定",
          })}
          {themeEnabled &&
            renderItem({
              href: "/admin/theme",
              icon: "🎨",
              label: "テーマ設定",
            })}
          {tenantEnabled &&
            renderItem({
              href: "/admin/tenants",
              icon: "🏢",
              label: "テナント管理",
            })}
        </>
      )}
    </nav>
  );

  return (
    <>
      {/* PC / タブレット: 通常配置（折りたたみ可能） */}
      <aside
        className={`hidden shrink-0 border-r border-gray-200 bg-white md:block ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {nav}
      </aside>

      {/* スマホ: ハンバーガーで開くオーバーレイ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-semibold">管理メニュー</span>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="メニューを閉じる"
                className="text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
