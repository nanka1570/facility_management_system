"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type DisplayConfig } from "@/lib/display";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

// DISP-05 サイネージ表示項目の設定（A-08 内のセクション。M-DISPLAY 有効時のみ）
// enabled / initialConfig はサーバー（settings/page.tsx）から渡される
type Props = {
  enabled: boolean;
  initialConfig: DisplayConfig;
};

export default function DisplaySettingsPanel({ enabled, initialConfig }: Props) {
  const [config, setConfig] = useState<DisplayConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  if (!enabled) return null;

  const handleSave = async () => {
    setSaving(true);
    setSavedMessage(false);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("module_settings")
      .update({ config })
      .eq("module_id", "M-DISPLAY");
    setSaving(false);
    if (updateError) {
      setError("サイネージ設定の保存に失敗しました");
      return;
    }
    setSavedMessage(true);
  };

  const toggle = (key: keyof DisplayConfig) => {
    setConfig((c) => ({ ...c, [key]: !c[key] }));
    setSavedMessage(false);
  };

  return (
    <section className="mt-8">
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <h2 className="mb-3 text-sm font-semibold text-gray-600">
        サイネージ表示設定（M-DISPLAY）
      </h2>
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.showSchedule}
              onChange={() => toggle("showSchedule")}
            />
            本日の時間帯一覧を表示する（全体表示のカード内・施設別の下部）
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.showNext}
              onChange={() => toggle("showNext")}
            />
            次の予約を表示する（施設別）
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            保存
          </Button>
          {savedMessage && (
            <p className="text-sm text-green-600">保存しました</p>
          )}
        </div>
      </div>
    </section>
  );
}
