// 料金計算（M-PRICE: PRICE-02 予約時料金表示 / M-EXTEND: EXT-05 延長料金計算）
//
// 施設料金 = ceil(利用分数 / time_unit) × price_per_unit
//   - time_unit（予約単位・分）に満たない端数は切り上げて課金する（設計判断: README 参照）
//   - 料金未設定（facility_prices に行が無い）は 0円 として扱う
// 備品料金 = Σ(数量 × 貸出時点の単価)
// 合計（reservation_prices.subtotal）= 施設料金 + 備品料金

export function calcFacilityCharge(params: {
  start: Date;
  end: Date;
  timeUnit: number;
  pricePerUnit: number;
}): number {
  const minutes = (params.end.getTime() - params.start.getTime()) / 60000;
  if (minutes <= 0) return 0;
  // time_unit が不正値（0以下）の場合は60分単位にフォールバック
  const unit = params.timeUnit > 0 ? params.timeUnit : 60;
  return Math.ceil(minutes / unit) * params.pricePerUnit;
}

export function calcItemsCharge(
  selections: { quantity: number; rentalPrice: number }[],
): number {
  return selections.reduce((sum, s) => sum + s.quantity * s.rentalPrice, 0);
}
