'use client'

import { ReactNode, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ROLE } from "@/lib/constants"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter()
    // ハンバーガーメニュー（サイドバー）開閉
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    useEffect(() => {
        // 権限チェック
        const authCheck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { 
                router.push('/')
                return
            }
            const { data: authData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            // 管理者・開発者以外（ユーザー）を弾く
            if (authData?.role === ROLE.USER) {
                router.push('/dashboard') 
            }
        }
        authCheck()

    }, [router])

    return (
        <>
            <Header onMenuClick={() => setIsMobileOpen(!isMobileOpen)}/>
            <div className="flex">
                <Sidebar isMobileOpen={isMobileOpen}/>
                <main className="flex-1">{children}</main>
            </div>
        </>
    )
}