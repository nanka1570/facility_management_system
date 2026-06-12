import AuthForm from "@/components/auth/AuthForm";

// C-01 ログイン/新規登録（画面設計書 §4.1）
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">
          🏢 施設管理システム
        </h1>
        <AuthForm />
      </div>
    </main>
  );
}
