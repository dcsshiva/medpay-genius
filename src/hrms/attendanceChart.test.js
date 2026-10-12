import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendanceByUnit } from './attendanceChart.js';

const date = '2026-10-01';
const units = [{ code: 'U1', name: 'Unit 1' }, { code: 'U2', name: 'Unit 2' }];
const staff = [1, 2, 3, 4, 5, 6].map(n => ({ empNo: String(n), unitCode: n <= 4 ? 'U1' : 'U2' }));
const attendance = Object.fromEntries(['P', 'P', 'A', 'A', 'P', 'A'].map((status, i) => [String(i + 1), { records: [{ date, status }] }]));

test('combined unit contributions total 50%, not the sum of unit percentages', () => {
  const day = attendanceByUnit([date], staff, attendance, units).series[0];
  assert.equal(day.pct, 50);
  assert.equal(day.segments[0].contribution, 2 / 6 * 100);
  assert.equal(day.segments[1].contribution, 1 / 6 * 100);
});
test('weekly offs and holidays are excluded', () => {
  const data = { ...attendance, '3': { records: [{ date, status: 'WO' }] }, '4': { records: [{ date, status: 'H' }] } };
  const day = attendanceByUnit([date], staff, data, units).series[0];
  assert.equal(day.total, 4);
  assert.equal(day.pct, 75);
});
test('missing records do not count in the denominator', () => {
  const day = attendanceByUnit([date], staff, { ...attendance, '6': { records: [] } }, units).series[0];
  assert.equal(day.total, 5);
  assert.equal(day.pct, 60);
});
test('no records differs from recorded zero attendance', () => {
  const empty = attendanceByUnit([date], staff, {}, units).series[0];
  const absent = attendanceByUnit([date], staff, { '1': { records: [{ date, status: 'A' }] } }, units).series[0];
  assert.equal(empty.pct, null);
  assert.equal(absent.pct, 0);
});
test('selected unit uses only its staff and legend', () => {
  const result = attendanceByUnit([date], staff.filter(s => s.unitCode === 'U2'), attendance, units);
  assert.deepEqual(result.units, [units[1]]);
  assert.equal(result.series[0].total, 2);
  assert.equal(result.series[0].pct, 50);
});