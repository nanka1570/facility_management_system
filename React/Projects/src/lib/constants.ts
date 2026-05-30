// src/lib/constants.ts
export const BUTTON_PRIMARY = "bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
export const BUTTON_DANGER = "bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
export const BUTTON_SECONDARY = "bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
export const BUTTON_SUCCESS = "bg-green-400 text-white px-4 py-2 rounded hover:bg-green-500"

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