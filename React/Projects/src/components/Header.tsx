'use client'

import { supabase } from "@/lib/supabase"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link";

export default function Header({ onMenuClick, homeHref='/dashboard', isAdmin=false }: { onMenuClick?: () => void; homeHref?:string; isAdmin?:boolean }) {
    
    // 画面遷移
    const router = useRouter()
    // パス
    const pathname = usePathname()
    // 管理者画面のパス
    const isAdminArea = pathname.startsWith('/admin')

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error){
            router.push('/')
        }
    }

    return(
        <header className="bg-white p-4 shadow flex justify-between items-center">
            <div className="flex items-center gap-3">
                {onMenuClick && (
                    <button
                        onClick={() => onMenuClick()}
                        className="md:hidden cursor-pointer p-2 rounded hover:bg-gray-200 text-xl"
                    >
                        ☰
                    </button>
                )}
                <h1
                    onClick={() => router.push(homeHref)}
                    className="cursor-pointer"
                >
                    施設管理システム
                </h1>
            </div>
            <div className="flex items-center gap-4">
                {!isAdminArea &&
                    <>
                        <Link
                            className="md:hidden cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                            href={'/reservations'}
                        >
                            予約
                        </Link>
                        <Link
                            className="md:hidden cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                            href={'/mypage'}
                        >
                            マイページ
                        </Link>
                    </>
                }
                <Link
                    className={`${isAdmin ? '' : 'hidden'} cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200`}
                    href={isAdminArea ? '/dashboard' : '/admin/dashboard'}
                >
                    {isAdminArea ? 'ユーザー画面へ' : '管理者画面へ'}
                </Link>
                <button 
                    className="cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    onClick={() => handleLogout()}
                >
                    ログアウト
                </button>
            </div>
        </header>
    )
}
