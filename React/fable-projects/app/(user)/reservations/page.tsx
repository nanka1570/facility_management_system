import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import ReservationCalendar from "@/components/reservations/ReservationCalendar";

// U-02 予約カレンダー（画面設計書 §4.4）
// M-RESERVE が無効の場合はダッシュボードへリダイレクトする
export default async function ReservationsPage() {
  const supabase = await createClient();

  if (!(await isModuleEnabled(supabase, "M-RESERVE"))) {
    redirect("/dashboard");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return <ReservationCalendar currentUserId={user.id} />;
}
