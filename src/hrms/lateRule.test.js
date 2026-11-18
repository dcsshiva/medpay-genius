import test from 'node:test';
import assert from 'node:assert/strict';
import { lateRule, addLateDay, lateDayNote, lateLopDays, extraDaysFor, fmtDays } from './lateRule.js';

test('defaults: every 3rd late day = ½ day; settings override', () => {
  assert.deepEqual(lateRule(), { every: 3, lopDays: 0.5 });
  assert.deepEqual(lateRule({ lateLopEvery: 4, lateLopDays: 1 }), { every: 4, lopDays: 1 });
  assert.deepEqual(lateRule({ lateLopEvery: 0, lateLopDays: -1 }), { every: 3, lopDays: 0.5 });
  assert.deepEqual(lateRule({ lateLopEvery: '', lateLopDays: '' }), { every: 3, lopDays: 0.5 });
});

test('the 3rd and 6th late days cost half a day; others are only counted', () => {
  const rule = lateRule();
  let c = 0; const lop = [];
  for (let i = 0; i < 7; i++) { const s = addLateDay(c, rule); c = s.count; lop.push(s.lopDays); }
  assert.deepEqual(lop, [0, 0, 0.5, 0, 0, 0.5, 0]);
  assert.equal(lateLopDays(7, rule), 1);
  assert.equal(lateLopDays(2, rule), 0);
});

test('notes say how many more late days lead to loss of pay', () => {
  const rule = lateRule();
  assert.equal(lateDayNote(addLateDay(0, rule), rule), 'late day 1 this cycle (2 more = ½ day loss of pay)');
  assert.equal(lateDayNote(addLateDay(2, rule), rule), 'late day 3 this cycle → ½ day loss of pay');
  assert.equal(fmtDays(1.5), '1½');
  assert.equal(fmtDays(1), '1');
});

test('double shifts: payDays 2 gives one extra day', () => {
  assert.equal(extraDaysFor({ payDays: 2 }), 1);
  assert.equal(extraDaysFor({ payDays: 1 }), 0);
  assert.equal(extraDaysFor({}), 0);
  assert.equal(extraDaysFor(null), 0);
});
