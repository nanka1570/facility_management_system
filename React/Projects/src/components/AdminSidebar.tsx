'use client'

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
// プロフィールのロール
import { ROLE } from "@/lib/constants"
// アイコン
import { LayoutDashboard, Building2, FolderTree, CalendarDays, Settings } from "lucide-react"
import Link from "next/link"

export default function AdminSidebar({ isMobileOpen }: { isMobileOpen: boolean }) {
    
    // 画面遷移
    const router = useRouter()
    // パス
    const pathname = usePathname()
    // サイドバーのスタイル
    const itemClass = "flex items-center gap-2 w-full px-3 py-2 rounded text-blue-500 hover:bg-gray-200 cursor-pointer"
    // アイコンのスタイル
    const iconClass = "shrink-0 text-gray-600"
    // 開発者かどうか
    const [isDeveloper, setIsDeveloper] = useState(false)
    // サイドバーの折りたたみ
    const [isExpanded, setIsExpanded] = useState(true)

    useEffect (() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: {session} } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // 開発者チェック
            const { data: authData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (authData?.role === ROLE.DEVELOPER) {
                setIsDeveloper(true)
            }
        }
        init()
    }, [router])

    return (
        <>
            <aside className={`${isMobileOpen ? 'block' : 'hidden'} md:block w-56 ${isExpanded ? '' : 'md:w-16'} bg-white shadow p-4`}>
                <div className="flex items-center justify-between font-bold mb-4">
                    <h2
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        管理メニュー
                    </h2>
                    <button
                        className="hidden md:block cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? '◀' : '▶'}
                    </button>
                </div>
                <Link
                    href={'/admin/dashboard'}
                    className={`${itemClass} ${pathname === '/admin/dashboard' ? 'bg-blue-100' : ''}`}
                >
                    <LayoutDashboard
                        size={18}
                        className={iconClass}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        ダッシュボード
                    </span>
                </Link>
                {/* 施設・予約グループ */}
                <p 
                    className={`text-gray-400 text-xs mt-4 mb-1 ${isExpanded ? '' : 'md:hidden'}`}
                >
                    施設・予約
                </p>
                <Link
                    href={'/admin/facilities'}
                    className={`${itemClass} ${pathname === '/admin/facilities' ? 'bg-blue-100' : ''}`}
                >
                    <Building2
                        size={18}
                        className={iconClass}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        施設管理
                    </span>
                </Link>
                <Link
                    href={'/admin/categories'}
                    className={`${itemClass} ${pathname === '/admin/categories' ? 'bg-blue-100' : ''}`}
                >
                    <FolderTree
                        size={18}
                        className={iconClass}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        カテゴリ管理
                    </span>
                </Link>
                <Link
                    href={'/admin/reservations'}
                    className={`${itemClass} ${pathname === '/admin/reservations' ? 'bg-blue-100' : ''}`}
                >
                    <CalendarDays
                        size={18}
                        className={iconClass}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        予約管理
                    </span>
                </Link>
                {/* システムグループ */}
                {isDeveloper && (
                    <div>
                        <p
                            className={`text-gray-400 text-xs mt-4 mb-1 ${isExpanded ? '' : 'md:hidden'}`}
                        >
                            システム
                        </p>
                        <Link
                            href={'/admin/settings'}
                            className={`${itemClass} ${pathname === '/admin/settings' ? 'bg-blue-100' : ''}`}
                        >
                            <Settings
                                size={18}
                                className={iconClass}
                            />
                            <span
                                className={isExpanded ? '' : 'md:hidden'}
                            >
                                モジュール設定                  
                            </span>
                        </Link>
                    </div>
                )}
            </aside>
        </>
    )
}