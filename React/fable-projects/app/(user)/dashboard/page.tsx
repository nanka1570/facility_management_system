import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import {
  formatJstMonthDay,
  formatJstTime,
  getDayRangeISO,
  getJstParts,
  jstDate,
  jstToday,
} from "@/lib/datetime";
import StatusBadge from "@/components/ui/StatusBadge";

// U-01 ダッシュボード（画面設計書 §4.3）
// 集計はすべて自分の confirmed 予約のみを対象とする
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const today = jstToday();
  const { startISO: todayStart, endISO: todayEnd } = getDayRangeISO(today);
  const parts = getJstParts(today);
  const monthStart = jstDate(parts.year, parts.month, 1).toISOString();
  const monthEnd = jstDate(parts.year, parts.month + 1, 1).toISOString();

  const [profileResult, todayResult, monthResult, upcomingResult, reserveEnabled] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      // 今日の予約（本日とオーバーラップする自分の confirmed）
      supabase
        .from("reservations")
        .select("*, facilities(name)")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .lt("start_time", todayEnd)
        .gt("end_time", todayStart)
        .order("start_time"),
      // 今月の予約数
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("start_time", monthStart)
        .lt("start_time", monthEnd),
      // 直近の予約（今日以降・最大5件）
      supabase
        .from("reservations")
        .select("*, facilities(name)")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("start_time", todayStart)
        .order("start_time")
        .limit(5),
      isModuleEnabled(supabase, "M-RESERVE"),
    ]);

  const displayName = profileResult.data?.display_name ?? "ゲスト";
  const todayReservations = todayResult.data ?? [];
  const monthCount = monthResult.count ?? 0;
  const upcoming = upcomingResult.data ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">こんにちは、{displayName}さん</h1>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold text-gray-600">
            📅 今日の予約
          </h2>
          {todayReservations.length === 0 ? (
            <p className="text-sm text-gray-500">今日の予約はありません</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {todayReservations.map((r) => (
                <li key={r.id}>
                  {r.facilities?.name ?? "（施設不明）"}{" "}
                  {formatJstTime(r.start_time)}-{formatJstTime(r.end_time)}
                </li>
              ))}
            </ul>
          )}
          {reserveEnabled && (
            <Link
              href="/reservations"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              予約カレンダーへ →
            </Link>
          )}
        </section>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold text-gray-600">
            📊 今月の予約数
          </h2>
          <p className="text-center text-3xl font-bold">
            {monthCount}
            <span className="ml-1 text-base font-normal text-gray-500">件</span>
          </p>
        </section>
      </div>

      <section className="rounded-lg bg-white shadow">
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">
          📋 直近の予約
        </h2>
        {upcoming.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            今後の予約はありません
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="text-gray-600">
                  {formatJstMonthDay(r.start_time)} {formatJstTime(r.start_time)}
                  -{formatJstTime(r.end_time)}
                </span>
                <span className="font-medium">
                  {r.facilities?.name ?? "（施設不明）"}
                </span>
                <StatusBadge status="confirmed" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
