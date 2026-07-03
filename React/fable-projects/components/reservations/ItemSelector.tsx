"use client";

import type { Item } from "@/types/database";

// U-03 予約モーダル内の備品選択（ITEM-03。M-ITEM 有効時のみ表示）
// 数量 0 = 借りない。上限は items.total_quantity
// （他予約との数量競合チェックは在庫管理 ITEM-04 = Phase3 のスコープ）
type Props = {
  items: Item[];
  // item_id → 数量（0 は未選択と同義）
  value: Map<number, number>;
  onChange: (next: Map<number, number>) => void;
  priceEnabled: boolean;
  disabled?: boolean;
};

export default function ItemSelector({
  items,
  value,
  onChange,
  priceEnabled,
  disabled = false,
}: Props) {
  if (items.length === 0) return null;

  const setQuantity = (itemId: number, quantity: number) => {
    const next = new Map(value);
    if (quantity === 0) {
      next.delete(itemId);
    } else {
      next.set(itemId, quantity);
    }
    onChange(next);
  };

  return (
    <div className="mb-4">
      <p className="mb-1 block text-sm font-medium">備品（任意）</p>
      <div className="space-y-1 rounded-md border border-gray-200 p-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="min-w-0 truncate">
              {item.name}
              {priceEnabled && item.rental_price !== null && (
                <span className="ml-1 text-xs text-gray-500">
                  （{item.rental_price.toLocaleString()}円/個）
                </span>
              )}
            </span>
            <select
              value={value.get(item.id) ?? 0}
              disabled={disabled}
              onChange={(e) => setQuantity(item.id, Number(e.target.value))}
              aria-label={`${item.name}の数量`}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              {Array.from({ length: item.total_quantity + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
