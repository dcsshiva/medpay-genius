import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leaveUpdates, markSeen, updateText } from './staffNotices.js';

const leaves = [
  { id: 'L1', type: 'CL', date: '2026-11-19', status: 'Approved', decidedBy: 'GOMATHY', decidedOn: '2026-11-14' },
  { id: 'L2', type: 'Permission', hours: 2, date: '2026-11-12', status: 'Rejected', decidedBy: 'GOMATHY', decidedOn: '2026-11-12' },
  { id: 'L3', type: 'CL', date: '2026-11-05', status: 'Revoked', decidedOn: '2026-11-01', revokedBy: 'HR', revokedOn: '2026-11-13', revokeReason: 'worked that day' },
  { id: 'L4', type: 'AL', date: '2026-11-09', status: 'Approved', decidedBy: 'GOMATHY', decidedOn: '2026-11-10' },
  { id: 'L5', type: 'CL', date: '2026-10-01', status: 'Approved', decidedOn: '2026-09-30' },   // older than 14 days
  { id: 'L6', type: 'CL', date: '2026-11-20', status: 'Pending' },                             // not decided
  { id: '~new-L1', type: 'CL', date: '2026-11-21', status: 'Approved', decidedOn: '2026-11-15' }, // not saved yet
];

test('decided in the last 14 days and not seen, newest first', () => {
  assert.deepEqual(leaveUpdates(leaves, {}, '2026-11-15').map(u => u.id), ['L1', 'L3', 'L2', 'L4']);
});

test('seen hides an update until its status changes again', () => {
  const seen = markSeen({}, leaveUpdates(leaves, {}, '2026-11-15'));
  assert.deepEqual(leaveUpdates(leaves, seen, '2026-11-15'), []);
  const later = leaves.map(l => (l.id === 'L1' ? { ...l, status: 'Revoked', revokedOn: '2026-11-15', revokedBy: 'GOMATHY' } : l));
  assert.deepEqual(leaveUpdates(later, seen, '2026-11-15').map(u => [u.id, u.status]), [['L1', 'Revoked']]);
});

test('messages in English and Tamil', () => {
  const [l1, l3, l2, l4] = leaveUpdates(leaves, {}, '2026-11-15');
  assert.equal(updateText(l1, 'Thu 19 Nov').en, 'Your CL for Thu 19 Nov was approved by GOMATHY ✓');
  assert.equal(updateText(l2, 'Thu 12 Nov').en, 'Your permission (2h) for Thu 12 Nov was not approved by GOMATHY.');
  assert.equal(updateText(l3, 'Thu 5 Nov').tone, 'bad');
  assert.match(updateText(l3, 'Thu 5 Nov').en, /withdrawn by HR — worked that day/);
  assert.equal(updateText(l4, 'Mon 9 Nov').en, 'GOMATHY marked Mon 9 Nov as approved leave ✓');
  for (const u of [l1, l2, l3, l4]) assert.match(updateText(u, 'x').ta, /[஀-௿]/);
});
