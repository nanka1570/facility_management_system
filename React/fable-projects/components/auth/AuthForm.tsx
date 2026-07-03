"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

type Tab = "login" | "signup";

type FieldErrors = { email?: string; password?: string };

// C-01 ログイン/新規登録フォーム（画面設計書 §4.1）
export default function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setMessage(null);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email) {
      errors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "メールアドレスの形式が正しくありません";
    }
    if (!password) {
      errors.password = "パスワードを入力してください";
    } else if (password.length < 6) {
      errors.password = "パスワードは6文字以上で入力してください";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSubmitting(true);
    const supabase = createClient();
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          // Confirm email が OFF の場合は即ログイン状態になる
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage({
            type: "success",
            text: "確認メールを送信しました。メールをご確認ください。",
          });
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: tab === "login" ? "ログインに失敗しました" : "登録に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (target: Tab) =>
    `flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
      tab === target
        ? "bg-blue-500 text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={tabClass("login")}
          onClick={() => switchTab("login")}
        >
          ログイン
        </button>
        <button
          type="button"
          className={tabClass("signup")}
          onClick={() => switchTab("signup")}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="you@example.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="6文字以上"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        {message && (
          <p
            className={`mb-4 text-sm ${
              message.type === "error" ? "text-red-500" : "text-green-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {tab === "login" ? "ログイン" : "登録"}
        </Button>
      </form>

      {tab === "login" && (
        <p className="mt-4 text-center text-sm">
          <Link href="/reset-password" className="text-blue-600 hover:underline">
            パスワードを忘れた方
          </Link>
        </p>
      )}
    </div>
  );
}
