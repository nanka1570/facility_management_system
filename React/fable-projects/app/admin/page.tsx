import { redirect } from "next/navigation";

// A-01 の URL は /admin/dashboard（画面設計書 v2.0）。/admin は転送のみ
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
