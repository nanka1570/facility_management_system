'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
        setMessage('')

        if (isLoginMode) {
            // ログイン
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if ( error ){
                setMessage('ログインに失敗しました: ' + error.message)
            }
        }else{
            //新規登録
            const { error } = await supabase.auth.signUp({
                email,
                password,
            })
            if (error) {
                setMessage('登録に失敗しました: ' + error.message)
            } else {
             setMessage('確認メールを送信しました。メールをご確認ください。')
            }
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6">
                    施設管理システム
                </h1>

                <div className="flex mb-6">
                    <button
                    className = {`flex-1 py-2 ${isLoginMode ? 'bg-blue-500 text-white': 'bg-gray-200'}`}
                    onClick={() => setIsLoginMode(true)}
                    >
                        ログイン
                    </button>
                    <button
                    className = {`flex-1 py-2 ${!isLoginMode ? 'bg-blue-500 text-white': 'bg-gray-200'}`}
                    onClick={() => setIsLoginMode(false)}
                    >
                        新規登録
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">メールアドレス</label>
                        <input
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full p-2 border rounded"
                         required 
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">パスワード</label>
                        <input
                         type="password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full p-2 border rounded"
                         minLength={6}
                         required 
                        />
                    </div>

                    <button
                     type="submit"
                     disabled={loading}
                     className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                     >
                        {loading ? '処理中...' : isLoginMode ? 'ログイン' : '登録'}
                     </button>
                </form>

                {message && (
                    <p className="mt-4 text-center text-sm text-red-500">{message}</p>
                )}
            </div>
        </div>
    )
}