import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import InquiryAdminPanel from "@/components/admin/InquiryAdminPanel";

// A-07 問い合わせ管理（INQ-03 一覧 / INQ-04 返信）
// 認証・role 検査は admin/layout.tsx（+ proxy）で実施済み。
// M-INQUIRY が無効の場合は管理ダッシュボードへリダイレクトする
export default async function AdminInquiriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!(await isModuleEnabled(supabase, "M-INQUIRY"))) {
    redirect("/admin/dashboard");
  }

  return <InquiryAdminPanel currentUserId={user.id} />;
}
