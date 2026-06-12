import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import ReservationManager from "@/components/admin/ReservationManager";

// A-04 予約管理（画面設計書 §4.11）
// M-RESERVE が無効の場合は管理ダッシュボードへリダイレクトする
export default async function AdminReservationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!(await isModuleEnabled(supabase, "M-RESERVE"))) {
    redirect("/admin/dashboard");
  }

  return <ReservationManager currentUserId={user.id} />;
}
