import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isModuleEnabled } from "@/lib/modules";

// M-NOTIFY メール通知の呼び出し（NOTIF-01/03/04）
// - M-NOTIFY 有効時のみ Edge Function（send-notification）を呼ぶ
// - 通知は補助機能のため、未デプロイ・失敗時も本処理を妨げない
//   （fire-and-forget: 呼び出し側は await せず void で呼ぶ）
export type NotificationEvent =
  | { type: "reservation_created"; reservationId: number }
  | { type: "reservation_cancelled"; reservationId: number }
  | { type: "inquiry_created"; inquiryId: number };

export async function notify(
  supabase: SupabaseClient<Database>,
  event: NotificationEvent,
): Promise<void> {
  try {
    if (!(await isModuleEnabled(supabase, "M-NOTIFY"))) return;
    await supabase.functions.invoke("send-notification", { body: event });
  } catch {
    // 通知失敗は握りつぶす（README 既知の制約参照）
  }
}
