// M-NOTIFY メール通知 Edge Function（NOTIF-01〜04）
//
// デプロイ:
//   supabase functions deploy send-notification
// 必要なシークレット:
//   supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_FROM="施設管理システム <onboarding@resend.dev>"
// リマインダー（NOTIF-02）は毎日実行のスケジュールで {"type":"reminder"} を
// 呼び出す（Supabase Dashboard → Edge Functions → Schedules、または pg_cron）。
//
// セキュリティ設計: 呼び出し側からはID（reservationId / inquiryId）のみを受け取り、
// 宛先・本文はサービスロールで DB から再取得して構築する（本文・宛先の偽装を防ぐ）
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationRequest =
  | { type: "reservation_created"; reservationId: number }
  | { type: "reservation_cancelled"; reservationId: number }
  | { type: "inquiry_created"; inquiryId: number }
  | { type: "reminder" };

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("NOTIFY_FROM") ?? "onboarding@resend.dev";

async function sendMail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY 未設定のため送信をスキップしました");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, text }),
  });
  if (!res.ok) {
    console.error(`Resend API error: ${res.status} ${await res.text()}`);
  }
}

// TIMESTAMPTZ を JST 表記に整形（アプリの lib/datetime.ts と同じ方針）
function formatJst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

async function fetchReservation(id: number) {
  const { data } = await supabase
    .from("reservations")
    .select("*, facilities(name), profiles(email, display_name)")
    .eq("id", id)
    .single();
  return data;
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json()) as NotificationRequest;

    switch (body.type) {
      // NOTIF-01 予約完了メール
      case "reservation_created": {
        const r = await fetchReservation(body.reservationId);
        if (!r?.profiles?.email) break;
        await sendMail(
          r.profiles.email,
          "【施設管理システム】予約が確定しました",
          `${r.profiles.display_name ?? ""} 様\n\n以下の予約が確定しました。\n\n施設: ${r.facilities?.name ?? "-"}\n日時: ${formatJst(r.start_time)} - ${formatJst(r.end_time)}\n人数: ${r.num_people}名\n`,
        );
        break;
      }
      // NOTIF-03 キャンセル通知
      case "reservation_cancelled": {
        const r = await fetchReservation(body.reservationId);
        if (!r?.profiles?.email) break;
        await sendMail(
          r.profiles.email,
          "【施設管理システム】予約がキャンセルされました",
          `${r.profiles.display_name ?? ""} 様\n\n以下の予約がキャンセルされました。\n\n施設: ${r.facilities?.name ?? "-"}\n日時: ${formatJst(r.start_time)} - ${formatJst(r.end_time)}\n`,
        );
        break;
      }
      // NOTIF-04 問い合わせ通知（admin / developer 全員へ）
      case "inquiry_created": {
        const [{ data: inquiry }, { data: admins }] = await Promise.all([
          supabase
            .from("inquiries")
            .select("subject, profiles(display_name)")
            .eq("id", body.inquiryId)
            .single(),
          supabase
            .from("profiles")
            .select("email")
            .in("role", ["admin", "developer"]),
        ]);
        if (!inquiry) break;
        await Promise.all(
          (admins ?? []).map((a) =>
            sendMail(
              a.email,
              "【施設管理システム】新しい問い合わせがあります",
              `新しい問い合わせが投稿されました。\n\n件名: ${inquiry.subject}\n投稿者: ${inquiry.profiles?.display_name ?? "不明"}\n\n管理画面（/admin/inquiries）から確認・返信してください。\n`,
            ),
          ),
        );
        break;
      }
      // NOTIF-02 予約リマインダー（翌日の confirmed 予約の所有者へ）
      case "reminder": {
        const now = new Date();
        const jstMidnight = new Date(
          Math.floor((now.getTime() + 9 * 3_600_000) / 86_400_000) * 86_400_000 -
            9 * 3_600_000,
        );
        const start = new Date(jstMidnight.getTime() + 86_400_000); // 翌日0:00 JST
        const end = new Date(start.getTime() + 86_400_000);
        const { data: reservations } = await supabase
          .from("reservations")
          .select("*, facilities(name), profiles(email, display_name)")
          .eq("status", "confirmed")
          .gte("start_time", start.toISOString())
          .lt("start_time", end.toISOString());
        await Promise.all(
          (reservations ?? []).map((r) =>
            r.profiles?.email
              ? sendMail(
                  r.profiles.email,
                  "【施設管理システム】明日の予約のお知らせ",
                  `${r.profiles.display_name ?? ""} 様\n\n明日の予約をお知らせします。\n\n施設: ${r.facilities?.name ?? "-"}\n日時: ${formatJst(r.start_time)} - ${formatJst(r.end_time)}\n`,
                )
              : Promise.resolve(),
          ),
        );
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
