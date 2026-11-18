/**
 * Hours worked (pure; see workHours.test.js): IN to OUT of each present day, a night shift running past
 * midnight included (OUT earlier than IN = next morning). Days with only one punch add nothing.
 */
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? +m[1] * 60 + +m[2] : null; };

export function minutesWorked(inTime, outTime) {
  const a = toMin(inTime), b = toMin(outTime);
  if (a === null || b === null || a === b) return 0;
  return b > a ? b - a : b + 1440 - a;
}

/** rows: the pay-cycle rows ({ status, inTime, outTime }) → { minutes, days } (present days with both punches) */
export function cycleWorked(rows) {
  let minutes = 0, days = 0;
  for (const r of rows || []) {
    if (r.status !== 'P') continue;
    const m = minutesWorked(r.inTime, r.outTime);
    if (m > 0) { minutes += m; days++; }
  }
  return { minutes, days };
}

/** 545 → "9h 05m" */
export function fmtHours(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}
