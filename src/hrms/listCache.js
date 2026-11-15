/**
 * Fewer server requests when the app opens (pure; see listCache.test.js).
 *
 *  • Shared lists that rarely change (units, departments, designations, shifts, holidays, task
 *    templates, payroll settings, the staff name list) are kept on the device. One small call
 *    (hr_data_version_stamps, migration 0029) says when each last changed; only changed lists are
 *    downloaded again. Full staff records (salary, bank details) are never kept on the device.
 *  • Leave requests: from the start of the previous pay cycle, plus anything still pending — not
 *    the whole history. Older cycles add their leave when they are opened.
 *  • Coming back to the app after a while refreshes the day-to-day data only.
 */
export const CACHED_LISTS = [
  { name: 'units', table: 'hr_units' },
  { name: 'departments', table: 'hr_departments' },
  { name: 'designations', table: 'hr_designations' },
  { name: 'shifts', table: 'hr_shifts' },
  { name: 'holidays', table: 'hr_holidays' },
  { name: 'templates', table: 'hr_task_templates' },
  { name: 'settings', table: 'hr_settings' },
  { name: 'directory', table: 'hr_staff' },
];
const TABLE = Object.fromEntries(CACHED_LISTS.map(l => [l.name, l.table]));

/** device cache key: per account, role and app version (a new version starts fresh) */
export function cacheKey(uid, role, appVersion) { return `hrCache:1:${appVersion || '-'}:${uid}:${role}`; }

/** may this list come from the device cache? (only when the server says it has not changed) */
export function useCached(cache, versions, name) {
  const t = TABLE[name];
  return !!(t && cache && cache.lists && cache.lists[name] !== undefined && versions && versions[t]
    && cache.versions && cache.versions[t] === versions[t]);
}

/** did any cached list change between two version maps? (null = unknown → yes) */
export function listsChanged(before, after) {
  if (!before || !after) return true;
  return CACHED_LISTS.some(l => before[l.table] !== after[l.table]);
}

/** start of the pay cycle before the one starting on cycleStart (same day, previous month) */
export function previousCycleStart(cycleStart) {
  const [y, m, d] = cycleStart.split('-').map(Number);
  const prevMonthDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 2, Math.min(d, prevMonthDays)));
  return t.toISOString().slice(0, 10);
}

/** refresh the day-to-day data when the app comes back after `minMs` or more */
export function shouldRefresh(lastLoadedAt, now, minMs = 15 * 60 * 1000) {
  return !!lastLoadedAt && now - lastLoadedAt >= minMs;
}
