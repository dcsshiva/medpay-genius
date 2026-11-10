import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePunchMonitor, looksLikeName } from './punchMonitor.js';

const parseDate = (s) => {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(s || '').trim());
  const mo = { Oct: '10', Nov: '11' }[m && m[2]];
  return m && mo ? `${m[3]}-${mo}-${m[1].padStart(2, '0')}` : null;
};
const mapStatus = (s) => (/not\s*present/i.test(s) ? 'A' : /present/i.test(s) ? 'P' : null);
const opts = { parseDate, mapStatus };

// layout of the 28-Oct-2026 export (empty column after "Emp Code" and after "Last Punch")
const withGaps = [
  ['Employee Punch Monitor', '', '', '', '', '', '', '', '', '', ''],
  ['Date', '', '', '28-Oct-2026', '', '', '', '', '', '', ''],
  ['SNo.', 'Emp Code ', '', 'Name', 'Last Punch', '', 'Direction', 'Punch Records', '', 'Status', ''],
  ['$79', '2100420', '', 'Dr. AARTHI ARUL', '18:21', '', '', '09:11,18:21,', '', 'Present', ''],
  ['$73', '2100408', '', 'MS. MANIMEGALAI', '', '', '', '', '', 'Not Present', ''],
  ['$81', '2100423', '', 'MS. SHANMUGAPRIYA', '08:55', '', '', '08:55,', '', 'Present', ''],
];
// same report exported without the empty columns — the old fixed positions read "17:57" as the name
const noGaps = [
  ['Employee Punch Monitor', '', '', '', '', '', ''],
  ['Date', '27-Oct-2026', '', '', '', '', ''],
  ['SNo.', 'Emp Code', 'Name', 'Last Punch', 'Direction', 'Punch Records', 'Status'],
  ['$79', '2100420', 'Dr. AARTHI ARUL', '17:57', '', '09:02,17:57,', 'Present'],
  ['$73', '2100408', 'MS. MANIMEGALAI', '17:11', '', '08:59,17:11,', 'Present'],
  ['$40', '2100300', 'MR. RAJARAM', '', '', '', 'Not Present'],
];

test('reads the 28 Oct layout (with empty columns)', () => {
  const got = parsePunchMonitor(withGaps, opts);
  assert.equal(got.date, '2026-10-28');
  assert.deepEqual(got.names, { '2100420': 'Dr. AARTHI ARUL', '2100408': 'MS. MANIMEGALAI', '2100423': 'MS. SHANMUGAPRIYA' });
  assert.deepEqual(got.records, [
    { empNo: '2100420', date: '2026-10-28', status: 'P', in: '09:11', out: '18:21' },
    { empNo: '2100408', date: '2026-10-28', status: 'A' },
    { empNo: '2100423', date: '2026-10-28', status: 'P', in: '08:55' },       // one punch: IN only
  ]);
});

test('reads the layout without empty columns: names stay names, punches are kept', () => {
  const got = parsePunchMonitor(noGaps, opts);
  assert.equal(got.date, '2026-10-27');
  assert.deepEqual(got.names, { '2100420': 'Dr. AARTHI ARUL', '2100408': 'MS. MANIMEGALAI', '2100300': 'MR. RAJARAM' });
  assert.deepEqual(got.records.map(r => [r.empNo, r.status, r.in, r.out]), [
    ['2100420', 'P', '09:02', '17:57'], ['2100408', 'P', '08:59', '17:11'], ['2100300', 'A', undefined, undefined],
  ]);
});

test('rows that do not line up with the header are still read correctly', () => {
  const rows = [
    ['Date', '', '', '27-Oct-2026'],
    ['SNo.', 'Emp Code ', '', 'Name', 'Last Punch', '', 'Direction', 'Punch Records', '', 'Status'],
    ['$1', '2100422', 'MRS. A KALAIYARASI', '17:06', '', '13:07,17:06,', 'Present'], // shifted row
  ];
  const got = parsePunchMonitor(rows, opts);
  assert.equal(got.names['2100422'], 'MRS. A KALAIYARASI');
  assert.deepEqual(got.records[0], { empNo: '2100422', date: '2026-10-27', status: 'P', in: '13:07', out: '17:06' });
});

test('a time, number or status word is never taken as a name', () => {
  for (const bad of ['17:57', '08:55,', '2100420', '', '  ', 'Present', 'Not Present']) assert.equal(looksLikeName(bad), false, bad);
  for (const ok of ['Dr. AARTHI ARUL', 'MS. MANIMEGALAI', 'A KALAIYARASI', 'DR.ARUNKUMAR I']) assert.equal(looksLikeName(ok), true, ok);
});

test('a single punch, or the same punch twice, is an IN with no OUT (e.g. a night shift start)', () => {
  const rows = [
    ['Date', '', '', '08-Nov-2026'],
    ['SNo.', 'Emp Code ', '', 'Name', 'Last Punch', '', 'Direction', 'Punch Records', '', 'Status'],
    [1, '21043', '', 'MS.NITHYA', '21:13', '', '', '21:13,21:13,', '', 'Present'],
    [2, '2100286', '', 'MRS. SIVALAKSHMI', '19:53', '', '', '19:53,', '', 'Present'],
    [3, '2100145', '', 'MR. PRAKASH', '13:12', '', '', '07:56,13:12,', '', 'Present'],
  ];
  const res = parsePunchMonitor(rows, { parseDate, mapStatus });
  assert.deepEqual(res.records.map(r => [r.empNo, r.in, r.out]), [
    ['21043', '21:13', undefined], ['2100286', '19:53', undefined], ['2100145', '07:56', '13:12']]);
});
