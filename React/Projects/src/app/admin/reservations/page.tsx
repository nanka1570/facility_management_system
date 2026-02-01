'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function reservations() {
    const router = useRouter()
    const [reservations, setReservations] = useState<any[]>([])
    const [refreshKey, setRefreshKey] = useState(0)

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
    checkSession()
    loadReservations()
   }, [refreshKey])

    return (
        <>
            <div>
                <Header />
            </div>
            <main>
                <h1>予約管理</h1>

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
                            {reservations.map((reservation) => {
                                <tr key={reservation.id} className="border-t">
                                    <td className="px-4 py-3">{reservation.id}</td>
                                    <td className="px-4 py-3">{reservation.facility_id}</td>
                                    <td className="px-4 py-3">{reservation.start_time}</td>
                                    <td className="px-4 py-3">{reservation.end_time}</td>
                                    <td className="px-4 py-3">{reservation.status}</td>
                                </tr>
                            })}
                        </tbody>
                    </table>
                </div>
            </main>
        </>
    )
}