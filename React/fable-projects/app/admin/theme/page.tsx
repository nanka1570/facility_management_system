import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import ThemeSettingsPanel from "@/components/admin/ThemeSettingsPanel";

// A-09 テーマ設定（画面設計書 §4.14。M-THEME 有効時・developer のみ）
// proxy のガードに加えてサーバー側でも再検査する
export default async function AdminThemePage() {
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

  if (!(await isModuleEnabled(supabase, "M-THEME"))) {
    redirect("/admin/dashboard");
  }

  return <ThemeSettingsPanel />;
}
