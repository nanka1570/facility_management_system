'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Reservations() {
    const router = useRouter()
    const [reservations, setReservations] = useState<any[]>([])
    const [facilities, setFacilities] = useState<any[]>([])
    const [refreshKey, setRefreshKey] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    //新規予約
    const [newFacilityId, setNewFacilityId] = useState<number | null>(null)
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newNumPeople, setNewNumPeople] = useState(1)
    const [newPurpose, setNewPurpose] = useState('')


   useEffect(() => {
    //ログインチェック
    const checkSession = async () => {
        const {data: { session } } = await supabase.auth.getSession()
        if (!session){
            router.push('/')
        }
    }
    //予約一覧をロード
    const loadReservations = async () => {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
        if (data){
            setReservations(data)
        }
    }
    //予約一覧をロード
    const loadFacilities = async () => {
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
        if (data){
            setFacilities(data)
        }
    }
    checkSession()
    loadReservations()
    loadFacilities()
   }, [refreshKey])

   //施設名を取得
   const getFacilityName = (facilityId: number | null) => {
    if (!facilityId) return '未設定'    //無駄にこの関数を呼び出すことを抑制（勉強のため記載）
    const facility = facilities.find((f) => f.id === facilityId)
    return facility ? facility.name : '未設定'
   }

   //日時をフォーマットする関数
   const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
   }

   //ステータスを日本語に直す関数
   const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string} = {
        'confirmed': '確定',
        'cancelled': 'キャンセル',
        'completed': '完了'
    }
    return statusMap[status] || status
   }

    return (
        <>
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">予約管理</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                    >
                        新規予約
                    </button>
                </div>
                <div className="bg-white rounded shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">施設名</th>
                                <th className="px-4 py-3 text-left">開始日時</th>
                                <th className="px-4 py-3 text-left">終了日時</th>
                                <th className="px-4 py-3 text-left">ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map((reservation) => (
                                <tr key={reservation.id} className="border-t">
                                    <td className="px-4 py-3">{reservation.id}</td>
                                    <td className="px-4 py-3">{getFacilityName(reservation.facility_id)}</td>
                                    <td className="px-4 py-3">{formatDateTime(reservation.start_time)}</td>
                                    <td className="px-4 py-3">{formatDateTime(reservation.end_time)}</td>
                                    <td className="px-4 py-3">{getStatusLabel(reservation.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {isModalOpen ? (
                    <>
                        <div className="">
                            <select>
                                <option value="">選択してください</option>
                            </select>
                            <label>
                                開始日時
                                <input
                                type="datetime-local"
                                value={newStartTime}
                                onChange={(e) => setNewStartTime(e.target.value)}
                                />
                            </label>
                            <label>
                                終了日時
                                <input 
                                type="datetime-local"
                                value={newEndTime}
                                onChange={(e) => setNewEndTime(e.target.value)}
                                />
                            </label>
                            <label>
                                利用人数
                                <input
                                type="number"
                                value={newNumPeople}
                                onChange={(e) => setNewNumPeople(Number(e.target.value))}
                                />
                            </label>
                            <label>
                                利用目的
                                <input
                                type="text"
                                value={newPurpose}
                                onChange={(e) => setNewPurpose(e.target.value)}
                                />
                            </label>
                        </div>
                        <button>
                            キャンセル
                        </button>
                        <button>
                            予約する
                        </button>
                    </>
                ):null}
            </main>
        </>
    )
}