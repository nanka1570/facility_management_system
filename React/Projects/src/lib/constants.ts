// 主要ボタン
export const BUTTON_PRIMARY = "inline-block bg-blue-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-blue-600 font-semibold cursor-pointer"
// 非破壊キャンセルボタン
export const BUTTON_SECONDARY = "inline-block bg-gray-200 text-gray-700 px-5 py-3 rounded-xl shadow-sm hover:bg-gray-300 font-semibold cursor-pointer"
// 破壊的キャンセルボタン
export const BUTTON_DANGER = "inline-block bg-red-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-red-600 font-semibold cursor-pointer"
// 復元・完了ボタン
export const BUTTON_SUCCESS = "inline-block bg-green-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-green-600 font-semibold cursor-pointer"

// カードスタイル
export const CARD = "bg-white rounded-xl shadow-sm"

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