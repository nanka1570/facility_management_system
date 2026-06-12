// 日時ヘルパー（表示・計算はすべて Asia/Tokyo 基準）
//
// JST は UTC+9 固定（夏時間なし）のため、Date.UTC によるオフセット計算で
// サーバー（UTC）・ブラウザのどちらで実行しても同じ結果になる。
// `new Date("YYYY-MM-DD")` は UTC 深夜として解釈されるため使用禁止。
// 日時の生成・分解は必ずこのファイルのヘルパーを経由すること。

const JST_OFFSET_HOURS = 9;

// 営業時間（U-02 カレンダーの表示範囲）
export const BUSINESS_HOURS = { start: 9, end: 18 } as const;

// スロット開始時刻の一覧: 9, 10, ..., 17 の9スロット（終了上限 18:00）
export function getTimeSlots(): number[] {
  const slots: number[] = [];
  for (let h = BUSINESS_HOURS.start; h < BUSINESS_HOURS.end; h++) {
    slots.push(h);
  }
  return slots;
}

export type JstParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
  weekday: number; // 0=日曜
};

// JST の暦日時を指す Date を生成する
export function jstDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hours - JST_OFFSET_HOURS, minutes));
}

// Date / ISO文字列 を JST の暦日時パーツに分解する
export function getJstParts(value: Date | string): JstParts {
  const date = typeof value === "string" ? new Date(value) : value;
  const shifted = new Date(date.getTime() + JST_OFFSET_HOURS * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

// JST における「今日」の 0:00 を表す Date
export function jstToday(): Date {
  const p = getJstParts(new Date());
  return jstDate(p.year, p.month, p.day);
}

// JST 基準で日数を加算する（Date.UTC が月跨ぎを正規化する）
export function addDays(date: Date, days: number): Date {
  const p = getJstParts(date);
  return jstDate(p.year, p.month, p.day + days, p.hours, p.minutes);
}

// 当日 0:00（JST）〜翌日 0:00（JST）の ISO 範囲（日別データ取得の gte/lt 用）
export function getDayRangeISO(dayStart: Date): { startISO: string; endISO: string } {
  return {
    startISO: dayStart.toISOString(),
    endISO: addDays(dayStart, 1).toISOString(),
  };
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 2桁ゼロ埋め（"09:00" 等の時刻・日付表記用）
export const pad = (n: number) => String(n).padStart(2, "0");

// "2026年1月9日（金）"
export function formatJstDate(value: Date | string): string {
  const p = getJstParts(value);
  return `${p.year}年${p.month}月${p.day}日（${WEEKDAY_LABELS[p.weekday]}）`;
}

// "10:00"
export function formatJstTime(value: Date | string): string {
  const p = getJstParts(value);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

// "01/10"
export function formatJstMonthDay(value: Date | string): string {
  const p = getJstParts(value);
  return `${pad(p.month)}/${pad(p.day)}`;
}

// "01/10 10:00"（A-04 一覧等）
export function formatJstDateTime(value: Date | string): string {
  return `${formatJstMonthDay(value)} ${formatJstTime(value)}`;
}

// "2026/01/10"（U-04 履歴等）
export function formatJstFullDate(value: Date | string): string {
  const p = getJstParts(value);
  return `${p.year}/${pad(p.month)}/${pad(p.day)}`;
}

// <input type="datetime-local"> の値（JSTの暦日時）⇔ Date
export function toDatetimeLocal(value: Date | string): string {
  const p = getJstParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`;
}

export function fromDatetimeLocal(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return jstDate(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
}

// <input type="date"> の値（JSTの暦日）⇔ Date
export function toDateInput(value: Date | string): string {
  const p = getJstParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function fromDateInput(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return jstDate(Number(m[1]), Number(m[2]), Number(m[3]));
}
