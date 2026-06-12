// データ取得中のスピナー（画面設計書 §6.2）
export default function Loading() {
  return (
    <div
      className="flex items-center justify-center py-16"
      role="status"
      aria-label="読み込み中"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
