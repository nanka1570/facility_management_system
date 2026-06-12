"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";

// A-03 カテゴリ管理（画面設計書 §4.10）
// モード切替式: 通常 / 編集（ラジオ1行選択→インライン編集）/ 削除（チェック複数→一括削除）
type Mode = "normal" | "edit" | "delete";

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", sortOrder: "0" });

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", sortOrder: "0" });

  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());

  // loading は初期値 true。再取得時は旧データを表示したまま差し替える
  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("id");
    if (fetchError) {
      setError("カテゴリの取得に失敗しました");
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  // モード切替時は他モードの選択状態をリセットする（同モードの再押下で通常に戻る）
  const switchMode = (next: Mode) => {
    setMode((current) => (current === next ? "normal" : next));
    setEditId(null);
    setDeleteIds(new Set());
  };

  const selectEditRow = (category: Category) => {
    setEditId(category.id);
    setEditForm({ name: category.name, sortOrder: String(category.sort_order) });
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

  const handleCreate = async () => {
    const name = createForm.name.trim();
    if (!name) {
      alert("カテゴリ名を入力してください");
      return;
    }
    const sortOrder = Number(createForm.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      alert("並び順は整数で入力してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("categories")
      .insert({ name, sort_order: sortOrder });
    setSaving(false);
    if (insertError) {
      setError("カテゴリの登録に失敗しました");
      return;
    }
    setCreateOpen(false);
    setCreateForm({ name: "", sortOrder: "0" });
    await fetchCategories();
  };

  const handleUpdate = async () => {
    if (editId === null) {
      alert("編集する行を選択してください");
      return;
    }
    const name = editForm.name.trim();
    if (!name) {
      alert("カテゴリ名を入力してください");
      return;
    }
    const sortOrder = Number(editForm.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      alert("表示順は整数で入力してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("categories")
      .update({ name, sort_order: sortOrder })
      .eq("id", editId);
    setSaving(false);
    if (updateError) {
      setError("カテゴリの更新に失敗しました");
      return;
    }
    switchMode("normal");
    await fetchCategories();
  };

  const handleDelete = async () => {
    if (deleteIds.size === 0) {
      alert("削除するカテゴリを選択してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const ids = Array.from(deleteIds);

    // 施設で使用中のカテゴリは削除不可（画面設計書 §4.10）
    const { data: used, error: checkError } = await supabase
      .from("facilities")
      .select("category_id")
      .in("category_id", ids);
    if (checkError) {
      setSaving(false);
      setError("削除前のチェックに失敗しました");
      return;
    }
    if (used && used.length > 0) {
      const usedIds = new Set(used.map((f) => f.category_id));
      const usedNames = categories
        .filter((c) => usedIds.has(c.id))
        .map((c) => c.name);
      alert(`施設で使用中のため削除できません: ${usedNames.join("、")}`);
      setSaving(false);
      return;
    }

    if (!confirm(`選択した${ids.length}件のカテゴリを削除します。よろしいですか？`)) {
      setSaving(false);
      return;
    }
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .in("id", ids);
    setSaving(false);
    if (deleteError) {
      setError("カテゴリの削除に失敗しました");
      return;
    }
    switchMode("normal");
    await fetchCategories();
  };

  const columnCount = mode === "normal" ? 3 : 4;
  const inputClass =
    "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">カテゴリ管理</h1>
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
                  <th className="px-4 py-3">カテゴリ名</th>
                  <th className="px-4 py-3">表示順</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const isEditing = mode === "edit" && editId === category.id;
                  return (
                    <tr
                      key={category.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {mode === "edit" && (
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="category-edit-target"
                            checked={editId === category.id}
                            onChange={() => selectEditRow(category)}
                            aria-label={`${category.name}を編集対象に選択`}
                          />
                        </td>
                      )}
                      {mode === "delete" && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={deleteIds.has(category.id)}
                            onChange={() => toggleDeleteRow(category.id)}
                            aria-label={`${category.name}を削除対象に選択`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">{category.id}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            className={inputClass}
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.sortOrder}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                sortOrder: e.target.value,
                              }))
                            }
                            className={`${inputClass} max-w-24`}
                          />
                        ) : (
                          category.sort_order
                        )}
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      カテゴリがありません
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
        title="カテゴリ登録"
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
          <label htmlFor="category-name" className="mb-1 block text-sm font-medium">
            カテゴリ名
          </label>
          <input
            id="category-name"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="例：会議室"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="category-sort" className="mb-1 block text-sm font-medium">
            並び順
          </label>
          <input
            id="category-sort"
            type="number"
            value={createForm.sortOrder}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))
            }
            className={inputClass}
          />
        </div>
      </Modal>
    </div>
  );
}
