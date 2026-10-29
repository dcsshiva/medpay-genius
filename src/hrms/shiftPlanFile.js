/**
 * Shift plan files: writes the .xlsx (frozen header, column widths, a drop-down of valid
 * shift codes in every day cell) and reads .xlsx / .xls / .csv back into rows.
 * Layout and checks live in ./shiftPlan.js.
 */
import * as XLSX from 'xlsx';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { FIXED_COLUMNS } from './shiftPlan.js';

const colName = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * SheetJS (community) writes no drop-downs or frozen panes, so they are added to the sheet XML:
 * <sheetViews> goes before <sheetFormatPr>/<cols>/<sheetData>, <dataValidations> after the
 * cell data and before page settings, as the OOXML schema orders them.
 */
export function addSheetExtras(sheetXml, { freezeCol, freezeRow, validationRef, choices }) {
  let xml = sheetXml;
  if (freezeCol || freezeRow) {
    const pane = `<pane xSplit="${freezeCol}" ySplit="${freezeRow}" topLeftCell="${colName(freezeCol)}${freezeRow + 1}" activePane="bottomRight" state="frozen"/>`;
    const views = `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`;
    if (/<sheetViews[\s>][\s\S]*?<\/sheetViews>|<sheetViews\/>/.test(xml)) xml = xml.replace(/<sheetViews[\s>][\s\S]*?<\/sheetViews>|<sheetViews\/>/, views);
    else {
      const at = ['<sheetFormatPr', '<cols', '<sheetData'].map(t => xml.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
      xml = xml.slice(0, at) + views + xml.slice(at);
    }
  }
  if (validationRef && choices && choices.length) {
    const list = `"${choices.join(',')}"`;
    const dv = `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Not a shift code" error="${xmlEsc('Pick a shift code from the list: ' + choices.join(', '))}" sqref="${validationRef}"><formula1>${xmlEsc(list)}</formula1></dataValidation></dataValidations>`;
    const after = ['<hyperlinks', '<printOptions', '<pageMargins', '<pageSetup', '<headerFooter', '<drawing', '<legacyDrawing', '<tableParts', '<extLst', '</worksheet>']
      .map(t => xml.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
    xml = xml.slice(0, after) + dv + xml.slice(after);
  }
  return xml;
}

/** aoa from buildPlanSheet → .xlsx bytes */
export function writePlanXlsx(aoa, { choices, sheetName = 'Shift plan' } = {}) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const width = (aoa[1] || []).length;
  ws['!cols'] = (aoa[1] || []).map((h, i) => ({ wch: i < FIXED_COLUMNS.length ? [12, 10, 26, 20, 22, 8][i] : 9 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
  const files = unzipSync(new Uint8Array(bytes));
  const path = 'xl/worksheets/sheet1.xml';
  const lastRow = Math.max(aoa.length, 3);
  const ref = width > FIXED_COLUMNS.length ? `${colName(FIXED_COLUMNS.length)}3:${colName(width - 1)}${lastRow + 200}` : '';
  files[path] = strToU8(addSheetExtras(strFromU8(files[path]), { freezeCol: 3, freezeRow: 2, validationRef: ref, choices }));
  return zipSync(files, { level: 6 });
}

export function writePlanCsv(aoa) {
  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa), { blankrows: false });
}

/** .xlsx / .xls / .csv bytes → array of arrays (first sheet) */
export function readPlanFile(bytes, fileName = '') {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const wb = /\.csv$/i.test(fileName)
    ? XLSX.read(new TextDecoder().decode(u8), { type: 'string', raw: true })
    : XLSX.read(u8, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
}
