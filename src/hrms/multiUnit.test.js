import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileUnit, multiUnitGaps, ranges, coverage, datesBetween } from './multiUnit.js';

const staff = [
  { empNo: 'a', name: 'NITHYA', unitCode: 'U1', multiUnit: true },
  { empNo: 'b', name: 'BASKAR', unitCode: 'U1', multiUnit: true },
  { empNo: 'c', name: 'ONE', unitCode: 'U1' },
  { empNo: 'd', name: 'TWO', unitCode: 'U1' },
  { empNo: 'e', name: 'THREE', unitCode: 'U1' },
  { empNo: 'f', name: 'FOUR', unitCode: 'U1' },
  { empNo: 'g', name: 'FIVE', unitCode: 'U2' },
];
const byCode = new Map(staff.map(s => [s.empNo, s]));

test('the unit of a file comes from its single-unit staff; multi-unit staff do not count', () => {
  assert.deepEqual(fileUnit(['a', 'b', 'c', 'd', 'e', 'f'], byCode), { unit: 'U1', counts: { U1: 4 } });
  assert.equal(fileUnit(['c', 'd', 'g'], byCode).unit, null);          // 2 vs 1: mixed file
  assert.equal(fileUnit(['c', 'd', 'e', 'f', 'g'], byCode).unit, 'U1'); // 80%
  assert.equal(fileUnit(['a', 'zz'], byCode).unit, null);
});

test('days to check: single daytime punch or absent, only for multi-unit staff and only in range', () => {
  const att = {
    a: { records: [
      { date: '2026-11-01', status: 'P', in: '09:02', out: '17:30' },
      { date: '2026-11-02', status: 'A', in: '09:05' },      // IN at one unit, OUT at the other not imported
      { date: '2026-11-03', status: 'A' },                   // worked at the other unit only?
      { date: '2026-11-04', status: 'A', in: '20:05' },      // night shift start: fine
      { date: '2026-11-05', status: 'WO' },
      { date: '2026-11-06', status: 'CL' },
      { date: '2026-11-09', status: 'A' },                   // out of range
    ] },
    b: { records: [{ date: '2026-11-02', status: 'P', in: '09:00', out: '18:00' }] },
    c: { records: [{ date: '2026-11-02', status: 'A' }] },   // single-unit staff: not this check
  };
  assert.deepEqual(multiUnitGaps(staff, att, '2026-11-01', '2026-11-08'),
    [{ empNo: 'a', name: 'NITHYA', single: ['2026-11-02'], absent: ['2026-11-03'] }]);
});

test('ranges and unit coverage from the import log', () => {
  assert.deepEqual(ranges(['2026-11-03', '2026-11-01', '2026-11-02', '2026-11-05']), [{ from: '2026-11-01', to: '2026-11-03' }, { from: '2026-11-05', to: '2026-11-05' }]);
  assert.equal(datesBetween('2026-10-30', '2026-11-02').length, 4);
  const log = [{ unit: 'U1', from: '2026-10-26', to: '2026-11-05' }, { unit: 'U2', from: '2026-10-26', to: '2026-10-31' }, { unit: null, from: '2026-11-01', to: '2026-11-05' }];
  assert.deepEqual(coverage(log, ['U1', 'U2'], '2026-10-28', '2026-11-05'), [
    { unit: 'U1', missing: [] },
    { unit: 'U2', missing: [{ from: '2026-11-01', to: '2026-11-05' }] },
  ]);
});
