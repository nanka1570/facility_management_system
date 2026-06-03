'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
// プロフィールのロール
import { ROLE } from "@/lib/constants"

export default function Sidebar() {
    
    // 画面遷移
    const router = useRouter()
    // サイドバーのスタイル1
    const itemClass = "block w-full text-left px-3 py-2 rounded text-blue-500 hover:bg-gray-200 cursor-pointer"
    // 開発者かどうか
    const [isDeveloper, setIsDeveloper] = useState(false)

    useEffect (() => {
        // 初期処理
        const init = async () => {
            // ログインチェック
            const { data: {session} } = await supabase.auth.getSession()
            if (!session) {
                router.push('/')
                return
            }

            // 権限チェック
            const { data: authCheckData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            if (authCheckData?.role === ROLE.USER) {
                alert('管理者と開発者のみアクセスできます')
                router.push('/dashboard')
                return
            }
            if (authCheckData?.role === ROLE.DEVELOPER) {
                setIsDeveloper(true)
            }
        }
        init()
    }, [router])

    return (
        <>
            <aside className="w-56 bg-white shadow min-h-screen p-4">
                <h2 className="font-bold mb-4">管理メニュー</h2>
                <button
                    className={itemClass}
                    onClick={() => router.push('/admin/dashboard')}
                >
                    ダッシュボード
                </button>
                {/* 施設・予約グループ */}
                <p className="text-gray-400 text-xs mt-4 mb-1">施設・予約</p>
                <Link
                    href={'/admin/facilities'}
                    className={itemClass}
                >
                    施設管理
                </Link>
                <Link
                    href={'/admin/categories'}
                    className={itemClass}
                >
                    カテゴリ管理
                </Link>
                <Link
                    href={'/admin/reservations'}
                    className={itemClass}
                >
                    予約管理
                </Link>
                {}
                {/* システムグループ */}
                {isDeveloper ?  (
                    <>
                        <p className="text-gray-400 text-xs mt-4 mb-1">システム</p>
                        <Link
                            href={'/admin/settings'}
                            className={itemClass}
                        >
                            モジュール設定
                        </Link>
                    </>
                ) : (
                    <p></p>
                ) }
            </aside>
        </>
    )
}