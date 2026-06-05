'use client'

import { usePathname } from "next/navigation"
import { Home, CalendarDays, User } from "lucide-react"
import Link from "next/link"

export default function UserSidebar() {
    const pathname = usePathname()
    const itemClass = "flex items-center gap-2 w-full px-3 py-2 rounded text-blue-500 hover:bg-gray-200 cursor-pointer"
    const iconClass = "shrink-0 text-gray-600"

    return (
        <aside className="hidden md:flex flex-col w-56 bg-white shadow p-4">
            <Link
                href="/dashboard"
                className={`${itemClass} ${pathname === '/dashboard' ? 'bg-blue-100' : ''}`}
            >
                <Home size={18} className={iconClass} />ホーム
            </Link>
            <Link
                href="/reservations"
                className={`${itemClass} ${pathname === '/reservations' ? 'bg-blue-100' : ''}`}
            >
                <CalendarDays size={18} className={iconClass} />予約
            </Link>
            <Link
                href="/mypage"
                className={`${itemClass} mt-auto ${pathname === '/mypage' ? 'bg-blue-100' : ''}`}
            >
                <User size={18} className={iconClass} />マイページ
            </Link>
            
        </aside>
    )
}