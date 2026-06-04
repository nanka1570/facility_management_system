'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
// プロフィールのロール
import { ROLE } from "@/lib/constants"
// アイコン
import { LayoutDashboard, Building2, FolderTree, CalendarDays, Settings } from "lucide-react"
export default function Sidebar() {
    
    // 画面遷移
    const router = useRouter()
    // サイドバーのスタイル
    const itemClass = "flex items-center gap-2 w-full px-3 py-2 rounded text-blue-500 hover:bg-gray-200 cursor-pointer"
    // アイコンのスタイル
    const iconClass = "shrink-0 text-gray-600"
    // 開発者かどうか
    const [isDeveloper, setIsDeveloper] = useState(false)
    // サイドバーの開閉
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    useEffect (() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: {session} } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // 権限チェック
            const { data: authCheckData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (authCheckData?.role === ROLE.USER) {
                alert('管理者と開発者のみアクセスできます')
                router.push('/dashboard')
                return
            }
            if (authCheckData?.role === ROLE.DEVELOPER) {
                setIsDeveloper(true)
            }
        }
        init()
    }, [router])

    return (
        <>
            <aside className={`${isSidebarOpen ? 'w-56' : 'w-16'} bg-white shadow min-h-screen p-4`}>
                <div className="flex items-center justify-between font-bold mb-4">
                    {isSidebarOpen &&
                        <h2>管理メニュー</h2>}
                    <button
                        className="cursor-pointer"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? '◀' : '▶'}
                    </button>
                </div>
                <Link
                    href={'/admin/dashboard'}
                    className={itemClass}
                >
                    <LayoutDashboard
                        size={18}
                        className={iconClass}
                    />
                    {isSidebarOpen && 'ダッシュボード'}
                </Link>
                {/* 施設・予約グループ */}
                {isSidebarOpen &&
                    <p className="text-gray-400 text-xs mt-4 mb-1">施設・予約</p>}
                <Link
                    href={'/admin/facilities'}
                    className={itemClass}
                >
                    <Building2
                        size={18}
                        className={iconClass}
                    />
                    {isSidebarOpen && '施設管理'}
                </Link>
                <Link
                    href={'/admin/categories'}
                    className={itemClass}
                >
                    <FolderTree
                        size={18}
                        className={iconClass}
                    />
                    {isSidebarOpen && 'カテゴリ管理'}
                </Link>
                <Link
                    href={'/admin/reservations'}
                    className={itemClass}
                >
                    <CalendarDays
                        size={18}
                        className={iconClass}
                    />
                    {isSidebarOpen && '予約管理'}
                </Link>
                {/* システムグループ */}
                {isDeveloper && (
                    <div>
                        {isSidebarOpen &&
                            <p className="text-gray-400 text-xs mt-4 mb-1">システム</p>}
                        <Link
                            href={'/admin/settings'}
                            className={itemClass}
                        >
                            <Settings
                                size={18}
                                className={iconClass}
                            />
                            {isSidebarOpen && 'モジュール設定'}
                        </Link>
                    </div>
                )}
            </aside>
        </>
    )
}
