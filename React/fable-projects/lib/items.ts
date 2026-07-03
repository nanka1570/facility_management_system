import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item } from "@/types/database";

// ITEM-04 在庫管理: 指定時間帯と重なる confirmed 予約での貸出数を集計し、
// 要求数を加えると総数を超える備品の名前一覧を返す（空配列 = 在庫OK）。
// 時間帯は hasOverlap と同じ半開区間 [start, end) の規約
export async function findItemShortages(
  supabase: SupabaseClient<Database>,
  params: {
    // item_id → 要求数
    requests: Map<number, number>;
    items: Item[];
    startISO: string;
    endISO: string;
    // 編集・延長時に自分の予約分を集計から除外する
    excludeReservationId?: number;
  },
): Promise<string[]> {
  const requestedIds = Array.from(params.requests.keys());
  if (requestedIds.length === 0) return [];

  let query = supabase
    .from("reservation_items")
    .select("item_id, quantity, reservations!inner(status, start_time, end_time)")
    .in("item_id", requestedIds)
    .eq("reservations.status", "confirmed")
    .lt("reservations.start_time", params.endISO)
    .gt("reservations.end_time", params.startISO);
  if (params.excludeReservationId !== undefined) {
    query = query.neq("reservation_id", params.excludeReservationId);
  }
  const { data, error } = await query;
  if (error) throw error;

  const booked = new Map<number, number>();
  for (const row of data ?? []) {
    booked.set(row.item_id, (booked.get(row.item_id) ?? 0) + row.quantity);
  }

  const shortages: string[] = [];
  for (const [itemId, requested] of params.requests) {
    if (requested <= 0) continue;
    const item = params.items.find((i) => i.id === itemId);
    if (!item) continue;
    if ((booked.get(itemId) ?? 0) + requested > item.total_quantity) {
      shortages.push(item.name);
    }
  }
  return shortages;
}
