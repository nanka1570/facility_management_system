"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 共通ヘッダー（画面設計書 §3.1）
// - PC: 主要ナビはサイドバーに集約し、Header はロゴ + ログアウト中心
// - スマホ: ユーザー画面では [予約][マイページ] ボタン、管理画面では ☰ でサイドバー開閉
// - admin/developer には「管理者画面へ ⇔ ユーザー画面へ」の切替リンクを表示
type Props = {
  isAdminUser: boolean;
  reserveEnabled: boolean;
  // スマホ用の問い合わせ導線（UserSidebar が隠れるため。M-INQUIRY 有効時のみ）
  inquiryEnabled?: boolean;
  // M-THEME 有効かつロゴ設定時のみ渡される（THEME-03）
  logoUrl?: string | null;
  onMenuClick?: () => void;
};

export default function Header({
  isAdminUser,
  reserveEnabled,
  inquiryEnabled = false,
  logoUrl = null,
  onMenuClick,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminArea = pathname.startsWith("/admin");
  const homeHref = isAdminArea ? "/admin/dashboard" : "/dashboard";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const mobileNavClass =
    "rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 md:hidden";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {isAdminArea && onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="メニューを開く"
              className="rounded-md px-2 py-1 text-xl text-gray-600 hover:bg-gray-100 md:hidden"
            >
              ☰
            </button>
          )}
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2 truncate text-base font-bold sm:text-lg"
          >
            {logoUrl ? (
              // 任意の外部URLを管理者が設定するため next/image の許可リスト管理は
              // 行わず <img> を使用する（THEME-03。README 参照）
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="ロゴ" className="h-8 w-auto" />
            ) : (
              <span aria-hidden="true">🏢</span>
            )}
            <span className="truncate">施設管理システム</span>
          </Link>
        </div>

        <nav className="flex shrink-0 items-center gap-2">
          {!isAdminArea && reserveEnabled && (
            <Link href="/reservations" className={mobileNavClass}>
              予約
            </Link>
          )}
          {!isAdminArea && inquiryEnabled && (
            <Link href="/inquiry" className={mobileNavClass}>
              問い合わせ
            </Link>
          )}
          {!isAdminArea && (
            <Link href="/mypage" className={mobileNavClass}>
              マイページ
            </Link>
          )}
          {isAdminUser && (
            <Link
              href={isAdminArea ? "/dashboard" : "/admin/dashboard"}
              className="hidden text-sm text-blue-600 hover:underline sm:inline"
            >
              {isAdminArea ? "ユーザー画面へ" : "管理者画面へ"}
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </nav>
      </div>
      {/* スマホ幅では切替リンクを2段目に表示（1段目の幅不足対策） */}
      {isAdminUser && (
        <div className="border-t border-gray-100 px-4 py-1.5 sm:hidden">
          <Link
            href={isAdminArea ? "/dashboard" : "/admin/dashboard"}
            className="text-sm text-blue-600 hover:underline"
          >
            {isAdminArea ? "ユーザー画面へ" : "管理者画面へ"}
          </Link>
        </div>
      )}
    </header>
  );
}
