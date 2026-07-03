import UserManager from "@/components/admin/UserManager";

// A-05 ユーザー管理（画面設計書 §4.12）
// 認証・role 検査は admin/layout.tsx（+ proxy）で実施済み
export default function AdminUsersPage() {
  return <UserManager />;
}
