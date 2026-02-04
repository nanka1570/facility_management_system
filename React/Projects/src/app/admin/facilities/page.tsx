'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Categories() {
    const router = useRouter()
    const [facilities, setFacilities] = useState<any[]>([])
    const [name, setName] = useState('')
    const [categories, setCategories] = useState<any[]>([])
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const [maxCapacity, setMaxCapacity] = useState(0)
    const [isActive, setIsActive] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editMaxCapacity, setEditMaxCapacity] = useState(0)
    const [editIsActive, setEditIsActive] = useState(true)
    
    useEffect(() => {
        //ログインチェック
        const checkSession = async () => {
            const { data:{ session } } = await supabase.auth.getSession()
            if (!session){
                router.push('/')
            } 
        }
        //施設一覧をロード
        const loadFacilities = async () => {
            const {data, error} = await supabase
                    .from('facilities')
                    .select('*')
            
            if (data) {    
                setFacilities(data)
            }
        }
        //カテゴリ一覧をロード
        const loadCategories = async () => {
            const {data, error} = await supabase
                    .from('categories')
                    .select('*')
            
            if (data) {    
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
                name, 
                category_id: categoryId,
                max_capacity: maxCapacity, 
                is_active: isActive 
            })
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setName('')
            setMaxCapacity(0)
            setIsActive(true)
        }
    }

    //施設編集
    const handleEditStart = (facility: any) => {
        setEditingId(facility.id)   //施設IDをセット
        setEditName(facility.name)  //施設名をセット
        setEditMaxCapacity(facility.max_capacity)   //施設の最大人数をセット
        setEditIsActive(facility.is_active)     //施設の利用可否をセット
    }

    //カテゴリ更新
    const handleUpdateFacilities = async (facilityId: number) => {
        const { error } = await supabase
            .from('facilities')
            .update({ name: editName, max_capacity: editMaxCapacity })
            .eq('id', facilityId)
        if (!error){
            setEditingId(null)
            setRefreshKey(prev => prev + 1)
        }
    }

    //カテゴリ削除
    const handleDeleteFacilities = async (facilityId: number) => {
        const { error } = await supabase
            .from('facilities')
            .delete()
            .eq('id', facilityId)
        if (!error) {
            setRefreshKey(prev => prev + 1)
        }
    }
    return(
        <>
            <div>
                <Header />
                <main className="p-6">
                    <h1 className="text-2xl font-bold mb-6">施設管理</h1>
                    
                    {/* テーブル */}
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">ID</th>
                                    <th className="px-4 py-3 text-left">施設名</th>
                                    <th className="px-4 py-3 text-left">カテゴリ名</th>
                                    <th className="px-4 py-3 text-left">最大人数</th>
                                    <th className="px-4 py-3 text-left">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facilities.map((facility) => (
                                    <tr key={facility.id} className="border-t">
                                        <td className="px-4 py-3">{facility.id}</td>
                                        {editingId === facility.id ? (
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
                                                        value={categoryId}
                                                        onChange={(e) => setCategoryId(Number(e.target.value))}
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
                                                     onChange={(e) => setEditMaxCapacity(Number(e.target.value))}
                                                     className="border rounded px-2 py-1 w-20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                     type="checkbox" 
                                                     checked={editIsActive}
                                                     onChange={(e) => setEditIsActive(e.target.checked)}
                                                     className="border rounded px-2 py-1 w-20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                     onClick={() => setEditingId(null)}
                                                     className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                                                     >
                                                        キャンセル
                                                    </button>
                                                    <button
                                                     onClick={() => handleUpdateFacilities(facility.id)}
                                                     className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                                                     >
                                                        保存
                                                    </button>
                                                </td>
                                            </>
                                        ):(
                                            <>
                                                <td className="px-4 py-3">{facility.name}</td>
                                                <td className="px-4 py-3">{getCategoryName(facility.category_id)}</td>
                                                <td className="px-4 py-3">{facility.max_capacity}</td>
                                                <td className="px-4 py-3">{facility.is_active ? '有効' : '無効'}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                     onClick={() => handleEditStart(facility)}
                                                     className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500 mr-2"
                                                     >
                                                        編集
                                                    </button>
                                                    <button
                                                     onClick={() => handleDeleteFacilities(facility.id)}
                                                     className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
                                                     >
                                                        削除
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 新規登録フォーム */}
                    <div className="mt-6 bg-white rounded shadow p-4">
                        <h2 className="font-bold mb-4">新規登録</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="施設名"
                                className="border rounded px-3 py-2 flex-1"
                            />
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(Number(e.target.value))}
                                className="border rounded px-2 py-1 w-full"
                            >
                                <option value="">選択してください</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={maxCapacity}
                                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                                placeholder="表示順"
                                className="border rounded px-3 py-2 w-24"
                            />
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                placeholder="利用可否"
                                className="border rounded px-3 py-2 w-24"
                            />
                            <button
                             onClick={handleInsertFacilities}
                             className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                             >
                                追加
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}