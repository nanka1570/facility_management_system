"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ユーザー画面用サイドバー（画面設計書 §3.2）
// PC（md以上）のみ表示。スマホのナビは Header のボタンで代替する
export default function UserSidebar({
  reserveEnabled,
}: {
  reserveEnabled: boolean;
}) {
  const pathname = usePathname();

  const itemClass = (href: string) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
      pathname === href
        ? "bg-blue-50 font-medium text-blue-600"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="hidden w-52 shrink-0 border-r border-gray-200 bg-white p-3 md:block">
      <nav className="flex h-full flex-col gap-1">
        <Link href="/dashboard" className={itemClass("/dashboard")}>
          🏠 ホーム
        </Link>
        {reserveEnabled && (
          <Link href="/reservations" className={itemClass("/reservations")}>
            📅 予約
          </Link>
        )}
        <Link href="/mypage" className={`${itemClass("/mypage")} mt-auto`}>
          👤 マイページ
        </Link>
      </nav>
    </aside>
  );
}
