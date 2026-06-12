"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEffectiveStatus } from "@/lib/reservations";
import {
  addDays,
  formatJstDate,
  getDayRangeISO,
  jstToday,
} from "@/lib/datetime";
import type { Facility, ReservationWithDetails } from "@/types/database";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";
import DayGrid from "@/components/reservations/DayGrid";
import DayList from "@/components/reservations/DayList";
import ReservationModal, {
  type ReservationModalState,
} from "@/components/reservations/ReservationModal";

// U-02 予約カレンダー（画面設計書 §4.4）
// 日別ビュー: ◀▶ で前日/翌日へ移動。PC=グリッド / スマホ=施設選択+リスト
export default function ReservationCalendar({
  currentUserId,
}: {
  currentUserId: string;
}) {
  // jstToday() は JST 固定計算のためサーバー/ブラウザどちらでも同じ結果になる
  const [selectedDate, setSelectedDate] = useState<Date>(() => jstToday());
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFacilityId, setMobileFacilityId] = useState<number | null>(null);
  const [modal, setModal] = useState<ReservationModalState | null>(null);

  // loading は初期値 true。日付変更時のスピナー表示は changeDate 側で設定する
  const fetchData = useCallback(async (date: Date) => {
    const supabase = createClient();
    const { startISO, endISO } = getDayRangeISO(date);
    const [facilitiesResult, reservationsResult] = await Promise.all([
      // 利用可能（is_active）な施設のみ表示する
      supabase.from("facilities").select("*").eq("is_active", true).order("id"),
      // 当日の範囲とオーバーラップする confirmed 予約（半開区間）
      supabase
        .from("reservations")
        .select("*, facilities(name), profiles(display_name)")
        .eq("status", "confirmed")
        .lt("start_time", endISO)
        .gt("end_time", startISO)
        .order("start_time"),
    ]);
    if (facilitiesResult.error || reservationsResult.error) {
      setError("予約状況の取得に失敗しました");
    } else {
      setFacilities(facilitiesResult.data ?? []);
      setReservations(reservationsResult.data ?? []);
      setMobileFacilityId(
        (prev) => prev ?? facilitiesResult.data?.[0]?.id ?? null,
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(selectedDate);
  }, [fetchData, selectedDate]);

  const changeDate = (deltaDays: number) => {
    setLoading(true);
    setSelectedDate((d) => addDays(d, deltaDays));
  };

  const openSlot = (facility: Facility, start: Date, end: Date) => {
    setModal({ mode: "create", facility, start, end });
  };

  const openReservation = (reservation: ReservationWithDetails) => {
    const facility = facilities.find((f) => f.id === reservation.facility_id);
    if (!facility) return;
    // 自分の予約 かつ 有効ステータスが confirmed の場合のみ編集可（§4.6）
    const editable =
      reservation.user_id === currentUserId &&
      getEffectiveStatus(reservation) === "confirmed";
    setModal({ mode: editable ? "edit" : "view", facility, reservation });
  };

  const handleSaved = () => {
    setModal(null);
    fetchData(selectedDate);
  };

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => changeDate(-1)}
          aria-label="前日へ"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ◀
        </button>
        <h1 className="text-lg font-bold">{formatJstDate(selectedDate)}</h1>
        <button
          type="button"
          onClick={() => changeDate(1)}
          aria-label="翌日へ"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ▶
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : facilities.length === 0 ? (
        <p className="rounded-lg bg-white px-4 py-8 text-center text-sm text-gray-500 shadow">
          利用可能な施設がありません
        </p>
      ) : (
        <>
          <DayGrid
            facilities={facilities}
            reservations={reservations}
            date={selectedDate}
            currentUserId={currentUserId}
            onSlotClick={openSlot}
            onReservationClick={openReservation}
          />
          <DayList
            facilities={facilities}
            reservations={reservations}
            date={selectedDate}
            currentUserId={currentUserId}
            selectedFacilityId={mobileFacilityId}
            onFacilityChange={setMobileFacilityId}
            onSlotClick={openSlot}
            onReservationClick={openReservation}
          />
        </>
      )}

      {modal && (
        <ReservationModal
          key={
            modal.mode === "create"
              ? `create-${modal.facility.id}-${modal.start.getTime()}`
              : `${modal.mode}-${modal.reservation.id}`
          }
          state={modal}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
