'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Header({ onMenuClick, homeHref='/dashboard' }: { onMenuClick?: () => void; homeHref?:string }) {
    // 画面遷移
    const router = useRouter()

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error){
            router.push('/')
        }
    }

    return(
        <header className="bg-white p-4 shadow flex justify-between">
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
            <div className="flex gap-4">
                <button
                    className="md:hidden cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    onClick={() => router.push('/reservations')}
                >
                    予約
                </button>
                <button
                    className="md:hidden cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    onClick={() => router.push('/mypage')}
                >
                    マイページ
                </button>
                <button 
                    className="cursor-pointer text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    onClick={() => handleLogout()}
                >
                ログアウト</button>
            </div>
        </header>
    )
}
