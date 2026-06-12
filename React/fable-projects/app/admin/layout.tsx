import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
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

  const reserveEnabled = await isModuleEnabled(supabase, "M-RESERVE");

  return (
    <AdminShell isDeveloper={role === "developer"} reserveEnabled={reserveEnabled}>
      {children}
    </AdminShell>
  );
}
