import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReservationStatus } from "@/types/database";

// 指定の施設・時間帯に重複する confirmed 予約があるか判定する。
// 区間は半開区間 [start, end) として扱い、境界接触（10-11 と 11-12）は重複としない。
// 呼び出し箇所: U-03 新規 / U-03 編集 / A-04 新規 / A-04 編集 / A-04 復元
export async function hasOverlap(
  supabase: SupabaseClient<Database>,
  params: {
    facilityId: number;
    startISO: string;
    endISO: string;
    // 編集・復元時に自分自身を重複相手から除外する
    excludeId?: number;
  },
): Promise<boolean> {
  let query = supabase
    .from("reservations")
    .select("id")
    .eq("facility_id", params.facilityId)
    .eq("status", "confirmed")
    .lt("start_time", params.endISO)
    .gt("end_time", params.startISO)
    .limit(1);

  if (params.excludeId !== undefined) {
    query = query.neq("id", params.excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// 表示用ステータスの導出。
// Phase1 では completed への自動更新（バッチ）を持たないため、
// DB 値が confirmed でも終了時刻を過ぎていれば「完了」として扱う。
// 表示（StatusBadge）と操作可否の判定は必ずこの関数を通すこと。
export function getEffectiveStatus(
  reservation: { status: ReservationStatus; end_time: string },
  now: Date = new Date(),
): ReservationStatus {
  if (reservation.status === "confirmed" && new Date(reservation.end_time) < now) {
    return "completed";
  }
  return reservation.status;
}
