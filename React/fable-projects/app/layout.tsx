import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "施設管理システム",
  description: "汎用施設管理システム（React リライト版）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
