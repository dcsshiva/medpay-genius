/**
 * Re-reads biometric punches before attendance is counted (pure; see punches.test.js).
 *
 * The device pairs the first and last punch of each CALENDAR day, so a night shift
 * (IN ~20:00, OUT ~08:00 next morning) arrives as:
 *   night 1 starts   →  "A  20:09 –"        (lone evening punch, marked Absent)
 *   following days   →  "P  08:27 – 20:09"  (this morning's OUT of last night + tonight's IN)
 *   after last night →  "A  08:30 –"        (lone morning OUT)
 * and any day with only an IN punch is marked Absent.
 *
 * Rules (per staff member, records in date order):
 *  1. A lone evening punch (IN ≥ 17:00, no OUT) starts a night shift on that date: Present,
 *     IN = that punch, whatever the device status (A / P / WO).
 *  2. While a night is open, the next calendar day's first punch at or before 11:00 is that
 *     night's OUT — unless that day also has a daytime OUT (then it's an ordinary day).
 *     If that day's remaining punch is in the evening (≥ 17:00) it starts the next night.
 *     If nothing remains, the day is "off after night duty" (no deduction), unless the device
 *     recorded leave / holiday for it.
 *  3. Otherwise a day marked Absent that has an IN punch but no OUT is counted Present
 *     ("missing OUT punch").
 * Records keep every original field; changed ones get `punchNote`, and night shifts `night: true`.
 */
export const EVENING_MIN = 17 * 60;
export const MORNING_MAX_MIN = 11 * 60;

const toMin = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};
const nextDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
};

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdayOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

/**
 * normalizePunches(records, { weeklyOff }) — weeklyOff is the staff member's weekly-off day(s)
 * from Staff Master ('Wed', 'Sat,Sun', or '' = not set). When set, it replaces the device's
 * weekly offs (the export only ever marks Sat/Sun):
 *  4. on a weekly-off day, a day the device marked Absent with no punch is a weekly off;
 *  5. on any other day, a device weekly off is Absent when there's no punch, Present when there is.
 * Off-after-night days, leave and holidays are left alone.
 */
/*
 * opts.plan — the Shift Planner for this staff member ({ date: shiftCode }, 'WO' = planned day off).
 * A planned date decides on its own, before the weekly-off rules:
 *  6. planned 'WO': a day marked Absent with no punch is a weekly off;
 *  7. planned shift: a device weekly off is Present when punched, Absent when not.
 */
export const PLANNED_OFF = 'WO';
export function normalizePunches(records, opts = {}) {
  const paired = pairPunches(records);
  const offDays = new Set(String(opts.weeklyOff || '').split(',').map(s => s.trim()).filter(d => WEEKDAYS.includes(d)));
  const plan = opts.plan || {};
  const hasPlan = Object.keys(plan).length > 0;
  if (!offDays.size && !hasPlan) return paired;
  const offLabel = [...offDays].join(', ');
  return paired.map(rec => {
    if (rec.offAfterNight || rec.night) return rec;
    const punched = !!rec.in;
    const planned = plan[rec.date];
    if (planned) {
      if (planned === PLANNED_OFF && rec.status === 'A' && !punched) {
        return { ...rec, status: 'WO', punchNote: 'Weekly off (planned in Shift Planner)' };
      }
      if (planned !== PLANNED_OFF && rec.status === 'WO') {
        return punched
          ? { ...rec, status: 'P', punchNote: 'Present — Shift Planner has a shift on this day' }
          : { ...rec, status: 'A', punchNote: 'Absent — Shift Planner has a shift on this day, not a weekly off' };
      }
      return rec;
    }
    if (!offDays.size) return rec;
    const isOffDay = offDays.has(weekdayOf(rec.date));
    if (isOffDay && rec.status === 'A' && !punched) {
      return { ...rec, status: 'WO', punchNote: 'Weekly off (' + offLabel + ', set in Staff Master)' };
    }
    if (!isOffDay && rec.status === 'WO') {
      return punched
        ? { ...rec, status: 'P', punchNote: 'Present — weekly off is ' + offLabel + ', not ' + weekdayOf(rec.date) }
        : { ...rec, status: 'A', punchNote: 'Absent — the device marked a weekly off, but this staff member\'s weekly off is ' + offLabel };
    }
    return rec;
  });
}

/** { "<empNo>|<date>": code } (the Shift Planner) → { date: code } for one staff member */
export function planFor(roster, empNo) {
  const out = {};
  const prefix = empNo + '|';
  for (const k in roster || {}) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = roster[k];
  return out;
}

function pairPunches(records) {
  const sorted = [...(records || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const out = [];
  let openNight = null; // the output record of a night still waiting for its OUT

  for (const rec of sorted) {
    const inM = toMin(rec.in);
    const outM = toMin(rec.out);
    const keepsStatus = rec.status === 'CL' || rec.status === 'H';

    // 2. this morning's punch closes last night's shift
    if (openNight && rec.date === nextDay(openNight.date) && inM !== null && inM <= MORNING_MAX_MIN
        && (outM === null || outM >= EVENING_MIN) && !keepsStatus) {
      openNight.out = rec.in;
      openNight.punchNote = 'Night shift ' + openNight.in + ' → ' + rec.in + ' next morning';
      openNight = null;
      if (outM !== null) {
        // the evening punch starts tonight's night shift
        const night = { ...rec, status: 'P', in: rec.out, out: undefined, night: true,
          punchNote: 'Night shift from ' + rec.out + ' (OUT punch is next morning)' };
        out.push(night);
        openNight = night;
      } else {
        out.push({ ...rec, status: 'WO', in: undefined, out: undefined, offAfterNight: true,
          punchNote: 'Off after night duty (' + rec.in + ' was the OUT of the previous night)' });
      }
      continue;
    }
    if (openNight) {
      openNight.punchNote = 'Night shift from ' + openNight.in + ' (no OUT punch found next morning)';
      openNight = null;
    }

    // 1. a lone evening punch starts a night shift
    if (inM !== null && inM >= EVENING_MIN && outM === null && !keepsStatus) {
      const night = { ...rec, status: 'P', night: true, punchNote: 'Night shift from ' + rec.in + ' (OUT punch is next morning)' };
      out.push(night);
      openNight = night;
      continue;
    }

    // 3. a single IN punch marked Absent is a present day with a missing OUT punch
    if (rec.status === 'A' && inM !== null && outM === null) {
      out.push({ ...rec, status: 'P', punchNote: 'Missing OUT punch — counted present' });
      continue;
    }

    out.push(rec);
  }
  if (openNight) openNight.punchNote = 'Night shift from ' + openNight.in + ' (OUT punch not yet imported)';
  return out;
}

/** { empNo: { records } } → same shape with normalized records for the given staff
 *  ([{ empNo, weeklyOff }], for the calendar / charts); `roster` = the Shift Planner. */
export function normalizeAttendance(attendance, staff, roster) {
  const res = {};
  for (const s of staff) {
    const a = attendance[s.empNo];
    if (a) res[s.empNo] = { ...a, records: normalizePunches(a.records, { weeklyOff: s.weeklyOff, plan: planFor(roster, s.empNo) }) };
  }
  return res;
}

/**
 * Combines two records for the same staff member and date — e.g. one per unit, for staff who
 * punch on more than one unit's biometric device. Importing a second file must not erase the
 * first: Present in either file wins (then leave, holiday, weekly off, absent), IN is the
 * earliest punch and OUT the latest across both. Re-importing the same file changes nothing.
 */
const STATUS_RANK = { P: 5, CL: 4, H: 3, WO: 2, A: 1 };
export function mergeAttendanceRecord(existing, incoming) {
  if (!existing) return { ...incoming };
  const rank = (s) => STATUS_RANK[s] || 0;
  const status = rank(incoming.status) > rank(existing.status) ? incoming.status : existing.status;
  const times = [existing.in, existing.out, incoming.in, incoming.out].filter(t => toMin(t) !== null);
  const sorted = [...new Set(times)].sort((a, b) => toMin(a) - toMin(b));
  const merged = { ...existing, ...incoming, status };
  delete merged.in; delete merged.out;
  if (sorted.length) merged.in = sorted[0];
  if (sorted.length > 1) merged.out = sorted[sorted.length - 1];
  return merged;
}
