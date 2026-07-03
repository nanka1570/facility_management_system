"use client";

import Link from "next/link";
import { formatJstDate, formatJstTime } from "@/lib/datetime";
import { useSignageData } from "@/components/display/useSignageData";
import FullscreenButton from "@/components/display/FullscreenButton";

// D-01 サイネージ（全体表示）: 全施設の本日スケジュール（DISP-01）
// 公共の場に表示するため予約者名・利用目的は表示しない（設計判断: README 参照）
export default function SignageBoard() {
  const { facilities, reservations, displayConfig, now, loading, error } =
    useSignageData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white/60">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">本日の予約状況</h1>
        <div className="flex items-center gap-4">
          <p className="text-lg tabular-nums text-white/80">
            {formatJstDate(now)} {formatJstTime(now)}
          </p>
          <FullscreenButton />
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300">
          データの取得に失敗しました（30秒後に自動で再試行します）
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {facilities.map((facility) => {
          const todays = reservations.filter(
            (r) => r.facility_id === facility.id,
          );
          const inUse = todays.some(
            (r) => new Date(r.start_time) <= now && now < new Date(r.end_time),
          );
          return (
            <Link
              key={facility.id}
              href={`/display/${facility.id}`}
              className="rounded-lg bg-gray-800 p-4 transition-colors hover:bg-gray-700"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="truncate text-lg font-bold">{facility.name}</h2>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    inUse ? "bg-red-500 text-white" : "bg-green-500 text-white"
                  }`}
                >
                  {inUse ? "利用中" : "空き"}
                </span>
              </div>
              {/* DISP-05: 本日の時間帯一覧は設定で非表示にできる */}
              <ul
                className={`space-y-1 text-sm ${displayConfig.showSchedule ? "" : "hidden"}`}
              >
                {todays.map((r) => {
                  const ended = new Date(r.end_time) <= now;
                  const active =
                    new Date(r.start_time) <= now &&
                    now < new Date(r.end_time);
                  return (
                    <li
                      key={r.id}
                      className={`rounded px-2 py-1 tabular-nums ${
                        active
                          ? "bg-red-500/20 text-red-200"
                          : ended
                            ? "text-white/30"
                            : "text-white/80"
                      }`}
                    >
                      {formatJstTime(r.start_time)} - {formatJstTime(r.end_time)}
                    </li>
                  );
                })}
                {todays.length === 0 && (
                  <li className="px-2 py-1 text-white/40">本日の予約なし</li>
                )}
              </ul>
            </Link>
          );
        })}
        {facilities.length === 0 && (
          <p className="text-white/50">表示できる施設がありません</p>
        )}
      </div>
    </div>
  );
}
