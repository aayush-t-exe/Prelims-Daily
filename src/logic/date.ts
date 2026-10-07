// All "days" in this app are LOCAL calendar dates as 'YYYY-MM-DD' strings.
// Using UTC would make an Indian user's day roll over at 5:30 AM, breaking streaks.

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, same format as toLocaleDateString('en-CA'), without relying on Intl. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse 'YYYY-MM-DD' as a pure calendar day (UTC midnight, so DST never shifts it). */
function toDayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whole calendar days from a to b (b - a). daysBetween('2026-10-06', '2026-10-07') === 1 */
export function daysBetween(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

/** The last 7 dates ending today, oldest first. */
export function lastNDays(today: string, n = 7): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** Days until Prelims (placeholder: 24 May of the target year). Never negative. */
export function daysToPrelims(today: string, targetYear: number): number {
  return Math.max(0, daysBetween(today, `${targetYear}-05-24`));
}
