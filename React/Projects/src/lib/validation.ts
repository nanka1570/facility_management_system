// 空白かどうか
export const isNonEmpty = (v: string): boolean => v.trim() !== ''
// 正の整数かどうか
export const isPositiveInt = (v: string): boolean => {
    const n = Number(v.trim())
    return n > 0 && Number.isInteger(n)
}
