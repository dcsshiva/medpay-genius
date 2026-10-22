# Unit 1 payslip + per-employee earnings/deductions

## 1. Salary > View payslip — new "Next: Payslip" step
- Keep today's View payslip breakdown exactly as it is.
- Add a **Next — Payslip** button at its foot. It opens the Unit 1 payslip in the same window.
- Period picker at the top. It defaults to the current pay cycle, and any earlier cycle can be chosen. Finalized cycles use their frozen figures; live cycles use the live calculation.
- Buttons: **Back**, **Print** (A5 landscape), **Download PDF** (A5 landscape, file name `Payslip_<EmpID>_<Month-Year>.pdf`).

## 2. Payslip layout (copies the Unit 1 sample)
```text
[WestMed logo]  | ECR Road, 2, New St, Pudupet, Lawspet, Puducherry 605008
                | 0431-2255566 / 9597359111 | westmedhealthcares@gmail.com | www.westmedhospitals.com
Pay Slip for the month of <Month - Year>
Employee ID - <code>
Emp. Name | ...            Designation | ...
No. of working days | ...  Pay Date | ...
LOP | ...                  UAN No | ...
Pay Period | 26 Sep - 25 Oct ESIC No | ...
EARNINGS   Amount (Rs.)  | DEDUCTIONS   Amount
BASIC, HRA, other earnings | EPF, ESI, TDS, OTHERS (+ LOP)
TOTAL                    | TOTAL
                         | NET SALARY
Employer Contribution:  EPF | ESI
Cost to Company
*This is a system generated Payslip and does not require Signature*
```
- The yellow heading bands use theme colours that print the same as the sample.
- Unit 2 gets its own template later. For now, Unit 2 staff also see the Unit 1 layout.
- Employee 210048 is used as the test case and should match the sample: Basic 14000, HRA 6000, EPF 1680, ESI 150, Net 18170, employer EPF 1680 + ESI 650, CTC 22330.

## 3. Staff Master — new "Earnings & Deductions" tab
- A new tab in the staff Details window, beside the contact details.
- **Standard earnings:** Basic, HRA, and extra rows you can add (e.g. Conveyance, Special allowance). Their total becomes the employee's gross salary.
- **Standard deductions:** EPF, ESI, TDS, Others. Each one can be a fixed amount, or EPF/ESI can be calculated automatically from the PF/ESI percentages in Payroll settings.
- **Employer contribution:** EPF and ESI, shown read-only.
- **Extra fields:** UAN No and ESIC No.
- The existing PF applicable / ESI applicable / Other monthly deduction boxes move into this tab. Staff who already have these values keep them.

## 4. Salary preparation — deductions for one cycle
- In the Salary tab, each staff row gets an **Adjust** option. The admin can add one-off deductions for that cycle only (advance, loan recovery, TDS, others) with a note.
- These amounts show under DEDUCTIONS on the payslip and are frozen when the cycle is finalized. The standard values in Staff Master stay as they are.

## Assumptions to confirm
- If Basic/HRA are left empty for a staff member, their gross salary is all shown as Basic, so current pay figures don't change.
- Pay Date = the date the cycle is finalized, or blank while it is still live.

## Technical details
- New `hr_staff` columns: `uan_no`, `esic_no`, `earnings jsonb`, `deductions jsonb`. New `hr_payroll_adjustments` table (cycle, emp_no, label, amount, note) with admin-write RLS and grants. All of these are applied with the SQL runner.
- `src/hrms/data.ts`: map and save the new fields and the adjustments.
- `scripts/port_prototype.py`: Details-window tab, payslip renderer with period picker, Next button in the drilldown, Adjust dialog, and the gross/deduction calculation using the structure. Then regenerate `prototype.ts`.
- Pure payslip calculation module + node tests built on the 210048 sample figures.
- Print: `@page { size: A5 landscape }` print stylesheet. PDF: html2canvas-pro + jsPDF in A5 landscape. Logo uploaded as an app asset (recreated from the sample header).
