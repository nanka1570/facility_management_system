'use client'

import { useState } from "react"

export default function Auth() {
    const [isLoginMode, setIsLoginMode] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
 
    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                    <h1 className="text2-xl font-bold text-center mb-6">
                        施設管理システム
                    </h1>

                    <div className="flex mb-6">
                        <button
                        className={`flex-1 py-2 ${isLoginMode ? 'bg-blue-500 text-white': 'bg-gray-200'}`}
                        onClick={() => setIsLoginMode(true)}
                        >
                            ログイン
                        </button>
                        <button
                        className={`flex-1 py-2 ${!isLoginMode ? 'bg-blue-500 text-white': 'bg-gray-200'}`}
                        onClick={() => setIsLoginMode(false)}>
                            新規登録
                        </button>
                    </div>

                        <div className="mb-4">
                            <label>メールアドレス</label>
                            <input
                             type="email"
                             value={email}

                             className="w-full p-2 border rounded"
                             />
                        </div>
                        <div className="mb-6">
                            <label>パスワード</label>
                            <input
                             type="password" 
                             value={password}

                             className="w-full p-2 border rounded"
                             />
                        </div>

                        <button>

                        </button>
                </div>

            </div>
        </>
    )
}