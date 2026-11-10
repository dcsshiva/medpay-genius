/**
 * Staff who punch on more than one unit's biometric device (pure; see multiUnit.test.js).
 *
 * Each unit's export carries only the punches made on that unit's device, and the import merges
 * them (earliest IN, latest OUT — mergeAttendanceRecord in ./punches.js). A day therefore looks
 * wrong for a multi-unit person until every unit's file for that day has been imported: a single
 * punch (IN at one unit, OUT at the other) or Absent (worked only at the other unit). This module
 * finds those days and which units' files are still missing for them.
 */
import { EVENING_MIN } from './punches.js';

const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? +m[1] * 60 + +m[2] : null; };
const pad = (n) => String(n).padStart(2, '0');
const nextDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
export const datesBetween = (from, to) => { const out = []; for (let d = from; d <= to; d = nextDay(d)) out.push(d); return out; };

/** The unit a device file belongs to: the unit most of its (single-unit) staff belong to. */
export function fileUnit(empNos, staffByCode) {
  const counts = {};
  for (const e of new Set(empNos)) {
    const s = staffByCode.get(e);
    if (!s || s.multiUnit || !s.unitCode) continue;
    counts[s.unitCode] = (counts[s.unitCode] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((n, [, c]) => n + c, 0);
  // a clear majority (70%+) names the unit; otherwise the file mixes units. Not higher: a unit's
  // device also records staff of the other unit who aren't marked multi-unit (Unit 2's file of
  // 8 Nov: 60 Unit 2 + 17 Unit 1 = 78%)
  const unit = ranked.length && ranked[0][1] >= 0.7 * total ? ranked[0][0] : null;
  return { unit, counts };
}

/**
 * Days to check for each multi-unit staff member between `from` and `to` (inclusive):
 *  single — an IN with no OUT (an evening IN is left out: that's the start of a night shift);
 *  absent — Absent with no punch.
 * Leave, holidays, weekly offs and days with no record are not flagged.
 * attendance: { empNo: { records: [{date,status,in,out}] } } (the merged, stored days)
 */
export function multiUnitGaps(staff, attendance, from, to) {
  const out = [];
  for (const s of staff) {
    if (!s.multiUnit) continue;
    const single = [], absent = [];
    for (const r of ((attendance[s.empNo] || {}).records || [])) {
      if (r.date < from || r.date > to) continue;
      const inM = toMin(r.in), outM = toMin(r.out);
      if (r.status === 'A' && inM === null) absent.push(r.date);
      else if ((r.status === 'P' || r.status === 'A') && inM !== null && outM === null && inM < EVENING_MIN) single.push(r.date);
    }
    if (single.length || absent.length) out.push({ empNo: s.empNo, name: s.name, single: single.sort(), absent: absent.sort() });
  }
  return out.sort((a, b) => (b.single.length + b.absent.length) - (a.single.length + a.absent.length) || a.name.localeCompare(b.name));
}

/** Consecutive dates → [{from, to}] */
export function ranges(dates) {
  const out = [];
  for (const d of [...new Set(dates)].sort()) {
    const last = out[out.length - 1];
    if (last && nextDay(last.to) === d) last.to = d; else out.push({ from: d, to: d });
  }
  return out;
}

/**
 * Which units' files have been imported for [from, to]: log = [{unit, from, to}] (one row per
 * import, unit null when the file mixed units). → [{ unit, missing: [{from,to}] }] for each unit.
 */
export function coverage(log, units, from, to) {
  const all = datesBetween(from, to);
  return units.map(unit => {
    const covered = new Set();
    for (const l of log || []) {
      if (l.unit !== unit) continue;
      for (const d of all) if (d >= l.from && d <= l.to) covered.add(d);
    }
    return { unit, missing: ranges(all.filter(d => !covered.has(d))) };
  });
}
