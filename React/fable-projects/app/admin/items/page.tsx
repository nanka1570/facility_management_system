import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import ItemManager from "@/components/admin/ItemManager";

// A-06 備品管理（ITEM-01/02）
// 認証・role 検査は admin/layout.tsx（+ proxy）で実施済み。
// M-ITEM が無効の場合は管理ダッシュボードへリダイレクトする
export default async function AdminItemsPage() {
  const supabase = await createClient();
  if (!(await isModuleEnabled(supabase, "M-ITEM"))) {
    redirect("/admin/dashboard");
  }
  return <ItemManager />;
}
