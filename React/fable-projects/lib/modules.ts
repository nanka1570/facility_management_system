import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// モジュール定義（要件定義書 §3.1 の12モジュール）
// fixed: true のモジュールは OFF にできない（A-08 でトグル無効）
export const MODULE_DEFS = [
  { id: "M-CORE", name: "コアシステム", description: "認証・基本設定（必須）", fixed: true },
  { id: "M-USER", name: "ユーザー管理", description: "ユーザー登録・認証", fixed: true },
  { id: "M-FACILITY", name: "施設管理", description: "施設・カテゴリのCRUD", fixed: true },
  { id: "M-RESERVE", name: "予約機能", description: "予約のCRUD・重複チェック", fixed: false },
  { id: "M-EXTEND", name: "時間延長", description: "利用中の予約時間を延長", fixed: false },
  { id: "M-DISPLAY", name: "表示機能", description: "デジタルサイネージ出力", fixed: false },
  { id: "M-PRICE", name: "料金計算", description: "利用料金の計算・表示", fixed: false },
  { id: "M-ITEM", name: "備品管理", description: "備品の貸出管理", fixed: false },
  { id: "M-INQUIRY", name: "問い合わせ", description: "チャット形式の問い合わせ", fixed: false },
  { id: "M-NOTIFY", name: "通知機能", description: "メール通知", fixed: false },
  { id: "M-THEME", name: "テーマカスタマイズ", description: "カラー・ロゴ・フォント変更", fixed: false },
  { id: "M-TENANT", name: "マルチテナント", description: "複数組織対応", fixed: false },
] as const;

export type ModuleId = (typeof MODULE_DEFS)[number]["id"];

export async function isModuleEnabled(
  supabase: SupabaseClient<Database>,
  moduleId: ModuleId,
): Promise<boolean> {
  const { data } = await supabase
    .from("module_settings")
    .select("is_enabled")
    .eq("module_id", moduleId)
    .single();
  return data?.is_enabled ?? false;
}
