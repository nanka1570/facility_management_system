"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODULE_DEFS, type ModuleId } from "@/lib/modules";
import Loading from "@/components/ui/Loading";
import Toast from "@/components/ui/Toast";

// A-08 モジュール設定（画面設計書 §4.13）
// M-CORE / M-USER / M-FACILITY は「ON（固定）」でトグル不可。
// トグルは即時で module_settings を更新する（developer の RLS で保護）
export default function ModuleSettingsPanel() {
  const router = useRouter();
  const [settings, setSettings] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<ModuleId | null>(null);

  // loading は初期値 true（取得は初回のみ）
  const fetchSettings = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("module_settings")
      .select("module_id, is_enabled");
    if (fetchError) {
      setError("モジュール設定の取得に失敗しました");
    } else {
      setSettings(new Map((data ?? []).map((s) => [s.module_id, s.is_enabled])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const handleToggle = async (moduleId: ModuleId) => {
    const current = settings.get(moduleId) ?? false;
    setUpdatingId(moduleId);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("module_settings")
      .update({ is_enabled: !current })
      .eq("module_id", moduleId);
    setUpdatingId(null);
    if (updateError) {
      setError("モジュール設定の更新に失敗しました");
      return;
    }
    setSettings((prev) => new Map(prev).set(moduleId, !current));
    // サイドバー等のモジュール連動表示（Server Component）を更新する
    router.refresh();
  };

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <h1 className="mb-4 text-xl font-bold">システム設定</h1>
      <h2 className="mb-3 text-sm font-semibold text-gray-600">モジュール設定</h2>

      {loading ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">モジュール</th>
                <th className="px-4 py-3">説明</th>
                <th className="px-4 py-3">状態</th>
              </tr>
            </thead>
            <tbody>
              {MODULE_DEFS.map((module) => {
                const enabled = settings.get(module.id) ?? false;
                return (
                  <tr
                    key={module.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {module.id}
                      <span className="ml-2 text-gray-500">{module.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {module.description}
                    </td>
                    <td className="px-4 py-3">
                      {module.fixed ? (
                        <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          ON（固定）
                        </span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${module.name}を${enabled ? "無効" : "有効"}にする`}
                          disabled={updatingId === module.id}
                          onClick={() => handleToggle(module.id)}
                          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                            enabled ? "bg-blue-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                              enabled ? "left-5.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
