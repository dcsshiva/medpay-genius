import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayPlan, upcomingDays } from './staffToday.js';

const staff = { empNo: 'e1', shiftCode: 'S6', weeklyOff: 'Sun' };

test('addDays crosses month ends', () => {
  assert.equal(addDays('2026-11-29', 3), '2026-12-02');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('holiday, then approved leave, then the Shift Planner, then Staff Master', () => {
  const ctx = {
    roster: { 'e1|2026-11-17': 'S4', 'e1|2026-11-18': 'WO' },
    holidays: [{ date: '2026-11-19', name: 'Diwali' }, { date: '2026-11-20', name: 'Old', suspended: true }],
    leaves: [{ empNo: 'e1', date: '2026-11-21', type: 'CL', status: 'Approved' }, { empNo: 'e1', date: '2026-11-20', type: 'CL', status: 'Pending' },
      { empNo: 'e1', date: '2026-11-17', type: 'Permission', status: 'Approved' }],
  };
  const days = upcomingDays(staff, '2026-11-15', 7, ctx);
  assert.deepEqual(days.map(d => [d.date, d.kind, d.code || d.holiday || d.leaveType || '', d.planned]), [
    ['2026-11-16', 'shift', 'S6', false],      // Monday, nothing planned: usual shift
    ['2026-11-17', 'shift', 'S4', true],       // planned night shift (a permission does not change the day)
    ['2026-11-18', 'off', 'WO', true],         // planned week off
    ['2026-11-19', 'holiday', 'Diwali', true],
    ['2026-11-20', 'shift', 'S6', false],      // suspended holiday and pending leave do not count
    ['2026-11-21', 'leave', 'CL', true],
    ['2026-11-22', 'off', 'WO', false],        // Sunday: usual weekly off
  ]);
});

test('a week off set by the manager counts as off; no shift at all is "none"', () => {
  assert.equal(dayPlan(staff, '2026-11-16', { leaves: [{ empNo: 'e1', date: '2026-11-16', type: 'WO', status: 'Approved' }] }).kind, 'off');
  assert.equal(dayPlan({ empNo: 'x' }, '2026-11-16').kind, 'none');
});
