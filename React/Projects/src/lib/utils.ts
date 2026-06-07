// 予約のステータス
import { RESERVATION_STATUS } from "@/lib/constants"

// 日時をフォーマットする関数
export const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

// 時間をフォーマットする関数
export const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ja-JP', { 
        hour: '2-digit',
        minute: '2-digit'
    })

// timeをdatetime-localに変換する関数
export const formatDateTimeLocal = (time: string) => {
        const timeLocal = new Date(time)
        return (
            (timeLocal.getFullYear())
            + '-' +
            ((timeLocal.getMonth() + 1).toString().padStart(2, '0'))
            + '-' +
            (timeLocal.getDate().toString().padStart(2, '0'))
            + 'T' +
            (timeLocal.getHours().toString().padStart(2, '0'))
            + ':' +
            (timeLocal.getMinutes().toString().padStart(2, '0'))
        )
    }

// ステータスを日本語に直す関数
export const getStatusLabel = (status: string) => {
        const statusMap: { [key: string]: string } = {
            [RESERVATION_STATUS.CONFIRMED]: '確定',
            [RESERVATION_STATUS.CANCELLED]: 'キャンセル',
            [RESERVATION_STATUS.COMPLETED]: '完了'
        }
        return statusMap[status] || status
    }
