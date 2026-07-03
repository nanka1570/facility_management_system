"use client";

import { useState } from "react";
import { getEffectiveStatus } from "@/lib/reservations";
import { formatJstFullDate, formatJstTime } from "@/lib/datetime";
import type { ReservationWithFacility } from "@/types/database";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

// U-04 予約履歴（画面設計書 §4.7）
// 全ステータスを新しい順に表示。デフォルト直近5件 ⇔ 全件をトグルで切替
// M-PRICE 有効時は記録済み料金（reservation_prices.subtotal）を表示（PRICE-03）
const DEFAULT_COUNT = 5;

type HistoryRow = ReservationWithFacility & {
  reservation_prices: { subtotal: number } | null;
};

export default function ReservationHistory({
  reservations,
  priceEnabled = false,
}: {
  reservations: HistoryRow[];
  priceEnabled?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? reservations : reservations.slice(0, DEFAULT_COUNT);

  return (
    <section className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">予約履歴</h2>
        {reservations.length > DEFAULT_COUNT && (
          <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "直近5件を表示" : "すべて表示"}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">予約履歴はありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">施設</th>
                {priceEnabled && <th className="px-4 py-3">料金</th>}
                <th className="px-4 py-3">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">{formatJstFullDate(r.start_time)}</td>
                  <td className="px-4 py-3">
                    {formatJstTime(r.start_time)}-{formatJstTime(r.end_time)}
                  </td>
                  <td className="px-4 py-3">
                    {r.facilities?.name ?? "（施設不明）"}
                  </td>
                  {priceEnabled && (
                    <td className="px-4 py-3 tabular-nums">
                      {r.reservation_prices
                        ? `${r.reservation_prices.subtotal.toLocaleString()}円`
                        : "-"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StatusBadge status={getEffectiveStatus(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
