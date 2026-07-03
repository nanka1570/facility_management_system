import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

// C-03 パスワードリセット（画面設計書 §4.2）: リセットメール送信
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">
          パスワードリセット
        </h1>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
