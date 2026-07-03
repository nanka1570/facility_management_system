import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

// C-03 パスワードリセット（画面設計書 §4.2）: 新パスワード設定
// リセットメールのリンクから遷移する。画面設計書にはメール送信画面のみ
// 定義されているため、本画面は補完（設計判断メモ参照）
export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">
          新しいパスワードの設定
        </h1>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
