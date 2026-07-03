// CSV 生成・ダウンロード（RES-08 予約履歴エクスポート）
// - Excel での文字化けを防ぐため UTF-8 BOM を付与する
// - カンマ・引用符・改行を含む値は RFC 4180 に従いエスケープする

function escapeCsvValue(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number)[][],
): void {
  const content = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
