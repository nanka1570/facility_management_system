'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// ボタンのスタイル
import { BUTTON_PRIMARY, BUTTON_DANGER, BUTTON_SECONDARY } from "@/lib/constants"
import { Category, Facility } from "@/lib/types"

export default function Facilities() {
    const router = useRouter()
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [refreshKey, setRefreshKey] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    /*施設*/
    // 新規登録
    const [newName, setNewName] = useState('')
    const [newCategoryId, setNewCategoryId] = useState<number | null>(null)
    const [newMaxCapacity, setNewMaxCapacity] = useState('')
    const [newIsActive, setNewIsActive] = useState(true)
    // 編集
    const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
    const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editMaxCapacity, setEditMaxCapacity] = useState('')
    const [editIsActive, setEditIsActive] = useState(true)
    const [isEditClick, setIsEditClick] = useState(false)   //編集ボタンクリック
    // 削除
    const [isDeleteClick, setIsDeleteClick] = useState(false)   //削除ボタンクリック
    const [selectedCheckboxFacilityId, setSelectedCheckboxFacilityId] = useState<number[]>([])
    // フィルター
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null)

    useEffect(() => {
        //ログインチェック
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            }
        }
        //施設一覧をロード
        const loadFacilities = async () => {
            const { data, error } = await supabase
                .from('facilities')
                .select('*')
                .order('id', { ascending: true })

            if (error) {
                alert('施設一覧の取得に失敗しました')
            } else {
                setFacilities(data)
            }
        }
        //カテゴリ一覧をロード
        const loadCategories = async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')

            if (error) {
                alert('カテゴリ一覧の取得に失敗しました')
            } else {
                setCategories(data)
            }
        }
        checkSession()
        loadFacilities()
        loadCategories()
    }, [refreshKey])

    //カテゴリ名を取得
    const getCategoryName = (categoryId: number | null) => {
        if (!categoryId) return '未設定'    //無駄にこの関数を呼び出すことを抑制（勉強のため記載）
        const category = categories.find((cat) => cat.id === categoryId)
        return category ? category.name : '未設定'
    }

    //施設追加
    const handleInsertFacilities = async () => {
        const { error } = await supabase
            .from('facilities')
            .insert({
                name: newName,
                category_id: newCategoryId,
                max_capacity: Number(newMaxCapacity),
                is_active: newIsActive
            })
        if (error) {
            alert('施設の追加に失敗しました')
        } else {
            setRefreshKey(prev => prev + 1)
            setNewName('')
            setNewCategoryId(null)
            setNewMaxCapacity('')
            setNewIsActive(true)
            setIsModalOpen(false)
        }
    }

    //施設更新
    const handleUpdateFacilities = async () => {
        if (!selectedFacilityId) return

        const { error } = await supabase
            .from('facilities')
            .update({
                name: editName,
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
    }

    //施設削除（一括）
    const handleDeleteFacilities = async () => {
        // 削除対象の施設が予約に使われていないかチェック
        const { data: linkedReservations, error: checkError } = await supabase
            .from('reservations')
            .select('id')
            .in('facility_id', selectedCheckboxFacilityId)
            .eq('status', 'confirmed')
            .limit(1)

        if (checkError) {
            alert('予約の確認に失敗しました')
            return
        }

        if (linkedReservations && linkedReservations.length > 0) {
            alert('確定済みの予約がある施設は削除できません。先に予約をキャンセルしてください。')
            return
        }

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
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">施設管理</h1>
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

                {/* フィルター */}
                {/* カテゴリー */}
                <select
                 value={filterCategoryId ?? ''}
                 onChange={(e) => setFilterCategoryId(
                    e.target.value === '' ? null : Number(e.target.value)
                 )}
                 className="border rounded px-2 py-1"
                >
                    <option value="">すべて</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}

                </select>

                {/* テーブル */}
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {(isEditClick || isDeleteClick) && <th className="px-4 py-3"></th>}
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">施設名</th>
                                <th className="px-4 py-3 text-left">カテゴリ名</th>
                                <th className="px-4 py-3 text-left">最大人数</th>
                                <th className="px-4 py-3 text-left">利用可否</th>
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
                                    <tr key={facility.id} className="border-t">
                                        {/* 編集のラジオボタン */}
                                        {isEditClick && (
                                            <>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="radio"
                                                        name="editTarget"
                                                        checked={selectedFacilityId === facility.id}
                                                        onChange={() => {
                                                            setSelectedFacilityId(facility.id)
                                                            setEditName(facility.name)
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
                                                        onChange={() => {
                                                            if (selectedCheckboxFacilityId.includes(facility.id)) {
                                                                setSelectedCheckboxFacilityId(
                                                                    selectedCheckboxFacilityId.filter((id) => id !== facility.id)
                                                                )
                                                            } else {
                                                                setSelectedCheckboxFacilityId(
                                                                    [...selectedCheckboxFacilityId, facility.id]
                                                                )
                                                            }
                                                        }}
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
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={editCategoryId ?? ''}
                                                        onChange={(e) => setEditCategoryId(Number(e.target.value))}
                                                        className="border rounded px-2 py-1 w-full"
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
                                                        className="border rounded px-2 py-1 w-20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={editIsActive}
                                                        onChange={(e) => setEditIsActive(e.target.checked)}
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
                                className="bg-white rounded shadow p-6 w-125"
                                onClick={(e) => (e.stopPropagation())}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            施設名
                                        </label>
                                        <input
                                            className="border rounded px-2 py-1"
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="例： 大会議室"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label>
                                            カテゴリ
                                        </label>
                                        <select
                                            className="border rounded px-2 py-1"
                                            value={newCategoryId ?? ''}
                                            onChange={(e) => setNewCategoryId(Number(e.target.value))}
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
                                            className="border rounded px-2 py-1"
                                            type="number"
                                            value={newMaxCapacity}
                                            onChange={(e) => setNewMaxCapacity(e.target.value)}
                                            placeholder="例： 30"
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
                                onClick={() => handleDeleteFacilities()}
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