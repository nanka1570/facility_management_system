import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules } from "@/lib/modules";
import { getThemeConfig } from "@/lib/theme";
import AdminShell from "@/components/layout/AdminShell";

// 管理エリア共通レイアウト
// proxy の role 検査に加えてサーバー側でも再検査する（防御の多重化）
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
  const role = profile?.role;
  if (role !== "admin" && role !== "developer") redirect("/dashboard");

  const [modules, theme] = await Promise.all([
    getEnabledModules(supabase),
    getThemeConfig(supabase),
  ]);

  return (
    <AdminShell
      isDeveloper={role === "developer"}
      reserveEnabled={modules.has("M-RESERVE")}
      itemEnabled={modules.has("M-ITEM")}
      inquiryEnabled={modules.has("M-INQUIRY")}
      themeEnabled={modules.has("M-THEME")}
      tenantEnabled={modules.has("M-TENANT")}
      logoUrl={theme.logoUrl}
    >
      {children}
    </AdminShell>
  );
}
