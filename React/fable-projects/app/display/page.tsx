import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import SignageBoard from "@/components/display/SignageBoard";

// D-01 サイネージ全体表示（DISP-01/03/04）
// RLS が authenticated 前提のため要ログイン
// （サイネージ端末は表示用アカウントでログインして運用する。README 参照）
export default async function DisplayPage() {
  const supabase = await createClient();
  if (!(await isModuleEnabled(supabase, "M-DISPLAY"))) {
    redirect("/dashboard");
  }
  return <SignageBoard />;
}
