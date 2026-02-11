'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Categories() {
    const router = useRouter()
    const [categories, setCategories] = useState<any[]>([])
    const [name, setName] = useState('')
    const [sortOrder, setSortOrder] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editSortOrder, setEditSortOrder] = useState(0)
    
    useEffect(() => {
        //ログインチェック
        const checkSession = async () => {
            const { data:{ session } } = await supabase.auth.getSession()
            if (!session){
                router.push('/')
            } 
        }
        //カテゴリ一覧を表示
        const loadCategories = async () => {
            const {data, error} = await supabase
                    .from('categories')
                    .select('*')
                    .order('sort_order', { ascending: true })
            
            if (data) {    
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
            .insert({ name, sort_order: sortOrder })
        if (!error) {
            setRefreshKey(prev => prev + 1)
            setName('')
            setSortOrder(0)
        }
    }

    //カテゴリ編集
    const handleEditStart = (category: any) => {
        setEditingId(category.id)   //カテゴリIDをセット
        setEditName(category.name)  //カテゴリ名をセット
        setEditSortOrder(category.sort_order)   //カテゴリ順をセット
    }

    //カテゴリ更新
    const handleUpdateCategories = async (categoryId: number) => {
        const { error } = await supabase
            .from('categories')
            .update({ name: editName, sort_order: editSortOrder })
            .eq('id', categoryId)
        if (!error){
            setEditingId(null)
            setRefreshKey(prev => prev + 1)
        }
    }

    //カテゴリ削除
    const handleDeleteCategories = async (categoryId: number) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId)
        if (!error) {
            setRefreshKey(prev => prev + 1)
        }
    }
    return(
        <>
            <div>
                <Header />
                <main className="p-6">
                    <h1 className="text-2xl font-bold mb-6">カテゴリ管理</h1>
                    
                    {/* テーブル */}
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">ID</th>
                                    <th className="px-4 py-3 text-left">カテゴリ名</th>
                                    <th className="px-4 py-3 text-left">表示順</th>
                                    <th className="px-4 py-3 text-left">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-t">
                                        <td className="px-4 py-3">{category.id}</td>
                                        {editingId === category.id ? (
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
                                                <td className="px-4 py-3">
                                                    <button
                                                     onClick={() => setEditingId(null)}
                                                     className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 mr-2"
                                                     >
                                                        キャンセル
                                                    </button>
                                                    <button
                                                     onClick={() => handleUpdateCategories(category.id)}
                                                     className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                                                     >
                                                        保存
                                                    </button>
                                                </td>
                                            </>
                                        ):(
                                            <>
                                                <td className="px-4 py-3">{category.name}</td>
                                                <td className="px-4 py-3">{category.sort_order}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                     onClick={() => handleEditStart(category)}
                                                     className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500 mr-2"
                                                     >
                                                        編集
                                                    </button>
                                                    <button
                                                     onClick={() => handleDeleteCategories(category.id)}
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
                                placeholder="カテゴリ名"
                                className="border rounded px-3 py-2 flex-1"
                            />
                            <input
                                type="number"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(Number(e.target.value))}
                                placeholder="表示順"
                                className="border rounded px-3 py-2 w-24"
                            />
                            <button
                             onClick={handleInsertCategories}
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