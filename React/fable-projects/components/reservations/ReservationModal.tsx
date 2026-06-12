"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasOverlap, getEffectiveStatus } from "@/lib/reservations";
import {
  formatJstDate,
  formatJstTime,
  toDatetimeLocal,
  fromDatetimeLocal,
} from "@/lib/datetime";
import type { Facility, ReservationWithDetails } from "@/types/database";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";

// U-03 予約詳細モーダル（画面設計書 §4.5・§4.6）
// - create: 空き枠から新規予約（施設・日時は読取専用）
// - edit  : 自分の confirmed 予約の編集（日時は datetime-local で変更可）+ キャンセル
// - view  : 他人の予約・終了済み予約の閲覧のみ
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

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  // 定員が後から減った既存予約でも現在の人数を選択肢に含める
  const maxPeople = Math.max(facility.max_capacity, numPeople);

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
        return;
      }

      if (state.mode === "create") {
        const { error } = await supabase.from("reservations").insert({
          user_id: currentUserId,
          facility_id: facility.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          num_people: numPeople,
          purpose: purpose.trim() || null,
        });
        if (error) throw error;
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
      }
      onSaved();
    } catch {
      setFormError(isCreate ? "予約に失敗しました" : "更新に失敗しました");
    } finally {
      setSaving(false);
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
        <Button onClick={handleSubmit} loading={saving}>
          予約する
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="danger"
          onClick={handleCancelReservation}
          loading={cancelling}
          className="mr-auto"
        >
          キャンセルする
        </Button>
        <Button variant="secondary" onClick={onClose}>
          閉じる
        </Button>
        <Button onClick={handleSubmit} loading={saving}>
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
          <div>
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
        </>
      )}

      {formError && <p className="mt-3 text-sm text-red-500">{formError}</p>}
    </Modal>
  );
}
