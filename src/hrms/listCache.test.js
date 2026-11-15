import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CACHED_LISTS, cacheKey, useCached, listsChanged, previousCycleStart, shouldRefresh } from './listCache.js';

const v1 = Object.fromEntries(CACHED_LISTS.map(l => [l.table, '2026-11-15T01:00:00Z']));

test('a list comes from the device only when the server stamp matches', () => {
  const cache = { versions: { ...v1 }, lists: { units: [], shifts: [{ code: 'S1' }] } };
  assert.equal(useCached(cache, v1, 'shifts'), true);
  assert.equal(useCached(cache, { ...v1, hr_shifts: '2026-11-15T02:00:00Z' }, 'shifts'), false); // changed on the server
  assert.equal(useCached(cache, v1, 'holidays'), false);   // never downloaded
  assert.equal(useCached(cache, null, 'shifts'), false);   // stamps unavailable → download
  assert.equal(useCached(null, v1, 'shifts'), false);
  assert.equal(useCached(cache, v1, 'attendance'), false); // not a cached list
});

test('changes between stamps; cache key per account, role and app version', () => {
  assert.equal(listsChanged(v1, { ...v1 }), false);
  assert.equal(listsChanged(v1, { ...v1, hr_staff: 'x' }), true);
  assert.equal(listsChanged(null, v1), true);
  assert.notEqual(cacheKey('u1', 'staff', '1.1.0.26'), cacheKey('u1', 'staff', '1.1.0.27'));
  assert.notEqual(cacheKey('u1', 'staff', '1'), cacheKey('u1', 'admin', '1'));
});

test('previous cycle start, across years and short months', () => {
  assert.equal(previousCycleStart('2026-10-26'), '2026-09-26');
  assert.equal(previousCycleStart('2026-01-26'), '2025-12-26');
  assert.equal(previousCycleStart('2026-03-28'), '2026-02-28');
  assert.equal(previousCycleStart('2026-11-01'), '2026-10-01');
});

test('refresh after 15 minutes away', () => {
  assert.equal(shouldRefresh(0, 10 ** 9), false);                   // never loaded
  assert.equal(shouldRefresh(1000, 1000 + 14 * 60 * 1000), false);
  assert.equal(shouldRefresh(1000, 1000 + 15 * 60 * 1000), true);
});
