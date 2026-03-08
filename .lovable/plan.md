

# Update TDS Report Filenames

Change all TDS report download filenames in `src/components/TDSReportsManagement.tsx` to include "WestMed_" prefix and current date+time suffix.

**Format:** `WestMed_TDS_{Type}_Report_{params}_{YYYYMMDD}_{HHmmss}.xlsx`

### Changes in `TDSReportsManagement.tsx`

1. **Quarterly** (line ~91): `WestMed_TDS_Quarterly_Report_2025-26_Q1_20260308_143022.xlsx`
2. **Annual** (line ~172): `WestMed_TDS_Annual_Report_2025-26_20260308_143022.xlsx`
3. **Custom** (line ~232): `WestMed_TDS_Custom_Report_2026-01-01_to_2026-03-08_20260308_143022.xlsx`

Use `format(new Date(), 'yyyyMMdd_HHmmss')` from date-fns for the timestamp suffix.

