

# Auto-fit Columns in TDS Excel Exports

## Problem
Exported Excel files have default column widths, making data hard to read without manual resizing.

## Fix

**`src/components/TDSReportsManagement.tsx`** — After each `XLSX.utils.json_to_sheet()` call, calculate and set `ws['!cols']` based on max content width per column.

Add a helper function:
```typescript
function autoFitColumns(ws: XLSX.WorkSheet, data: any[]) {
  const keys = Object.keys(data[0] || {});
  ws['!cols'] = keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: maxLen + 2 };
  });
}
```

Apply it in all 3 report generators (quarterly ~line 92, annual ~line 168, custom ~line 228) right after creating the worksheet.

