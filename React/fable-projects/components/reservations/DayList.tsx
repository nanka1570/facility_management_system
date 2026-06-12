"use client";

import { getTimeSlots, getJstParts, jstDate } from "@/lib/datetime";
import type { Facility, ReservationWithDetails } from "@/types/database";

// U-02 スマートフォン用 日別リスト（画面設計書 §4.4）
// 施設セレクト + 時間帯ごとの空き/予約リスト
type Props = {
  facilities: Facility[];
  reservations: ReservationWithDetails[];
  date: Date;
  currentUserId: string;
  selectedFacilityId: number | null;
  onFacilityChange: (facilityId: number) => void;
  onSlotClick: (facility: Facility, start: Date, end: Date) => void;
  onReservationClick: (reservation: ReservationWithDetails) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function DayList({
  facilities,
  reservations,
  date,
  currentUserId,
  selectedFacilityId,
  onFacilityChange,
  onSlotClick,
  onReservationClick,
}: Props) {
  const facility =
    facilities.find((f) => f.id === selectedFacilityId) ?? facilities[0] ?? null;
  const slots = getTimeSlots();
  const parts = getJstParts(date);

  const findReservation = (slotStart: Date, slotEnd: Date) =>
    facility
      ? reservations.find(
          (r) =>
            r.facility_id === facility.id &&
            new Date(r.start_time) < slotEnd &&
            new Date(r.end_time) > slotStart,
        )
      : undefined;

  if (!facility) return null;

  return (
    <div className="md:hidden">
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="facility-select" className="shrink-0 text-sm text-gray-600">
          施設:
        </label>
        <select
          id="facility-select"
          value={facility.id}
          onChange={(e) => onFacilityChange(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg bg-white shadow">
        {slots.map((hour) => {
          const slotStart = jstDate(parts.year, parts.month, parts.day, hour);
          const slotEnd = jstDate(parts.year, parts.month, parts.day, hour + 1);
          const reservation = findReservation(slotStart, slotEnd);
          const label = `${pad(hour)}:00 - ${pad(hour + 1)}:00`;

          return (
            <li key={hour}>
              {reservation ? (
                <button
                  type="button"
                  onClick={() => onReservationClick(reservation)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                >
                  <span>{label}</span>
                  <span
                    className={
                      reservation.user_id === currentUserId
                        ? "font-medium text-blue-600"
                        : "font-medium text-red-500"
                    }
                  >
                    {reservation.user_id === currentUserId
                      ? "自分の予約"
                      : "予約済み"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSlotClick(facility, slotStart, slotEnd)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-green-50"
                >
                  <span>{label}</span>
                  <span className="font-medium text-green-600">空き</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
