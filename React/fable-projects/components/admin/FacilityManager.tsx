"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, FacilityWithCategory } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";

// A-02 施設管理（画面設計書 §4.9）
// モード切替式（A-03 と同パターン）+ カテゴリフィルター + 確定予約あり削除ガード
// Phase2: 延長可否（FAC-10/EXT-01。M-EXTEND 有効時のみ表示）と
//         時間単価（PRICE-01。M-PRICE 有効時のみ表示、facility_prices に保存）を追加。
// time_unit・equipment は引き続き DB デフォルト値で登録される
type Mode = "normal" | "edit" | "delete";

type EditForm = {
  name: string;
  categoryId: string; // "" = 未分類
  maxCapacity: string;
  isActive: boolean;
  allowExtension: boolean;
  pricePerUnit: string; // "" = 0円扱い（M-PRICE 有効時のみ使用）
};

const EMPTY_FORM: EditForm = {
  name: "",
  categoryId: "",
  maxCapacity: "1",
  isActive: true,
  allowExtension: false,
  pricePerUnit: "",
};

export default function FacilityManager() {
  const [facilities, setFacilities] = useState<FacilityWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // facility_id → 時間単価（facility_prices。行が無い施設は未設定=0円扱い）
  const [prices, setPrices] = useState<Map<number, number>>(new Map());
  const [extendEnabled, setExtendEnabled] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [saving, setSaving] = useState(false);

  // カテゴリフィルター（"all" = すべて）
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EditForm>(EMPTY_FORM);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);

  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());

  // loading は初期値 true。再取得時は旧データを表示したまま差し替える
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [facilitiesResult, categoriesResult, pricesResult, modulesResult] =
      await Promise.all([
        supabase
          .from("facilities")
          .select("*, categories(name)")
          .order("id"),
        supabase.from("categories").select("*").order("sort_order").order("id"),
        supabase.from("facility_prices").select("facility_id, price_per_unit"),
        supabase
          .from("module_settings")
          .select("module_id, is_enabled")
          .in("module_id", ["M-EXTEND", "M-PRICE"]),
      ]);
    if (
      facilitiesResult.error ||
      categoriesResult.error ||
      pricesResult.error ||
      modulesResult.error
    ) {
      setError("施設の取得に失敗しました");
    } else {
      setFacilities(facilitiesResult.data ?? []);
      setCategories(categoriesResult.data ?? []);
      setPrices(
        new Map(
          (pricesResult.data ?? []).map((p) => [p.facility_id, p.price_per_unit]),
        ),
      );
      const enabled = new Map(
        (modulesResult.data ?? []).map((m) => [m.module_id, m.is_enabled]),
      );
      setExtendEnabled(enabled.get("M-EXTEND") ?? false);
      setPriceEnabled(enabled.get("M-PRICE") ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // フィルターやモードの切替で非表示・対象外になった行が
  // 編集/削除の対象に残らないよう、選択状態をまとめてリセットする
  const clearSelections = () => {
    setEditId(null);
    setDeleteIds(new Set());
  };

  const switchMode = (next: Mode) => {
    setMode((current) => (current === next ? "normal" : next));
    clearSelections();
  };

  const selectEditRow = (facility: FacilityWithCategory) => {
    setEditId(facility.id);
    const price = prices.get(facility.id);
    setEditForm({
      name: facility.name,
      categoryId: facility.category_id === null ? "" : String(facility.category_id),
      maxCapacity: String(facility.max_capacity),
      isActive: facility.is_active,
      allowExtension: facility.allow_extension,
      pricePerUnit: price === undefined ? "" : String(price),
    });
  };

  const toggleDeleteRow = (id: number) => {
    setDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 入力値の共通検証（新規・編集兼用）
  const validateForm = (
    form: EditForm,
  ): { name: string; capacity: number; price: number } | null => {
    const name = form.name.trim();
    if (!name) {
      alert("施設名を入力してください");
      return null;
    }
    const capacity = Number(form.maxCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      alert("最大人数は1以上の整数で入力してください");
      return null;
    }
    // 料金は M-PRICE 有効時のみ検証。空欄は 0円（未設定）扱い
    let price = 0;
    if (priceEnabled && form.pricePerUnit !== "") {
      price = Number(form.pricePerUnit);
      if (!Number.isInteger(price) || price < 0) {
        alert("料金は0以上の整数で入力してください");
        return null;
      }
    }
    return { name, capacity, price };
  };

  // facility_prices は施設と別テーブルのため、施設保存後に upsert する
  const savePrice = async (facilityId: number, price: number) => {
    if (!priceEnabled) return null;
    const supabase = createClient();
    const { error: priceError } = await supabase
      .from("facility_prices")
      .upsert(
        { facility_id: facilityId, price_per_unit: price },
        { onConflict: "facility_id" },
      );
    return priceError;
  };

  const handleCreate = async () => {
    const valid = validateForm(createForm);
    if (!valid) return;
    setSaving(true);
    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("facilities")
      .insert({
        name: valid.name,
        category_id: createForm.categoryId === "" ? null : Number(createForm.categoryId),
        max_capacity: valid.capacity,
        is_active: createForm.isActive,
        allow_extension: createForm.allowExtension,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      setSaving(false);
      setError("施設の登録に失敗しました");
      return;
    }
    const priceError = await savePrice(inserted.id, valid.price);
    setSaving(false);
    if (priceError) {
      setError("施設は登録しましたが、料金の保存に失敗しました");
    }
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    await fetchData();
  };

  const handleUpdate = async () => {
    if (editId === null) {
      alert("編集する行を選択してください");
      return;
    }
    const valid = validateForm(editForm);
    if (!valid) return;
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("facilities")
      .update({
        name: valid.name,
        category_id: editForm.categoryId === "" ? null : Number(editForm.categoryId),
        max_capacity: valid.capacity,
        is_active: editForm.isActive,
        allow_extension: editForm.allowExtension,
      })
      .eq("id", editId);
    if (updateError) {
      setSaving(false);
      setError("施設の更新に失敗しました");
      return;
    }
    const priceError = await savePrice(editId, valid.price);
    setSaving(false);
    if (priceError) {
      setError("施設は更新しましたが、料金の保存に失敗しました");
    }
    switchMode("normal");
    await fetchData();
  };

  const handleDelete = async () => {
    if (deleteIds.size === 0) {
      alert("削除する施設を選択してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const ids = Array.from(deleteIds);

    // 確定済み予約がある施設は削除不可（画面設計書 §4.9）。
    // 「確定」は表示ステータス基準（終了済みは完了扱い）のため end_time が未来のもののみ対象
    const { data: reserved, error: checkError } = await supabase
      .from("reservations")
      .select("facility_id")
      .in("facility_id", ids)
      .eq("status", "confirmed")
      .gt("end_time", new Date().toISOString());
    if (checkError) {
      setSaving(false);
      setError("削除前のチェックに失敗しました");
      return;
    }
    if (reserved && reserved.length > 0) {
      const reservedIds = new Set(reserved.map((r) => r.facility_id));
      const reservedNames = facilities
        .filter((f) => reservedIds.has(f.id))
        .map((f) => f.name);
      alert(`確定済みの予約があるため削除できません: ${reservedNames.join("、")}`);
      setSaving(false);
      return;
    }

    if (!confirm(`選択した${ids.length}件の施設を削除します。よろしいですか？`)) {
      setSaving(false);
      return;
    }
    const { error: deleteError } = await supabase
      .from("facilities")
      .delete()
      .in("id", ids);
    setSaving(false);
    if (deleteError) {
      setError("施設の削除に失敗しました");
      return;
    }
    switchMode("normal");
    await fetchData();
  };

  const visibleFacilities =
    categoryFilter === "all"
      ? facilities
      : facilities.filter((f) => String(f.category_id ?? "") === categoryFilter);

  const columnCount =
    (mode === "normal" ? 5 : 6) + (extendEnabled ? 1 : 0) + (priceEnabled ? 1 : 0);
  const inputClass =
    "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

  const categoryOptions = (
    <>
      <option value="">未分類</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">施設管理</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>新規登録</Button>
          <Button
            variant={mode === "edit" ? "primary" : "secondary"}
            onClick={() => switchMode("edit")}
          >
            編集
          </Button>
          <Button
            variant={mode === "delete" ? "danger" : "secondary"}
            onClick={() => switchMode("delete")}
          >
            削除
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="category-filter" className="text-sm text-gray-600">
          カテゴリ:
        </label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            clearSelections();
          }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">すべて</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  {mode !== "normal" && <th className="w-12 px-4 py-3" />}
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">施設名</th>
                  <th className="px-4 py-3">カテゴリ</th>
                  <th className="px-4 py-3">定員</th>
                  <th className="px-4 py-3">利用可否</th>
                  {extendEnabled && <th className="px-4 py-3">延長可否</th>}
                  {priceEnabled && <th className="px-4 py-3">料金（円/時間単位）</th>}
                </tr>
              </thead>
              <tbody>
                {visibleFacilities.map((facility) => {
                  const isEditing = mode === "edit" && editId === facility.id;
                  return (
                    <tr
                      key={facility.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {mode === "edit" && (
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="facility-edit-target"
                            checked={editId === facility.id}
                            onChange={() => selectEditRow(facility)}
                            aria-label={`${facility.name}を編集対象に選択`}
                          />
                        </td>
                      )}
                      {mode === "delete" && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={deleteIds.has(facility.id)}
                            onChange={() => toggleDeleteRow(facility.id)}
                            aria-label={`${facility.name}を削除対象に選択`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">{facility.id}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            className={`${inputClass} min-w-32`}
                          />
                        ) : (
                          facility.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.categoryId}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                categoryId: e.target.value,
                              }))
                            }
                            className={`${inputClass} min-w-28`}
                          >
                            {categoryOptions}
                          </select>
                        ) : (
                          (facility.categories?.name ?? "-")
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editForm.maxCapacity}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                maxCapacity: e.target.value,
                              }))
                            }
                            className={`${inputClass} max-w-20`}
                          />
                        ) : (
                          facility.max_capacity
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <label className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                            利用可
                          </label>
                        ) : facility.is_active ? (
                          "利用可"
                        ) : (
                          <span className="text-red-500">利用停止中</span>
                        )}
                      </td>
                      {extendEnabled && (
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={editForm.allowExtension}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    allowExtension: e.target.checked,
                                  }))
                                }
                              />
                              延長可
                            </label>
                          ) : facility.allow_extension ? (
                            "延長可"
                          ) : (
                            <span className="text-gray-400">延長不可</span>
                          )}
                        </td>
                      )}
                      {priceEnabled && (
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editForm.pricePerUnit}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  pricePerUnit: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className={`${inputClass} max-w-24`}
                            />
                          ) : (
                            `${(prices.get(facility.id) ?? 0).toLocaleString()}円`
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {visibleFacilities.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      施設がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {mode !== "normal" && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => switchMode("normal")}>
                閉じる
              </Button>
              {mode === "edit" && (
                <Button onClick={handleUpdate} loading={saving}>
                  更新する
                </Button>
              )}
              {mode === "delete" && (
                <Button variant="danger" onClick={handleDelete} loading={saving}>
                  削除する
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        title="施設登録"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              閉じる
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              追加する
            </Button>
          </>
        }
      >
        <div className="mb-4">
          <label htmlFor="facility-name" className="mb-1 block text-sm font-medium">
            施設名
          </label>
          <input
            id="facility-name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="例：大会議室A"
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="facility-category"
            className="mb-1 block text-sm font-medium"
          >
            カテゴリ
          </label>
          <select
            id="facility-category"
            value={createForm.categoryId}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, categoryId: e.target.value }))
            }
            className={inputClass}
          >
            {categoryOptions}
          </select>
        </div>
        <div className="mb-4">
          <label
            htmlFor="facility-capacity"
            className="mb-1 block text-sm font-medium"
          >
            最大人数
          </label>
          <input
            id="facility-capacity"
            type="number"
            min={1}
            value={createForm.maxCapacity}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, maxCapacity: e.target.value }))
            }
            placeholder="例：30"
            className={inputClass}
          />
        </div>
        {priceEnabled && (
          <div className="mb-4">
            <label
              htmlFor="facility-price"
              className="mb-1 block text-sm font-medium"
            >
              料金（円/時間単位）
            </label>
            <input
              id="facility-price"
              type="number"
              min={0}
              value={createForm.pricePerUnit}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, pricePerUnit: e.target.value }))
              }
              placeholder="例：1000（空欄は0円）"
              className={inputClass}
            />
          </div>
        )}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            利用可否
          </label>
          {extendEnabled && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={createForm.allowExtension}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    allowExtension: e.target.checked,
                  }))
                }
              />
              時間延長を許可
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
