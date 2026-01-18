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
    
    useEffect(() => {
        const checkSession = async () => {
            const { data:{ session } } = await supabase.auth.getSession()
            if (!session){
                router.push('/')
            } 
        }
        const loadCategories = async () => {
            const {data, error} = await supabase
                    .from('categories')
                    .select('*')
                    .order('sort_order', { ascending: true })
            
            if (data) {    
                setCategories(data)
            }
               console.log(data);
        }
        checkSession()
        loadCategories()
    }, [refreshKey])
    
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

    const handleUpdateCategories = async (categoryId: number) => {
        const { error } = await supabase
            .from('cagtegories')
            .update({ name: name, sort_order: sortOrder })
            .eq('id', categoryId)
    }

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
                <main>
                    <div>
                        カテゴリ管理
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>カテゴリ名</th>
                                <th>表示順</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr key={category.id}>
                                    <td>{category.id}</td>
                                    <td>{category.name}</td>
                                    <td>{category.sort_order}</td>
                                    <td>
                                        <button
                                         onClick={() => handleUpdateCategories(category.id)}>編集</button>
                                        <button
                                         onClick={() => handleDeleteCategories(category.id)}>削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="カテゴリ名"
                    />
                    <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        placeholder="表示順"
                    />
                    <button
                     onClick={handleInsertCategories}>
                        追加
                    </button>
                </main>
            </div>
        </>
    )
}