"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Tenant } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";

// テナント管理（TENANT-01〜03）
// - テナントの作成・有効/無効・削除（削除時は紐づくデータの tenant_id が
//   NULL=共有に戻る。ON DELETE SET NULL）
// - ユーザーのテナント割当（TENANT-04 のデータ分離は RLS が行う）
// - 自分（developer）の所属切替（TENANT-02）: 新規作成する行の割当先が変わる
//   （developer は全テナントの行を閲覧できるため、表示は変わらない）
export default function TenantManager({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [tenantsResult, profilesResult] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("created_at"),
    ]);
    if (tenantsResult.error || profilesResult.error) {
      setError("テナント情報の取得に失敗しました");
    } else {
      setTenants(tenantsResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // TENANT-01 テナント作成
  const handleCreate = async () => {
    const name = newName.trim();
    const subdomain = newSubdomain.trim().toLowerCase();
    if (!name) {
      alert("テナント名を入力してください");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(subdomain)) {
      alert("サブドメインは英小文字・数字・ハイフンで入力してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("tenants")
      .insert({ name, subdomain });
    setSaving(false);
    if (insertError) {
      setError("テナントの作成に失敗しました（サブドメインの重複など）");
      return;
    }
    setNewName("");
    setNewSubdomain("");
    await fetchData();
  };

  // TENANT-03 テナント別設定（有効/無効）
  const handleToggleActive = async (tenant: Tenant) => {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ is_active: !tenant.is_active })
      .eq("id", tenant.id);
    if (updateError) {
      setError("テナントの更新に失敗しました");
      return;
    }
    await fetchData();
  };

  const handleDelete = async (tenant: Tenant) => {
    if (
      !confirm(
        `テナント「${tenant.name}」を削除します。所属データは共有（未割当）に戻ります。よろしいですか？`,
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenant.id);
    if (deleteError) {
      setError("テナントの削除に失敗しました");
      return;
    }
    await fetchData();
  };

  // ユーザー割当 + 自分の所属切替（TENANT-02）
  const handleAssign = async (profile: Profile, tenantId: string) => {
    setSavingProfileId(profile.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId === "" ? null : tenantId })
      .eq("id", profile.id);
    setSavingProfileId(null);
    if (updateError) {
      setError("テナント割当の変更に失敗しました");
      return;
    }
    await fetchData();
    // 自分の所属を変えた場合、以後の新規作成データの割当先が変わる
    if (profile.id === currentUserId) router.refresh();
  };

  if (loading) return <Loading />;

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <h1 className="mb-4 text-xl font-bold">テナント管理</h1>

      <section className="mb-6 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          新規テナント作成
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="tenant-name" className="mb-1 block text-sm font-medium">
              テナント名
            </label>
            <input
              id="tenant-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例：株式会社サンプル"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="tenant-subdomain"
              className="mb-1 block text-sm font-medium"
            >
              サブドメイン
            </label>
            <input
              id="tenant-subdomain"
              value={newSubdomain}
              onChange={(e) => setNewSubdomain(e.target.value)}
              placeholder="例：sample"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <Button onClick={handleCreate} loading={saving}>
            作成する
          </Button>
        </div>
      </section>

      <section className="mb-6 overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">テナント名</th>
              <th className="px-4 py-3">サブドメイン</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">{tenant.name}</td>
                <td className="px-4 py-3">{tenant.subdomain}</td>
                <td className="px-4 py-3">
                  {tenant.is_active ? (
                    "有効"
                  ) : (
                    <span className="text-red-500">無効</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleActive(tenant)}
                    >
                      {tenant.is_active ? "無効にする" : "有効にする"}
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(tenant)}>
                      削除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  テナントがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-lg bg-white shadow">
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">
          ユーザーのテナント割当
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">表示名</th>
              <th className="px-4 py-3">メール</th>
              <th className="px-4 py-3">所属テナント</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  {profile.display_name ?? "（未設定）"}
                  {profile.id === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">（自分）</span>
                  )}
                </td>
                <td className="px-4 py-3">{profile.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={profile.tenant_id ?? ""}
                    disabled={savingProfileId === profile.id}
                    onChange={(e) => handleAssign(profile, e.target.value)}
                    aria-label={`${profile.email}の所属テナント`}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">共有（未割当）</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
