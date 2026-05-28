'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/constants"


export default function Mypage() {
    
    // ログイン
    const router = useRouter()
    const [userId, setUserId] = useState('')
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // プロフィール
    const [profile, setProfile] = useState<any | null>(null)
    // 予約一覧
    const [reservations, setReservations] = useState<any[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<any[]>([])
    // 全件表示かどうか
    const [displayAll, setDisplayAll] = useState(false)
    // 編集モーダル開閉
    const [isModalOpen, setIsModalOpen] = useState(false)
    // 編集
    const [updateDisplayName, setUpdateDisplayName] = useState('')

    useEffect(() => {
        // ログインチェック
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            } else {
                setUserId(session.user.id)
                // プロフィールをロード
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                if (profileError) {
                    alert('プロフィールの取得に失敗しました')
                } else {
                    setProfile(profileData)
                }
                // 予約一覧をロード
                const { data: reservationData, error: reservationError } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('start_time', { ascending: false })
                if (reservationError) {
                    alert('予約一覧の取得に失敗しました')
                } else {
                    setReservations(reservationData)
                }
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
        loadFacilities()
    }, [refreshKey])

    // 編集
    const handleUpdateProfile = async () => {
        const { error } = await supabase
            .from('profiles')
            .update({ display_name: updateDisplayName })
            .eq('id', userId)
        if (error) {
            alert('プロフィールの更新に失敗しました')
        } else {
            setRefreshKey(prev => prev + 1)
            setIsModalOpen(false)
        }
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
        const statusMap: { [key: string]: string } = {
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
                    <h1 className="text-2xl font-bold">マイページ</h1>
                </div>
                {/* プロフィール */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">
                            プロフィール
                        </h2>
                        <button
                            className={`${BUTTON_PRIMARY} mr-2`}
                            onClick={() => {
                                setIsModalOpen(true)
                                setUpdateDisplayName(profile?.display_name || '')
                            }}
                        >
                            編集
                        </button>
                    </div>
                    <div className="bg-white rounded shadow p-6">
                        <div className="flex flex-col gap-8">
                            <div className="flex gap-2">
                                <p className="text-gray-500">表示名: </p>
                                <p>{profile?.display_name}</p>
                            </div>
                            <div className="flex gap-2">
                                <p className="text-gray-500">メール: </p>
                                <p>{profile?.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <p className="text-gray-500">権限: </p>
                                <p>{profile?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* 予約履歴 */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">
                            予約履歴
                        </h2>
                        <button
                            onClick={() => setDisplayAll(!displayAll)}
                        >
                            {displayAll ? '直近5件のみ表示' : 'すべて表示'}
                        </button>
                    </div>
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="border-t">
                                    <th className="px-4 py-3 text-left">開始日時</th>
                                    <th className="px-4 py-3 text-left">終了日時</th>
                                    <th className="px-4 py-3 text-left">施設</th>
                                    <th className="px-4 py-3 text-left">ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(displayAll ? 
                                reservations : 
                                reservations.slice(0,5))
                                    .map((reservation) => (
                                        <tr
                                            key={reservation.id}
                                            className="border-t"
                                        >
                                            <td className="px-4 py-3">
                                                {formatDateTime(reservation.start_time)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {formatDateTime(reservation.end_time)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {facilities.find(f => f.id === reservation.facility_id)?.name}
                                            </td>
                                            <td
                                                className={`px-4 py-3
                                                ${reservation.status === 'completed' ? 'text-green-600 font-semibold' :
                                                reservation.status === 'cancelled' ? 'text-red-400' : ''}`}
                                            >
                                                {getStatusLabel(reservation.status)}
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* 編集モーダル */}
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
                                        <label>表示名: </label>
                                        <input
                                            type="text"
                                            className="border rounded px-2 py-1"
                                            value={updateDisplayName}
                                            onChange={(e) => setUpdateDisplayName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-gray-500">メール</p>
                                        <p className="text-gray-500 border rounded px-2 py-1 bg-gray-100">{profile?.email}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-gray-500">権限</p>
                                        <p className="text-gray-500 border rounded px-2 py-1 bg-gray-100">{profile?.role}</p>
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
                                            onClick={() => handleUpdateProfile()}
                                        >
                                            更新する
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>    
                ): null}
            </main>
        </>
    )
}