'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Reservations() {

    /* ログイン */
    // ルーター
    const router = useRouter()
    const [userId, setUserId] = useState('')
    // 更新
    const [refreshKey, setRefreshKey] = useState(0)
    /* 予約 */
    const [reservations, setReservations] = useState<any[]>([])
    /* 施設 */
    const [facilities, setFacilities] = useState<any[]>([])
    /* 予約カレンダー */
    // 営業時間
    const BUSINESS_HOUR_START = 9
    const BUSINESS_HOUR_END = 17
    const timeSlots = Array.from({ length: BUSINESS_HOUR_END - BUSINESS_HOUR_START + 1 }, (_, i) => i + BUSINESS_HOUR_START)
    // 今日の日付
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date()
        return today.toLocaleDateString('sv-SE')
    })
    // モーダル
    const [isModalOpen, setIsModalOpen] = useState(false)
    // const [modalFacilityId, setModalFacilityId] = useState<number | null>(null)
    // const [modalTimeSlot, setModalTimeSlot] = useState<number | null>(null)
    // 新規登録
    const [newFacilityId, setNewFacilityId] = useState<number | null>(null)
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newNumPeople, setNewNumPeople] = useState('')
    const [newPurpose, setNewPurpose] = useState('')
    //ボタンのスタイル
    const BUTTON_PRIMARY = "bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
    const BUTTON_DANGER = "bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
    const BUTTON_SECONDARY = "bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
    const BUTTON_SUCCESS = "bg-green-400 text-white px-4 py-2 rounded hover:bg-green-500"

    useEffect(() => {
        // ログインチェック
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            }else {
                setUserId(session.user.id)
            }
        }
        // 予約一覧をロード
        const loadReservations = async () => {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .order('id', { ascending: true })
            if (error) {
                alert('予約一覧の取得に失敗しました')
            } else {
                setReservations(data)
            }
        }
        // 施設一覧をロード
        const loadFacilities = async () => {
            const { data, error } = await supabase
                .from('facilities')
                .select('*')
            if (error) {
                alert('施設一覧の取得に失敗しました')
            } else {
                setFacilities(data)
            }
        }
        checkSession()
        loadReservations()
        loadFacilities()
    }, [refreshKey])

    const handleInsertReservations = async () => {
        const { data: overlappingReservations, error: checkError } = await supabase
            .from('reservations')
            .select('id')
            .eq('facility_id', newFacilityId)
            .eq('status', 'confirmed')
            .lt('start_time', new Date(newEndTime).toISOString())
            .gt('end_time', new Date(newStartTime).toISOString())
            .limit(1)

        if (checkError) {
            alert('予約の確認に失敗しました')
            return
        }

        if (overlappingReservations && overlappingReservations.length > 0) {
            alert('この時間帯はすでに予約が入っています。')
            return
        }
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
                                                        new Date(r.start_time).getHours() === timeSlot &&
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
                                                        if (!reservation) {
                                                            setNewFacilityId(facility.id)
                                                            setNewStartTime(`${selectedDate}T${String(timeSlot).padStart(2, '0')}:00`)
                                                            setNewEndTime(`${selectedDate}T${String(timeSlot + 1).padStart(2, '0')}:00`)
                                                            setIsModalOpen(true)
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
                                        onClick={() => handleInsertReservations()}
                                    >
                                        予約する
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
        </>
    )
}