'use client'

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" //next.jsの画面遷移
import { useEffect } from "react"

export default function Dashboard() {
    const router = useRouter()

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error){
            router.push('/')
        }
    }

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
            }
            
        }
        checkSession()
    }, [])

    return (
        <>
            <div>ダッシュボード</div>
            <div>
                <p>こんにちは、ゲストさん</p>
                <button
                onClick={handleLogout}
                >ログアウト</button>
            </div>
        </>
    )
}