import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutesWorked, cycleWorked, fmtHours } from './workHours.js';

test('day and night shifts', () => {
  assert.equal(minutesWorked('09:02', '18:05'), 543);
  assert.equal(minutesWorked('20:05', '08:10'), 725);   // night: OUT next morning
  assert.equal(minutesWorked('08:13', '08:13'), 0);     // one punch read twice
  assert.equal(minutesWorked('08:13', ''), 0);
  assert.equal(minutesWorked('', '18:00'), 0);
});

test('pay-cycle total counts present days with both punches', () => {
  const rows = [
    { status: 'P', inTime: '09:00', outTime: '18:00' },
    { status: 'P', inTime: '20:00', outTime: '08:00' },
    { status: 'P', inTime: '09:10', outTime: '' },        // missing OUT
    { status: 'A' }, { status: 'WO' },
  ];
  assert.deepEqual(cycleWorked(rows), { minutes: 540 + 720, days: 2 });
  assert.equal(fmtHours(1260), '21h 00m');
  assert.equal(fmtHours(545), '9h 05m');
});
