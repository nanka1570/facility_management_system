'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY } from "@/lib/constants"
import { Category } from "@/lib/types"

export default function Categories() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [refreshKey, setRefreshKey] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    //新規登録
    const [newName, setNewName] = useState('')
    const [newSortOrder, setNewSortOrder] = useState(0)
    //編集
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editSortOrder, setEditSortOrder] = useState(0)
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    //削除
    const [isDeleteClick, setIsDeleteClick] = useState(false)   //削除ボタンクリック
    const [selectedCheckboxCategoryId, setSelectedCheckboxCategoryId] = useState<number[]>([])

    useEffect(() => {
        //ログインチェック
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            }
        }
        //カテゴリ一覧を表示
        const loadCategories = async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })

            if (error) {
                alert('カテゴリ一覧の取得に失敗しました')
            } else {
                setCategories(data)
            }
        }
        checkSession()
        loadCategories()
    }, [refreshKey])

    //カテゴリ追加
    const handleInsertCategories = async () => {
        const { error } = await supabase
            .from('categories')
            .insert({ name: newName, sort_order: newSortOrder })
        if (error) {
            alert('カテゴリの追加に失敗しました')
        } else {
            setRefreshKey(prev => prev + 1)
            setNewName('')
            setNewSortOrder(0)
            setIsModalOpen(false)
        }
    }

    //カテゴリ更新
    const handleUpdateCategories = async () => {
        if (!selectedCategoryId) return

        const { error } = await supabase
            .from('categories')
            .update({ name: editName, sort_order: editSortOrder })
            .eq('id', selectedCategoryId)
        if (error) {
            alert('カテゴリの更新に失敗しました')
        } else {
            setRefreshKey(prev => prev + 1)
            setSelectedCategoryId(null)
        }
    }

    //カテゴリ削除（一括）
    const handleDeleteCategories = async () => {
        if (!window.confirm('選択したカテゴリを削除しますか？')) return
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
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">カテゴリ管理</h1>
                    <div>
                        <button
                            onClick={() => {
                                resetAllModes()
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
                                                        setEditName(category.name)
                                                        setEditSortOrder(category.sort_order)
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
                                                    onChange={() => {
                                                        if (selectedCheckboxCategoryId.includes(category.id)) {
                                                            setSelectedCheckboxCategoryId(
                                                                selectedCheckboxCategoryId.filter((id) => id !== category.id)
                                                            )
                                                        } else {
                                                            setSelectedCheckboxCategoryId(
                                                                [...selectedCheckboxCategoryId, category.id]
                                                            )
                                                        }
                                                    }}
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
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="border rounded px-2 py-1 w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={editSortOrder}
                                                    onChange={(e) => setEditSortOrder(Number(e.target.value))}
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
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
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
                                            value={newSortOrder}
                                            onChange={(e) => setNewSortOrder(Number(e.target.value))}
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
                                onClick={() => handleDeleteCategories()}
                            >
                                削除する
                            </button>
                        </div>
                    </>
                )}
            </main>
        </>
    )
}