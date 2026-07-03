"use client";

import Link from "next/link";
import { formatJstDate, formatJstTime } from "@/lib/datetime";
import { useSignageData } from "@/components/display/useSignageData";
import FullscreenButton from "@/components/display/FullscreenButton";

// D-02 サイネージ（施設別）: 特定施設の現在の利用状況（DISP-02）
// 公共の場に表示するため予約者名・利用目的は表示しない（設計判断: README 参照）
export default function SignageFacility({ facilityId }: { facilityId: number }) {
  const { facilities, reservations, displayConfig, now, loading, error } =
    useSignageData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white/60">
        読み込み中…
      </div>
    );
  }

  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 text-white/60">
        <p>施設が見つかりません</p>
        <Link href="/display" className="text-blue-400 hover:underline">
          全体表示へ戻る
        </Link>
      </div>
    );
  }

  const todays = reservations.filter((r) => r.facility_id === facilityId);
  const current = todays.find(
    (r) => new Date(r.start_time) <= now && now < new Date(r.end_time),
  );
  const next = todays.find((r) => new Date(r.start_time) > now);

  return (
    <div className="flex min-h-screen flex-col bg-gray-900 p-6 text-white">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/display" className="text-sm text-white/50 hover:text-white">
          ← 全体表示
        </Link>
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

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="mb-6 text-4xl font-bold">{facility.name}</h1>
        {current ? (
          <>
            <p className="mb-2 inline-block rounded-lg bg-red-500 px-8 py-3 text-3xl font-bold">
              利用中
            </p>
            <p className="text-xl tabular-nums text-white/80">
              {formatJstTime(current.start_time)} -{" "}
              {formatJstTime(current.end_time)}
            </p>
          </>
        ) : (
          <>
            <p className="mb-2 inline-block rounded-lg bg-green-500 px-8 py-3 text-3xl font-bold">
              空き
            </p>
            {/* DISP-05: 次の予約は設定で非表示にできる */}
            {displayConfig.showNext && next && (
              <p className="text-xl tabular-nums text-white/80">
                次の予約: {formatJstTime(next.start_time)} -{" "}
                {formatJstTime(next.end_time)}
              </p>
            )}
          </>
        )}
      </div>

      {/* DISP-05: 本日のスケジュール一覧は設定で非表示にできる */}
      <section className={`mt-6 ${displayConfig.showSchedule ? "" : "hidden"}`}>
        <h2 className="mb-2 text-sm font-medium text-white/50">
          本日のスケジュール
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {todays.map((r) => {
            const ended = new Date(r.end_time) <= now;
            const active = current?.id === r.id;
            return (
              <li
                key={r.id}
                className={`rounded px-3 py-1.5 tabular-nums ${
                  active
                    ? "bg-red-500/30 text-red-200"
                    : ended
                      ? "bg-gray-800 text-white/30"
                      : "bg-gray-800 text-white/80"
                }`}
              >
                {formatJstTime(r.start_time)} - {formatJstTime(r.end_time)}
              </li>
            );
          })}
          {todays.length === 0 && (
            <li className="text-white/40">本日の予約はありません</li>
          )}
        </ul>
      </section>
    </div>
  );
}
