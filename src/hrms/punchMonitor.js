/**
 * Reads the biometric device's "Employee Punch Monitor" export (one day per file), already
 * split into cells per line. Pure; see punchMonitor.test.js.
 *
 * Column positions are taken from the header row ("SNo. | Emp Code | Name | Last Punch |
 * Direction | Punch Records | Status"), because the export does not always put them in the
 * same place: some days have an empty column after "Emp Code", some don't. Reading fixed
 * positions turned a punch time into a staff member's name ("17:57") and lost the punches.
 * Each value is also checked: a name must contain letters and not look like a time, punches
 * must be HH:MM, the code must be digits — otherwise the row is searched for the right cell.
 */
const TIME = /^\d{1,2}:\d{2}$/;
const STATUS_WORDS = /present|absent|weekly\s*off|week\s*off|holiday|leave|\bcl\b/i;

/** True when s can be a person's name (has letters; not a time, number or status word). */
export function looksLikeName(s) {
  const t = String(s || '').trim();
  if (!t || !/[A-Za-z]/.test(t)) return false;
  if (/^[\d\s:.,/-]+$/.test(t)) return false;
  if (/^(not\s*)?present$|^absent$/i.test(t)) return false;
  return true;
}

const punchList = (s) => String(s || '').split(',').map(p => p.trim()).filter(p => TIME.test(p));
const isCode = (s) => /^\d{3,}$/.test(String(s || '').trim());

export function punchMonitorColumns(header) {
  const find = (re) => header.findIndex(c => re.test(String(c || '').trim()));
  return {
    code: find(/^emp(loyee)?\.?\s*(code|no)/i),
    name: find(/^(emp(loyee)?\s*)?name$/i),
    last: find(/^last\s*punch/i),
    punches: find(/^punch\s*records?$/i),
    status: find(/^status$/i),
  };
}

/** One data row → { code, name, punches[], statusText } (name '' when the row has none). */
export function punchMonitorRow(cells, cols) {
  const at = (i) => (i >= 0 && i < cells.length ? String(cells[i] || '').trim() : '');
  let code = at(cols.code);
  if (!isCode(code)) code = (cells.slice(1).find(isCode) || '').trim();

  let name = at(cols.name);
  if (!looksLikeName(name)) {
    const codeIdx = cells.findIndex(c => String(c || '').trim() === code);
    name = (cells.slice(codeIdx + 1).find(c => looksLikeName(c) && !STATUS_WORDS.test(c)) || '').trim();
  }

  let punches = punchList(at(cols.punches));
  if (!punches.length) {
    const listCell = cells.find(c => String(c || '').includes(',') && punchList(c).length);
    if (listCell) punches = punchList(listCell);
    else if (TIME.test(at(cols.last))) punches = [at(cols.last)];
  }

  let statusText = at(cols.status);
  if (!STATUS_WORDS.test(statusText)) statusText = (cells.find(c => STATUS_WORDS.test(String(c || ''))) || '').trim();

  return { code, name, punches, statusText };
}

/**
 * rows: array of cell arrays for the whole file.
 * parseDate('28-Oct-2026') → '2026-10-28' | null;  mapStatus('Not Present') → 'A' | 'P' | … | null
 * → { date, records: [{empNo, date, status, in?, out?}], names: {code: name}, warnings: [] }
 */
export function parsePunchMonitor(rows, { parseDate, mapStatus }) {
  const res = { date: null, records: [], names: {}, warnings: [] };
  let cols = null;
  for (const raw of rows) {
    const cells = raw.map(c => String(c ?? '').trim());
    if (!res.date && /^date$/i.test(cells[0] || '')) {
      const d = cells.slice(1).map(parseDate).find(Boolean);
      if (d) res.date = d;
      continue;
    }
    if (!cols && /^s\.?\s*no/i.test(cells[0] || '')) {
      cols = punchMonitorColumns(cells);
      if (cols.code < 0) cols.code = 1;
      continue;
    }
    if (!cols) continue;
    const row = punchMonitorRow(cells, cols);
    if (!row.code) continue;
    if (row.name) res.names[row.code] = row.name;
    if (!res.date) { res.warnings.push('No report date found in the Punch Monitor header.'); continue; }
    const status = mapStatus(row.statusText) || (row.punches.length ? 'P' : 'A');
    const rec = { empNo: row.code, date: res.date, status };
    if (row.punches.length) { rec.in = row.punches[0]; rec.out = row.punches[row.punches.length - 1]; }
    res.records.push(rec);
  }
  return res;
}
