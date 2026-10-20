import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Pull the real permission rule out of the generated HRMS screens.
const src = readFileSync(new URL('./prototype.ts', import.meta.url), 'utf8');
const pick = (name) => src.match(new RegExp(`function ${name}\\([^)]*\\)\\{.*\\}`))[0];
const load = (settings) => new Function('PAYROLL_SETTINGS',
  `${pick('permissionPoolMin')}\n${pick('permissionDisplay')}\nreturn { permissionPoolMin, permissionDisplay };`)(settings);
const { permissionPoolMin, permissionDisplay } = load({ defaultPermissionHours: 2, permissionRoundUpToHours: 4 });

test('90 min used of 2h counts as 90 min, 30 min left', () => {
  assert.deepEqual(permissionDisplay(120, 90), { raw: 90, used: 90, remaining: 30 });
});
test('2h 7m used counts as 4h with nothing left', () => {
  assert.deepEqual(permissionDisplay(120, 127), { raw: 127, used: 240, remaining: 0 });
});
test('lateness up to 4h is absorbed without deduction; beyond is deducted', () => {
  const pool = permissionPoolMin(120);
  assert.equal(pool, 240);
  assert.equal(Math.max(0, 250 - pool), 10); // 4h 10m late -> 10 min deducted
});

const pre = new Function('LEAVES', `${pick('approvedPermissionByDate')}\n${pick('permissionCover')}\nreturn { approvedPermissionByDate, permissionCover };`);
const LV = [
  { empNo: 'E1', type: 'Permission', status: 'Approved', date: '2026-10-05', hours: 1 },
  { empNo: 'E1', type: 'Permission', status: 'Pending', date: '2026-10-06', hours: 2 },
];
const { approvedPermissionByDate, permissionCover } = pre(LV);
const approved = approvedPermissionByDate('E1');

test('late without approved permission uses no permission', () => {
  assert.equal(permissionCover(52, approved['2026-10-07'], 120), 0);
});
test('1h approved covers up to 60 min of lateness', () => {
  assert.equal(permissionCover(52, approved['2026-10-05'], 120), 52);
  assert.equal(permissionCover(75, approved['2026-10-05'], 120), 60);
});
test('pending permission covers nothing', () => {
  assert.equal(permissionCover(30, approved['2026-10-06'], 120), 0);
});
