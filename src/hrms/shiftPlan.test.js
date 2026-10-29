import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { buildPlanSheet, buildPlanBook, readPlanSheet, readPlanBook, planChanges, parseHeaderDate, defaultPlanCode, planChoices, sheetName } from './shiftPlan.js';
import { writePlanXlsx, writePlanXls, writePlanCsv, readPlanFile, readPlanBookFile, addSheetExtras } from './shiftPlanFile.js';

const cycle = { key: '2026-12', label: '26 Nov 2026 - 25 Dec 2026', start: '2026-11-26', end: '2026-12-25',
  dates: Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 10, 26 + i)).toISOString().slice(0, 10)) };
const shifts = [
  { code: 'S1', letter: 'G1', name: 'General Shift 1' },
  { code: 'S2', letter: 'MS', name: 'Morning Shift' },
  { code: 'S4', letter: 'NS', name: 'Night Shift' },
  { code: 'S5', letter: 'BS', name: '4-Hour Break Shift', allowedDesignations: ['DSG7'] },
  { code: 'S9', letter: 'X9', name: 'Old shift', suspended: true },
];
const staff = [
  { empNo: '2100329', name: 'VIJAYALAKSHMI', unitCode: 'U2', shiftCode: 'S4', weeklyOff: '', reportingManager: 'M1', designation: 'DSG1', active: true },
  { empNo: '21002', name: 'RAJARAM', unitCode: 'U1', shiftCode: 'S1', weeklyOff: 'Sun', reportingManager: 'M1', designation: 'DSG7', active: true },
  { empNo: '2100500', name: 'OTHER TEAM', unitCode: 'U1', shiftCode: 'S2', weeklyOff: '', reportingManager: 'M2', designation: 'DSG1', active: true },
  { empNo: '2100600', name: 'LEFT', unitCode: 'U1', shiftCode: 'S2', weeklyOff: '', reportingManager: 'M1', active: false },
];
const names = { unit: c => ({ U1: 'Unit 1', U2: 'Unit 2' })[c], designation: c => c, manager: c => ({ M1: 'Manager One', M2: 'Manager Two' })[c] };
const exportedAt = '2026-11-20T10:00:00.000Z';
const sheet = (roster = {}) => buildPlanSheet({ cycle, staff: staff.filter(s => s.active), roster, shifts, names, exportedAt, exportedBy: 'Admin', scope: 'All units' });
const ctx = (over = {}) => ({
  cycle, staffByCode: new Map(staff.map(s => [s.empNo, s])), roster: {}, rosterMeta: {}, shifts,
  canEdit: s => s.reportingManager === 'M1', isAdmin: false, today: '2026-11-20', finalized: false,
  allowedFor: (sh, s) => !sh.allowedDesignations || sh.allowedDesignations.includes(s.designation), ...over,
});
const col = (aoa, date) => aoa[1].findIndex(h => String(h).startsWith(date));

test('export: meta row, header, one row per staff sorted by unit then code, planned letters with WO on the weekly off', () => {
  const aoa = sheet({ '2100329|2026-11-27': 'S2' });
  assert.deepEqual(aoa[0].slice(0, 6), ['WestMed shift plan', cycle.label, 'Cycle', '2026-12', 'Exported', exportedAt]);
  assert.deepEqual(aoa[1].slice(0, 8), ['Unit', 'Code', 'Name', 'Designation', 'Reporting Manager', 'Default Shift', 'Weekly Off', '2026-11-26 (Thu)']);
  assert.equal(aoa[1].length, 7 + 30);
  assert.deepEqual(aoa.slice(2).map(r => r[1]), ['21002', '2100500', '2100329']);
  const raj = aoa[2];
  assert.equal(raj[5], 'G1');
  assert.equal(raj[6], 'Sun');
  assert.equal(raj[col(aoa, '2026-11-29')], 'WO'); // Sunday = Rajaram's weekly off
  assert.equal(raj[col(aoa, '2026-11-30')], 'G1');
  assert.equal(aoa[4][col(aoa, '2026-11-27')], 'MS'); // planner override
  assert.equal(aoa[4][col(aoa, '2026-11-28')], 'NS');
});

test('import: only real changes; back to default removes the override; blank leaves the day alone', () => {
  const aoa = sheet({ '2100329|2026-11-27': 'S2' });
  const v = aoa[4];
  v[col(aoa, '2026-11-27')] = 'ns';  // back to her default → clear the override
  v[col(aoa, '2026-12-02')] = 'WO';  // planned day off
  v[col(aoa, '2026-12-03')] = '';    // blank → unchanged
  const r = planChanges(readPlanSheet(aoa, { cycle }), ctx({ roster: { '2100329|2026-11-27': 'S2' } }));
  assert.deepEqual(r.errors.filter(e => e.line), [{ line: 4, empNo: '2100500', date: undefined, message: 'OTHER TEAM is not one of your staff.' }]);
  assert.deepEqual(r.changes.map(c => [c.empNo, c.date, c.from, c.to, c.clear]), [
    ['2100329', '2026-11-27', 'S2', 'S4', true],
    ['2100329', '2026-12-02', 'S4', 'WO', false],
  ]);
  assert.equal(r.staffCount, 2);
});

test('import checks: unknown code, suspended shift, designation-restricted shift, past date for managers, inactive and duplicate rows', () => {
  const aoa = sheet();
  aoa[2][col(aoa, '2026-11-30')] = 'BS';   // Rajaram's designation is allowed BS → fine
  aoa[4][col(aoa, '2026-11-30')] = 'BS';   // not allowed for her designation
  aoa[4][col(aoa, '2026-12-01')] = 'ZZ';
  aoa[4][col(aoa, '2026-12-04')] = 'X9';
  aoa[4][col(aoa, '2026-11-26')] = 'MS';   // before today (manager)
  aoa.push(['Unit 1', 2100600, 'LEFT']);   // inactive (code as a number, like Excel)
  aoa.push(['Unit 2', '2100329', 'VIJAYALAKSHMI']);
  aoa.push(['Unit 1', '21002', 'SOMEONE ELSE']);  // code edited in an unprotected copy
  aoa.push(['Unit 2', '9999999', 'nobody']);
  const r = planChanges(readPlanSheet(aoa, { cycle }), ctx({ today: '2026-11-27' }));
  const msgs = r.errors.filter(e => e.line).map(e => e.empNo + ' ' + (e.date || '') + ' ' + e.message);
  assert.ok(msgs.some(m => /2100329 2026-11-30 4-Hour Break Shift is not allowed/.test(m)));
  assert.ok(msgs.some(m => /2100329 2026-12-01 "ZZ" is not a shift code — use one of G1, MS, NS, BS, WO/.test(m)));
  assert.ok(msgs.some(m => /2100329 2026-12-04 Old shift is suspended/.test(m)));
  assert.ok(msgs.some(m => /2100329 2026-11-26 Past date/.test(m)));
  assert.ok(msgs.some(m => /2100600  LEFT is inactive/.test(m)));
  assert.ok(msgs.some(m => /2100329  Code appears twice/.test(m)));
  assert.ok(msgs.some(m => /9999999  No staff member/.test(m)));
  assert.ok(msgs.some(m => /21002  Code 21002 is RAJARAM, but this row says "SOMEONE ELSE"/.test(m)));
  assert.deepEqual(r.changes.map(c => [c.empNo, c.date, c.to]), [['21002', '2026-11-30', 'S5']]);
  // an administrator may change past dates and anyone's staff
  const a = planChanges(readPlanSheet(aoa, { cycle }), ctx({ today: '2026-11-27', isAdmin: true, canEdit: () => true }));
  assert.ok(a.changes.some(c => c.empNo === '2100329' && c.date === '2026-11-26'));
});

test('a cell changed in the app after the file was exported is a conflict, not overwritten', () => {
  const aoa = sheet({ '21002|2026-12-01': 'S2' });           // exported while it was MS
  aoa[2][col(aoa, '2026-12-02')] = 'NS';                      // the admin edits another day
  const roster = { '21002|2026-12-01': 'S4' };                // a manager set NS after the export
  const r = planChanges(readPlanSheet(aoa, { cycle }), ctx({ roster, rosterMeta: { '21002|2026-12-01': '2026-11-21T08:00:00Z' }, isAdmin: true, canEdit: () => true }));
  assert.deepEqual(r.conflicts.map(c => [c.date, c.from, c.to]), [['2026-12-01', 'S4', 'S2']]);
  assert.deepEqual(r.changes.map(c => c.date), ['2026-12-02']);
  assert.ok(r.checkedConflicts);
  // changed before the export → a normal change
  const r2 = planChanges(readPlanSheet(aoa, { cycle }), ctx({ roster, rosterMeta: { '21002|2026-12-01': '2026-11-19T08:00:00Z' }, isAdmin: true, canEdit: () => true }));
  assert.equal(r2.conflicts.length, 0);
  assert.ok(r2.changes.some(c => c.date === '2026-12-01' && c.to === 'S2'));
});

test('whole-file errors: wrong cycle, finalized cycle, no header', () => {
  const aoa = sheet();
  assert.match(planChanges(readPlanSheet(aoa, { cycle }), ctx({ cycle: { ...cycle, key: '2027-01', label: 'Jan' } })).errors[0].message, /for pay cycle 2026-12/);
  assert.match(planChanges(readPlanSheet(aoa, { cycle }), ctx({ finalized: true })).errors[0].message, /finalized/);
  assert.match(planChanges(readPlanSheet([['a', 'b']], { cycle }), ctx()).errors[0].message, /No header row/);
});

test('header dates in every shape Excel produces', () => {
  assert.equal(parseHeaderDate('2026-11-26 (Thu)', cycle), '2026-11-26');
  assert.equal(parseHeaderDate('26-11-2026', cycle), '2026-11-26');
  assert.equal(parseHeaderDate('26/11/2026', cycle), '2026-11-26');
  assert.equal(parseHeaderDate('26-Nov-2026', cycle), '2026-11-26');
  assert.equal(parseHeaderDate('2-Dec', cycle), '2026-12-02');
  assert.equal(parseHeaderDate(46352, cycle), '2026-11-26');           // Excel serial
  assert.equal(parseHeaderDate(new Date(2026, 10, 26), cycle), '2026-11-26');
  assert.equal(parseHeaderDate('Default Shift', cycle), null);
  assert.equal(parseHeaderDate('31-02-2026', cycle), null);
});

test('defaults and choices', () => {
  assert.equal(defaultPlanCode(staff[1], '2026-11-29'), 'WO');
  assert.equal(defaultPlanCode(staff[1], '2026-11-30'), 'S1');
  assert.deepEqual(planChoices(shifts), ['G1', 'MS', 'NS', 'BS', 'WO']);
});

test('workbook: one sheet per reporting manager plus How to fill; xlsx locks everything but the day cells', () => {
  const book = buildPlanBook({ cycle, staff: staff.filter(s => s.active), roster: { '2100329|2026-11-27': 'S2' }, shifts, names, exportedAt, exportedBy: 'Admin' });
  assert.deepEqual(book.map(b => b.name), ['Manager One', 'Manager Two', 'How to fill']);
  assert.deepEqual(book[0].aoa.slice(2).map(r => r[1]), ['21002', '2100329']);
  assert.equal(book[0].aoa[0][9], 'Reporting manager: Manager One');
  const bytes = writePlanXlsx(book, { choices: planChoices(shifts) });
  const sheets = readPlanBookFile(bytes, 'plan.xlsx');
  assert.deepEqual(sheets.map(x => x.name), ['Manager One', 'Manager Two', 'How to fill']);
  const trim = r => { const a = r.map(String); while (a.length && a[a.length - 1] === '') a.pop(); return a; };
  assert.deepEqual(sheets[0].aoa.map(trim), book[0].aoa.map(trim));
  const read = readPlanBook(sheets, { cycle });
  assert.deepEqual(read.rows.map(r => r.sheet + ':' + r.empNo), ['Manager One:21002', 'Manager One:2100329', 'Manager Two:2100500']);
  const same = ctx({ roster: { '2100329|2026-11-27': 'S2' }, canEdit: () => true });
  assert.deepEqual(planChanges(read, same).changes, []);
  // the XML: protected sheet, editable day cells only, drop-down on exactly the day cells, schema order
  const wb = XLSX.read(bytes, { type: 'array', bookFiles: true });
  const xml = new TextDecoder().decode(wb.files['xl/worksheets/sheet1.xml'].content);
  const styles = new TextDecoder().decode(wb.files['xl/styles.xml'].content);
  const xfs = [...styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/)[0].matchAll(/<xf [^>]*?(\/>|>[\s\S]*?<\/xf>)/g)].map(m => m[0]);
  const unlocked = xfs.map((x, i) => /locked="0"/.test(x) ? i : -1).filter(i => i >= 0);
  assert.equal(unlocked.length, 1);
  const cells = [...xml.matchAll(/<c r="([A-Z]+)(\d+)"(?: s="(\d+)")?/g)].map(m => ({ col: m[1], row: +m[2], s: m[3] ? +m[3] : null }));
  const editable = cells.filter(c => c.s === unlocked[0]);
  assert.equal(editable.length, 2 * 30);                                   // 2 staff × 30 days
  assert.ok(editable.every(c => c.row >= 3 && c.col >= 'H' || c.col.length === 2));
  assert.ok(cells.filter(c => ['A', 'B', 'C', 'F', 'G'].includes(c.col)).every(c => c.s !== unlocked[0]));
  assert.match(xml, /<sheetProtection sheet="1"[^>]*formatColumns="0"/);
  assert.match(xml, /<dataValidation type="list"[^>]*sqref="H3:AK4"><formula1>&quot;G1,MS,NS,BS,WO&quot;<\/formula1>/);
  assert.match(xml, /<pane xSplit="3" ySplit="2" topLeftCell="D3"/);
  const at = t => xml.indexOf(t);
  assert.ok(at('<sheetViews>') < at('<sheetData') && at('</sheetData>') < at('<sheetProtection') && at('<sheetProtection') < at('<dataValidations'));
  assert.ok(at('<ignoredErrors') < 0 || at('<dataValidations') < at('<ignoredErrors'));
  const help = new TextDecoder().decode(wb.files['xl/worksheets/sheet3.xml'].content);
  assert.match(help, /<sheetProtection sheet="1"/);
});

test('xls keeps the manager sheets; csv is one table; both import with no changes', () => {
  const roster = { '2100329|2026-11-27': 'S2' };
  const book = buildPlanBook({ cycle, staff: staff.filter(s => s.active), roster, shifts, names, exportedAt });
  const same = ctx({ roster, canEdit: () => true });
  const xls = readPlanBookFile(writePlanXls(book), 'plan.xls');
  assert.deepEqual(xls.map(x => x.name), ['Manager One', 'Manager Two', 'How to fill']);
  assert.deepEqual(planChanges(readPlanBook(xls, { cycle }), same).changes, []);
  const csv = writePlanCsv(sheet(roster));
  const fromCsv = readPlanBookFile(new TextEncoder().encode(csv), 'plan.csv');
  assert.equal(fromCsv.length, 1);
  assert.deepEqual(planChanges(readPlanBook(fromCsv, { cycle }), same).changes, []);
  assert.equal(readPlanFile(new TextEncoder().encode(csv), 'plan.csv').length, 5);
  // a code appearing on two manager sheets is caught
  const dup = [...book.slice(0, 2), { name: 'Copy', aoa: book[0].aoa }];
  const r = planChanges(readPlanBook(dup, { cycle }), same);
  assert.ok(r.errors.some(e => e.sheet === 'Copy' && /appears twice/.test(e.message)));
});

test('sheet names follow Excel rules', () => {
  const taken = new Set();
  assert.equal(sheetName('A:B/C [x]', taken), 'A B C x');
  assert.equal(sheetName('A:B/C [x]', taken), 'A B C x (2)');
  assert.equal(sheetName('X'.repeat(40), taken).length, 31);
  assert.equal(sheetName('', taken), 'Sheet');
});

test('sheet extras slot into the right place when SheetJS already wrote sheetViews', () => {
  const xml = '<worksheet><dimension ref="A1"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData/><pageMargins left="0.7"/></worksheet>';
  const out = addSheetExtras(xml, { freezeCol: 1, freezeRow: 1, validationRef: 'B2:B9', choices: ['A', 'B'] });
  assert.equal((out.match(/<sheetViews>/g) || []).length, 1);
  assert.ok(out.indexOf('<dataValidations') < out.indexOf('<pageMargins'));
});
