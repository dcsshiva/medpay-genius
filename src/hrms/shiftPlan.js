/**
 * Shift plan export / import for the Shift Planner (pure; see shiftPlan.test.js).
 *
 * One layout for every file — the administrator's combined file and each reporting manager's
 * file — so the same sheet goes out and comes back:
 *
 *   row 1   WestMed shift plan | <cycle label> | Cycle | <key> | Exported | <ISO time> | By | <name> | Scope | <who>
 *   row 2   Unit | Code | Name | Designation | Reporting Manager | Default Shift | Weekly Off | 2026-10-26 (Mon) | …
 *   row 3…  one row per staff member, sorted by unit then code
 *
 * The administrator's file has one sheet per reporting manager (buildPlanBook) plus a "How to fill"
 * sheet; a manager's file has their sheet only. In the .xlsx only the day cells can be edited.
 *
 * Cells hold the shift letter shown in the planner (G1, MS, NS …) or WO for a planned day off.
 * Rows are matched on Code only; a blank cell leaves that day unchanged. Only differences from
 * the default (Staff Master shift, or WO on the Staff Master weekly-off day) are stored.
 */
export const PLAN_OFF = 'WO';
export const FIXED_COLUMNS = ['Unit', 'Code', 'Name', 'Designation', 'Reporting Manager', 'Default Shift', 'Weekly Off'];
export const HELP_SHEET = 'How to fill';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};
export const weekdayOf = (date) => { const [y, m, d] = date.split('-').map(Number); return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
export const dateHeader = (date) => `${date} (${weekdayOf(date)})`;
const rosterKey = (empNo, date) => empNo + '|' + date;

/** What applies with no planner entry: WO on the Staff Master weekly-off day, else the Staff Master shift. */
export function defaultPlanCode(staff, date) {
  const off = String(staff.weeklyOff || '').split(',').map(s => s.trim());
  if (off.includes(weekdayOf(date))) return PLAN_OFF;
  return staff.shiftCode || '';
}
export function plannedCode(roster, staff, date) {
  return (roster || {})[rosterKey(staff.empNo, date)] || defaultPlanCode(staff, date);
}

/** shift code ↔ the letter people see; letters, codes and names are all accepted when reading */
export function shiftTokens(shifts) {
  const label = new Map([[PLAN_OFF, PLAN_OFF]]);
  const lookup = new Map([[PLAN_OFF, { code: PLAN_OFF }]]);
  for (const s of shifts || []) {
    label.set(s.code, s.letter || s.code);
    for (const t of [s.letter, s.code, s.name]) if (t) lookup.set(String(t).trim().toUpperCase(), { code: s.code, shift: s });
  }
  return { label: (code) => (code ? label.get(code) || code : ''), lookup: (raw) => lookup.get(String(raw).trim().toUpperCase()) || null };
}

/** The values offered in each cell's drop-down: every active shift's letter, then WO. */
export function planChoices(shifts) {
  return [...(shifts || []).filter(s => !s.suspended).map(s => s.letter || s.code), PLAN_OFF];
}

/**
 * Rows for the file (array of arrays). `names` resolves display names:
 * { unit(code), designation(code), manager(empNo) }.
 */
export function buildPlanSheet({ cycle, staff, roster, shifts, names, exportedAt, exportedBy, scope }) {
  const tok = shiftTokens(shifts);
  const n = names || {};
  const unit = n.unit || (x => x || '');
  const sorted = [...staff].sort((a, b) =>
    String(unit(a.unitCode)).localeCompare(String(unit(b.unitCode))) || String(a.empNo).localeCompare(String(b.empNo), undefined, { numeric: true }));
  const meta = ['WestMed shift plan', cycle.label, 'Cycle', cycle.key, 'Exported', exportedAt, 'By', exportedBy || '', 'Scope', scope || ''];
  const header = [...FIXED_COLUMNS, ...cycle.dates.map(dateHeader)];
  const rows = sorted.map(s => [
    unit(s.unitCode) || '', s.empNo, s.name || '',
    (n.designation ? n.designation(s.designation) : s.designation) || '',
    (n.manager ? n.manager(s.reportingManager) : s.reportingManager) || '',
    tok.label(s.shiftCode),
    s.weeklyOff || '',
    ...cycle.dates.map(d => tok.label(plannedCode(roster, s, d))),
  ]);
  return [meta, header, ...rows];
}

/** Excel sheet names: ≤31 characters, none of : \ / ? * [ ], unique. */
export function sheetName(name, taken) {
  const base = (String(name || '').replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sheet').slice(0, 31);
  let n = base, i = 2;
  while (taken.has(n.toLowerCase()) || n.toLowerCase() === HELP_SHEET.toLowerCase()) { const suffix = ` (${i++})`; n = base.slice(0, 31 - suffix.length) + suffix; }
  taken.add(n.toLowerCase());
  return n;
}

/**
 * The administrator's workbook: one sheet per reporting manager ("No reporting manager" last),
 * each in the buildPlanSheet layout, then the "How to fill" sheet. → [{ name, aoa, kind }]
 */
export function buildPlanBook(opts) {
  const n = opts.names || {};
  const managerName = (code) => (n.manager ? n.manager(code) : code) || '';
  const groups = new Map();
  for (const s of opts.staff) {
    const key = managerName(s.reportingManager) ? s.reportingManager : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const keys = [...groups.keys()].sort((a, b) => (!a) - (!b) || managerName(a).localeCompare(managerName(b)));
  const taken = new Set();
  const sheets = keys.map(k => ({
    name: sheetName(k ? managerName(k) : 'No reporting manager', taken),
    kind: 'plan',
    aoa: buildPlanSheet({ ...opts, staff: groups.get(k), scope: k ? 'Reporting manager: ' + managerName(k) : 'No reporting manager' }),
  }));
  return [...sheets, { name: HELP_SHEET, kind: 'help', aoa: planHelp(opts.cycle, opts.shifts) }];
}

/** The "How to fill" sheet (no "Code" header, so the import skips it). */
export function planHelp(cycle, shifts) {
  return [
    ['How to fill the shift plan'],
    ['Pay cycle', cycle.label],
    [],
    ['Only the yellow day cells can be changed. Everything else is locked.'],
    ['Pick a shift from the drop-down in each day, or WO for a weekly off (day off).'],
    ['Leave a day blank to keep it as it is. Rows are matched on the staff Code.'],
    ['Upload the file with Shift Planner → Import plan (.xlsx, .xls or .csv). Nothing is saved until you confirm the preview.'],
    [],
    ['Shift code', 'Shift', 'Start', 'End'],
    ...(shifts || []).filter(s => !s.suspended).map(s => [s.letter || s.code, s.name, s.start || '', s.end || '']),
    [PLAN_OFF, 'Weekly off (day off)', '', ''],
  ];
}

const clean = (v) => (v == null ? '' : String(v).trim());
/** Excel may hand back a header as text, a date serial number or a Date. */
export function parseHeaderDate(v, cycle) {
  if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = clean(v);
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*(?:[-\s,]+(\d{4}))?/);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (!mo) return null;
    if (m[3]) return iso(+m[3], mo, +m[1]);
    const years = cycle ? [...new Set([cycle.start.slice(0, 4), cycle.end.slice(0, 4)].map(Number))] : [];
    for (const y of years) { const d = iso(y, mo, +m[1]); if (d && d >= cycle.start && d <= cycle.end) return d; }
  }
  return null;
}
const codeOf = (v) => (typeof v === 'number' && Number.isInteger(v) ? String(v) : clean(v).replace(/\.0+$/, ''));

/** Reads the sheet back: { meta, dateColumns, badColumns, rows, error } */
export function readPlanSheet(aoa, { cycle, sheet } = {}) {
  const grid = (aoa || []).map(r => (Array.isArray(r) ? r : []));
  const h = grid.slice(0, 15).findIndex(r => r.some(c => clean(c).toLowerCase() === 'code'));
  if (h < 0) return { error: 'No header row with a "Code" column was found. Export a fresh file from the Shift Planner and fill that in.' };
  const meta = {};
  for (const r of grid.slice(0, h)) {
    r.forEach((c, i) => {
      const k = clean(c).toLowerCase();
      if (k === 'cycle') meta.cycleKey = clean(r[i + 1]);
      if (k === 'exported') meta.exportedAt = clean(r[i + 1]);
    });
  }
  const header = grid[h];
  const codeCol = header.findIndex(c => clean(c).toLowerCase() === 'code');
  const nameCol = header.findIndex(c => clean(c).toLowerCase() === 'name');
  const dateColumns = [];
  const badColumns = [];
  header.forEach((c, i) => {
    if (i === codeCol || FIXED_COLUMNS.some(f => f.toLowerCase() === clean(c).toLowerCase())) return;
    const d = parseHeaderDate(c, cycle);
    if (!d) return;
    if (cycle && (d < cycle.start || d > cycle.end)) badColumns.push({ col: i, date: d });
    else dateColumns.push({ col: i, date: d });
  });
  const rows = [];
  grid.slice(h + 1).forEach((r, k) => {
    const empNo = codeOf(r[codeCol]);
    if (!empNo) return;
    const cells = {};
    dateColumns.forEach(({ col, date }) => { const v = clean(r[col]); if (v) cells[date] = v; });
    rows.push({ line: h + k + 2, sheet, empNo, name: nameCol >= 0 ? clean(r[nameCol]) : '', cells });
  });
  return { meta, dateColumns, badColumns, rows };
}

/** Every plan sheet of a workbook ([{ name, aoa }]) read as one; the help sheet is skipped. */
export function readPlanBook(sheets, { cycle } = {}) {
  const reads = (sheets || []).filter(s => String(s.name).toLowerCase() !== HELP_SHEET.toLowerCase())
    .map(s => readPlanSheet(s.aoa, { cycle, sheet: sheets.length > 1 ? s.name : undefined }));
  const ok = reads.filter(r => !r.error);
  if (!ok.length) return reads[0] || { error: 'The file is empty.' };
  const bad = new Map();
  ok.forEach(r => r.badColumns.forEach(b => bad.set(b.date, b)));
  return { meta: ok[0].meta, dateColumns: ok[0].dateColumns, badColumns: [...bad.values()], rows: ok.flatMap(r => r.rows) };
}
const sameName = (a, b) => String(a).toUpperCase().replace(/[^A-Z]/g, '') === String(b).toUpperCase().replace(/[^A-Z]/g, '');

/**
 * Works out what an import would change.
 * ctx: { cycle, staffByCode: Map(empNo → staff incl. inactive, with .active), roster, rosterMeta (key → ISO
 *        updated time), shifts, canEdit(staff), isAdmin, today, finalized, allowedFor(shift, staff) }
 * → { changes:[{empNo,name,date,from,to}], conflicts:[…same + changedAt], errors:[{line,empNo,date,message}],
 *     unchanged, staffCount, checkedConflicts }
 * from / to are shift codes ('' = nothing planned); to === default → the stored override is removed.
 */
export function planChanges(read, ctx) {
  const out = { changes: [], conflicts: [], errors: [], unchanged: 0, staffCount: 0, checkedConflicts: !!(read.meta && read.meta.exportedAt) };
  if (read.error) { out.errors.push({ message: read.error }); return out; }
  const { cycle } = ctx;
  if (read.meta && read.meta.cycleKey && cycle && read.meta.cycleKey !== cycle.key) {
    out.errors.push({ message: `This file is for pay cycle ${read.meta.cycleKey}, but ${cycle.label} is open. Choose that cycle at the top of the page, then import again.` });
    return out;
  }
  if (!read.dateColumns.length) {
    out.errors.push({ message: read.badColumns.length ? `None of the day columns fall inside ${cycle.label}.` : 'No day columns (like "2026-10-26 (Mon)") were found in the header row.' });
    return out;
  }
  read.badColumns.forEach(b => out.errors.push({ date: b.date, message: `${b.date} is outside ${cycle.label} — column ignored.` }));
  if (ctx.finalized) {
    out.errors.push({ message: `${cycle.label} is finalized. Reopen it on the Salary tab before changing shifts.` });
    return out;
  }
  const tok = shiftTokens(ctx.shifts);
  const exportedAt = read.meta && read.meta.exportedAt ? Date.parse(read.meta.exportedAt) : NaN;
  const seen = new Set();
  for (const row of read.rows) {
    const s = ctx.staffByCode.get(row.empNo);
    const fail = (message, date) => out.errors.push({ line: row.line, ...(row.sheet ? { sheet: row.sheet } : {}), empNo: row.empNo, date, message });
    if (!s) { fail('No staff member with this code.'); continue; }
    if (row.name && !sameName(row.name, s.name)) { fail(`Code ${row.empNo} is ${s.name}, but this row says "${row.name}" — the row was skipped.`); continue; }
    if (seen.has(row.empNo)) { fail('Code appears twice — only the first row was used.'); continue; }
    seen.add(row.empNo);
    if (s.active === false) { fail(`${s.name} is inactive.`); continue; }
    if (!ctx.canEdit(s)) { fail(`${s.name} is not one of your staff.`); continue; }
    out.staffCount++;
    for (const [date, raw] of Object.entries(row.cells)) {
      const hit = tok.lookup(raw);
      if (!hit) { fail(`"${raw}" is not a shift code — use one of ${planChoices(ctx.shifts).join(', ')}.`, date); continue; }
      if (hit.shift && hit.shift.suspended) { fail(`${hit.shift.name} is suspended in Shift Master.`, date); continue; }
      if (hit.shift && ctx.allowedFor && !ctx.allowedFor(hit.shift, s)) { fail(`${hit.shift.name} is not allowed for ${s.name}'s designation.`, date); continue; }
      const key = rosterKey(s.empNo, date);
      const override = (ctx.roster || {})[key] || '';
      const def = defaultPlanCode(s, date);
      const current = override || def;
      if (hit.code === current) { out.unchanged++; continue; }
      if (!ctx.isAdmin && date < ctx.today) { fail('Past date — only an administrator can change it.', date); continue; }
      const change = { empNo: s.empNo, name: s.name, date, from: current, to: hit.code, clear: hit.code === def };
      const changedAt = (ctx.rosterMeta || {})[key];
      if (override && !isNaN(exportedAt) && changedAt && Date.parse(changedAt) > exportedAt) {
        out.conflicts.push({ ...change, changedAt });
        continue;
      }
      out.changes.push(change);
    }
  }
  return out;
}
