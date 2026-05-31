'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY } from "@/lib/constants"
// timeをdatetime-localに変換する関数
import { formatDateTimeLocal } from "@/lib/utils"
// 施設・予約のtypes
import { Facility, Reservation } from "@/lib/types"
// 予約のステータス
import { RESERVATION_STATUS } from "@/lib/constants"

export default function Reservations() {

    // 画面遷移
    const router = useRouter()
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // ユーザーID
    const [userId, setUserId] = useState('')
    // 予約一覧
    const [reservations, setReservations] = useState<Reservation[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<Facility[]>([])
    // 予約カレンダー
    const BUSINESS_HOUR_START = 9   // 営業開始時間
    const BUSINESS_HOUR_END = 17    // 営業終了時間
    const timeSlots = Array.from({ length: BUSINESS_HOUR_END - BUSINESS_HOUR_START + 1 }, (_, i) => i + BUSINESS_HOUR_START)
    // 今日の日付
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date()
        return today.toLocaleDateString('sv-SE')
    })
    /* 予約 */
    // 新規登録モーダル
    const [isModalOpen, setIsModalOpen] = useState(false)
    // 詳細モーダル
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    // 新規登録
    const [newFacilityId, setNewFacilityId] = useState<number | null>(null)
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newNumPeople, setNewNumPeople] = useState('')
    const [newPurpose, setNewPurpose] = useState('')
    // 編集
    const [editFacilityId, setEditFacilityId] = useState<number | null>(null)
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editNumPeople, setEditNumPeople] = useState('')
    const [editPurpose, setEditPurpose] = useState('')
    // 選択した予約
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
    // 多重送信防止
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // UUIDをユーザーIDとしてセット
            setUserId(session.user.id)
            
            // 予約一覧をロード
            const { data: reservationData, error: reservationError } = await supabase
                .from('reservations')
                .select('*')
                .order('id', { ascending: true })
            if (reservationError) {
                alert('予約一覧の取得に失敗しました')
            } else {
                setReservations(reservationData)
            }

            // 施設一覧をロード
            const { data: facilityData, error: facilityError } = await supabase
                .from('facilities')
                .select('*')
            if (facilityError) {
                alert('施設一覧の取得に失敗しました')
            } else {
                setFacilities(facilityData)
            }
        }
        init()
    }, [refreshKey])

    // 新規予約
    const handleInsertReservations = async () => {
        // 予約重複
        const { data: overlappingReservations, error: checkError } = await supabase
            .from('reservations')
            .select('id')
            .eq('facility_id', newFacilityId)
            .eq('status', RESERVATION_STATUS.CONFIRMED)
            .lt('start_time', new Date(newEndTime).toISOString())
            .gt('end_time', new Date(newStartTime).toISOString())
            .limit(1)

        if (checkError) {
            alert('予約の確認に失敗しました')
            return
        }

        // 予約重複チェック
        if (overlappingReservations && overlappingReservations.length > 0) {
            alert('この時間帯はすでに予約が入っています。')
            return
        }
        
        // 人数必須チェック
        if (!newNumPeople || Number(newNumPeople) <= 0) {
            alert('利用人数を正しく入力してください')
            return
        }
        
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('reservations')
                .insert({
                    user_id: userId,
                    facility_id: newFacilityId,
                    start_time: new Date(newStartTime).toISOString(),
                    end_time: new Date(newEndTime).toISOString(),
                    num_people: Number(newNumPeople),
                    purpose: newPurpose,
                })
            if (error) {
                alert('新規予約に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setNewFacilityId(null)
                setNewStartTime('')
                setNewEndTime('')
                setNewNumPeople('')
                setNewPurpose('')
                setIsModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // 更新処理
    const handleUpdateReservation = async () => {
        // nullチェック
        if (!selectedReservation) return
        // 予約重複
        const { data: overlappingReservations, error: checkError } = await supabase
            .from('reservations')
            .select('id')
            .eq('facility_id', editFacilityId)
            .eq('status', RESERVATION_STATUS.CONFIRMED)
            .neq('id', selectedReservation.id)
            .lt('start_time', new Date(editEndTime).toISOString())
            .gt('end_time', new Date(editStartTime).toISOString())
            .limit(1)

        if (checkError) {
            alert('予約の確認に失敗しました')
            return
        }
        // 予約重複チェック
        if (overlappingReservations && overlappingReservations.length > 0) {
            alert('この時間帯はすでに予約が入っています。')
            return
        }

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('reservations')
                .update({
                    facility_id: editFacilityId,
                    start_time: new Date(editStartTime).toISOString(),
                    end_time: new Date(editEndTime).toISOString(),
                    num_people: Number(editNumPeople),
                    purpose: editPurpose,
                })
                .eq('id', selectedReservation.id)
            if (error) {
                alert('予約の更新に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedReservation(null)
                setEditFacilityId(null)
                setEditStartTime('')
                setEditEndTime('')
                setEditNumPeople('')
                setEditPurpose('')
                setIsDetailModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // キャンセル処理
    const handleCancelReservation = async () => {
        if (!selectedReservation) return
        // キャンセル確認
        if (!window.confirm('選択した予約をキャンセルしますか？')) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('reservations')
                .update({
                    status: RESERVATION_STATUS.CANCELLED
                })
                .eq('id', selectedReservation.id)
            if (error) {
                alert('予約のキャンセルに失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedReservation(null)
                setIsDetailModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }
    
    return (
        <>
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">予約カレンダー</h1>
                </div>
                {/* 予約カレンダー */}
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <button
                        onClick={() => {
                            const date = new Date(selectedDate)
                            date.setDate(date.getDate() - 1)
                            setSelectedDate(date.toLocaleDateString('sv-SE'))
                        }}
                        className="px-3 py-1 border rounded"
                        >
                        </button>
                        <span className="text-lg font-semibold">{selectedDate}</span>
                        <button
                        onClick={() => {
                            const date = new Date(selectedDate)
                            date.setDate(date.getDate() + 1)
                            setSelectedDate(date.toLocaleDateString('sv-SE'))
                        }}
                        className="px-3 py-1 border rounded"
                        >
                        </button>
                    </div>
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3"></th>
                                    {facilities
                                        .map((facility) => (
                                            <th
                                                key={facility.id}
                                            >
                                                {facility.name}
                                            </th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots
                                    .map((timeSlot) => (
                                        <tr key={timeSlot} className="border-t">
                                            <td className="bg-gray-50 px-4 py-3 font-mono">
                                                {timeSlot}:00
                                            </td>
                                            {facilities
                                                .map((facility) => {
                                                    // 時間と施設が一致する予約を探す
                                                    const reservation = reservations.find((r) =>
                                                        r.facility_id === facility.id &&
                                                        r.status === RESERVATION_STATUS.CONFIRMED &&
                                                        new Date(r.start_time).getHours() <= timeSlot &&
                                                        new Date(r.end_time).getHours() > timeSlot &&
                                                        new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate
                                                )
                                                return (
                                                    <td
                                                    key={facility.id}
                                                    className={`px-4 py-3 border-1 text-center ${
                                                        reservation
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-50 hover:bg-green-100 cursor-pointer'
                                                    }`}
                                                    onClick={() => {
                                                        if (!reservation) { // 予約が存在しなければ新規登録モーダルを開く
                                                            setIsModalOpen(true)
                                                            setNewFacilityId(facility.id)
                                                            setNewStartTime(`${selectedDate}T${String(timeSlot).padStart(2, '0')}:00`)
                                                            setNewEndTime(`${selectedDate}T${String(timeSlot + 1).padStart(2, '0')}:00`)
                                                            setNewNumPeople('')
                                                            setNewPurpose('')
                                                        } else {    // 予約が存在したら詳細モーダルを開く
                                                            setIsDetailModalOpen(true)
                                                            setSelectedReservation(reservation)
                                                            setEditFacilityId(reservation.facility_id)
                                                            setEditStartTime(formatDateTimeLocal(reservation.start_time))
                                                            setEditEndTime(formatDateTimeLocal(reservation.end_time))
                                                            setEditNumPeople(String(reservation.num_people))
                                                            setEditPurpose(reservation.purpose || '')
                                                        }
                                                    }}
                                                    >
                                                        {reservation ? 'x' : 'o'}
                                                    </td>
                                                )
                                                })
                                            }
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    {/* 新規登録モーダル */}
                    {isModalOpen ? (
                        <div 
                            className="fixed inset-0 bg-black/50 flex justify-center items-center"
                            onClick={() => (setIsModalOpen(false))}
                        >
                            <div
                                className="bg-white rounded shadow p-6 w-125"
                                onClick={(e) => (e.stopPropagation())}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            施設名
                                        </label>
                                        <p className="border rounded px-2 py-1 bg-gray-100">
                                            {facilities.find(f => f.id === newFacilityId)?.name}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            開始日時
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1 bg-gray-100"
                                            type="datetime-local"
                                            value={newStartTime}
                                            readOnly
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            終了日時
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="datetime-local"
                                            value={newEndTime}
                                            onChange={(e) => setNewEndTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用人数
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="number"
                                            value={newNumPeople}
                                            onChange={(e) => setNewNumPeople(e.target.value)}
                                            placeholder="例： 30"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用目的
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="text"
                                            value={newPurpose}
                                            onChange={(e) => setNewPurpose(e.target.value)}
                                            placeholder="例： 報告会議"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className={`${BUTTON_SECONDARY} mr-2`}
                                    >
                                        閉じる
                                    </button>
                                    <button
                                        className={BUTTON_PRIMARY}
                                        disabled={isSubmitting}
                                        onClick={() => handleInsertReservations()}
                                    >
                                        予約する
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {/* 詳細モーダル */}
                    {isDetailModalOpen ? (
                        <div 
                            className="fixed inset-0 bg-black/50 flex justify-center items-center"
                            onClick={() => (setIsDetailModalOpen(false))}
                        >
                            <div
                                className="bg-white rounded shadow p-6 w-125"
                                onClick={(e) => (e.stopPropagation())}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            施設名
                                        </label>
                                        <p className="border rounded px-2 py-1 bg-gray-100">
                                            {facilities.find(f => f.id === editFacilityId)?.name}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            開始日時
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1 bg-gray-100"
                                            type="datetime-local"
                                            value={editStartTime}
                                            onChange={(e) => setEditStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            終了日時
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="datetime-local"
                                            value={editEndTime}
                                            onChange={(e) => setEditEndTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用人数
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="number"
                                            value={editNumPeople}
                                            onChange={(e) => setEditNumPeople(e.target.value)}
                                            placeholder="例： 30"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            利用目的
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="text"
                                            value={editPurpose}
                                            onChange={(e) => setEditPurpose(e.target.value)}
                                            placeholder="例： 報告会議"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className={`${BUTTON_SECONDARY} mr-2`}
                                    >
                                        閉じる
                                    </button>
                                    {selectedReservation?.user_id === userId ? (
                                        <>
                                            <button
                                                className={BUTTON_DANGER}
                                                disabled={isSubmitting}
                                                onClick={() => handleCancelReservation()}
                                            >
                                                予約をキャンセルする
                                            </button>
                                            <button
                                                className={BUTTON_PRIMARY}
                                                disabled={isSubmitting}
                                                onClick={() => handleUpdateReservation()}
                                            >
                                                更新する
                                            </button>
                                        </>
                                    ): null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
        </>
    )
}