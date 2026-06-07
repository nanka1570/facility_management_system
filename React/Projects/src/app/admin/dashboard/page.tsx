'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" //next.jsの画面遷移
import { useEffect, useState } from "react"
import { CalendarX } from "lucide-react"
// 施設・予約のtypes
import { Facility, Reservation, Profile } from "@/lib/types"
// 予約のステータス
import { CARD, RESERVATION_STATUS, STAT_NUMBER } from "@/lib/constants"
import Loading from "@/components/Loading"

export default function Dashboard() {

    // 画面遷移
    const router = useRouter();
    // 予約一覧
    const [reservations, setReservations] = useState<Reservation[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<Facility[]>([])
    // プロフィール一覧
    const [profiles, setProfiles] = useState<Profile[]>([])
    // 表示名
    const [displayName, setDisplayName] = useState('')
    // 今日の日付
    const [selectedDate] = useState(() => {
        const today = new Date()
        return today.toLocaleDateString('sv-SE')
    })
    // ロード
    const [isLoading, setIsLoading] = useState(true)
    
    useEffect(() => {
        // 初期処理
        const init = async () => {

            try {
                // ログインチェック
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    router.push('/')
                    return
                }
    
                // プロフィールをロード
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                if (profileError) {
                    alert('プロフィールの取得に失敗しました')
                } else {
                    setProfiles(profileData)
                    setDisplayName(profileData.find(p => p.id === session.user.id)?.display_name ?? '')
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
            } finally {
                setIsLoading(false)
            }
        }
        init()
    }, [router])
    
    // ローディング
    if (isLoading) return <Loading />

    return (
        <>
            <p
                className="text-xl mb-4"
            >
                こんにちは、{displayName}さん
            </p>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className={`${CARD} p-6`}>
                        <h2 
                            className="text-lg font-semibold text-gray-700 mb-2"
                        >
                            今日の予約数
                        </h2>
                        <p className={`${STAT_NUMBER} pl-2`}>
                            {reservations.filter((r) => new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate).length}
                        </p>
                    </div>
                    <div className={`${CARD} p-6`}>
                        <h2 
                            className="text-lg font-semibold text-gray-700 mb-2"
                        >
                            施設数
                        </h2>
                        <p className={`${STAT_NUMBER} pl-2`}>
                            {facilities.length}
                        </p>
                    </div>
                    <div className={`${CARD} p-6`}>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2"
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
                    <div className={`${CARD} p-6`}>
                        <h2 
                            className="text-lg font-semibold text-gray-700 mb-2"
                        >
                            ユーザー数
                        </h2>
                        <p className={`${STAT_NUMBER} pl-2`}>
                            {profiles.length}
                        </p>
                    </div>
                </div>
                <div className={`${CARD} flex-1 p-4 overflow-x-auto`}>
                    <h2 
                        className="text-lg font-semibold text-gray-700 mb-2"
                    >
                        今日の予約一覧
                    </h2>
                    <table className="w-full">
                        {( () => {
                        const todayReservations = reservations.filter(
                            (r) => new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate
                        )
                        return todayReservations.length > 0 ? (
                            <>
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm text-gray-600">時間</th>
                                        <th className="px-4 py-3 text-left text-sm text-gray-600">施設</th>
                                        <th className="px-4 py-3 text-left text-sm text-gray-600">利用者</th>
                                        <th className="px-4 py-3 text-left text-sm text-gray-600">目的</th>
                                    </tr>
                                </thead>
                                <tbody>
                                        {todayReservations
                                            .map(
                                                (r) => (
                                                    <tr key={r.id} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            {new Date(r.start_time).getHours()}:00 - {new Date(r.end_time).getHours()}:00
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {facilities.find((f) => f.id === r.facility_id)?.name}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {profiles.find((p) => p.id === r.user_id)?.display_name}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {r.purpose}
                                                        </td>
                                                    </tr>
                                                )
                                        )}
                                </tbody>
                            </>
                            ) : (
                                <tbody>
                                    <tr>
                                        <td colSpan={4}>
                                            <div>
                                                <CalendarX size={32} className="mx-auto mb-2" />
                                                <p
                                                    className="text-gray-400 text-center py-8"
                                                >
                                                    予約はまだありません
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                )
                            }
                        )()}
                    </table>
                </div>
            </div>
        </>
    )
}