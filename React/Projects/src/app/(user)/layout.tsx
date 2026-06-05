'use client'

import { ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Header from "@/components/Header"
import UserSidebar from "@/components/UserSidebar"

export default function UserLayout({ children }: { children: ReactNode }) {

    const router = useRouter()
    useEffect(() => {
        const check = async () => {
            // ログインチェック
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }
        }
        check()
    }, [router])

    return (
        <>
            <div className="flex flex-col h-screen">
                <Header
                    homeHref="/dashboard"
                />
                <div className="flex flex-1 overflow-hidden">
                    <UserSidebar />
                    <main className="flex-1 overflow-auto bg-gray-100">
                        {children}
                    </main>
                </div>
            </div>
        </>
    )
}
