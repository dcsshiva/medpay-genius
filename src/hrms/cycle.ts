import type { HrCycle } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoDate(new Date());
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const label = (d: Date) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** Pay cycle that ENDS in month `key` ('YYYY-MM'); cycles run startDay → startDay-1 of the next month. */
export function cycleForKey(key: string, startDay: number): HrCycle {
  const [y, m] = key.split('-').map(Number);
  const sd = Math.min(Math.max(Math.round(startDay || 1), 1), 28);
  const start = sd <= 1 ? new Date(y, m - 1, 1) : new Date(y, m - 2, sd);
  const end = sd <= 1 ? new Date(y, m, 0) : new Date(y, m - 1, sd - 1);
  const dates: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(isoDate(d));
  return {
    key,
    label: `${label(start)} - ${label(end)}`,
    start: isoDate(start),
    end: isoDate(end),
    dates,
    complete: isoDate(end) < todayISO(),
  };
}

/** Pay cycle containing the given ISO date. */
export function cycleContaining(date: string, startDay: number): HrCycle {
  const d = parse(date);
  let y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (startDay > 1 && d.getDate() >= startDay) { m += 1; if (m > 12) { m = 1; y += 1; } }
  return cycleForKey(`${y}-${pad(m)}`, startDay);
}

/** The last `count` cycles up to (and including) the current one, newest first — plus `extra` if outside. */
export function recentCycles(startDay: number, count = 12, extra?: HrCycle): HrCycle[] {
  const cur = cycleContaining(todayISO(), startDay);
  const [y, m] = cur.key.split('-').map(Number);
  const list: HrCycle[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(y, m - 1 - i, 1);
    list.push(cycleForKey(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`, startDay));
  }
  if (extra && !list.some(c => c.key === extra.key)) list.push(extra);
  return list.sort((a, b) => b.key.localeCompare(a.key));
}
