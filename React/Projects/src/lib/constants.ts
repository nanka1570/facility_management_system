// 主要ボタン
export const BUTTON_PRIMARY = "inline-block bg-blue-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-blue-600 font-semibold cursor-pointer transition-colors duration-150"
// 非破壊キャンセルボタン
export const BUTTON_SECONDARY = "inline-block bg-gray-200 text-gray-700 px-5 py-3 rounded-xl shadow-sm hover:bg-gray-300 font-semibold cursor-pointer transition-colors duration-150"
// 破壊的キャンセルボタン
export const BUTTON_DANGER = "inline-block bg-red-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-red-600 font-semibold cursor-pointer transition-colors duration-150"
// 復元・完了ボタン
export const BUTTON_SUCCESS = "inline-block bg-green-500 text-white px-5 py-3 rounded-xl shadow-sm hover:bg-green-600 font-semibold cursor-pointer transition-colors duration-150"

// カードスタイル
export const CARD = "bg-white rounded-xl shadow-sm"
// フォームスタイル
export const INPUT = "border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-150"
// numberのスタイル
export const STAT_NUMBER = "text-3xl font-bold text-gray-800"
// サイドバースタイル
export const SIDEBAR_ITEM = "flex items-center gap-2 w-full px-3 py-2 rounded text-blue-500 hover:bg-gray-200 cursor-pointer transition-colors duration-150"
// サイドバーアイコンスタイル
export const SIDEBAR_ICON = "shrink-0 text-gray-600"

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