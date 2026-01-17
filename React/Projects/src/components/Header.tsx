'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Header() {
    const router = useRouter()

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error){
            router.push('/')
        }
    }

    return(
        <header className="bg-white p-4 shadow flex justify-between">
            <h1>
                施設管理システム
            </h1>
            <div className="flex gap-4">
                <button
                    className="text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    >
                    予約
                    </button>
                <button
                    className="text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    >
                    マイページ
                    </button>
                <button 
                    className="text-blue-500 px-3 py-1 rounded hover:text-blue-700 hover:bg-gray-200"
                    onClick={handleLogout}
                    >
                    ログアウト</button>
            </div>
        </header>
    )
}
