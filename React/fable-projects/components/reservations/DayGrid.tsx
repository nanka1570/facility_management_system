"use client";

import { getTimeSlots, getJstParts, jstDate, pad } from "@/lib/datetime";
import { overlapsRange } from "@/lib/reservations";
import type { Facility, ReservationWithDetails } from "@/types/database";

// U-02 PC用 日別グリッド（画面設計書 §4.4）
// 縦軸=時間（9:00〜17:00開始の9スロット）、横軸=施設
// 空きセルはクリックで新規予約、予約済みセルはクリックで詳細（自分=編集 / 他人=閲覧）
type Props = {
  facilities: Facility[];
  reservations: ReservationWithDetails[];
  date: Date;
  currentUserId: string;
  onSlotClick: (facility: Facility, start: Date, end: Date) => void;
  onReservationClick: (reservation: ReservationWithDetails) => void;
};

export default function DayGrid({
  facilities,
  reservations,
  date,
  currentUserId,
  onSlotClick,
  onReservationClick,
}: Props) {
  const slots = getTimeSlots();
  const parts = getJstParts(date);

  // スロット区間 [slotStart, slotEnd) とオーバーラップする confirmed 予約を探す
  const findReservation = (facilityId: number, slotStart: Date, slotEnd: Date) =>
    reservations.find(
      (r) => r.facility_id === facilityId && overlapsRange(r, slotStart, slotEnd),
    );

  return (
    <div className="hidden overflow-x-auto rounded-lg bg-white shadow md:block">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="w-16 border-b border-r border-gray-200 px-2 py-2 font-medium">
              時間
            </th>
            {facilities.map((facility) => (
              <th
                key={facility.id}
                className="truncate border-b border-r border-gray-200 px-2 py-2 font-medium last:border-r-0"
                title={facility.name}
              >
                {facility.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((hour) => {
            const slotStart = jstDate(parts.year, parts.month, parts.day, hour);
            const slotEnd = jstDate(parts.year, parts.month, parts.day, hour + 1);
            return (
              <tr key={hour}>
                <td className="border-b border-r border-gray-200 px-2 py-1 text-center text-gray-500">
                  {pad(hour)}:00
                </td>
                {facilities.map((facility) => {
                  const reservation = findReservation(
                    facility.id,
                    slotStart,
                    slotEnd,
                  );
                  if (reservation) {
                    const isMine = reservation.user_id === currentUserId;
                    return (
                      <td
                        key={facility.id}
                        className="border-b border-r border-gray-200 p-0.5 last:border-r-0"
                      >
                        <button
                          type="button"
                          onClick={() => onReservationClick(reservation)}
                          aria-label={`${facility.name} ${pad(hour)}:00の予約詳細を表示`}
                          className={`h-10 w-full rounded ${
                            isMine
                              ? "bg-blue-300 hover:bg-blue-400"
                              : "bg-red-300 hover:bg-red-400"
                          }`}
                        />
                      </td>
                    );
                  }
                  return (
                    <td
                      key={facility.id}
                      className="border-b border-r border-gray-200 p-0.5 last:border-r-0"
                    >
                      <button
                        type="button"
                        onClick={() => onSlotClick(facility, slotStart, slotEnd)}
                        aria-label={`${facility.name} ${pad(hour)}:00の空き枠を予約`}
                        className="h-10 w-full rounded hover:bg-green-100"
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
        凡例:
        <span className="mx-1 inline-block h-3 w-6 rounded bg-red-300 align-middle" />
        予約済み
        <span className="mx-1 ml-3 inline-block h-3 w-6 rounded bg-blue-300 align-middle" />
        自分の予約
        <span className="mx-1 ml-3 inline-block h-3 w-6 rounded border border-gray-300 bg-white align-middle" />
        空き（クリックで予約）
      </p>
    </div>
  );
}
