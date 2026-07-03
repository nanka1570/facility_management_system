import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import InquiryPanel from "@/components/inquiries/InquiryPanel";

// U-05 問い合わせ（INQ-01/02）
// M-INQUIRY が無効の場合はダッシュボードへリダイレクトする
export default async function InquiryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!(await isModuleEnabled(supabase, "M-INQUIRY"))) {
    redirect("/dashboard");
  }

  return <InquiryPanel currentUserId={user.id} />;
}
