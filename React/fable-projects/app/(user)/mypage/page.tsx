import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import ProfileSection from "@/components/mypage/ProfileSection";
import ReservationHistory from "@/components/mypage/ReservationHistory";

// U-04 マイページ（画面設計書 §4.7）
// M-PRICE 有効時は予約履歴に料金列を表示する（PRICE-03 料金履歴）
export default async function MyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profileResult, reservationsResult, priceEnabled] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    // 自分の予約を全ステータス・新しい順に取得（記録済み料金を同時取得）
    supabase
      .from("reservations")
      .select("*, facilities(name), reservation_prices(subtotal)")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false }),
    isModuleEnabled(supabase, "M-PRICE"),
  ]);

  const profile = profileResult.data;
  if (!profile) redirect("/");

  return (
    <div className="space-y-4">
      <ProfileSection profile={profile} />
      <ReservationHistory
        reservations={reservationsResult.data ?? []}
        priceEnabled={priceEnabled}
      />
    </div>
  );
}
