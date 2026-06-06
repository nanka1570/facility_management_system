'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY, BUTTON_SUCCESS } from "@/lib/constants"
// 日時をフォーマットする関数, timeをdatetime-localに変換する関数, ステータスを日本語に直す関数
import { formatDateTime, formatDateTimeLocal, getStatusLabel } from "@/lib/utils"
// 施設・予約のtypes
import { Facility, Reservation } from "@/lib/types"
// 予約のステータス
import { RESERVATION_STATUS } from "@/lib/constants"
// チェックボックス
import { toggleId } from "@/lib/selection"
// バリデーション
import { isNonEmpty, isPositiveInt } from "@/lib/validation"

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
    /* 予約 */
    // 新規登録モーダル 
    const [isModalOpen, setIsModalOpen] = useState(false)
    // 新規予約
    const [newFacilityId, setNewFacilityId] = useState<number | null>(null)
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newNumPeople, setNewNumPeople] = useState('')
    const [newPurpose, setNewPurpose] = useState('')
    // 編集
    const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)
    const selectedReservation = reservations.find(r => r.id === selectedReservationId)
    const [editFacilityId, setEditFacilityId] = useState<number | null>(null)
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editNumPeople, setEditNumPeople] = useState('')
    const [editPurpose, setEditPurpose] = useState('')
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    // 予約キャンセル
    const [isCancelClick, setIsCancelClick] = useState(false)   //予約キャンセルボタンクリック
    const [selectedCheckboxReservationId, setSelectedCheckboxReservationId] = useState<number[]>([])
    // 予約復元
    const [isRestoreClick, setIsRestoreClick] = useState(false) //予約復元ボタンクリック
    // 多重送信防止
    const [isSubmitting, setIsSubmitting] = useState(false)
    // フィルター
    const [filterFacilityId, setFilterFacilityId] = useState<number | null>(null)
    const [filterDate, setFilterDate] = useState('')

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
    }, [refreshKey, router])


    //施設名を取得
    const getFacilityName = (facilityId: number | null) => {
        if (!facilityId) return '未設定'    //無駄にこの関数を呼び出すことを抑制（勉強のため記載）
        const facility = facilities.find((f) => f.id === facilityId)
        return facility ? facility.name : '未設定'
    }


    //新規予約
    const handleInsertReservations = async () => {
        /* バリデーション */
        // 施設名必須チェック
        if (newFacilityId === null) {
            alert('施設名を選択してください')
            return
        }

        // 開始日時必須チェック
        if (!isNonEmpty(newStartTime)) {
            alert('開始日時を選択してください')
            return
        }
        
        // 終了日時必須チェック
        if (!isNonEmpty(newEndTime)) {
            alert('終了日時を選択してください')
            return
        }
        
        // 開始・終了の順序チェック
        if (newEndTime <= newStartTime) {
            alert('終了日時は開始日時より後を入力してください')
            return
        }
        
        // 利用人数必須チェック
        if (!isPositiveInt(newNumPeople)) {
            alert('利用人数を入力してください')
            return
        }
        
        // 多重送信防止
        setIsSubmitting(true)
        try {
            // 予約重複チェック
            const { data: overlapping, error: checkError } = await supabase
                .from('reservations')
                .select('id')
                .eq('facility_id', newFacilityId)
                .eq('status', RESERVATION_STATUS.CONFIRMED)
                .lt('start_time', new Date(newEndTime).toISOString())
                .gt('end_time', new Date(newStartTime).toISOString())
                .limit(1)
            if (checkError) { alert('予約の確認に失敗しました'); return }
            if (overlapping && overlapping.length > 0) {
                alert('この時間帯はすでに予約が入っています')
                return
            }

            // 予約登録
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
                resetNewForm()
                setIsModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //更新処理
    const handleUpdateReservation = async () => {
        // nullチェック
        if (!selectedReservation) return

        /* バリデーション */
        // 施設名必須チェック
        if (editFacilityId === null) {
            alert('施設名を選択してください')
            return
        }

        // 開始日時必須チェック
        if (!isNonEmpty(editStartTime)) {
            alert('開始日時を選択してください')
            return
        }
        
        // 終了日時必須チェック
        if (!isNonEmpty(editEndTime)) {
            alert('終了日時を選択してください')
            return
        }

        // 開始・終了の順序チェック
        if (editEndTime <= editStartTime) {
            alert('終了日時は開始日時より後を入力してください')
            return
        }

        // 利用人数必須チェック
        if (!isPositiveInt(editNumPeople)) {
            alert('利用人数を入力してください')
            return
        }

        // 多重送信防止
        setIsSubmitting(true)
        try {
            // 予約重複チェック
            const { data: overlapping, error: checkError } = await supabase
                .from('reservations')
                .select('id')
                .eq('facility_id', editFacilityId)
                .eq('status', RESERVATION_STATUS.CONFIRMED)
                .neq('id', selectedReservation.id)   // 自分自身を除外
                .lt('start_time', new Date(editEndTime).toISOString())
                .gt('end_time', new Date(editStartTime).toISOString())
                .limit(1)
            if (checkError) { alert('予約の確認に失敗しました'); return }
            if (overlapping && overlapping.length > 0) {
                alert('この時間帯はすでに予約が入っています')
                return
            }
            // 予約更新
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
                setSelectedReservationId(null)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //キャンセル処理
    const handleCancelReservation = async () => {
        // キャンセル確認
        if (!window.confirm('選択した予約をキャンセルしますか？')) return

        // 多重送信防止
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('reservations')
                .update({
                    status: RESERVATION_STATUS.CANCELLED
                })
                .in('id', selectedCheckboxReservationId)
            if (error) {
                alert('予約のキャンセルに失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedCheckboxReservationId([])
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //復元処理
    const handleRestoreReservation = async () => {
        // 多重送信防止
        setIsSubmitting(true)
        try {
            // 予約重複チェック
            for (const id of selectedCheckboxReservationId){
                const target = reservations.find(r => r.id === id)
                if (!target) continue
                const { data: overlapping, error: checkError } = await supabase
                    .from('reservations')
                    .select('id')
                    .eq('facility_id', target.facility_id)
                    .eq('status', RESERVATION_STATUS.CONFIRMED)
                    .neq('id', target.id)   // 自分自身を除外
                    .lt('start_time', target.end_time)
                    .gt('end_time', target.start_time)
                    .limit(1)
                if (checkError) { 
                    alert('予約の確認に失敗しました')
                    return 
                }
                if (overlapping && overlapping.length > 0) {
                    alert('この時間帯はすでに予約が入っています')
                    return
                }
            }
                
            // 予約復元
            const { error } = await supabase
            .from('reservations')
                .update({
                    status: RESERVATION_STATUS.CONFIRMED
                })
                .in('id', selectedCheckboxReservationId)
            if (error) {
                alert('予約の復元に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedCheckboxReservationId([])
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // 新規登録のstateをリセットする関数
    const resetNewForm = () => {
        setNewFacilityId(null)
        setNewStartTime('')
        setNewEndTime('')
        setNewNumPeople('')
        setNewPurpose('')
    }

    //ボタンのONをすべてリセットする関数
    const resetAllModes = () => {
        setIsEditClick(false)
        setIsCancelClick(false)
        setIsRestoreClick(false)
        setSelectedReservationId(null)
        setSelectedCheckboxReservationId([])
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">予約管理</h1>
                <div>
                    <button
                        onClick={() => {
                            resetAllModes()
                            resetNewForm()
                            setIsModalOpen(true)
                        }}
                        className={`${BUTTON_PRIMARY} mr-2`}
                    >
                        新規予約
                    </button>
                    <button
                        onClick={() => {
                            resetAllModes()
                            setIsEditClick(true)
                        }}
                        className={`${BUTTON_PRIMARY} mr-2`}
                    >
                        編集
                    </button>
                    <button
                        onClick={() => {
                            resetAllModes()
                            setIsCancelClick(true)
                        }}
                        className={`${BUTTON_DANGER} mr-2`}
                    >
                        予約キャンセル
                    </button>
                    <button
                        onClick={() => {
                            resetAllModes()
                            setIsRestoreClick(true)
                        }}
                        className={BUTTON_SUCCESS}
                    >
                        予約復元
                    </button>
                </div>
            </div>
            {/* フィルター */}
            {/* 施設 */}
            <select
                value={filterFacilityId ?? ''}
                onChange={(e) => setFilterFacilityId(
                e.target.value === '' ? null : Number(e.target.value)
                )}
                className="border rounded px-2 py-1"
                >
                <option value="">すべて</option>
                {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                        {fac.name}
                    </option>
                ))}
                </select>
            {/* 日付 */}
            <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                />

            {/* テーブル */}
            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {(isEditClick || isCancelClick || isRestoreClick) && <th className="px-4 py-3"></th>}
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">施設名</th>
                            <th className="px-4 py-3 text-left">開始日時</th>
                            <th className="px-4 py-3 text-left">終了日時</th>
                            <th className="px-4 py-3 text-left">ステータス</th>
                            <th className="px-4 py-3 text-left">利用人数</th>
                            <th className="px-4 py-3 text-left">利用目的</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations
                            .filter((reservation) => 
                                filterFacilityId === null
                                ? true
                                : reservation.facility_id === filterFacilityId
                            )
                            .filter((reservation) => 
                                filterDate === ''
                                ? true
                                : new Date(reservation.start_time).toLocaleDateString('sv-SE') === filterDate
                            )
                            .map((reservation) => (
                                <tr
                                    key={reservation.id}
                                    //ステータスが'cancelled'ならグレーアウトする
                                    className={`border-t ${((isEditClick || isCancelClick) && reservation.status === RESERVATION_STATUS.CANCELLED) ||
                                        (isRestoreClick && reservation.status === RESERVATION_STATUS.CONFIRMED) ? 'opacity-40' : ''}`}
                                >
                                    {/* 編集のラジオボタン */}
                                    {isEditClick && (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="radio"
                                                    name="editTarget"
                                                    checked={selectedReservationId === reservation.id}
                                                    onChange={() => {
                                                        setSelectedReservationId(reservation.id)
                                                        setEditFacilityId(reservation.facility_id)
                                                        setEditStartTime(formatDateTimeLocal(reservation.start_time))
                                                        setEditEndTime(formatDateTimeLocal(reservation.end_time))
                                                        setEditNumPeople(String(reservation.num_people))
                                                        setEditPurpose(reservation.purpose || '')
                                                    }}
                                                    disabled={reservation.status !== RESERVATION_STATUS.CONFIRMED}
                                                />
                                            </td>
                                        </>
                                    )}

                                    {/* 予約キャンセル・予約復元のチェックボックス */}
                                    {(isCancelClick || isRestoreClick) && (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCheckboxReservationId.includes(reservation.id)}
                                                    onChange={() => setSelectedCheckboxReservationId(toggleId(selectedCheckboxReservationId, reservation.id))}
                                                    disabled={
                                                        isCancelClick
                                                            ? reservation.status !== RESERVATION_STATUS.CONFIRMED
                                                            : reservation.status !== RESERVATION_STATUS.CANCELLED
                                                    }
                                                />
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-3">{reservation.id}</td>

                                    {/* ステータスが'cancelled'以外 かつ ラジオボタンが押されたとき */}
                                    {reservation.status !== RESERVATION_STATUS.CANCELLED && selectedReservationId === reservation.id ? (
                                        <>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={editFacilityId ?? ''}
                                                    onChange={(e) => setEditFacilityId(
                                                        e.target.value === '' ?  null :Number(e.target.value)
                                                    )}
                                                    className="border rounded px-2 py-1"
                                                >
                                                    <option value="">選択してください</option>
                                                    {facilities.map((f) => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="border rounded px-2 py-1"
                                                    type="datetime-local"
                                                    value={formatDateTimeLocal(editStartTime)}
                                                    onChange={(e) => setEditStartTime(e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="border rounded px-2 py-1"
                                                    type="datetime-local"
                                                    value={formatDateTimeLocal(editEndTime)}
                                                    onChange={(e) => setEditEndTime(e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="border rounded px-2 py-1"
                                                    type="text"
                                                    value={getStatusLabel(reservation.status)}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="border rounded px-2 py-1"
                                                    type="number"
                                                    value={editNumPeople}
                                                    onChange={(e) => setEditNumPeople(e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    className="border rounded px-2 py-1"
                                                    type="text"
                                                    value={editPurpose}
                                                    onChange={(e) => setEditPurpose(e.target.value)}
                                                />
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {/* 予約一覧 */}
                                            <td className="px-4 py-3">{getFacilityName(reservation.facility_id)}</td>
                                            <td className="px-4 py-3">{formatDateTime(reservation.start_time)}</td>
                                            <td className="px-4 py-3">{formatDateTime(reservation.end_time)}</td>
                                            <td
                                                className={`px-4 py-3 ${reservation.status === RESERVATION_STATUS.COMPLETED ? 'text-green-600 font-semibold' :
                                                        reservation.status === RESERVATION_STATUS.CANCELLED ? 'text-red-400' : ''
                                                    }`}>
                                                {getStatusLabel(reservation.status)}
                                            </td>
                                            <td className="px-4 py-3">{reservation.num_people}</td>
                                            <td className="px-4 py-3">{reservation.purpose}</td>
                                        </>
                                    )}


                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            {/* 新規登録モーダル */}
            {isModalOpen ? (
                <>
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
                                    <select
                                        className="border rounded px-2 py-1"
                                        value={newFacilityId ?? ''}
                                        onChange={(e) => setNewFacilityId(
                                            e.target.value === '' ? null : Number(e.target.value)
                                        )}
                                    >
                                        <option value="">選択してください</option>
                                        {facilities.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label>
                                        開始日時
                                    </label>
                                    <input
                                        className="border rounded px-2 py-1"
                                        type="datetime-local"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
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
                </>
            ) : null}

            {/* 予約編集 */}
            {isEditClick && (
                <>
                    <div>
                        <button
                            onClick={() => resetAllModes()}
                            className={`${BUTTON_SECONDARY} mr-2`}
                        >
                            閉じる</button>
                        <button
                            className={BUTTON_PRIMARY}
                            disabled={isSubmitting}
                            onClick={() => handleUpdateReservation()}
                        >
                            更新する</button>
                    </div>
                </>
            )}

            {/* 予約キャンセル */}
            {isCancelClick && (
                <>
                    <div>
                        <button
                            onClick={() => resetAllModes()}
                            className={`${BUTTON_SECONDARY} mr-2`}
                        >
                            閉じる
                        </button>
                        <button
                            className={BUTTON_DANGER}
                            disabled={isSubmitting}
                            onClick={() => handleCancelReservation()}
                        >
                            予約をキャンセルする
                        </button>
                    </div>
                </>
            )}

            {/* 予約復元 */}
            {isRestoreClick && (
                <>
                    <div>
                        <button
                            onClick={() => resetAllModes()}
                            className={`${BUTTON_SECONDARY} mr-2`}
                        >
                            閉じる
                        </button>
                        <button
                            className={BUTTON_SUCCESS}
                            disabled={isSubmitting}
                            onClick={() => handleRestoreReservation()}
                        >
                            予約を復元する
                        </button>
                    </div>
                </>
            )}
        </>
    )
}