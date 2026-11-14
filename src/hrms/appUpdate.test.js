import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, updateAction } from './appUpdate.js';

test('version comparison', () => {
  assert.equal(isNewerVersion('1.1.0.20', '1.1.0.21'), true);
  assert.equal(isNewerVersion('1.1.0.20', '1.1.0.20'), false);
  assert.equal(isNewerVersion('1.1.0.21', '1.1.0.20'), false);
  assert.equal(isNewerVersion('1.1.0.9', '1.1.0.10'), true);
  assert.equal(isNewerVersion('1.1.0.20', '1.2.0.01'), true);
  assert.equal(isNewerVersion('v1.1.0.20', '1.1.0.21'), true);
  assert.equal(isNewerVersion('1.1.0.20', ''), false);
});

test('reload when nothing would be lost, otherwise ask; never loop', () => {
  assert.equal(updateAction({ current: '1.1.0.20', published: '1.1.0.20', quiet: true }), 'none');
  assert.equal(updateAction({ current: '1.1.0.20', published: '1.1.0.21', quiet: true }), 'reload');
  assert.equal(updateAction({ current: '1.1.0.20', published: '1.1.0.21', quiet: false }), 'banner');
  assert.equal(updateAction({ current: '1.1.0.20', published: '1.1.0.21', quiet: true, tried: '1.1.0.21' }), 'banner');
});
