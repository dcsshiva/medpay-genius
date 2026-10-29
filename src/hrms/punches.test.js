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
  const got = normalizeAttendance(att, ['a']);
  assert.deepEqual(Object.keys(got), ['a']);
  assert.equal(got.a.primaryShift, 'S1');
  assert.equal(got.a.records[0].status, 'P');
  assert.equal(att.a.records[0].status, 'A'); // input not mutated
});
