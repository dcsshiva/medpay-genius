import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftAllowed, shiftsForStaff, departmentsLabel, MANAGERS } from './shiftScope.js';

const NURSE = ['DPT1', 'DPT3', 'DPT4', 'DPT7'], FO = ['DPT2', 'DPT5'];
const SH = [
  { code: 'S1', letter: 'G1', allowedDepartments: [MANAGERS] },
  { code: 'S2', letter: 'MS', allowedDepartments: NURSE },
  { code: 'S4', letter: 'NS', allowedDepartments: NURSE },
  { code: 'S5', letter: 'BS', allowedDepartments: ['DPT6'] },
  { code: 'S8', letter: 'D1', allowedDepartments: ['DPT6'] },
  { code: 'S11', letter: 'M2', allowedDepartments: FO },
  { code: 'SX', letter: 'X', allowedDepartments: null },
  { code: 'SL', letter: 'L', allowedDesignations: ['DSG7'] },
];
const codes = (emp) => SH.filter(s => shiftAllowed(s, emp, SH)).map(s => s.code);

test('department shifts: each department sees its own shifts plus the open ones', () => {
  assert.deepEqual(codes({ department: 'DPT1', role: 'Staff' }), ['S2', 'S4', 'SX']);
  assert.deepEqual(codes({ department: 'DPT5', role: 'Staff' }), ['S11', 'SX']);
  assert.deepEqual(codes({ department: 'DPT6', role: 'Staff', designation: 'DSG7' }), ['S5', 'S8', 'SX', 'SL']);
});

test('managers get the manager shifts and their own department’s', () => {
  assert.deepEqual(codes({ department: 'DPT3', role: 'Manager' }), ['S1', 'S2', 'S4', 'SX']);
  assert.deepEqual(codes({ department: 'DPT9', role: 'Manager' }), ['S1', 'SX']);
});

test('a department named on no shift keeps every shift (designation locks still apply)', () => {
  assert.deepEqual(codes({ department: 'DPT10', role: 'Staff' }), ['S1', 'S2', 'S4', 'S5', 'S8', 'S11', 'SX']);
  assert.deepEqual(codes({ department: 'DPT10', role: 'Staff', designation: 'DSG7' }).includes('SL'), true);
});

test('suspended shifts do not narrow a department', () => {
  const sh = [{ code: 'A', allowedDepartments: ['DPT8'], suspended: true }, { code: 'B', allowedDepartments: ['DPT1'] }];
  assert.equal(shiftAllowed(sh[1], { department: 'DPT8' }, sh), true);
});

test('planner choices: union over the staff being planned; labels', () => {
  const team = [{ department: 'DPT1', role: 'Staff' }, { department: 'DPT2', role: 'Staff' }];
  assert.deepEqual(shiftsForStaff(SH, team).map(s => s.letter), ['MS', 'NS', 'M2', 'X']);
  const depts = [{ code: 'DPT2', name: 'Front Office' }, { code: 'DPT5', name: 'Pharmacy' }];
  assert.equal(departmentsLabel(SH[5], depts), 'Front Office, Pharmacy');
  assert.equal(departmentsLabel(SH[0], depts), 'Reporting managers');
  assert.equal(departmentsLabel(SH[6], depts), 'All departments');
});
