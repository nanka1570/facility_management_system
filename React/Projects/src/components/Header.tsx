'use client'

import { supabase } from "@/lib/supabase"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react";
import { ROLE } from "@/lib/constants";
import Link from "next/link";

export default function Header({ onMenuClick, homeHref='/dashboard' }: { onMenuClick?: () => void; homeHref?:string }) {
    // 画面遷移
    const router = useRouter()
    // パス
    const pathname = usePathname()
    // 管理者画面のパス
    const isAdminArea = pathname.startsWith('/admin')
    // 開発者かどうか
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect (() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: {session} } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // 開発者・管理者チェック
            const { data: authData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (authData?.role !== ROLE.USER) {
                setIsAdmin(true)
            }
        }
        init()
    }, [router])

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
