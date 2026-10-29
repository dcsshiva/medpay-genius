import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePunches, normalizeAttendance } from './punches.js';

const r = (date, status, inT, outT) => ({ date, status, ...(inT ? { in: inT } : {}), ...(outT ? { out: outT } : {}) });
const brief = (list) => list.map(x => `${x.date.slice(8)} ${x.status} ${x.in || '-'}-${x.out || '-'}`);

test('night stretch: lone evening punch, then morning-OUT + evening-IN days, then a lone morning OUT (Agalya, 19–22 Oct)', () => {
  const got = normalizePunches([
    r('2026-10-18', 'P', '08:05', '15:12'),
    r('2026-10-19', 'A', '20:09'),
    r('2026-10-20', 'P', '08:27', '20:09'),
    r('2026-10-21', 'P', '08:50', '20:01'),
    r('2026-10-22', 'A', '08:34'),
  ]);
  assert.deepEqual(brief(got), [
    '18 P 08:05-15:12',          // ordinary day shift, untouched
    '19 P 20:09-08:27',          // night 1: was Absent
    '20 P 20:09-08:50',          // night 2
    '21 P 20:01-08:34',          // night 3
    '22 WO ---',                 // only the OUT of night 3: off after night duty, no deduction
  ]);
  assert.ok(got[1].night && got[2].night && got[3].night);
  assert.ok(got[4].offAfterNight);
  assert.match(got[1].punchNote, /Night shift 20:09 → 08:27/);
});

test('a night can start on a weekly-off day (Siva, 18 Oct)', () => {
  const got = normalizePunches([r('2026-10-18', 'WO', '20:02'), r('2026-10-19', 'P', '08:18', '19:55')]);
  assert.deepEqual(brief(got), ['18 P 20:02-08:18', '19 P 19:55--']);
  assert.match(got[1].punchNote, /OUT punch not yet imported/);
});

test('no morning punch next day: the night stays present with a note; a daytime single punch is present (Salath, 8–9 Oct)', () => {
  const got = normalizePunches([r('2026-10-08', 'A', '19:59'), r('2026-10-09', 'A', '13:01')]);
  assert.deepEqual(brief(got), ['08 P 19:59--', '09 P 13:01--']);
  assert.match(got[0].punchNote, /no OUT punch found/);
  assert.match(got[1].punchNote, /Missing OUT punch/);
});

test('ordinary days are untouched: day, afternoon and 12-hour day shifts without a preceding lone evening punch', () => {
  const recs = [r('2026-10-05', 'P', '13:00', '20:37'), r('2026-10-06', 'P', '08:27', '20:09'), r('2026-10-07', 'P', '07:54', '15:08'), r('2026-10-08', 'A')];
  assert.deepEqual(normalizePunches(recs), recs);
});

test('the morning after a night is an ordinary day when it has a daytime OUT punch', () => {
  const got = normalizePunches([r('2026-10-10', 'A', '20:05'), r('2026-10-11', 'P', '08:00', '15:00')]);
  assert.deepEqual(brief(got), ['10 P 20:05--', '11 P 08:00-15:00']);
});

test('leave and holidays are never re-read, and a gap of more than one day closes the night', () => {
  const got = normalizePunches([r('2026-10-10', 'A', '20:05'), r('2026-10-11', 'CL', '08:00'), r('2026-10-13', 'A', '20:00'), r('2026-10-15', 'A', '08:10')]);
  assert.deepEqual(brief(got), ['10 P 20:05--', '11 CL 08:00--', '13 P 20:00--', '15 P 08:10--']);
});

test('works across a month boundary and on unsorted input', () => {
  const got = normalizePunches([r('2026-11-01', 'P', '08:20', '20:05'), r('2026-10-31', 'A', '20:01')]);
  assert.deepEqual(brief(got), ['31 P 20:01-08:20', '01 P 20:05--']);
});

test('normalizeAttendance keeps the { empNo: { records } } shape for the listed staff only', () => {
  const att = { a: { primaryShift: 'S1', records: [r('2026-10-01', 'A', '09:05')] }, b: { records: [] } };
  const got = normalizeAttendance(att, [{ empNo: 'a' }]);
  assert.deepEqual(Object.keys(got), ['a']);
  assert.equal(got.a.primaryShift, 'S1');
  assert.equal(got.a.records[0].status, 'P');
  assert.equal(att.a.records[0].status, 'A'); // input not mutated
});

test('weekly off set in Staff Master replaces the device weekly offs (21 Oct = Wed, 18/25 Oct = Sun)', () => {
  const recs = [
    r('2026-10-18', 'WO'),             // device Sunday off, no punch  -> Absent (her off day is Wed)
    r('2026-10-21', 'A'),              // Wed, no punch                 -> weekly off
    r('2026-10-22', 'A'),              // Thu, no punch                 -> stays Absent
    r('2026-10-25', 'WO', '08:02', '15:00'), // device Sunday off, but she worked -> Present
    r('2026-10-28', 'P', '08:00', '15:00'),  // worked on her weekly off  -> stays Present
  ];
  const got = normalizePunches(recs, { weeklyOff: 'Wed' });
  assert.deepEqual(got.map(x => x.status), ['A', 'WO', 'A', 'P', 'P']);
  assert.match(got[0].punchNote, /weekly off is Wed/);
  assert.match(got[1].punchNote, /Weekly off \(Wed/);
});

test('without a weekly off set, the device weekly offs are used as they are', () => {
  const recs = [r('2026-10-18', 'WO'), r('2026-10-21', 'A')];
  assert.deepEqual(normalizePunches(recs), recs);
  assert.deepEqual(normalizePunches(recs, { weeklyOff: '' }), recs);
});

test('weekly off never touches night shifts, the day off after a night, leave or holidays', () => {
  const got = normalizePunches([
    r('2026-10-17', 'A', '20:05'),   // Sat night starts
    r('2026-10-18', 'WO', '08:10'),  // Sun: OUT of that night -> off after night (kept although Sun isn't her off day)
    r('2026-10-21', 'CL'), r('2026-10-22', 'H'),
  ], { weeklyOff: 'Wed' });
  assert.deepEqual(got.map(x => x.status), ['P', 'WO', 'CL', 'H']);
  assert.ok(got[1].offAfterNight);
});

test('normalizeAttendance passes each staff member\'s weekly off', () => {
  const att = { a: { records: [r('2026-10-21', 'A')] }, b: { records: [r('2026-10-21', 'A')] } };
  const got = normalizeAttendance(att, [{ empNo: 'a', weeklyOff: 'Wed' }, { empNo: 'b', weeklyOff: '' }]);
  assert.equal(got.a.records[0].status, 'WO');
  assert.equal(got.b.records[0].status, 'A');
});

import { mergeAttendanceRecord } from './punches.js';

test('staff on two units\' devices: the second file never erases the first', () => {
  const unit2 = { date: '2026-10-21', status: 'P', in: '09:05', out: '17:30' };
  const unit1 = { date: '2026-10-21', status: 'A' };                 // "Not Present" on the other device
  assert.deepEqual(mergeAttendanceRecord(unit2, unit1), unit2);       // Unit 1 file imported after Unit 2
  assert.deepEqual(mergeAttendanceRecord(unit1, unit2), unit2);       // …or before
});

test('punches from both units combine into the earliest IN and latest OUT', () => {
  assert.deepEqual(mergeAttendanceRecord({ date: 'd', status: 'P', in: '09:00' }, { date: 'd', status: 'A', in: '17:10' }),
    { date: 'd', status: 'P', in: '09:00', out: '17:10' });
  assert.deepEqual(mergeAttendanceRecord({ date: 'd', status: 'P', in: '08:50', out: '13:00' }, { date: 'd', status: 'P', in: '14:00', out: '18:05' }),
    { date: 'd', status: 'P', in: '08:50', out: '18:05' });
});

test('re-importing the same file changes nothing; leave and weekly off beat absent', () => {
  const rec = { date: 'd', status: 'P', in: '08:47', out: '18:01' };
  assert.deepEqual(mergeAttendanceRecord(rec, { ...rec }), rec);
  assert.equal(mergeAttendanceRecord({ date: 'd', status: 'A' }, { date: 'd', status: 'CL' }).status, 'CL');
  assert.equal(mergeAttendanceRecord({ date: 'd', status: 'WO' }, { date: 'd', status: 'A' }).status, 'WO');
  assert.deepEqual(mergeAttendanceRecord(null, { date: 'd', status: 'A' }), { date: 'd', status: 'A' });
});
