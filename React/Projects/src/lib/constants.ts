// src/lib/constants.ts
export const BUTTON_PRIMARY = "inline-block bg-blue-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-blue-600 font-semibold cursor-pointer"
export const BUTTON_DANGER = "inline-block bg-red-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-red-600 font-semibold cursor-pointer"
export const BUTTON_SECONDARY = "inline-block bg-gray-200 text-gray-700 px-5 py-3 rounded-xl shadow-sm hover:bg-gray-300 font-semibold cursor-pointer"
export const BUTTON_SUCCESS = "inline-block bg-green-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-green-600 font-semibold cursor-pointer"

// 予約のステータス
export const RESERVATION_STATUS = {
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
} as const

// プロフィールのロール
export const ROLE = {
    USER: 'user',
    ADMIN: 'admin',
    DEVELOPER: 'developer',
} as const