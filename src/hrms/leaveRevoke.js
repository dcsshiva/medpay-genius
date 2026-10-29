/**
 * Withdrawing an approved Casual Leave / Permission request (pure; see leaveRevoke.test.js).
 *
 *  • Only requests dated in the running pay cycle or the one before (or later, for leave approved
 *    in advance) can be withdrawn; older ones are locked. The database repeats this rule
 *    (migration 0022) and also refuses dates in a finalized pay cycle.
 *  • Approving a CL marks the day CL and clears its punches; the day as it was is saved on the
 *    request (prevAttendance) so withdrawing puts it back. A Permission never touched attendance —
 *    once withdrawn it simply stops covering that day's lateness.
 */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d)); return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`; };

/** First day of the pay cycle containing `date` (cycles run startDay → startDay-1 of next month). */
export function cycleStartOf(date, startDay) {
  const sd = Math.min(Math.max(Math.round(startDay || 1), 1), 28);
  const [y, m, d] = date.split('-').map(Number);
  if (sd <= 1) return ymd(y, m, 1);
  return d >= sd ? ymd(y, m, sd) : ymd(y, m - 1, sd);
}

/** Earliest date that can still be withdrawn: the start of the previous pay cycle. */
export function revokeWindowStart(today, startDay) {
  const [y, m, d] = cycleStartOf(today, startDay).split('-').map(Number);
  return cycleStartOf(ymd(y, m, d - 1), startDay);
}

export function canRevoke(leave, { today, startDay }) {
  if (!leave || leave.status !== 'Approved') return { ok: false, reason: 'Only an approved request can be withdrawn.' };
  const from = revokeWindowStart(today, startDay);
  if (leave.date < from) return { ok: false, reason: `Only requests from ${from} (the previous pay cycle) onward can be withdrawn.`, from };
  return { ok: true, from };
}

/**
 * What to do with the attendance day when an approved CL is withdrawn.
 * current = the stored day now (null if none); prev = leave.prevAttendance
 * ({status,in,out,permMin} | {none:true} | undefined for requests approved before this was kept).
 * → { action: 'keep' | 'delete' | 'set', rec?, note }
 */
export function attendanceAfterRevoke(current, prev) {
  if (!current || current.status !== 'CL') {
    return { action: 'keep', note: current ? `Attendance left as it is (${current.status}) — the day is no longer marked CL.` : 'No attendance stored for that day.' };
  }
  if (prev && prev.none) return { action: 'delete', note: 'The day had no attendance before the leave was approved — cleared again.' };
  if (prev && prev.status && prev.status !== 'CL') {
    const rec = { status: prev.status };
    if (prev.in) rec.in = prev.in;
    if (prev.out) rec.out = prev.out;
    if (prev.permMin != null) rec.permMin = prev.permMin;
    return { action: 'set', rec, note: `Attendance put back as it was before approval (${prev.status}${prev.in ? ' ' + prev.in + (prev.out ? '–' + prev.out : '') : ''}).` };
  }
  return { action: 'set', rec: { status: 'A' }, note: 'The day before approval was not recorded, so it is now Absent. Re-import that day\'s device file to restore any punches.' };
}

/** The day as it is now, saved on the request when a CL is approved. */
export function snapshotDay(rec) {
  if (!rec) return { none: true };
  const out = { status: rec.status };
  if (rec.in) out.in = rec.in;
  if (rec.out) out.out = rec.out;
  if (rec.permMin != null) out.permMin = rec.permMin;
  return out;
}
