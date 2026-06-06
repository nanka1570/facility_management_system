'use client'

import { ReactNode, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ROLE } from "@/lib/constants"
import Header from "@/components/Header"
import AdminSidebar from "@/components/AdminSidebar"

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
            if (!authData || authData?.role === ROLE.USER) {
                router.push('/dashboard') 
            }
        }
        authCheck()

    }, [router])

    return (
        <>
            <div className="flex flex-col h-screen">
                <Header
                    onMenuClick={() => setIsMobileOpen(!isMobileOpen)}
                    homeHref="/admin/dashboard"
                />
                <div className="flex flex-1 overflow-hidden">
                    <AdminSidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)}/>
                    <main className="flex-1 overflow-auto bg-gray-100">
                        {children}
                    </main>
                </div>
            </div>
        </>
    )
}