'use client'

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Header from "@/components/Header"
import UserSidebar from "@/components/UserSidebar"
import { ROLE } from "@/lib/constants"

export default function UserLayout({ children }: { children: ReactNode }) {

    // 画面遷移
    const router = useRouter()
    // 管理者・開発者
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const check = async () => {
            // ログインチェック
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
            // 管理者・開発者の場合
            if (authData && authData?.role !== ROLE.USER) {
                setIsAdmin(true)
            }
        }
        check()
    }, [router])

    return (
        <>
            <div className="flex flex-col h-screen">
                <Header
                    homeHref="/dashboard"
                    isAdmin={isAdmin}
                />
                <div className="flex flex-1 overflow-hidden">
                    <UserSidebar />
                    <main className="flex-1 overflow-auto bg-gray-100 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </>
    )
}
