import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDisplayConfig } from "@/lib/display";
import ModuleSettingsPanel from "@/components/admin/ModuleSettingsPanel";
import DisplaySettingsPanel from "@/components/admin/DisplaySettingsPanel";

// A-08 システム設定（画面設計書 §4.13）
// developer のみ。proxy のガードに加えてサーバー側でも再検査する。
// M-DISPLAY 有効時はサイネージ表示設定（DISP-05）のセクションを表示する
// （モジュールのトグルは router.refresh() で本ページを再描画するため連動する）
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

  const { data: displayModule } = await supabase
    .from("module_settings")
    .select("is_enabled, config")
    .eq("module_id", "M-DISPLAY")
    .single();

  return (
    <div>
      <ModuleSettingsPanel />
      <DisplaySettingsPanel
        enabled={displayModule?.is_enabled ?? false}
        initialConfig={parseDisplayConfig(displayModule?.config ?? null)}
      />
    </div>
  );
}
