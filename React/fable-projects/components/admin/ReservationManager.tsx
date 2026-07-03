"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasOverlap, getEffectiveStatus, overlapsRange } from "@/lib/reservations";
import { downloadCsv } from "@/lib/csv";
import {
  formatJstDateTime,
  fromDatetimeLocal,
  fromDateInput,
  getDayRangeISO,
  toDateInput,
  toDatetimeLocal,
} from "@/lib/datetime";
import type { Facility, ReservationWithDetails } from "@/types/database";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import Toast from "@/components/ui/Toast";

// A-04 予約管理（画面設計書 §4.11）
// 4モード: 新規予約モーダル / 編集（ラジオ→インライン編集）/
//          予約キャンセル（チェック→一括 cancelled）/ 予約復元（チェック→重複検査→一括 confirmed）
// - 編集・キャンセルは有効ステータス=confirmed の行のみ選択可
//   （表示が「完了」の行 = DB値 confirmed でも終了済みの行は選択不可）
// - 復元は cancelled の行のみ選択可。対象外の行はグレーアウト
// - 新規予約は管理者自身の名義で登録する（設計判断: モーダルに予約者選択欄がないため）
type Mode = "normal" | "edit" | "cancel" | "restore";

type ReservationForm = {
  facilityId: string;
  startLocal: string;
  endLocal: string;
  numPeople: string;
  purpose: string;
};

const EMPTY_FORM: ReservationForm = {
  facilityId: "",
  startLocal: "",
  endLocal: "",
  numPeople: "1",
  purpose: "",
};

export default function ReservationManager({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [saving, setSaving] = useState(false);

  // フィルター（施設 + 日付。クライアント側絞り込み）
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ReservationForm>(EMPTY_FORM);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ReservationForm>(EMPTY_FORM);

  // キャンセル/復元モード共用の選択（モード切替時にリセットされる）
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // loading は初期値 true。再取得時は旧データを表示したまま差し替える
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [reservationsResult, facilitiesResult] = await Promise.all([
      // 既知の制約: 全件取得+クライアント側フィルター（Phase1 の規模を前提）。
      // 予約が数千件規模になる場合は日付フィルターのサーバー側適用やページングが必要
      supabase
        .from("reservations")
        .select("*, facilities(name), profiles(display_name)")
        .order("start_time", { ascending: false }),
      supabase.from("facilities").select("*").order("id"),
    ]);
    if (reservationsResult.error || facilitiesResult.error) {
      setError("予約の取得に失敗しました");
    } else {
      setReservations(reservationsResult.data ?? []);
      setFacilities(facilitiesResult.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // データ取得の setState は await 後（非同期）でありカスケードレンダーにならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // フィルターやモードの切替で非表示・対象外になった行が
  // 編集/キャンセル/復元の対象に残らないよう、選択状態をまとめてリセットする
  const clearSelections = () => {
    setEditId(null);
    setSelectedIds(new Set());
  };

  const switchMode = (next: Mode) => {
    setMode((current) => (current === next ? "normal" : next));
    clearSelections();
  };

  // 行の操作可否（表示ステータス基準）
  const isRowSelectable = (r: ReservationWithDetails): boolean => {
    if (mode === "edit" || mode === "cancel") {
      return getEffectiveStatus(r) === "confirmed";
    }
    if (mode === "restore") {
      return r.status === "cancelled";
    }
    return false;
  };

  const selectEditRow = (r: ReservationWithDetails) => {
    setEditId(r.id);
    setEditForm({
      facilityId: String(r.facility_id),
      startLocal: toDatetimeLocal(r.start_time),
      endLocal: toDatetimeLocal(r.end_time),
      numPeople: String(r.num_people),
      purpose: r.purpose ?? "",
    });
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 新規・編集共通のフォーム検証
  const validateForm = (
    form: ReservationForm,
  ): { facilityId: number; start: Date; end: Date; numPeople: number } | null => {
    if (form.facilityId === "") {
      alert("施設を選択してください");
      return null;
    }
    const start = fromDatetimeLocal(form.startLocal);
    const end = fromDatetimeLocal(form.endLocal);
    if (!start || !end) {
      alert("開始日時と終了日時を入力してください");
      return null;
    }
    if (start >= end) {
      alert("終了日時は開始日時より後にしてください");
      return null;
    }
    const numPeople = Number(form.numPeople);
    if (!Number.isInteger(numPeople) || numPeople < 1) {
      alert("利用人数は1以上の整数で入力してください");
      return null;
    }
    return { facilityId: Number(form.facilityId), start, end, numPeople };
  };

  const handleCreate = async () => {
    const valid = validateForm(createForm);
    if (!valid) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const overlap = await hasOverlap(supabase, {
        facilityId: valid.facilityId,
        startISO: valid.start.toISOString(),
        endISO: valid.end.toISOString(),
      });
      if (overlap) {
        alert("指定の時間帯は既に予約されています");
        return;
      }
      const { error: insertError } = await supabase.from("reservations").insert({
        user_id: currentUserId,
        facility_id: valid.facilityId,
        start_time: valid.start.toISOString(),
        end_time: valid.end.toISOString(),
        num_people: valid.numPeople,
        purpose: createForm.purpose.trim() || null,
      });
      if (insertError) throw insertError;
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      await fetchData();
    } catch {
      setError("予約の登録に失敗しました");
    } finally {
      setSaving(false);
    }
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
    try {
      // 重複チェックは変更後の施設で行い、自分自身は除外する
      const overlap = await hasOverlap(supabase, {
        facilityId: valid.facilityId,
        startISO: valid.start.toISOString(),
        endISO: valid.end.toISOString(),
        excludeId: editId,
      });
      if (overlap) {
        alert("指定の時間帯は既に予約されています");
        return;
      }
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          facility_id: valid.facilityId,
          start_time: valid.start.toISOString(),
          end_time: valid.end.toISOString(),
          num_people: valid.numPeople,
          purpose: editForm.purpose.trim() || null,
        })
        .eq("id", editId);
      if (updateError) throw updateError;
      switchMode("normal");
      await fetchData();
    } catch {
      setError("予約の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBulk = async () => {
    if (selectedIds.size === 0) {
      alert("キャンセルする予約を選択してください");
      return;
    }
    if (
      !confirm(`選択した${selectedIds.size}件の予約をキャンセルします。よろしいですか？`)
    ) {
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .in("id", Array.from(selectedIds));
    setSaving(false);
    if (updateError) {
      setError("予約のキャンセルに失敗しました");
      return;
    }
    switchMode("normal");
    await fetchData();
  };

  const handleRestore = async () => {
    if (selectedIds.size === 0) {
      alert("復元する予約を選択してください");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    try {
      // 復元対象すべてを重複検査し、1件でも重複があれば全体を中止する（画面設計書 §4.11）
      // DB 上の confirmed に加えて、同時に復元する対象同士の重複も検査する
      // （cancelled 同士は DB 側の検査に掛からないため、見落とすとダブルブッキングになる）
      const targets = reservations.filter((r) => selectedIds.has(r.id));
      const conflicted: ReservationWithDetails[] = [];
      const accepted: ReservationWithDetails[] = [];
      for (const target of targets) {
        const overlapsDb = await hasOverlap(supabase, {
          facilityId: target.facility_id,
          startISO: target.start_time,
          endISO: target.end_time,
          excludeId: target.id,
        });
        const overlapsSelected = accepted.some(
          (other) =>
            other.facility_id === target.facility_id &&
            overlapsRange(
              other,
              new Date(target.start_time),
              new Date(target.end_time),
            ),
        );
        if (overlapsDb || overlapsSelected) {
          conflicted.push(target);
        } else {
          accepted.push(target);
        }
      }
      if (conflicted.length > 0) {
        const labels = conflicted.map(
          (r) =>
            `ID ${r.id}（${r.facilities?.name ?? "施設不明"} ${formatJstDateTime(r.start_time)}）`,
        );
        alert(
          `重複のため復元できない予約が含まれます。復元を中止しました:\n${labels.join("\n")}`,
        );
        return;
      }
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .in("id", Array.from(selectedIds));
      if (updateError) throw updateError;
      switchMode("normal");
      await fetchData();
    } catch {
      setError("予約の復元に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // フィルター適用（施設 + 日付。日付は JST のその日に開始する予約）
  const visibleReservations = reservations.filter((r) => {
    if (facilityFilter !== "all" && String(r.facility_id) !== facilityFilter) {
      return false;
    }
    if (dateFilter !== "") {
      const day = fromDateInput(dateFilter);
      if (day) {
        const { startISO, endISO } = getDayRangeISO(day);
        if (r.start_time < startISO || r.start_time >= endISO) return false;
      }
    }
    return true;
  });

  // RES-08 予約履歴エクスポート: 現在のフィルター適用後の一覧を CSV 出力する
  const handleExportCsv = () => {
    const statusLabels = {
      confirmed: "確定",
      cancelled: "キャンセル",
      completed: "完了",
    } as const;
    downloadCsv(
      `reservations_${toDateInput(new Date())}.csv`,
      ["ID", "施設名", "予約者", "開始日時", "終了日時", "ステータス", "人数", "目的"],
      visibleReservations.map((r) => [
        r.id,
        r.facilities?.name ?? "-",
        r.profiles?.display_name ?? "-",
        formatJstDateTime(r.start_time),
        formatJstDateTime(r.end_time),
        statusLabels[getEffectiveStatus(r)],
        r.num_people,
        r.purpose ?? "",
      ]),
    );
  };

  const columnCount = mode === "normal" ? 7 : 8;
  const inputClass =
    "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

  const facilityOptions = facilities.map((f) => (
    <option key={f.id} value={f.id}>
      {f.name}
    </option>
  ));

  const modeButton = (target: Mode, label: string, danger = false) => (
    <Button
      variant={mode === target ? (danger ? "danger" : "primary") : "secondary"}
      onClick={() => switchMode(target)}
    >
      {label}
    </Button>
  );

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">予約管理</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}>新規予約</Button>
          {modeButton("edit", "編集")}
          {modeButton("cancel", "予約キャンセル", true)}
          {modeButton("restore", "予約復元")}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="facility-filter" className="text-sm text-gray-600">
            施設:
          </label>
          <select
            id="facility-filter"
            value={facilityFilter}
            onChange={(e) => {
              setFacilityFilter(e.target.value);
              clearSelections();
            }}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">すべて</option>
            {facilityOptions}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="date-filter" className="text-sm text-gray-600">
            日付:
          </label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              clearSelections();
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleExportCsv}
          disabled={visibleReservations.length === 0}
        >
          CSVエクスポート
        </Button>
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
                  <th className="px-4 py-3">開始日時</th>
                  <th className="px-4 py-3">終了日時</th>
                  <th className="px-4 py-3">ステータス</th>
                  <th className="px-4 py-3">人数</th>
                  <th className="px-4 py-3">目的</th>
                </tr>
              </thead>
              <tbody>
                {visibleReservations.map((r) => {
                  const isEditing = mode === "edit" && editId === r.id;
                  const selectable = isRowSelectable(r);
                  const grayedOut = mode !== "normal" && !selectable;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-gray-100 last:border-0 ${
                        grayedOut ? "opacity-50" : ""
                      }`}
                    >
                      {mode === "edit" && (
                        <td className="px-4 py-3">
                          {selectable && (
                            <input
                              type="radio"
                              name="reservation-edit-target"
                              checked={editId === r.id}
                              onChange={() => selectEditRow(r)}
                              aria-label={`予約ID ${r.id}を編集対象に選択`}
                            />
                          )}
                        </td>
                      )}
                      {(mode === "cancel" || mode === "restore") && (
                        <td className="px-4 py-3">
                          {selectable && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(r.id)}
                              onChange={() => toggleSelectRow(r.id)}
                              aria-label={`予約ID ${r.id}を選択`}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">{r.id}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.facilityId}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                facilityId: e.target.value,
                              }))
                            }
                            className={`${inputClass} min-w-28`}
                          >
                            {facilityOptions}
                          </select>
                        ) : (
                          (r.facilities?.name ?? "（施設不明）")
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editForm.startLocal}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                startLocal: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        ) : (
                          formatJstDateTime(r.start_time)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editForm.endLocal}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                endLocal: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        ) : (
                          formatJstDateTime(r.end_time)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getEffectiveStatus(r)} />
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editForm.numPeople}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                numPeople: e.target.value,
                              }))
                            }
                            className={`${inputClass} max-w-20`}
                          />
                        ) : (
                          r.num_people
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editForm.purpose}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                purpose: e.target.value,
                              }))
                            }
                            className={`${inputClass} min-w-24`}
                          />
                        ) : (
                          (r.purpose ?? "-")
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleReservations.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      予約がありません
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
              {mode === "cancel" && (
                <Button variant="danger" onClick={handleCancelBulk} loading={saving}>
                  予約をキャンセルする
                </Button>
              )}
              {mode === "restore" && (
                <Button onClick={handleRestore} loading={saving}>
                  予約を復元する
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        title="新規予約"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              閉じる
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              予約する
            </Button>
          </>
        }
      >
        <div className="mb-4">
          <label
            htmlFor="create-facility"
            className="mb-1 block text-sm font-medium"
          >
            施設名
          </label>
          <select
            id="create-facility"
            value={createForm.facilityId}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, facilityId: e.target.value }))
            }
            className={inputClass}
          >
            <option value="">選択してください</option>
            {facilityOptions}
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="create-start" className="mb-1 block text-sm font-medium">
            開始日時
          </label>
          <input
            id="create-start"
            type="datetime-local"
            value={createForm.startLocal}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, startLocal: e.target.value }))
            }
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="create-end" className="mb-1 block text-sm font-medium">
            終了日時
          </label>
          <input
            id="create-end"
            type="datetime-local"
            value={createForm.endLocal}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, endLocal: e.target.value }))
            }
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="create-people" className="mb-1 block text-sm font-medium">
            利用人数
          </label>
          <input
            id="create-people"
            type="number"
            min={1}
            value={createForm.numPeople}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, numPeople: e.target.value }))
            }
            placeholder="例：5"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="create-purpose"
            className="mb-1 block text-sm font-medium"
          >
            利用目的
          </label>
          <input
            id="create-purpose"
            value={createForm.purpose}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, purpose: e.target.value }))
            }
            placeholder="例：報告会議"
            className={inputClass}
          />
        </div>
      </Modal>
    </div>
  );
}
