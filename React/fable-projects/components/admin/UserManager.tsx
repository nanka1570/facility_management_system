"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";

// A-05 ユーザー管理（画面設計書 §4.12）
// - 権限プルダウンで即時変更（選択肢は user / admin のみ）
// - developer はここからは設定不可（プルダウン無効・RLS でも遮断）
// - 自分自身の行も変更不可（自己降格による管理不能状態を防ぐ。設計判断）
export default function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    try {
      const [{ data: userData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);
      if (error) throw error;
      setCurrentUserId(userData.user?.id ?? null);
      setProfiles(data ?? []);
    } catch {
      setToast("ユーザー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (profile: Profile, nextRole: UserRole) => {
    if (nextRole === profile.role) return;
    setSavingId(profile.id);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", profile.id);
      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role: nextRole } : p)),
      );
    } catch {
      setToast("権限の変更に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <h1 className="mb-4 text-xl font-bold">ユーザー管理</h1>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-3">表示名</th>
              <th className="px-4 py-3">メール</th>
              <th className="px-4 py-3">権限</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              // developer は変更不可（画面設計書 §4.12）。自分自身も変更不可
              const locked =
                profile.role === "developer" || profile.id === currentUserId;
              return (
                <tr key={profile.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">
                    {profile.display_name ?? "（未設定）"}
                    {profile.id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-400">
                        （自分）
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{profile.email}</td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-gray-500">{profile.role}</span>
                    ) : (
                      <select
                        value={profile.role}
                        disabled={savingId === profile.id}
                        onChange={(e) =>
                          handleRoleChange(profile, e.target.value as UserRole)
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  ユーザーがいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
