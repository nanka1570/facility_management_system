"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";

// A-06 備品管理（ITEM-01/02）
// 画面設計書に A-06 の詳細ワイヤーは無いため、A-02/A-03 と同じ
// モード切替式（通常/編集/削除）で統一した（設計判断）
type Mode = "normal" | "edit" | "delete";

type EditForm = {
  name: string;
  totalQuantity: string;
  rentalPrice: string; // "" = 未設定（無料）
};

const EMPTY_FORM: EditForm = { name: "", totalQuantity: "1", rentalPrice: "" };

export default function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [saving, setSaving] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EditForm>(EMPTY_FORM);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);

  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [itemsResult, moduleResult] = await Promise.all([
      supabase.from("items").select("*").order("id"),
      supabase
        .from("module_settings")
        .select("is_enabled")
        .eq("module_id", "M-PRICE")
        .single(),
    ]);
    if (itemsResult.error) {
      setError("備品の取得に失敗しました");
    } else {
      setItems(itemsResult.data ?? []);
      setPriceEnabled(moduleResult.data?.is_enabled ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const clearSelections = () => {
    setEditId(null);
    setDeleteIds(new Set());
  };

  const switchMode = (next: Mode) => {
    setMode((current) => (current === next ? "normal" : next));
    clearSelections();
  };

  const selectEditRow = (item: Item) => {
    setEditId(item.id);
    setEditForm({
      name: item.name,
      totalQuantity: String(item.total_quantity),
      rentalPrice: item.rental_price === null ? "" : String(item.rental_price),
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

  const validateForm = (
    form: EditForm,
  ): { name: string; quantity: number; price: number | null } | null => {
    const name = form.name.trim();
    if (!name) {
      alert("備品名を入力してください");
      return null;
    }
    const quantity = Number(form.totalQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      alert("総数は1以上の整数で入力してください");
      return null;
    }
    let price: number | null = null;
    if (form.rentalPrice !== "") {
      price = Number(form.rentalPrice);
      if (!Number.isInteger(price) || price < 0) {
        alert("貸出単価は0以上の整数で入力してください");
        return null;
      }
    }
    return { name, quantity, price };
  };

  const handleCreate = async () => {
    const valid = validateForm(createForm);
    if (!valid) return;
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("items").insert({
      name: valid.name,
      total_quantity: valid.quantity,
      rental_price: valid.price,
    });
    setSaving(false);
    if (insertError) {
      setError("備品の登録に失敗しました");
      return;
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
      .from("items")
      .update({
        name: valid.name,
        total_quantity: valid.quantity,
        rental_price: valid.price,
      })
      .eq("id", editId);
    setSaving(false);
    if (updateError) {
      setError("備品の更新に失敗しました");
      return;
    }
    switchMode("normal");
    await fetchData();
  };

  const handleDelete = async () => {
    if (deleteIds.size === 0) {
      alert("削除する備品を選択してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const ids = Array.from(deleteIds);

    // 予約で使用中の備品は削除不可（DB側も ON DELETE RESTRICT で防護）
    const { data: used, error: checkError } = await supabase
      .from("reservation_items")
      .select("item_id")
      .in("item_id", ids);
    if (checkError) {
      setSaving(false);
      setError("削除前のチェックに失敗しました");
      return;
    }
    if (used && used.length > 0) {
      const usedIds = new Set(used.map((u) => u.item_id));
      const usedNames = items
        .filter((i) => usedIds.has(i.id))
        .map((i) => i.name);
      alert(`予約で使用中のため削除できません: ${usedNames.join("、")}`);
      setSaving(false);
      return;
    }

    if (!confirm(`選択した${ids.length}件の備品を削除します。よろしいですか？`)) {
      setSaving(false);
      return;
    }
    const { error: deleteError } = await supabase
      .from("items")
      .delete()
      .in("id", ids);
    setSaving(false);
    if (deleteError) {
      setError("備品の削除に失敗しました");
      return;
    }
    switchMode("normal");
    await fetchData();
  };

  const columnCount = (mode === "normal" ? 3 : 4) + (priceEnabled ? 1 : 0);
  const inputClass =
    "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">備品管理</h1>
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
                  <th className="px-4 py-3">備品名</th>
                  <th className="px-4 py-3">総数</th>
                  {priceEnabled && <th className="px-4 py-3">貸出単価</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEditing = mode === "edit" && editId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {mode === "edit" && (
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="item-edit-target"
                            checked={editId === item.id}
                            onChange={() => selectEditRow(item)}
                            aria-label={`${item.name}を編集対象に選択`}
                          />
                        </td>
                      )}
                      {mode === "delete" && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={deleteIds.has(item.id)}
                            onChange={() => toggleDeleteRow(item.id)}
                            aria-label={`${item.name}を削除対象に選択`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">{item.id}</td>
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
                          item.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editForm.totalQuantity}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                totalQuantity: e.target.value,
                              }))
                            }
                            className={`${inputClass} max-w-20`}
                          />
                        ) : (
                          item.total_quantity
                        )}
                      </td>
                      {priceEnabled && (
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editForm.rentalPrice}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  rentalPrice: e.target.value,
                                }))
                              }
                              placeholder="未設定"
                              className={`${inputClass} max-w-24`}
                            />
                          ) : item.rental_price === null ? (
                            <span className="text-gray-400">未設定</span>
                          ) : (
                            `${item.rental_price.toLocaleString()}円`
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      備品がありません
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
        title="備品登録"
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
          <label htmlFor="item-name" className="mb-1 block text-sm font-medium">
            備品名
          </label>
          <input
            id="item-name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="例：プロジェクター"
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="item-quantity"
            className="mb-1 block text-sm font-medium"
          >
            総数
          </label>
          <input
            id="item-quantity"
            type="number"
            min={1}
            value={createForm.totalQuantity}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, totalQuantity: e.target.value }))
            }
            placeholder="例：3"
            className={inputClass}
          />
        </div>
        {priceEnabled && (
          <div className="mb-4">
            <label
              htmlFor="item-price"
              className="mb-1 block text-sm font-medium"
            >
              貸出単価（円）
            </label>
            <input
              id="item-price"
              type="number"
              min={0}
              value={createForm.rentalPrice}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, rentalPrice: e.target.value }))
              }
              placeholder="空欄で未設定（無料）"
              className={inputClass}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
