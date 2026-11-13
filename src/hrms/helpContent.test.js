import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HELP, HELP_ORDER, HELP_GROUPS, helpKey } from './helpContent.js';

const TAMIL = /[஀-௿]/;

test('every help entry has English and Tamil, with the same number of steps and tips', () => {
  for (const [key, h] of Object.entries(HELP)) {
    for (const f of ['title', 'intro']) {
      assert.ok(h[f].en && h[f].ta, key + ' ' + f);
      assert.ok(TAMIL.test(h[f].ta), key + ' ' + f + ' Tamil');
    }
    for (const f of ['steps', 'tips']) {
      assert.equal(h[f].en.length, h[f].ta.length, key + ' ' + f + ' count');
      h[f].ta.forEach((x, i) => assert.ok(TAMIL.test(x), key + ' ' + f + ' ' + i + ' Tamil'));
    }
  }
});

test('the printable document covers every entry once, and its groups exist', () => {
  assert.deepEqual([...HELP_ORDER].sort(), Object.keys(HELP).sort());
  HELP_GROUPS.forEach(g => assert.ok(HELP_ORDER.includes(g.before)));
});

test('helpKey picks the entry for the screen in view', () => {
  assert.equal(helpKey({ signedIn: false }), 'login');
  assert.equal(helpKey({ signedIn: true, view: 'staff', staffTab: 'leave' }), 'staff.leave');
  assert.equal(helpKey({ signedIn: true, view: 'staff', staffTab: 'nope' }), 'staff.overview');
  assert.equal(helpKey({ signedIn: true, view: 'admin', role: 'admin', adminTab: 'planner' }), 'admin.planner');
  assert.equal(helpKey({ signedIn: true, view: 'admin', role: 'manager', adminTab: 'overview' }), 'manager.overview');
  assert.equal(helpKey({ signedIn: true, view: 'admin', role: 'admin', adminTab: 'masters', mastersSubTab: 'holidays' }), 'admin.masters.holidays');
});
