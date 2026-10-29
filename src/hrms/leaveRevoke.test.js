import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleStartOf, revokeWindowStart, canRevoke, attendanceAfterRevoke, snapshotDay } from './leaveRevoke.js';

test('pay cycle start for a 26th-to-25th cycle, across month and year ends', () => {
  assert.equal(cycleStartOf('2026-10-29', 26), '2026-10-26');
  assert.equal(cycleStartOf('2026-10-25', 26), '2026-09-26');
  assert.equal(cycleStartOf('2026-01-10', 26), '2025-12-26');
  assert.equal(cycleStartOf('2026-10-29', 1), '2026-10-01');
  assert.equal(cycleStartOf('2026-03-05', 31), '2026-02-28'); // start day is capped at 28, like the app's cycles
});

test('window = running cycle and the previous one', () => {
  assert.equal(revokeWindowStart('2026-10-29', 26), '2026-09-26');  // running 26 Oct–25 Nov, previous 26 Sep–25 Oct
  assert.equal(revokeWindowStart('2026-10-26', 26), '2026-09-26');
  assert.equal(revokeWindowStart('2026-10-25', 26), '2026-08-26');  // still in the 26 Sep–25 Oct cycle
  assert.equal(revokeWindowStart('2026-01-03', 1), '2025-12-01');
});

test('canRevoke: approved and inside the window only; leave approved in advance can be withdrawn', () => {
  const ctx = { today: '2026-10-29', startDay: 26 };
  assert.equal(canRevoke({ status: 'Approved', date: '2026-09-26' }, ctx).ok, true);
  assert.equal(canRevoke({ status: 'Approved', date: '2026-11-30' }, ctx).ok, true);
  const old = canRevoke({ status: 'Approved', date: '2026-09-25' }, ctx);
  assert.equal(old.ok, false); assert.match(old.reason, /2026-09-26/);
  assert.equal(canRevoke({ status: 'Pending', date: '2026-10-28' }, ctx).ok, false);
  assert.equal(canRevoke({ status: 'Revoked', date: '2026-10-28' }, ctx).ok, false);
});

test('withdrawing a CL puts the day back as it was', () => {
  const cl = { status: 'CL' };
  assert.deepEqual(attendanceAfterRevoke(cl, { status: 'P', in: '08:58', out: '17:02' }), { action: 'set', rec: { status: 'P', in: '08:58', out: '17:02' }, note: 'Attendance put back as it was before approval (P 08:58–17:02).' });
  assert.deepEqual(attendanceAfterRevoke(cl, { status: 'A' }).rec, { status: 'A' });
  assert.equal(attendanceAfterRevoke(cl, { none: true }).action, 'delete');        // approved in advance, no day stored then
  const legacy = attendanceAfterRevoke(cl, undefined);                             // approved before this was saved
  assert.deepEqual(legacy.rec, { status: 'A' }); assert.match(legacy.note, /Re-import/);
  assert.equal(attendanceAfterRevoke({ status: 'P', in: '09:00' }, { status: 'A' }).action, 'keep'); // a later import already changed it
  assert.equal(attendanceAfterRevoke(null, { status: 'A' }).action, 'keep');
});

test('snapshot of the day at approval', () => {
  assert.deepEqual(snapshotDay(null), { none: true });
  assert.deepEqual(snapshotDay({ date: 'x', status: 'A', in: '09:04' }), { status: 'A', in: '09:04' });
  assert.deepEqual(snapshotDay({ status: 'P', in: '08:00', out: '15:00', permMin: 0 }), { status: 'P', in: '08:00', out: '15:00', permMin: 0 });
});
