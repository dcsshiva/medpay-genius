import { format } from 'date-fns';

export interface PrintColumn {
  label: string;
  key: string;
}

export interface PrintReportOptions {
  title: string;
  columns: PrintColumn[];
  data: Record<string, any>[];
  orientation?: 'portrait' | 'landscape';
  subtitle?: string;
  companyName?: string;
}

export function printReport(options: PrintReportOptions) {
  const {
    title,
    columns,
    data,
    orientation = 'landscape',
    subtitle,
    companyName = 'WestMed Hospital',
  } = options;

  const now = new Date();
  const dateStr = format(now, 'dd/MM/yyyy hh:mm a');
  const recordCount = data.length;

  const tableRows = data
    .map(
      (row, idx) =>
        `<tr class="${idx === data.length - 1 && isTotalRow(row, columns) ? 'total-row' : ''}">
          ${columns.map((col) => `<td>${row[col.key] ?? ''}</td>`).join('')}
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: ${orientation}; margin: 10mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
  .header-left h1 { font-size: 16px; margin-bottom: 2px; }
  .header-left h2 { font-size: 13px; font-weight: 600; color: #333; }
  .header-left .subtitle { font-size: 11px; color: #555; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background-color: #2c3e7a; color: #fff; font-weight: 600; text-align: left; padding: 5px 6px; font-size: 10px; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 10px; word-break: break-word; }
  tr:nth-child(even) { background-color: #f7f7f7; }
  .total-row td { font-weight: 700; background-color: #e8e8e8 !important; border-top: 2px solid #333; }
  .footer { margin-top: 10px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${companyName}</h1>
      <h2>${title}</h2>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="header-right">
      <div>Date: ${dateStr}</div>
      <div>Records: ${recordCount}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>${columns.map((col) => `<th>${col.label}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">Generated from ${companyName} Management System</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the report.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

function isTotalRow(row: Record<string, any>, columns: PrintColumn[]): boolean {
  const firstVal = String(row[columns[0]?.key] ?? '').toUpperCase();
  return firstVal.includes('TOTAL') || firstVal.includes('NET TOTAL');
}

export function autoFitColumns(ws: any, data: any[]) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map((key: string) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row: any) => String(row[key] ?? '').length)
    );
    return { wch: maxLen + 2 };
  });
}
