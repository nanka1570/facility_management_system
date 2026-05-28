'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" //next.jsの画面遷移
import { useEffect, useState } from "react"
import Header from "@/components/Header"

export default function Dashboard() {
    const [ displayName, setDisplayName ] = useState('')
    const router = useRouter();

    // 予約一覧
    const [reservations, setReservations] = useState<any[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<any[]>([])
    // 今日の日付
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date()
        return today.toLocaleDateString('sv-SE')
    })
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
                router.push('/')
            } else {
                const userId = session.user.id
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()
                setDisplayName(data.display_name)
            }

            // 予約一覧をロード
            const { data: reservationData, error: reservationError } = await supabase
                .from('reservations')
                .select('*')
                .eq('status', 'confirmed')
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
        checkSession()
    }, [])

    return (
        <>
            <div className="bg-gray-100 min-h-screen">
                <Header />
                <main className="p-6">
                    <p
                    className="text-xl mb-4"
                    >
                        こんにちは、{displayName}さん
                    </p>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white p-4 rounded shadow">
                            <h2 
                            className="font-bold mb-2"
                            >
                                今日の予約
                            </h2>
                            {reservations ? (
                                <>
                                    {reservations
                                        .filter((r) => 
                                            new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate)
                                        .map((r) => (
                                            <p key={r.id} className="text-gray-600 py-1">
                                                {facilities.find(f => f.id === r.facility_id)?.name}
                                                {new Date(r.start_time).getHours()}:00 - {new Date(r.end_time).getHours()}:00
                                            </p>
                                        ))
                                    }
                                </>
                            ) : (
                                <p 
                                className="text-gray-500"
                                >
                                    (予約なし)
                                </p>
                            )}
                            <button
                                className="text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                                onClick={() => router.push('/reservations')}
                            >
                                予約カレンダーへ
                            </button>
                        </div>
                        <div className="flex-1 bg-white p-4 rounded shadow">
                            <h2 className="font-bold mb-2"
                            >
                                今月の予約数
                            </h2>
                            <p>
                                {reservations
                                    .filter((r) => 
                                        new Date(r.start_time).toLocaleDateString('sv-SE').slice(0, 7) === selectedDate.slice(0, 7))
                                    .length
                                }
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}