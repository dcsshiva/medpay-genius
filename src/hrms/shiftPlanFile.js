/**
 * Shift plan files. Writes .xlsx — one sheet per reporting manager, frozen header, a drop-down
 * of valid shift codes and WO in every day cell, and sheet protection so only the (yellow) day
 * cells can be edited — plus .xls (same sheets, no locking: the old format can't carry it from
 * here) and .csv (one table). Reads .xlsx / .xls / .csv back into sheets. Layout and checks:
 * ./shiftPlan.js.
 */
import * as XLSX from 'xlsx';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { FIXED_COLUMNS } from './shiftPlan.js';

const colName = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const colIndex = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstOf = (xml, tags) => tags.map(t => xml.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];

/**
 * SheetJS (community) writes no drop-downs, frozen panes or protection, so they are added to the
 * sheet XML in the order the OOXML schema requires: <sheetViews> before <sheetFormatPr>/<cols>/
 * <sheetData>; <sheetProtection> right after the cell data; <dataValidations> before page settings.
 */
export function addSheetExtras(sheetXml, { freezeCol, freezeRow, validationRef, choices, protect }) {
  let xml = sheetXml;
  if (freezeCol || freezeRow) {
    const pane = `<pane xSplit="${freezeCol}" ySplit="${freezeRow}" topLeftCell="${colName(freezeCol)}${freezeRow + 1}" activePane="bottomRight" state="frozen"/>`;
    const views = `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`;
    if (/<sheetViews[\s>][\s\S]*?<\/sheetViews>|<sheetViews\/>/.test(xml)) xml = xml.replace(/<sheetViews[\s>][\s\S]*?<\/sheetViews>|<sheetViews\/>/, views);
    else { const at = firstOf(xml, ['<sheetFormatPr', '<cols', '<sheetData']); xml = xml.slice(0, at) + views + xml.slice(at); }
  }
  if (protect) {
    // sheet="1" turns protection on; formatColumns/formatRows="0" still lets people widen columns
    const p = '<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0"/>';
    xml = /<sheetData\/>/.test(xml) ? xml.replace('<sheetData/>', '<sheetData/>' + p) : xml.replace('</sheetData>', '</sheetData>' + p);
  }
  if (validationRef && choices && choices.length) {
    const list = `"${choices.join(',')}"`;
    const dv = `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Not a shift code" error="${xmlEsc('Pick a shift code from the list: ' + choices.join(', '))}" sqref="${validationRef}"><formula1>${xmlEsc(list)}</formula1></dataValidation></dataValidations>`;
    const at = firstOf(xml, ['<hyperlinks', '<printOptions', '<pageMargins', '<pageSetup', '<headerFooter', '<ignoredErrors', '<drawing', '<legacyDrawing', '<tableParts', '<extLst', '</worksheet>']);
    xml = xml.slice(0, at) + dv + xml.slice(at);
  }
  return xml;
}

/** Adds the two cell styles the plan uses to styles.xml: header (bold, grey) and editable day (unlocked, yellow). */
export function addPlanStyles(stylesXml) {
  let xml = stylesXml;
  const bump = (tag, item) => {
    const m = xml.match(new RegExp(`<${tag} count="(\\d+)"`));
    const n = m ? +m[1] : 0;
    xml = xml.replace(new RegExp(`<${tag} count="\\d+"([^>]*)>([\\s\\S]*?)</${tag}>`), (_, attrs, inner) => `<${tag} count="${n + 1}"${attrs}>${inner}${item}</${tag}>`);
    return n;
  };
  const bold = bump('fonts', '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>');
  const grey = bump('fills', '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF3"/><bgColor indexed="64"/></patternFill></fill>');
  const yellow = bump('fills', '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF5CC"/><bgColor indexed="64"/></patternFill></fill>');
  const header = bump('cellXfs', `<xf numFmtId="0" fontId="${bold}" fillId="${grey}" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`);
  const editable = bump('cellXfs', `<xf numFmtId="0" fontId="0" fillId="${yellow}" borderId="0" xfId="0" applyFill="1" applyProtection="1"><protection locked="0"/></xf>`);
  return { xml, header, editable };
}

/** Gives cells a style: styleFor(colIndex, rowNumber) → style index or undefined. */
export function styleCells(sheetXml, styleFor) {
  return sheetXml.replace(/<c r="([A-Z]+)(\d+)"((?:(?!\bs=)[^>])*?)(\/?)>/g, (all, col, row, rest, close) => {
    const st = styleFor(colIndex(col), +row);
    return st == null ? all : `<c r="${col}${row}" s="${st}"${rest}${close}>`;
  });
}

const widths = (aoa, kind) => kind === 'help' ? [{ wch: 14 }, { wch: 36 }, { wch: 8 }, { wch: 8 }]
  : (aoa[1] || []).map((h, i) => ({ wch: i < FIXED_COLUMNS.length ? [12, 10, 26, 20, 22, 8, 10][i] : 9 }));
const toBook = (sheets) => {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa);
    ws['!cols'] = widths(s.aoa, s.kind);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return wb;
};

/** sheets = [{ name, aoa, kind: 'plan' | 'help' }] (buildPlanBook) or one aoa → .xlsx bytes */
export function writePlanXlsx(sheets, { choices } = {}) {
  const list = Array.isArray(sheets[0]) ? [{ name: 'Shift plan', aoa: sheets, kind: 'plan' }] : sheets;
  const files = unzipSync(new Uint8Array(XLSX.write(toBook(list), { type: 'array', bookType: 'xlsx', compression: true })));
  const styles = addPlanStyles(strFromU8(files['xl/styles.xml']));
  files['xl/styles.xml'] = strToU8(styles.xml);
  list.forEach((s, i) => {
    const path = `xl/worksheets/sheet${i + 1}.xml`;
    let xml = strFromU8(files[path]);
    if (s.kind === 'plan') {
      const width = (s.aoa[1] || []).length;
      const lastRow = s.aoa.length;
      const first = FIXED_COLUMNS.length;
      xml = styleCells(xml, (c, r) => (r <= 2 ? styles.header : (r >= 3 && c >= first && c < width ? styles.editable : undefined)));
      const ref = width > first && lastRow >= 3 ? `${colName(first)}3:${colName(width - 1)}${lastRow}` : '';
      xml = addSheetExtras(xml, { freezeCol: 3, freezeRow: 2, validationRef: ref, choices, protect: true });
    } else {
      xml = styleCells(xml, (c, r) => (r === 1 || r === 9 ? styles.header : undefined));
      xml = addSheetExtras(xml, { protect: true });
    }
    files[path] = strToU8(xml);
  });
  return zipSync(files, { level: 6 });
}

/** Same sheets as Excel 97-2003 (.xls) — no drop-down or locking in this format. */
export function writePlanXls(sheets) {
  const list = Array.isArray(sheets[0]) ? [{ name: 'Shift plan', aoa: sheets, kind: 'plan' }] : sheets;
  return new Uint8Array(XLSX.write(toBook(list), { type: 'array', bookType: 'biff8' }));
}

export function writePlanCsv(aoa) {
  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa), { blankrows: false });
}

/** .xlsx / .xls / .csv bytes → [{ name, aoa }] for every sheet */
export function readPlanBookFile(bytes, fileName = '') {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const wb = /\.csv$/i.test(fileName)
    ? XLSX.read(new TextDecoder().decode(u8), { type: 'string', raw: true })
    : XLSX.read(u8, { type: 'array', cellDates: true });
  return wb.SheetNames.map(name => ({ name, aoa: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false }) }));
}

/** first sheet only (kept for single-sheet callers) */
export function readPlanFile(bytes, fileName = '') {
  return readPlanBookFile(bytes, fileName)[0].aoa;
}
