'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" //next.jsの画面遷移
import { useEffect, useState } from "react"
import { CalendarX } from "lucide-react"
// 施設・予約のtypes
import { Facility, Reservation } from "@/lib/types"
// 予約のステータス
import { BUTTON_PRIMARY, RESERVATION_STATUS, STAT_NUMBER } from "@/lib/constants"
import Link from "next/link"

export default function Dashboard() {

    // 画面遷移
    const router = useRouter();
    // 予約一覧
    const [reservations, setReservations] = useState<Reservation[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<Facility[]>([])
    // 表示名
    const [displayName, setDisplayName] = useState('')
    // 今日の日付
    const [selectedDate] = useState(() => {
        const today = new Date()
        return today.toLocaleDateString('sv-SE')
    })

    useEffect(() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                return
            }
            
            // プロフィールをロード
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (profileError) {
                alert('プロフィールの取得に失敗しました')
            } else {
                setDisplayName(profileData.display_name)
            }

            // 予約一覧をロード
            const { data: reservationData, error: reservationError } = await supabase
                .from('reservations')
                .select('*')
                .eq('status', RESERVATION_STATUS.CONFIRMED)
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
    }, [router])

    return (
        <>
            <p
                className="text-xl mb-4"
            >
                こんにちは、{displayName}さん
            </p>
            <div className="flex gap-4">
                <div className="flex-1 bg-white p-6 rounded-xl shadow-sm">
                    <h2 
                        className="text-lg font-semibold text-gray-700 mb-2"
                    >
                        今日の予約
                    </h2>
                    {( () => {
                        const todayReservations = reservations.filter(
                            (r) => new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate
                        )
                        return todayReservations.length > 0 ? (
                            todayReservations.map(
                                (r) => (
                                    <p key={r.id} className="text-gray-600 py-1">
                                        {facilities.find(f => f.id === r.facility_id)?.name}
                                        {new Date(r.start_time).getHours()}:00 - {new Date(r.end_time).getHours()}:00
                                    </p>
                                )
                            )
                        ) : (
                            <div>
                                <CalendarX size={32} className="mx-auto mb-2" />
                                <p
                                    className="text-gray-400 text-center py-8"
                                >
                                    予約はまだありません
                                </p>
                            </div>
                            )
                        }
                    )()}
                    <Link
                        href={'/reservations'}
                        className={BUTTON_PRIMARY}
                    >
                        予約カレンダーへ
                    </Link>
                </div>
                <div className="flex-1 bg-white p-6 rounded-xl shadow-sm">
                    <h2
                        className="text-lg font-semibold text-gray-700 mb-2"
                    >
                        今月の予約数
                    </h2>
                    <p className={`${STAT_NUMBER} pl-2`}>
                        {reservations
                            .filter((r) => 
                                new Date(r.start_time).toLocaleDateString('sv-SE').slice(0, 7) === selectedDate.slice(0, 7))
                            .length
                        }
                    </p>
                </div>
            </div>
        </>
    )
}