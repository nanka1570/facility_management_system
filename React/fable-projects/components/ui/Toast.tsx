"use client";

// 通信エラー等の画面上部トースト通知（画面設計書 §6.3）
export default function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-md bg-red-500 px-4 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
