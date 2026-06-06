'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/constants"
// カテゴリ・施設のtypes
import { Category, Facility } from "@/lib/types"
// 予約のステータス
import { RESERVATION_STATUS } from "@/lib/constants"
// チェックボックス
import { toggleId } from "@/lib/selection"
// バリデーション
import { isNonEmpty, isPositiveInt } from "@/lib/validation"

export default function Facilities() {

    // 画面遷移
    const router = useRouter()
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // 施設一覧
    const [facilities, setFacilities] = useState<Facility[]>([])
    // カテゴリ一覧
    const [categories, setCategories] = useState<Category[]>([])
    /* 施設 */
    // 新規登録モーダル
    const [isModalOpen, setIsModalOpen] = useState(false)
    // 新規登録
    const [newFacilityName, setNewFacilityName] = useState('')
    const [newCategoryId, setNewCategoryId] = useState<number | null>(null)
    const [newMaxCapacity, setNewMaxCapacity] = useState('')
    const [newIsActive, setNewIsActive] = useState(true)
    // 編集
    const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
    const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
    const [editFacilityName, setEditFacilityName] = useState('')
    const [editMaxCapacity, setEditMaxCapacity] = useState('')
    const [editIsActive, setEditIsActive] = useState(true)
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    // 削除
    const [isDeleteClick, setIsDeleteClick] = useState(false)   //削除ボタンクリック
    const [selectedCheckboxFacilityId, setSelectedCheckboxFacilityId] = useState<number[]>([])
    // 多重送信防止
    const [isSubmitting, setIsSubmitting] = useState(false)
    // フィルター
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null)

    useEffect(() => {
        // 初期処理
        const init = async () => {
            //ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            //施設一覧をロード
            const { data: facilityData, error: facilityError } = await supabase
                .from('facilities')
                .select('*')
                .order('id', { ascending: true })

            if (facilityError) {
                alert('施設一覧の取得に失敗しました')
            } else {
                setFacilities(facilityData)
            }

            //カテゴリ一覧をロード
            const { data: categoryData, error: categoryError } = await supabase
                .from('categories')
                .select('*')

            if (categoryError) {
                alert('カテゴリ一覧の取得に失敗しました')
            } else {
                setCategories(categoryData)
            }
        }
        init()
    }, [refreshKey, router])

    //カテゴリ名を取得
    const getCategoryName = (categoryId: number | null) => {
        if (!categoryId) return '未設定'    //無駄にこの関数を呼び出すことを抑制（勉強のため記載）
        const category = categories.find((cat) => cat.id === categoryId)
        return category ? category.name : '未設定'
    }

    //施設追加
    const handleInsertFacilities = async () => {
        /* バリデーションチェック */
        // 施設名必須チェック
        if (!isNonEmpty(newFacilityName)) {
            alert('施設名を入力してください')
            return
        }

        // カテゴリ選択チェック
        if (newCategoryId === null) {
            alert('カテゴリを選択してください')
            return
        }

        // 最大人数必須チェック
        if (!isPositiveInt(newMaxCapacity)) {
            alert('最大人数を正しく入力して下さい')
            return
        }

        // 多重送信防止
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('facilities')
                .insert({
                    name: newFacilityName,
                    category_id: newCategoryId,
                    max_capacity: Number(newMaxCapacity),
                    is_active: newIsActive
                })
            if (error) {
                alert('施設の追加に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                resetNewForm()
                setIsModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //施設更新
    const handleUpdateFacilities = async () => {
        if (!selectedFacilityId) return
        /* バリデーションチェック */
        // 施設名必須チェック
        if (!isNonEmpty(editFacilityName)) {
            alert('施設名を入力してください')
            return
        }

        // カテゴリ選択チェック
        if (editCategoryId === null) {
            alert('カテゴリを選択してください')
            return
        }

        // 最大人数必須チェック
        if (!isPositiveInt(editMaxCapacity)) {
            alert('最大人数を正しく入力して下さい')
            return
        }
        
        // 多重送信防止
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('facilities')
                .update({
                    name: editFacilityName,
                    category_id: editCategoryId,
                    max_capacity: Number(editMaxCapacity),
                    is_active: editIsActive
                })
                .eq('id', selectedFacilityId)
            if (error) {
                alert('施設の更新に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedFacilityId(null)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //施設削除（一括）
    const handleDeleteFacilities = async () => {
        // 削除確認
        if (!window.confirm('選択した施設を削除しますか？')) return

        // 削除対象の施設が予約に使われていないかチェック
        const { data: linkedReservations, error: checkError } = await supabase
            .from('reservations')
            .select('id')
            .in('facility_id', selectedCheckboxFacilityId)
            .eq('status', RESERVATION_STATUS.CONFIRMED)
            .limit(1)

        if (checkError) {
            alert('予約の確認に失敗しました')
            return
        }

        if (linkedReservations && linkedReservations.length > 0) {
            alert('確定済みの予約がある施設は削除できません。先に予約をキャンセルしてください')
            return
        }

        // 多重送信防止
        setIsSubmitting(true)
        try {
            //　予約がなければ削除実行
            const { error } = await supabase
                .from('facilities')
                .delete()
                .in('id', selectedCheckboxFacilityId)
            if (error) {
                alert('施設の削除に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedCheckboxFacilityId([])
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // 新規登録のstateをリセットする関数
    const resetNewForm = () => {
        setNewFacilityName('')
        setNewCategoryId(null)
        setNewMaxCapacity('')
        setNewIsActive(true)
    }

    //ボタンのONをすべてリセットする関数
    const resetAllModes = () => {
        setIsEditClick(false)
        setIsDeleteClick(false)
        setSelectedFacilityId(null)
        setSelectedCheckboxFacilityId([])
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">施設管理</h1>
                <div>
                    <button
                        onClick={() => {
                            resetAllModes()
                            resetNewForm()
                            setIsModalOpen(true)
                        }}
                        className={`${BUTTON_PRIMARY} mr-2`}
                    >
                        新規登録
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
                            setIsDeleteClick(true)
                        }}
                        className={BUTTON_DANGER}
                    >
                        削除
                    </button>
                </div>
            </div>

            {/* フィルター */}
            {/* カテゴリー */}
            <div className="flex gap-4 mb-4">
                <select
                    value={filterCategoryId ?? ''}
                    onChange={(e) => setFilterCategoryId(
                    e.target.value === '' ? null : Number(e.target.value)
                    )}
                    className={INPUT}
                >
                    <option value="">すべて</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* テーブル */}
            <div className={`${CARD} overflow-x-auto`}>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {(isEditClick || isDeleteClick) && <th className="px-4 py-3"></th>}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">施設名</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">カテゴリ名</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">最大人数</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">利用可否</th>
                        </tr>
                    </thead>
                    <tbody>
                        {facilities
                            .filter((facility) =>
                                filterCategoryId === null
                                    ? true
                                    : facility.category_id === filterCategoryId
                                )
                            .map((facility) => (
                                <tr key={facility.id} className="border-t hover:bg-gray-50">
                                    {/* 編集のラジオボタン */}
                                    {isEditClick && (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="radio"
                                                    name="editTarget"
                                                    className={INPUT}
                                                    checked={selectedFacilityId === facility.id}
                                                    onChange={() => {
                                                        setSelectedFacilityId(facility.id)
                                                        setEditFacilityName(facility.name)
                                                        setEditCategoryId(facility.category_id)
                                                        setEditMaxCapacity(String(facility.max_capacity))
                                                        setEditIsActive(facility.is_active)
                                                    }}
                                                />
                                            </td>
                                        </>
                                    )}

                                    {/* 削除のチェックボックス */}
                                    {isDeleteClick && (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCheckboxFacilityId.includes(facility.id)}
                                                    onChange={() => setSelectedCheckboxFacilityId(toggleId(selectedCheckboxFacilityId, facility.id))}
                                                    className={INPUT}
                                                />
                                            </td>
                                        </>
                                    )}

                                    <td className="px-4 py-3">{facility.id}</td>

                                    {/* ラジオボタンが押されたとき → インライン編集 */}
                                    {selectedFacilityId === facility.id ? (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={editFacilityName}
                                                    onChange={(e) => setEditFacilityName(e.target.value)}
                                                    className={`${INPUT} w-full`}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={editCategoryId ?? ''}
                                                    onChange={(e) => setEditCategoryId(
                                                        e.target.value === '' ? null : Number(e.target.value)
                                                    )}
                                                    className={`${INPUT} w-full`}
                                                >
                                                    <option value="">選択してください</option>
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={editMaxCapacity}
                                                    onChange={(e) => setEditMaxCapacity(e.target.value)}
                                                    className={`${INPUT} w-20`}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={editIsActive}
                                                    onChange={(e) => setEditIsActive(e.target.checked)}
                                                    className={INPUT}
                                                />
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {/* 施設一覧 */}
                                            <td className="px-4 py-3">{facility.name}</td>
                                            <td className="px-4 py-3">{getCategoryName(facility.category_id)}</td>
                                            <td className="px-4 py-3">{facility.max_capacity}</td>
                                            <td className="px-4 py-3">{facility.is_active ? '利用可' : '利用停止中'}</td>
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
                            className={`${CARD} p-6 w-125`}
                            onClick={(e) => (e.stopPropagation())}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label>
                                        施設名
                                    </label>
                                    <input
                                        type="text"
                                        value={newFacilityName}
                                        onChange={(e) => setNewFacilityName(e.target.value)}
                                        placeholder="例： 大会議室"
                                        className={INPUT}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label>
                                        カテゴリ
                                    </label>
                                    <select
                                        value={newCategoryId ?? ''}
                                        onChange={(e) => setNewCategoryId(
                                            e.target.value === '' ? null : Number(e.target.value)
                                        )}
                                        className={INPUT}
                                    >
                                        <option value="">選択してください</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label>
                                        最大人数
                                    </label>
                                    <input
                                        type="number"
                                        value={newMaxCapacity}
                                        onChange={(e) => setNewMaxCapacity(e.target.value)}
                                        placeholder="例： 30"
                                        className={INPUT}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label>
                                        利用可否
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={newIsActive}
                                        onChange={(e) => setNewIsActive(e.target.checked)}
                                        className={INPUT}
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
                                    onClick={() => handleInsertFacilities()}
                                >
                                    追加する
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {/* 施設編集 */}
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
                            onClick={() => handleUpdateFacilities()}
                        >
                            更新する</button>
                    </div>
                </>
            )}

            {/* 施設削除 */}
            {isDeleteClick && (
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
                            onClick={() => handleDeleteFacilities()}
                        >
                            削除する
                        </button>
                    </div>
                </>
            )}
        </>
    )
}