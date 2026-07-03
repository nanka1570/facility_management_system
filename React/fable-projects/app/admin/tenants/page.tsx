import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import TenantManager from "@/components/admin/TenantManager";

// テナント管理（TENANT-01〜03。developer + M-TENANT 有効時のみ）
// proxy のガードに加えてサーバー側でも再検査する
export default async function AdminTenantsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "developer") redirect("/admin/dashboard");

  if (!(await isModuleEnabled(supabase, "M-TENANT"))) {
    redirect("/admin/dashboard");
  }

  return <TenantManager currentUserId={user.id} />;
}
