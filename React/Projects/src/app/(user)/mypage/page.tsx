'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/constants"
// 日時をフォーマットする関数, ステータスを日本語に直す関数
import { formatDateTime } from "@/lib/utils"
// 施設・プロフィール・予約のtypes
import { Facility, Profile, Reservation } from "@/lib/types"
// バリデーション
import { isNonEmpty } from "@/lib/validation"
import StatusBadge from "@/components/StatusBadge"
import Loading from "@/components/Loading"

export default function Mypage() {
    
    // 画面遷移
    const router = useRouter()
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // ユーザーID
    const [userId, setUserId] = useState('')
    // プロフィール
    const [profile, setProfile] = useState<Profile | null>(null)
    // 予約一覧
    const [reservations, setReservations] = useState<Reservation[]>([])
    // 施設一覧
    const [facilities, setFacilities] = useState<Facility[]>([])
    // 全件表示かどうか
    const [displayAll, setDisplayAll] = useState(false)
    // 編集モーダル開閉
    const [isModalOpen, setIsModalOpen] = useState(false)
    // 編集
    const [updateDisplayName, setUpdateDisplayName] = useState('')
    // 多重送信防止
    const [isSubmitting, setIsSubmitting] = useState(false)
    // ロード
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 初期処理
        const init = async () => {

            try {
                // ログインチェック
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    return
                }
    
                // UUIDをユーザーIDとしてセット
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
    
                // 施設一覧をロード
                const { data, error } = await supabase
                    .from('facilities')
                    .select('*')
                if (error) {
                    alert('施設一覧の取得に失敗しました')
                } else {
                    setFacilities(data)
                }
            } finally {
                // ロード終了
                setIsLoading(false)
            }
        }
        init()
    }, [refreshKey, router])

    // ローディング
    if (isLoading) return <Loading />

    // 編集
    const handleUpdateProfile = async () => {
        /* バリデーションチェック */
        // 表示名必須チェック
        if (!isNonEmpty(updateDisplayName)) {
            alert('表示名を入力してください')
            return
        }

        setIsSubmitting(true)
        try {
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
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">マイページ</h1>
            </div>
            {/* プロフィール */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-700">
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
                <div className={`${CARD} p-6`}>
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
                    <h2 className="text-lg font-semibold text-gray-700">
                        予約履歴
                    </h2>
                    <button
                        className={BUTTON_SECONDARY}
                        onClick={() => setDisplayAll(!displayAll)}
                    >
                        {displayAll ? '直近5件のみ表示' : 'すべて表示'}
                    </button>
                </div>
                {/* テーブル */}
                <div className={`${CARD} overflow-hidden`}>
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr className="border-t">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">開始日時</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">終了日時</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">施設</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ステータス</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(displayAll ? 
                            reservations : 
                            reservations.slice(0,5))
                                .map((reservation) => (
                                    <tr
                                        key={reservation.id}
                                        className="border-t hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3">
                                            {formatDateTime(reservation.start_time)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDateTime(reservation.end_time)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {facilities.find(f => f.id === reservation.facility_id)?.name ?? '未設定'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={reservation.status} />
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
                            className={`${CARD} p-6 w-125`}
                            onClick={(e) => (e.stopPropagation())}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label>表示名: </label>
                                    <input
                                        type="text"
                                        value={updateDisplayName}
                                        onChange={(e) => setUpdateDisplayName(e.target.value)}
                                        className={INPUT}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-gray-500">メール</p>
                                    <p className="text-gray-500 border rounded-lg px-3 py-2 bg-gray-100">{profile?.email}</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-gray-500">権限</p>
                                    <p className="text-gray-500 border rounded-lg px-3 py-2 bg-gray-100">{profile?.role}</p>
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
        </>
    )
}