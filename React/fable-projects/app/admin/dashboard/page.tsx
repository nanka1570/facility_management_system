import { createClient } from "@/lib/supabase/server";
import {
  formatJstTime,
  getDayRangeISO,
  getJstParts,
  jstDate,
  jstToday,
} from "@/lib/datetime";

// A-01 管理者ダッシュボード（画面設計書 §4.8）
// 統計4カード + 本日の予約一覧（全ユーザーの confirmed。終了時刻経過分も表示）
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const today = jstToday();
  const { startISO: todayStart, endISO: todayEnd } = getDayRangeISO(today);
  const parts = getJstParts(today);
  const monthStart = jstDate(parts.year, parts.month, 1).toISOString();
  const monthEnd = jstDate(parts.year, parts.month + 1, 1).toISOString();

  const [todayCount, facilityCount, monthCount, userCount, todayList] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed")
        .lt("start_time", todayEnd)
        .gt("end_time", todayStart),
      supabase.from("facilities").select("*", { count: "exact", head: true }),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("start_time", monthStart)
        .lt("start_time", monthEnd),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("reservations")
        .select("*, facilities(name), profiles(display_name)")
        .eq("status", "confirmed")
        .lt("start_time", todayEnd)
        .gt("end_time", todayStart)
        .order("start_time"),
    ]);

  const stats = [
    { label: "今日の予約", value: todayCount.count ?? 0, unit: "件" },
    { label: "施設数", value: facilityCount.count ?? 0, unit: "室" },
    { label: "今月の予約", value: monthCount.count ?? 0, unit: "件" },
    { label: "ユーザー数", value: userCount.count ?? 0, unit: "人" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">管理者ダッシュボード</h1>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <section key={stat.label} className="rounded-lg bg-white p-4 shadow">
            <h2 className="mb-2 text-sm text-gray-600">{stat.label}</h2>
            <p className="text-center text-3xl font-bold">
              {stat.value}
              <span className="ml-1 text-base font-normal text-gray-500">
                {stat.unit}
              </span>
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-lg bg-white shadow">
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">
          本日の予約一覧
        </h2>
        {(todayList.data ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            本日の予約はありません
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(todayList.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="text-gray-600">
                  {formatJstTime(r.start_time)}-{formatJstTime(r.end_time)}
                </span>
                <span className="font-medium">
                  {r.facilities?.name ?? "（施設不明）"}
                </span>
                <span>{r.profiles?.display_name ?? "不明"}</span>
                {r.purpose && <span className="text-gray-500">{r.purpose}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
