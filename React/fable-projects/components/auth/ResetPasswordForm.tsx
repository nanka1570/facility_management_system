"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

// C-03 リセットメール送信フォーム（画面設計書 §4.2）
export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    if (!email) {
      setFieldError("メールアドレスを入力してください");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("メールアドレスの形式が正しくありません");
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSubmitting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      });
      if (error) throw error;
      setMessage({
        type: "success",
        text: "リセットメールを送信しました。メールをご確認ください。",
      });
    } catch {
      setMessage({ type: "error", text: "リセットメールの送信に失敗しました" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
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
          {fieldError && (
            <p className="mt-1 text-sm text-red-500">{fieldError}</p>
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
          リセットメール送信
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← ログインに戻る
        </Link>
      </p>
    </div>
  );
}
