"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDayRangeISO, jstToday } from "@/lib/datetime";
import type { Facility, Reservation } from "@/types/database";

// D-01/D-02 共用のサイネージデータ取得フック
// - 本日（JST）の confirmed 予約と利用可の施設を取得
// - DISP-03: 30秒間隔で自動再取得（要件定義書 §9.1）
// - 時計表示用に now を1秒間隔で更新
export function useSignageData() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { startISO, endISO } = getDayRangeISO(jstToday());
    const [facilitiesResult, reservationsResult] = await Promise.all([
      supabase.from("facilities").select("*").eq("is_active", true).order("id"),
      // 「本日と重なる予約」を半開区間 [start, end) で取得する（hasOverlap と同じ規約）。
      // start_time だけで絞ると前日から続く日跨ぎ予約が漏れ、
      // 利用中の施設が「空き」と誤表示される
      supabase
        .from("reservations")
        .select("*")
        .eq("status", "confirmed")
        .lt("start_time", endISO)
        .gt("end_time", startISO)
        .order("start_time"),
    ]);
    if (facilitiesResult.error || reservationsResult.error) {
      setError(true);
    } else {
      setError(false);
      setFacilities(facilitiesResult.data ?? []);
      setReservations(reservationsResult.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const refreshTimer = setInterval(fetchData, 30_000);
    const clockTimer = setInterval(() => setNow(new Date()), 1_000);
    return () => {
      clearInterval(refreshTimer);
      clearInterval(clockTimer);
    };
  }, [fetchData]);

  return { facilities, reservations, now, loading, error };
}
