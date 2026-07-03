import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getThemeConfig,
  resolveFontFamily,
  resolvePrimaryColor,
} from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "施設管理システム",
  description: "汎用施設管理システム（React リライト版）",
};

// M-THEME 有効時はプライマリカラー（CSS変数）とフォント（THEME-04）を
// 全画面に注入する。未ログイン時は RLS で module_settings が読めないためデフォルト
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const theme = await getThemeConfig(supabase);

  return (
    <html lang="ja">
      <body
        className="min-h-screen bg-gray-100 text-gray-900 antialiased"
        style={
          {
            "--color-primary": resolvePrimaryColor(theme),
            fontFamily: resolveFontFamily(theme),
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
