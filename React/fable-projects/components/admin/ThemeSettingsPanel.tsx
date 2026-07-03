"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  THEME_TEMPLATES,
  parseThemeConfig,
  resolvePrimaryColor,
  type ThemeConfig,
  type ThemeTemplateId,
} from "@/lib/theme";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";

// A-09 テーマ設定（画面設計書 §4.14）
// - THEME-01: カラーテンプレート選択（5種）
// - THEME-02: プライマリカラーのカスタム指定（テンプレートより優先）
// - THEME-03: ロゴURL設定（Supabase Storage 等の画像URLを想定。アップロードは未対応）
// 保存先は module_settings（M-THEME）の config。保存後 router.refresh() で全画面に反映
export default function ThemeSettingsPanel() {
  const router = useRouter();
  const [config, setConfig] = useState<ThemeConfig | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const fetchConfig = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("module_settings")
      .select("config")
      .eq("module_id", "M-THEME")
      .single();
    if (fetchError) {
      setError("テーマ設定の取得に失敗しました");
      return;
    }
    const parsed = parseThemeConfig(data?.config ?? null);
    setConfig(parsed);
    setUseCustom(parsed.customColor !== null);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig();
  }, [fetchConfig]);

  if (config === null) return <Loading />;

  const previewColor = resolvePrimaryColor({
    ...config,
    customColor: useCustom ? (config.customColor ?? "#3b82f6") : null,
  });

  const selectTemplate = (template: ThemeTemplateId) => {
    setConfig((c) => (c ? { ...c, template } : c));
    setUseCustom(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMessage(false);
    const supabase = createClient();
    const logoUrl = config.logoUrl?.trim() || null;
    if (logoUrl && !/^https?:\/\//.test(logoUrl)) {
      setError("ロゴURLは http(s):// で始まるURLを指定してください");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("module_settings")
      .update({
        config: {
          template: config.template,
          customColor: useCustom ? config.customColor : null,
          logoUrl,
        },
      })
      .eq("module_id", "M-THEME");
    setSaving(false);
    if (updateError) {
      setError("テーマ設定の保存に失敗しました");
      return;
    }
    setSavedMessage(true);
    // ルートレイアウトの CSS 変数・Header のロゴを再評価させる
    router.refresh();
  };

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <h1 className="mb-4 text-xl font-bold">テーマ設定</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          カラーテンプレート
        </h2>
        <div className="flex flex-wrap gap-3">
          {THEME_TEMPLATES.map((template) => {
            const selected = !useCustom && config.template === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                aria-pressed={selected}
                className={`w-28 rounded-lg border-2 bg-white p-3 text-center text-xs transition-colors ${
                  selected ? "border-gray-800" : "border-transparent shadow"
                }`}
              >
                <span
                  className="mx-auto mb-2 block h-10 w-10 rounded-full"
                  style={{ backgroundColor: template.primary }}
                />
                {template.name}
                {selected && <span className="mt-1 block font-bold">●</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          プライマリカラー（カスタム）
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseCustom(checked);
                // ON にした時点で現在のテンプレート色を初期値に確定させる
                // （null のままだと「プレビュー≠保存結果」の食い違いが起きる）
                if (checked) {
                  setConfig((c) =>
                    c && c.customColor === null
                      ? {
                          ...c,
                          customColor:
                            THEME_TEMPLATES.find((t) => t.id === c.template)
                              ?.primary ?? "#3b82f6",
                        }
                      : c,
                  );
                }
              }}
            />
            カスタムカラーを使う（テンプレートより優先）
          </label>
          {useCustom && (
            <input
              type="color"
              value={config.customColor ?? "#3b82f6"}
              onChange={(e) =>
                setConfig((c) =>
                  c ? { ...c, customColor: e.target.value } : c,
                )
              }
              aria-label="カスタムカラー"
              className="h-9 w-14 cursor-pointer rounded border border-gray-300"
            />
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">ロゴ設定</h2>
        <input
          value={config.logoUrl ?? ""}
          onChange={(e) =>
            setConfig((c) => (c ? { ...c, logoUrl: e.target.value } : c))
          }
          placeholder="https://example.com/logo.png（空欄でデフォルトの🏢）"
          aria-label="ロゴURL"
          className="w-full max-w-lg rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">プレビュー</h2>
        <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
          <span
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: previewColor }}
          >
            主要ボタン
          </span>
          <span className="text-sm tabular-nums text-gray-500">
            {previewColor}
          </span>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}>
          保存
        </Button>
        {savedMessage && (
          <p className="text-sm text-green-600">保存しました</p>
        )}
      </div>
    </div>
  );
}
