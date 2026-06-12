import type { ReservationStatus } from "@/types/database";

// 確定=青 / 完了=緑 / キャンセル=赤（画面設計書 §4.7・§4.11）
// Tailwind が検出できるよう完全なクラス文字列で定義する（動的連結は禁止）
const BADGES: Record<ReservationStatus, { label: string; className: string }> = {
  confirmed: { label: "確定", className: "bg-blue-100 text-blue-700" },
  completed: { label: "完了", className: "bg-green-100 text-green-700" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-700" },
};

// status には getEffectiveStatus() を通した表示用ステータスを渡すこと
export default function StatusBadge({ status }: { status: ReservationStatus }) {
  const badge = BADGES[status];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
