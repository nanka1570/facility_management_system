import type { Json } from "@/types/database";

// DISP-05 サイネージ表示項目カスタマイズ
// 保存先: module_settings の M-DISPLAY 行の config（JSONB）
// config 形式: { "showSchedule": boolean, "showNext": boolean }
//   showSchedule: 本日の時間帯一覧（D-01 カード内 / D-02 下部）の表示
//   showNext    : 次の予約（D-02）の表示
// 施設名と利用中/空きの状態表示はサイネージの主目的のため常時表示（設定対象外）

export type DisplayConfig = {
  showSchedule: boolean;
  showNext: boolean;
};

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showSchedule: true,
  showNext: true,
};

export function parseDisplayConfig(config: Json | null): DisplayConfig {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return DEFAULT_DISPLAY_CONFIG;
  }
  const record = config as { [key: string]: Json | undefined };
  return {
    showSchedule:
      typeof record.showSchedule === "boolean"
        ? record.showSchedule
        : DEFAULT_DISPLAY_CONFIG.showSchedule,
    showNext:
      typeof record.showNext === "boolean"
        ? record.showNext
        : DEFAULT_DISPLAY_CONFIG.showNext,
  };
}
