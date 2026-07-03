import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { isModuleEnabled } from "@/lib/modules";

// M-THEME テーマカスタマイズ（THEME-01〜03）
//
// 保存先: module_settings の M-THEME 行の config（JSONB）
//   DB設計書 v1.0 にテーマ用テーブルが無いため、module_settings.config
//   （「追加設定」カラム）を利用する（設計判断: README 参照）
// config 形式: { "template": "blue", "customColor": "#rrggbb" | null, "logoUrl": "https://..." | null }
//   customColor が設定されていればテンプレートより優先する（THEME-02）

// カラーテンプレート5種（要件定義書 §4.12）
export const THEME_TEMPLATES = [
  { id: "blue", name: "ビジネスブルー", primary: "#3b82f6" },
  { id: "green", name: "ナチュラルグリーン", primary: "#22c55e" },
  { id: "purple", name: "エレガントパープル", primary: "#a855f7" },
  { id: "orange", name: "ウォームオレンジ", primary: "#f97316" },
  { id: "mono", name: "モノクロ", primary: "#6b7280" },
] as const;

export type ThemeTemplateId = (typeof THEME_TEMPLATES)[number]["id"];

export type ThemeConfig = {
  template: ThemeTemplateId;
  customColor: string | null;
  logoUrl: string | null;
};

export const DEFAULT_THEME: ThemeConfig = {
  template: "blue",
  customColor: null,
  logoUrl: null,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// config（JSONB）を安全に ThemeConfig へ変換する。不正値はデフォルトに落とす
export function parseThemeConfig(config: Json | null): ThemeConfig {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return DEFAULT_THEME;
  }
  const record = config as { [key: string]: Json | undefined };
  const template = THEME_TEMPLATES.find((t) => t.id === record.template)?.id;
  const customColor =
    typeof record.customColor === "string" && HEX_COLOR.test(record.customColor)
      ? record.customColor
      : null;
  const logoUrl =
    typeof record.logoUrl === "string" && record.logoUrl.trim() !== ""
      ? record.logoUrl
      : null;
  return {
    template: template ?? DEFAULT_THEME.template,
    customColor,
    logoUrl,
  };
}

// 適用するプライマリカラー（customColor がテンプレートより優先）
export function resolvePrimaryColor(config: ThemeConfig): string {
  if (config.customColor) return config.customColor;
  return (
    THEME_TEMPLATES.find((t) => t.id === config.template)?.primary ??
    DEFAULT_THEME.customColor ??
    THEME_TEMPLATES[0].primary
  );
}

// サーバー側で現在のテーマを取得する。
// M-THEME 無効時・未ログイン時（RLS で module_settings が読めない）はデフォルト
export async function getThemeConfig(
  supabase: SupabaseClient<Database>,
): Promise<ThemeConfig> {
  if (!(await isModuleEnabled(supabase, "M-THEME"))) {
    return DEFAULT_THEME;
  }
  const { data } = await supabase
    .from("module_settings")
    .select("config")
    .eq("module_id", "M-THEME")
    .single();
  return parseThemeConfig(data?.config ?? null);
}
