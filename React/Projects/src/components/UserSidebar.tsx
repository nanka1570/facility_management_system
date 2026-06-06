'use client'

import { usePathname } from "next/navigation"
import { Home, CalendarDays, User } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { SIDEBAR_ICON, SIDEBAR_ITEM } from "@/lib/constants"

export default function UserSidebar() {
    // パス
    const pathname = usePathname()
    // サイドバーの折りたたみ
    const [isExpanded, setIsExpanded] = useState(true)
    // リンククラス
    const linkClass = `${SIDEBAR_ITEM} ${isExpanded ? '' : 'justify-center'}`

    return (
        <aside className={`hidden md:flex flex-col ${isExpanded ? 'w-56' : 'w-16'} bg-white shadow p-4`}>
            <div className="flex items-center justify-between font-bold mb-4">
                    <h2
                        className={isExpanded ? '' : 'md:hidden'}
                    >
                        ユーザーメニュー
                    </h2>
                    <button
                        className="hidden md:block cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? '◀' : '▶'}
                    </button>
                </div>
            <Link
                href="/dashboard"
                className={`${linkClass} ${pathname === '/dashboard' ? 'bg-blue-100' : ''}`}
            >
                <Home size={18} className={SIDEBAR_ICON} />
                {isExpanded && 'ホーム'}
            </Link>
            <Link
                href="/reservations"
                className={`${linkClass} ${pathname === '/reservations' ? 'bg-blue-100' : ''}`}
            >
                <CalendarDays size={18} className={SIDEBAR_ICON} />
                {isExpanded && '予約'}
            </Link>
            <Link
                href="/mypage"
                className={`${linkClass} mt-auto ${pathname === '/mypage' ? 'bg-blue-100' : ''}`}
            >
                <User size={18} className={SIDEBAR_ICON} />
                {isExpanded && 'マイページ'}
            </Link>
            
        </aside>
    )
}