// チェックボックス
// if (selectedCheckboxCategoryId.includes(category.id)) {
//     setSelectedCheckboxCategoryId(
//         selectedCheckboxCategoryId.filter((id) => id !== category.id)
//     )
// } else {
//     setSelectedCheckboxCategoryId(
//         [...selectedCheckboxCategoryId, category.id]
//     )
// }
export const toggleId = (ids: number[], id: number): number[] => 
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]