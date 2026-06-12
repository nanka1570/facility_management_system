import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModuleSettingsPanel from "@/components/admin/ModuleSettingsPanel";

// A-08 システム設定（画面設計書 §4.13）
// developer のみ。proxy のガードに加えてサーバー側でも再検査する
export default async function AdminSettingsPage() {
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

  return <ModuleSettingsPanel />;
}
