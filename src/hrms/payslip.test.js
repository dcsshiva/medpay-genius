import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayslip, statutory, earningsTotal, cycleAdjustments } from './payslip.js';

const settings = { pf: { enabled: true, rate: 12 }, esi: { enabled: true, rate: 0.75, ceiling: 21000 } };
const emp = { netSalary: 20000, pfApplicable: true, esiApplicable: true,
  earnings: [{ label: 'BASIC', amount: 14000 }, { label: 'HRA', amount: 6000 }] };

test('Unit 1 sample: EPF 1680 on Basic, ESI 150, employer ESI 650', () => {
  assert.deepEqual(statutory(emp, settings), { gross: 20000, pf: 1680, esi: 150, employerPf: 1680, employerEsi: 650 });
});

test('Unit 1 sample payslip: totals 20000 / 1830, net 18170, CTC 22330', () => {
  const st = statutory(emp, settings);
  const slip = buildPayslip({ emp, settings, summary: { grossPay: 20000, pfDeduction: st.pf, esiDeduction: st.esi, tdsDeduction: 0, otherDeduction: 0, totalDeduction: 0 } });
  assert.equal(slip.earningsSum, 20000);
  assert.equal(slip.deductionsSum, 1830);
  assert.equal(slip.net, 18170);
  assert.equal(slip.ctc, 22330);
});

test('no earnings breakdown keeps the whole salary as Basic', () => {
  assert.equal(earningsTotal({ netSalary: 70000 }), 70000);
});

test('one-off deductions only apply to their own cycle', () => {
  const e = { cycleAdjustments: { '2026-10': [{ label: 'Advance', amount: 500 }] } };
  assert.equal(cycleAdjustments(e, '2026-10')[0].amount, 500);
  assert.equal(cycleAdjustments(e, '2026-11').length, 0);
});
