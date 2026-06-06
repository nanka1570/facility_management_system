'use client'

import { usePathname, } from "next/navigation"
import { useState } from "react"
// アイコン
import { LayoutDashboard, Building2, FolderTree, CalendarDays, Settings } from "lucide-react"
import Link from "next/link"
import { SIDEBAR_ICON, SIDEBAR_ITEM } from "@/lib/constants"

export default function AdminSidebar({ isMobileOpen, onClose, isDeveloper }: { isMobileOpen: boolean; onClose: () => void, isDeveloper?: boolean }) {
    
    // パス
    const pathname = usePathname()
    // サイドバーの折りたたみ
    const [isExpanded, setIsExpanded] = useState(true)
    // リンククラス
    const linkClass = `${SIDEBAR_ITEM} ${isExpanded ? '' : 'justify-center'}`

    return (
        <>
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => onClose()}
                />
            )}
            <aside className={`${isMobileOpen ? 'block' : 'hidden'}
                             md:block fixed inset-y-0 left-0 z-40 md:static md:z-auto w-56 
                             ${isExpanded ? '' : 'md:w-16'} bg-white shadow p-4 `}>
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
                    className={`${linkClass} ${pathname === '/admin/dashboard' ? 'bg-blue-100' : ''}`}
                    onClick={() => onClose()}
                >
                    <LayoutDashboard
                        size={18}
                        className={SIDEBAR_ICON}
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
                    className={`${linkClass} ${pathname === '/admin/facilities' ? 'bg-blue-100' : ''}`}
                    onClick={() => onClose()}
                >
                    <Building2
                        size={18}
                        className={SIDEBAR_ICON}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        施設管理
                    </span>
                </Link>
                <Link
                    href={'/admin/categories'}
                    className={`${linkClass} ${pathname === '/admin/categories' ? 'bg-blue-100' : ''}`}
                    onClick={() => onClose()}
                >
                    <FolderTree
                        size={18}
                        className={SIDEBAR_ICON}
                    />
                    <span
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        カテゴリ管理
                    </span>
                </Link>
                <Link
                    href={'/admin/reservations'}
                    className={`${linkClass} ${pathname === '/admin/reservations' ? 'bg-blue-100' : ''}`}
                    onClick={() => onClose()}
                >
                    <CalendarDays
                        size={18}
                        className={SIDEBAR_ICON}
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
                            className={`${linkClass} ${pathname === '/admin/settings' ? 'bg-blue-100' : ''}`}
                            onClick={() => onClose()}
                        >
                            <Settings
                                size={18}
                                className={SIDEBAR_ICON}
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