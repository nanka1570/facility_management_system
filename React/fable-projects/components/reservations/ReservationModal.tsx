"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasOverlap, getEffectiveStatus } from "@/lib/reservations";
import { findItemShortages } from "@/lib/items";
import { notify } from "@/lib/notify";
import { calcFacilityCharge, calcItemsCharge } from "@/lib/pricing";
import {
  formatJstDate,
  formatJstTime,
  toDatetimeLocal,
  fromDatetimeLocal,
} from "@/lib/datetime";
import type { Facility, Item, ReservationWithDetails } from "@/types/database";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import ItemSelector from "@/components/reservations/ItemSelector";

// U-03 予約詳細モーダル（画面設計書 §4.5・§4.6）
// - create: 空き枠から新規予約（施設・日時は読取専用）
// - edit  : 自分の confirmed 予約の編集（日時は datetime-local で変更可）+ キャンセル
// - view  : 他人の予約・終了済み予約の閲覧のみ
// Phase2 拡張（各モジュール有効時のみ表示）:
// - M-PRICE : 料金の見積り表示（PRICE-02）と reservation_prices への記録
// - M-ITEM  : 備品選択（ITEM-03）と reservation_items への記録（単価は貸出時点を保存）
// - M-EXTEND: 利用中の自分の予約の時間延長（U-06 / EXT-02〜05。15/30/45/60分）
const EXTENSION_MINUTES = [15, 30, 45, 60] as const;
export type ReservationModalState =
  | { mode: "create"; facility: Facility; start: Date; end: Date }
  | { mode: "edit"; facility: Facility; reservation: ReservationWithDetails }
  | { mode: "view"; facility: Facility; reservation: ReservationWithDetails };

type Props = {
  state: ReservationModalState;
  currentUserId: string;
  onClose: () => void;
  // 登録・更新・キャンセル成功時（親はモーダルを閉じて再取得する）
  onSaved: () => void;
};

export default function ReservationModal({
  state,
  currentUserId,
  onClose,
  onSaved,
}: Props) {
  const facility = state.facility;
  const isCreate = state.mode === "create";
  const isEdit = state.mode === "edit";
  const reservation = state.mode === "create" ? null : state.reservation;

  const [numPeople, setNumPeople] = useState<number>(
    reservation ? reservation.num_people : 1,
  );
  const [purpose, setPurpose] = useState<string>(reservation?.purpose ?? "");
  const [startLocal, setStartLocal] = useState<string>(() =>
    state.mode === "create"
      ? toDatetimeLocal(state.start)
      : toDatetimeLocal(state.reservation.start_time),
  );
  const [endLocal, setEndLocal] = useState<string>(() =>
    state.mode === "create"
      ? toDatetimeLocal(state.end)
      : toDatetimeLocal(state.reservation.end_time),
  );
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Phase2: モジュール状態と付帯データ（モーダル自身が取得し、親は関知しない）
  // extrasLoaded が false の間は保存操作を禁止する。
  // 既存備品の読込完了前に更新すると空の選択で総入れ替え（=備品全削除）になるため
  const [extrasLoaded, setExtrasLoaded] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [itemEnabled, setItemEnabled] = useState(false);
  const [extendEnabled, setExtendEnabled] = useState(false);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [itemQty, setItemQty] = useState<Map<number, number>>(new Map());
  const [recordedSubtotal, setRecordedSubtotal] = useState<number | null>(null);
  const [extensionMinutes, setExtensionMinutes] = useState<number>(30);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [modulesResult, priceResult, itemsResult] = await Promise.all([
        supabase
          .from("module_settings")
          .select("module_id, is_enabled")
          .in("module_id", ["M-PRICE", "M-ITEM", "M-EXTEND"]),
        supabase
          .from("facility_prices")
          .select("price_per_unit")
          .eq("facility_id", facility.id)
          .maybeSingle(),
        supabase.from("items").select("*").order("id"),
      ]);
      const enabled = new Map(
        (modulesResult.data ?? []).map((m) => [m.module_id, m.is_enabled]),
      );
      setPriceEnabled(enabled.get("M-PRICE") ?? false);
      setItemEnabled(enabled.get("M-ITEM") ?? false);
      setExtendEnabled(enabled.get("M-EXTEND") ?? false);
      setPricePerUnit(priceResult.data?.price_per_unit ?? 0);
      setItems(itemsResult.data ?? []);

      // 既存予約は選択済み備品と記録済み料金を読み込む
      if (reservation) {
        const [selectedResult, subtotalResult] = await Promise.all([
          supabase
            .from("reservation_items")
            .select("item_id, quantity")
            .eq("reservation_id", reservation.id),
          supabase
            .from("reservation_prices")
            .select("subtotal")
            .eq("reservation_id", reservation.id)
            .maybeSingle(),
        ]);
        setItemQty(
          new Map(
            (selectedResult.data ?? []).map((s) => [s.item_id, s.quantity]),
          ),
        );
        setRecordedSubtotal(subtotalResult.data?.subtotal ?? null);
      }
      setExtrasLoaded(true);
    };
    load();
    // reservation は state から導出される固定値のため facility.id のみ依存に含める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility.id]);

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  // 定員が後から減った既存予約でも現在の人数を選択肢に含める
  const maxPeople = Math.max(facility.max_capacity, numPeople);

  // 現在の入力内容から合計金額（施設料金＋備品料金）を計算する
  const computeSubtotal = (start: Date, end: Date): number => {
    const facilityCharge = calcFacilityCharge({
      start,
      end,
      timeUnit: facility.time_unit,
      pricePerUnit,
    });
    const itemsCharge = calcItemsCharge(
      Array.from(itemQty.entries()).map(([itemId, quantity]) => ({
        quantity,
        rentalPrice: items.find((i) => i.id === itemId)?.rental_price ?? 0,
      })),
    );
    return facilityCharge + itemsCharge;
  };

  // 料金見積り対象の時間帯。編集中の入力が不正な間は null（見積り非表示）
  const estimateRange = (): { start: Date; end: Date } | null => {
    if (state.mode === "create") return { start: state.start, end: state.end };
    const start = fromDatetimeLocal(startLocal);
    const end = fromDatetimeLocal(endLocal);
    return start && end && start < end ? { start, end } : null;
  };

  // U-06 時間延長の表示条件（EXT-01/02）:
  // 編集可能（=自分の confirmed）かつ M-EXTEND 有効かつ施設が延長許可、
  // かつ現在時刻が利用中（開始済み・未終了）であること
  const canExtend =
    isEdit &&
    extendEnabled &&
    facility.allow_extension &&
    reservation !== null &&
    new Date(reservation.start_time) <= new Date() &&
    new Date() < new Date(reservation.end_time);

  // 予約本体の保存後に備品と料金を保存する（各モジュール有効時のみ）
  const saveExtras = async (
    supabase: ReturnType<typeof createClient>,
    reservationId: number,
    start: Date,
    end: Date,
  ) => {
    if (itemEnabled) {
      // 選択内容で総入れ替え（差分更新より単純さを優先）
      const { error: deleteError } = await supabase
        .from("reservation_items")
        .delete()
        .eq("reservation_id", reservationId);
      if (deleteError) throw deleteError;
      const rows = Array.from(itemQty.entries())
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({
          reservation_id: reservationId,
          item_id: itemId,
          quantity,
          // 貸出時点の単価を記録する（DB設計書 §3.2.4）
          rental_price: items.find((i) => i.id === itemId)?.rental_price ?? 0,
        }));
      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("reservation_items")
          .insert(rows);
        if (insertError) throw insertError;
      }
    }
    if (priceEnabled) {
      const { error: priceError } = await supabase
        .from("reservation_prices")
        .upsert(
          { reservation_id: reservationId, subtotal: computeSubtotal(start, end) },
          { onConflict: "reservation_id" },
        );
      if (priceError) throw priceError;
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    let startDate: Date;
    let endDate: Date;
    if (state.mode === "create") {
      startDate = state.start;
      endDate = state.end;
    } else {
      const start = fromDatetimeLocal(startLocal);
      const end = fromDatetimeLocal(endLocal);
      if (!start || !end) {
        setFormError("日時を入力してください");
        return;
      }
      if (start >= end) {
        setFormError("終了日時は開始日時より後にしてください");
        return;
      }
      startDate = start;
      endDate = end;
    }

    setSaving(true);
    const supabase = createClient();

    // 1) 予約本体の保存
    let savedId: number;
    try {
      // 重複チェック（画面設計書 §4.5・§4.6。編集時は自分自身を除外）
      const overlap = await hasOverlap(supabase, {
        facilityId: facility.id,
        startISO: startDate.toISOString(),
        endISO: endDate.toISOString(),
        excludeId: isEdit && reservation ? reservation.id : undefined,
      });
      if (overlap) {
        alert("指定の時間帯は既に予約されています");
        setSaving(false);
        return;
      }

      // ITEM-04 在庫チェック: 同一時間帯の貸出合計が総数を超えないか
      if (itemEnabled && itemQty.size > 0) {
        const shortages = await findItemShortages(supabase, {
          requests: itemQty,
          items,
          startISO: startDate.toISOString(),
          endISO: endDate.toISOString(),
          excludeReservationId: isEdit && reservation ? reservation.id : undefined,
        });
        if (shortages.length > 0) {
          alert(`備品の在庫が不足しています: ${shortages.join("、")}`);
          setSaving(false);
          return;
        }
      }

      if (state.mode === "create") {
        const { data: inserted, error } = await supabase
          .from("reservations")
          .insert({
            user_id: currentUserId,
            facility_id: facility.id,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            num_people: numPeople,
            purpose: purpose.trim() || null,
          })
          .select("id")
          .single();
        if (error || !inserted) throw error ?? new Error("insert failed");
        savedId = inserted.id;
        // NOTIF-01 予約完了メール（M-NOTIFY 有効時のみ。失敗しても本処理は継続）
        void notify(supabase, {
          type: "reservation_created",
          reservationId: inserted.id,
        });
      } else {
        const { error } = await supabase
          .from("reservations")
          .update({
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            num_people: numPeople,
            purpose: purpose.trim() || null,
          })
          .eq("id", state.reservation.id);
        if (error) throw error;
        savedId = state.reservation.id;
      }
    } catch {
      setFormError(isCreate ? "予約に失敗しました" : "更新に失敗しました");
      setSaving(false);
      return;
    }

    // 2) 付帯情報（備品・料金）の保存。
    //    予約本体は既に保存済みのため、ここで失敗しても「予約失敗」とは
    //    表示しない（再試行による二重予約を防ぐ）。警告して閉じる
    try {
      await saveExtras(supabase, savedId, startDate, endDate);
    } catch {
      alert(
        isCreate
          ? "予約は登録しましたが、料金・備品の保存に失敗しました"
          : "予約は更新しましたが、料金・備品の保存に失敗しました",
      );
    } finally {
      setSaving(false);
    }
    onSaved();
  };

  // U-06 時間延長申請（EXT-02〜05）。利用中の自分の予約の終了時刻を延ばす
  const handleExtend = async () => {
    if (!reservation) return;
    setFormError(null);
    setExtending(true);
    const supabase = createClient();
    try {
      const currentEnd = new Date(reservation.end_time);
      const newEnd = new Date(
        currentEnd.getTime() + extensionMinutes * 60 * 1000,
      );
      // 延長分 [現終了, 新終了) が他の予約と重複しないか確認（EXT-04）
      const overlap = await hasOverlap(supabase, {
        facilityId: facility.id,
        startISO: currentEnd.toISOString(),
        endISO: newEnd.toISOString(),
        excludeId: reservation.id,
      });
      if (overlap) {
        setFormError("延長する時間帯に他の予約が入っています");
        return;
      }
      const { error } = await supabase
        .from("reservations")
        .update({ end_time: newEnd.toISOString() })
        .eq("id", reservation.id);
      if (error) throw error;
      // 延長後の合計料金を再計算して記録する（EXT-05。M-PRICE 有効時のみ）
      if (priceEnabled) {
        const { error: priceError } = await supabase
          .from("reservation_prices")
          .upsert(
            {
              reservation_id: reservation.id,
              subtotal: computeSubtotal(
                new Date(reservation.start_time),
                newEnd,
              ),
            },
            { onConflict: "reservation_id" },
          );
        if (priceError) throw priceError;
      }
      onSaved();
    } catch {
      setFormError("時間延長に失敗しました");
    } finally {
      setExtending(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;
    if (!confirm("この予約をキャンセルします。よろしいですか？")) return;
    setCancelling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation.id);
    setCancelling(false);
    if (error) {
      setFormError("キャンセルに失敗しました");
      return;
    }
    // NOTIF-03 キャンセル通知
    void notify(supabase, {
      type: "reservation_cancelled",
      reservationId: reservation.id,
    });
    onSaved();
  };

  const dateTimeLabel = (startISO: string | Date, endISO: string | Date) =>
    `${formatJstDate(startISO)} ${formatJstTime(startISO)} - ${formatJstTime(endISO)}`;

  const footer =
    state.mode === "view" ? (
      <Button variant="secondary" onClick={onClose}>
        閉じる
      </Button>
    ) : state.mode === "create" ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        {/* extrasLoaded 前はモジュール状態が未確定のため保存を禁止する */}
        <Button onClick={handleSubmit} loading={saving} disabled={!extrasLoaded}>
          予約する
        </Button>
      </>
    ) : (
      <>
        {/* 更新とキャンセルは同一予約への並行UPDATEを防ぐため相互に無効化する */}
        <Button
          variant="danger"
          onClick={handleCancelReservation}
          loading={cancelling}
          disabled={saving}
          className="mr-auto"
        >
          キャンセルする
        </Button>
        <Button variant="secondary" onClick={onClose}>
          閉じる
        </Button>
        {/* extrasLoaded 前に更新すると既存備品を空の選択で総入れ替えしてしまう */}
        <Button
          onClick={handleSubmit}
          loading={saving}
          disabled={cancelling || !extrasLoaded}
        >
          更新
        </Button>
      </>
    );

  return (
    <Modal
      open
      title={state.mode === "create" ? "予約" : "予約詳細"}
      onClose={onClose}
      footer={footer}
    >
      <dl className="mb-4 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-gray-600">施設:</dt>
          <dd>{facility.name}</dd>
        </div>
        {(state.mode === "create" || state.mode === "view") && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-gray-600">日時:</dt>
            <dd>
              {state.mode === "create"
                ? dateTimeLabel(state.start, state.end)
                : dateTimeLabel(
                    state.reservation.start_time,
                    state.reservation.end_time,
                  )}
            </dd>
          </div>
        )}
        {reservation && (
          <>
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-gray-600">予約者:</dt>
              <dd>{reservation.profiles?.display_name ?? "不明"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 font-medium text-gray-600">ステータス:</dt>
              <dd>
                <StatusBadge status={getEffectiveStatus(reservation)} />
              </dd>
            </div>
          </>
        )}
      </dl>

      {state.mode === "edit" && (
        <>
          <div className="mb-4">
            <label
              htmlFor="reservation-start"
              className="mb-1 block text-sm font-medium"
            >
              開始日時
            </label>
            <input
              id="reservation-start"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="reservation-end"
              className="mb-1 block text-sm font-medium"
            >
              終了日時
            </label>
            <input
              id="reservation-end"
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      )}

      {state.mode === "view" ? (
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-gray-600">利用人数:</dt>
            <dd>{reservation?.num_people}人</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-gray-600">利用目的:</dt>
            <dd>{reservation?.purpose ?? "-"}</dd>
          </div>
          {itemEnabled && itemQty.size > 0 && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-gray-600">備品:</dt>
              <dd>
                {Array.from(itemQty.entries())
                  .map(([itemId, quantity]) => {
                    const name =
                      items.find((i) => i.id === itemId)?.name ?? `#${itemId}`;
                    return `${name} ×${quantity}`;
                  })
                  .join("、")}
              </dd>
            </div>
          )}
          {priceEnabled && recordedSubtotal !== null && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-gray-600">料金:</dt>
              <dd>{recordedSubtotal.toLocaleString()}円</dd>
            </div>
          )}
        </dl>
      ) : (
        <>
          <div className="mb-4">
            <label
              htmlFor="reservation-people"
              className="mb-1 block text-sm font-medium"
            >
              利用人数
            </label>
            <select
              id="reservation-people"
              value={numPeople}
              onChange={(e) => setNumPeople(Number(e.target.value))}
              className={inputClass}
            >
              {Array.from({ length: maxPeople }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="reservation-purpose"
              className="mb-1 block text-sm font-medium"
            >
              利用目的（任意）
            </label>
            <input
              id="reservation-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="例：部内ミーティング"
              className={inputClass}
            />
          </div>

          {itemEnabled && (
            <ItemSelector
              items={items}
              value={itemQty}
              onChange={setItemQty}
              priceEnabled={priceEnabled}
              disabled={saving || cancelling}
            />
          )}

          {priceEnabled &&
            (() => {
              // PRICE-02: 現在の入力内容での料金見積り表示
              const range = estimateRange();
              if (!range) return null;
              return (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                  料金:{" "}
                  <span className="font-bold">
                    {computeSubtotal(range.start, range.end).toLocaleString()}円
                  </span>
                  <span className="ml-1 text-xs text-gray-500">
                    （施設料金＋備品料金）
                  </span>
                </p>
              );
            })()}

          {canExtend && reservation && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-sm font-medium">
                時間延長（利用中の予約）
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={extensionMinutes}
                  onChange={(e) => setExtensionMinutes(Number(e.target.value))}
                  aria-label="延長時間"
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {EXTENSION_MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}分
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleExtend}
                  loading={extending}
                  disabled={saving || cancelling}
                >
                  延長する
                </Button>
              </div>
              {priceEnabled && (
                <p className="mt-2 text-xs text-gray-600">
                  延長後の料金:{" "}
                  {computeSubtotal(
                    new Date(reservation.start_time),
                    new Date(
                      new Date(reservation.end_time).getTime() +
                        extensionMinutes * 60 * 1000,
                    ),
                  ).toLocaleString()}
                  円
                </p>
              )}
            </div>
          )}
        </>
      )}

      {formError && <p className="mt-3 text-sm text-red-500">{formError}</p>}
    </Modal>
  );
}
