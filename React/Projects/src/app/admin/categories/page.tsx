'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY } from "@/lib/constants"
// カテゴリのtypes
import { Category } from "@/lib/types"
// チェックボックス
import { toggleId } from "@/lib/selection"
// バリデーション
import { isNonEmpty } from "@/lib/validation"

export default function Categories() {
    
    // 画面遷移
    const router = useRouter()
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // カテゴリ一覧
    const [categories, setCategories] = useState<Category[]>([])
    /* カテゴリ */
    // 新規登録モーダル
    const [isModalOpen, setIsModalOpen] = useState(false)
    //新規登録
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategorySortOrder, setNewCategorySortOrder] = useState(0)
    //編集
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
    const [editCategoryName, setEditCategoryName] = useState('')
    const [editCategorySortOrder, setEditCategorySortOrder] = useState(0)
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    //削除
    const [selectedCheckboxCategoryId, setSelectedCheckboxCategoryId] = useState<number[]>([])
    const [isDeleteClick, setIsDeleteClick] = useState(false)   //削除ボタンクリック
    // 多重送信防止
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        // 初期処理
        const init = async () => {
            //ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            //カテゴリ一覧を表示
            const { data: categoryData, error: categoryError } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })

            if (categoryError) {
                alert('カテゴリ一覧の取得に失敗しました')
            } else {
                setCategories(categoryData)
            }
        }
        init()
    }, [refreshKey, router])

    //カテゴリ追加
    const handleInsertCategories = async () => {
        /* バリデーションチェック */
        // カテゴリ名必須チェック
        if (!isNonEmpty(newCategoryName)) {
            alert('カテゴリ名を入力してください')
            return
        }

        // 多重送信防止
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('categories')
                .insert({ name: newCategoryName, sort_order: newCategorySortOrder })
            if (error) {
                alert('カテゴリの追加に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                resetNewForm()
                setIsModalOpen(false)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //カテゴリ更新
    const handleUpdateCategories = async () => {
        // 選択したカテゴリ
        if (!selectedCategoryId) return

        /* バリデーションチェック */
        // カテゴリ名必須チェック
        if (!isNonEmpty(editCategoryName)) {
            alert('カテゴリ名を入力してください')
            return
        }
        
        // 多重送信防止
        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('categories')
                .update({ name: editCategoryName, sort_order: editCategorySortOrder })
                .eq('id', selectedCategoryId)
            if (error) {
                alert('カテゴリの更新に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedCategoryId(null)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    //カテゴリ削除（一括）
    const handleDeleteCategories = async () => {
        if (!window.confirm('選択したカテゴリを削除しますか？')) return

        // 多重送信防止
        setIsSubmitting(true)
        try {
            // カテゴリが施設で使われているかチェック
            const { data: linkedFacilities, error: checkError } = await supabase
                .from('facilities')
                .select('id')
                .in('category_id', selectedCheckboxCategoryId)
                .limit(1)
    
            if (checkError) {
                alert('施設の確認に失敗しました')
                return
            }
    
            if (linkedFacilities && linkedFacilities.length > 0) {
                alert('使用中のカテゴリは削除できません。先に施設のカテゴリを変更するか削除してください')
                return
            }

            // カテゴリ削除
            const { error } = await supabase
                .from('categories')
                .delete()
                .in('id', selectedCheckboxCategoryId)
            if (error) {
                alert('カテゴリの削除に失敗しました')
            } else {
                setRefreshKey(prev => prev + 1)
                setSelectedCheckboxCategoryId([])
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // 新規登録のstateをリセットする関数
    const resetNewForm = () => {
        setNewCategoryName('')
        setNewCategorySortOrder(0)
    }

    //ボタンのONをすべてリセットする関数
    const resetAllModes = () => {
        setIsEditClick(false)
        setIsDeleteClick(false)
        setSelectedCategoryId(null)
        setSelectedCheckboxCategoryId([])
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">カテゴリ管理</h1>
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

            {/* テーブル */}
            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {(isEditClick || isDeleteClick) && <th className="px-4 py-3"></th>}
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">カテゴリ名</th>
                            <th className="px-4 py-3 text-left">表示順</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id} className="border-t">
                                {/* 編集のラジオボタン */}
                                {isEditClick && (
                                    <>
                                        <td className="px-4 py-3">
                                            <input
                                                type="radio"
                                                name="editTarget"
                                                checked={selectedCategoryId === category.id}
                                                onChange={() => {
                                                    setSelectedCategoryId(category.id)
                                                    setEditCategoryName(category.name)
                                                    setEditCategorySortOrder(category.sort_order)
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
                                                checked={selectedCheckboxCategoryId.includes(category.id)}
                                                onChange={() => setSelectedCheckboxCategoryId(toggleId(selectedCheckboxCategoryId, category.id))}
                                            />
                                        </td>
                                    </>
                                )}

                                <td className="px-4 py-3">{category.id}</td>

                                {/* ラジオボタンが押されたとき → インライン編集 */}
                                {selectedCategoryId === category.id ? (
                                    <>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={editCategoryName}
                                                onChange={(e) => setEditCategoryName(e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={editCategorySortOrder}
                                                onChange={(e) => setEditCategorySortOrder(Number(e.target.value))}
                                                className="border rounded px-2 py-1 w-20"
                                            />
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        {/* カテゴリ一覧 */}
                                        <td className="px-4 py-3">{category.name}</td>
                                        <td className="px-4 py-3">{category.sort_order}</td>
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
                            className="bg-white rounded shadow p-6 w-125"
                            onClick={(e) => (e.stopPropagation())}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label>
                                        カテゴリ名
                                    </label>
                                    <input
                                        className="border rounded px-2 py-1"
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="例：会議室"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label>
                                        並び順
                                    </label>
                                    <input
                                        className="border rounded px-2 py-1"
                                        type="number"
                                        value={newCategorySortOrder}
                                        onChange={(e) => setNewCategorySortOrder(Number(e.target.value))}
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
                                    onClick={() => handleInsertCategories()}
                                >
                                    追加する
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {/* カテゴリ編集 */}
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
                            onClick={() => handleUpdateCategories()}
                        >
                            更新する</button>
                    </div>
                </>
            )}

            {/* カテゴリ削除 */}
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
                            onClick={() => handleDeleteCategories()}
                        >
                            削除する
                        </button>
                    </div>
                </>
            )}
        </>
    )
}