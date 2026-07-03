"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

// C-03 新パスワード設定フォーム
// リカバリーリンクの code はブラウザクライアントがページ読み込み時に
// 自動でセッションへ交換する（detectSessionInUrl）。交換完了を待ってから
// 入力を受け付け、セッションが得られなければリンク切れとして案内する
export default function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // code 交換は非同期に走るため、まず現在のセッションを見て、
    // 無ければ認証イベント（SIGNED_IN / PASSWORD_RECOVERY）を少し待つ
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setReady("ok");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setReady("ok");
      } else {
        setTimeout(() => {
          if (!cancelled) {
            setReady((current) => (current === "checking" ? "invalid" : current));
          }
        }, 3000);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const validate = (): boolean => {
    if (!password || password.length < 6) {
      setFieldError("パスワードは6文字以上で入力してください");
      return false;
    }
    if (password !== confirm) {
      setFieldError("確認用パスワードが一致しません");
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("パスワードの更新に失敗しました");
      setSubmitting(false);
    }
  };

  if (ready === "checking") {
    return (
      <p className="text-center text-sm text-gray-500">確認しています…</p>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="text-center text-sm">
        <p className="mb-4 text-red-500">
          リンクが無効か、有効期限が切れています。
        </p>
        <Link href="/reset-password" className="text-blue-600 hover:underline">
          リセットメールを再送信する
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          新しいパスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="6文字以上"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
          新しいパスワード（確認）
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {fieldError && (
          <p className="mt-1 text-sm text-red-500">{fieldError}</p>
        )}
      </div>

      {message && <p className="mb-4 text-sm text-red-500">{message}</p>}

      <Button type="submit" loading={submitting} className="w-full">
        パスワードを更新する
      </Button>
    </form>
  );
}
