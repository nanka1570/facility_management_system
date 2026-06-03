'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" //next.jsの画面遷移
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_SECONDARY } from "@/lib/constants"
// 施設・予約のtypes
import { Facility, Reservation, Profile } from "@/lib/types"
// 予約のステータス
import { RESERVATION_STATUS } from "@/lib/constants"
// プロフィールのロール
import { ROLE } from "@/lib/constants"

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
    
    useEffect(() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // 権限チェック
            const { data: authCheckData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (authCheckData?.role === ROLE.USER) {
                alert('管理者と開発者のみアクセスできます')
                router.push('/dashboard')
                return
            } else {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                if (profileError) {
                    alert('プロフィールの取得に失敗しました')
                } else {
                    setProfiles(profileData)
                }
            }
            
            // プロフィールをロード
            if (!authCheckData) {
                alert('プロフィールの取得に失敗しました')
            } else {
                setDisplayName(authCheckData.display_name)
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
            <div className="bg-gray-100 min-h-screen">
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
                            {( () => {
                                const todayReservations = reservations.filter(
                                    (r) => new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate
                                )
                                return todayReservations.length > 0 ? (
                                    todayReservations.map(
                                        (r) => (
                                            <p key={r.id} className="text-gray-600 py-1">
                                                {facilities.find(f => f.id === r.facility_id)?.name}
                                            </p>
                                        )
                                    )
                                ) : (
                                        <p className="text-gray-500">(予約なし)</p>
                                    )
                                }
                            )()}
                            <button
                                className={BUTTON_SECONDARY}
                                onClick={() => router.push('/reservations')}
                            >
                                予約カレンダーへ
                            </button>
                            <h2 
                                className="font-bold mb-2"
                            >
                                施設数
                            </h2>
                            <p>
                                {facilities.length}
                            </p>
                        </div>
                    </div>
                    <div>
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
                            <h2 
                                className="font-bold mb-2"
                            >
                                ユーザー数
                            </h2>
                            <p>
                                {profiles.length}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 
                            className="font-bold mb-2"
                        >
                            本日の予約一覧
                        </h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>時間</th>
                                    <th>施設</th>
                                    <th>利用者</th>
                                    <th>目的</th>
                                </tr>
                            </thead>
                            <tbody>
                                {( () => {
                                const todayReservations = reservations.filter(
                                    (r) => new Date(r.start_time).toLocaleDateString('sv-SE') === selectedDate
                                )
                                return todayReservations.length > 0 ? (
                                    todayReservations
                                        .map(
                                            (r) => (
                                                <tr key={r.id} className="text-gray-600 py-1">
                                                    <td>
                                                        {new Date(r.start_time).getHours()}:00 - {new Date(r.end_time).getHours()}:00
                                                    </td>
                                                    <td>
                                                        {facilities.find((f) => f.id === r.facility_id)?.name}
                                                    </td>
                                                    <td>
                                                        {profiles.find((p) => p.id === r.user_id)?.display_name}
                                                    </td>
                                                    <td>
                                                        {r.purpose}
                                                    </td>
                                                </tr>
                                            )
                                    )
                                ) : (
                                        <tr>
                                            <td colSpan={4} className="text-gray-500">(予約なし)</td>
                                        </tr>
                                    )
                                }
                            )()}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </>
    )
}