"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";

// U-04 プロフィールカード + 編集モーダル（画面設計書 §4.7）
// 編集できるのは表示名のみ。メール・権限は読み取り専用
const ROLE_LABELS: Record<Profile["role"], string> = {
  user: "一般ユーザー",
  admin: "管理者",
  developer: "開発者",
};

export default function ProfileSection({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setDisplayName(profile.display_name ?? "");
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    const name = displayName.trim();
    if (!name) {
      alert("表示名を入力してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", profile.id);
    setSaving(false);
    if (updateError) {
      setError("プロフィールの更新に失敗しました");
      return;
    }
    setEditOpen(false);
    router.refresh();
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const readOnlyClass = `${inputClass} bg-gray-100 text-gray-500`;

  return (
    <section className="rounded-lg bg-white shadow">
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">プロフィール</h2>
        <Button variant="secondary" onClick={openModal}>
          編集
        </Button>
      </div>
      <dl className="space-y-2 px-4 py-4 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-gray-500">表示名:</dt>
          <dd>{profile.display_name ?? "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-gray-500">メール:</dt>
          <dd className="break-all">{profile.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-gray-500">権限:</dt>
          <dd>{ROLE_LABELS[profile.role]}</dd>
        </div>
      </dl>

      <Modal
        open={editOpen}
        title="プロフィール編集"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              閉じる
            </Button>
            <Button onClick={handleUpdate} loading={saving}>
              更新する
            </Button>
          </>
        }
      >
        <div className="mb-4">
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
            表示名
          </label>
          <input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
            メール
          </label>
          <input
            id="profile-email"
            value={profile.email}
            readOnly
            className={readOnlyClass}
          />
        </div>
        <div>
          <label htmlFor="profile-role" className="mb-1 block text-sm font-medium">
            権限
          </label>
          <input
            id="profile-role"
            value={profile.role}
            readOnly
            className={readOnlyClass}
          />
        </div>
      </Modal>
    </section>
  );
}
