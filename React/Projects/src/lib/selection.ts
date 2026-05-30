// チェックボックス
// idが配列にあれば外す、なければ足す（チェックボックスのON/OFF切替）
export const toggleId = (ids: number[], id: number): number[] => 
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]