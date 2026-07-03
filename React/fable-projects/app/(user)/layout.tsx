import { createClient } from "@/lib/supabase/server";
import { getEnabledModules } from "@/lib/modules";
import { getThemeConfig } from "@/lib/theme";
import Header from "@/components/layout/Header";
import UserSidebar from "@/components/layout/UserSidebar";

// 一般ユーザーエリア共通レイアウト（Header + UserSidebar）
// 認証ガードは proxy（updateSession）が行う
export default async function UserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdminUser = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdminUser = profile?.role === "admin" || profile?.role === "developer";
  }

  const [modules, theme] = await Promise.all([
    getEnabledModules(supabase),
    getThemeConfig(supabase),
  ]);
  const reserveEnabled = modules.has("M-RESERVE");
  const inquiryEnabled = modules.has("M-INQUIRY");

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        isAdminUser={isAdminUser}
        reserveEnabled={reserveEnabled}
        inquiryEnabled={inquiryEnabled}
        logoUrl={theme.logoUrl}
      />
      <div className="flex flex-1">
        <UserSidebar
          reserveEnabled={reserveEnabled}
          inquiryEnabled={inquiryEnabled}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
