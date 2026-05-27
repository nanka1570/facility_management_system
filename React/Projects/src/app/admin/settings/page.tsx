'use client'

import Header from "@/components/Header"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Settings() {
    
    // ログイン
    const router = useRouter()
    // 画面更新
    const [refreshKey, setRefreshKey] = useState(0)
    // モジュール設定一覧
    const [moduleSettings, setModuleSettings] = useState<any[]>([])
    // 固定モジュール
    const FIXED_MODULE_IDS = ['M-CORE', 'M-USER', 'M-FACILITY']

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            } else {
                // developer権限チェック
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                if (profileData?.role !== 'developer') {
                    alert('開発者のみアクセスできます')
                    router.push('/dashboard')
                    return
                } else {
                    // モジュール設定一覧をロード
                    const { data: moduleData, error: moduleError } = await supabase
                        .from('module_settings')
                        .select('*')
                        .order('id', { ascending: true })
                    if (moduleError) {
                        alert('モジュール設定値欄の取得に失敗しました')
                    } else {
                        setModuleSettings(moduleData)
                    }
                }
            }
        }
        checkSession()
    }, [refreshKey])

    const handleUpdateToggle = async (id: number, currentValue: boolean) => {
        const { error } = await supabase
            .from('module_settings')
            .update({ is_enabled: !currentValue })
            .eq('id', id)
        if (error) {
            alert('モジュール設定の更新に失敗しました')
        } else {
            setRefreshKey(prev => prev + 1)
        }
    }

    return (
        <>
            <div>
                <Header />
            </div>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                        モジュール設定
                    </h2>
                </div>
                <div className="bg-white rounded shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr className="border-t">
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">モジュール名</th>
                                <th className="px-4 py-3 text-left">状態</th>
                            </tr>
                        </thead>
                        <tbody>
                            {moduleSettings
                                .map((moduleSetting) => (
                                    <tr 
                                        key={moduleSetting.id}
                                        className="border-t"
                                    >
                                        <td className="px-4 py-3">
                                            {moduleSetting.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            {moduleSetting.module_id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="checkbox"
                                                checked={moduleSetting.is_enabled}
                                                onChange={() => handleUpdateToggle(moduleSetting.id, moduleSetting.is_enabled)}
                                                disabled={FIXED_MODULE_IDS.includes(moduleSetting.module_id)}
                                             />
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </>
    )
}