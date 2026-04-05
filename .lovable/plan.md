

# Add Print Report Option to All Export Locations

## Summary

Add a "Print Report" button alongside existing export buttons across all components that have data export functionality. The print system will use native HTML tables rendered in a hidden container and triggered via `window.print()`, avoiding absolute positioning issues.

## All Export Locations Found

| # | Component | Current Export | What to Add |
|---|-----------|---------------|-------------|
| 1 | `ReportGeneration.tsx` | Excel + PDF | Print button |
| 2 | `TDSReportsManagement.tsx` | Excel (3 tabs: Quarterly, Annual, Custom) | Print button per tab |
| 3 | `DoctorHistoryExport.tsx` | Excel + PDF | Print button |
| 4 | `DoctorManagement.tsx` | Excel export | Print button |
| 5 | `StaffManagement.tsx` | Excel export | Print button |
| 6 | `VisitManagement.tsx` | Excel export | Print button |
| 7 | `StaffAttendanceReports.tsx` | Excel export | Print button |
| 8 | `StaffAttendanceManagement.tsx` | Excel template download | Skip (template, not report) |
| 9 | `StaffPayrollGeneration.tsx` | Excel export | Print button |
| 10 | `VendorPaymentReports.tsx` | Excel export | Print button |
| 11 | `AuditTrailViewer.tsx` | Excel export | Print button |
| 12 | `PaymentManagement.tsx` | Excel (bank advice) | Print button |
| 13 | `StaffPaymentHistoryTab.tsx` | Excel export | Print button |
| 14 | `TDSCertificateGenerator.tsx` | PDF certificate | Print button |
| 15 | `UserGuide.tsx` | window.print() | Already has print |
| 16 | `PublicUserGuide.tsx` | PDF generation | Already has export |

## Implementation

### 1. Create Shared Print Utility (`src/lib/printUtils.ts`)

A reusable function that:
- Takes a title, column definitions, and row data
- Builds a hidden `<div>` with a native HTML `<table>` (no absolute positioning)
- Includes a print-friendly stylesheet (borders, auto-fit columns, page break rules, company header)
- Appends to `document.body`, calls `window.print()`, then removes the element
- Supports landscape/portrait orientation via `@media print` CSS

```typescript
export function printReport(options: {
  title: string;
  columns: { label: string; key: string }[];
  data: Record<string, any>[];
  orientation?: 'portrait' | 'landscape';
  subtitle?: string;
}) { ... }
```

### 2. Add Print Button to Each Component

For each component listed above (except #8, #15, #16), add a `Printer` icon button next to the existing export button that calls `printReport()` with the same data used for Excel export.

**Pattern**: Each component already prepares `excelData` or similar array — the print function reuses that same data.

### 3. Ensure Existing Excel Exports Use Auto-fit

Several components don't have the `autoFitColumns` helper that was added to TDSReportsManagement. Apply it consistently:
- `StaffAttendanceReports.tsx`
- `VendorPaymentReports.tsx`
- `AuditTrailViewer.tsx`
- `StaffPayrollGeneration.tsx`
- `StaffPaymentHistoryTab.tsx`

### Print Report HTML Structure

```text
+------------------------------------------+
| WestMed Hospital                         |
| Report Title           Date: DD/MM/YYYY  |
| Subtitle (if any)      Records: N        |
+------------------------------------------+
| Col1  | Col2  | Col3  | Col4  | Col5    |
|-------|-------|-------|-------|---------|
| data  | data  | data  | data  | data    |
| ...   | ...   | ...   | ...   | ...     |
|-------|-------|-------|-------|---------|
| TOTAL | ...   | ...   | sum   | sum     |
+------------------------------------------+
```

Native HTML table with CSS `table { width: 100%; border-collapse: collapse; }` — no absolute positioning.

## Files

| File | Change |
|------|--------|
| New: `src/lib/printUtils.ts` | Shared print utility with HTML table rendering |
| `src/components/ReportGeneration.tsx` | Add Print button |
| `src/components/TDSReportsManagement.tsx` | Add Print button per report type |
| `src/components/DoctorHistoryExport.tsx` | Add Print button |
| `src/components/DoctorManagement.tsx` | Add Print button + autoFitColumns |
| `src/components/StaffManagement.tsx` | Add Print button + autoFitColumns |
| `src/components/VisitManagement.tsx` | Add Print button + autoFitColumns |
| `src/components/StaffAttendanceReports.tsx` | Add Print button + autoFitColumns |
| `src/components/StaffPayrollGeneration.tsx` | Add Print button + autoFitColumns |
| `src/components/VendorPaymentReports.tsx` | Add Print button + autoFitColumns |
| `src/components/AuditTrailViewer.tsx` | Add Print button + autoFitColumns |
| `src/components/PaymentManagement.tsx` | Add Print button |
| `src/components/quick-payment/StaffPaymentHistoryTab.tsx` | Add Print button + autoFitColumns |
| `src/components/TDSCertificateGenerator.tsx` | Add Print button |

All existing export logic preserved — print is purely additive.

