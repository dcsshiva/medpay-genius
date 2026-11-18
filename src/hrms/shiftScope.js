/* Who may be planned on a shift (pure; tests in shiftScope.test.js).
   • allowedDesignations: null/empty = any designation; otherwise the staff member's designation must be
     listed ('ADMIN' also lets administrators in).
   • allowedDepartments: null/empty = every department; otherwise department codes and MANAGERS
     ('@managers' = role Manager). A staff member whose department (or Manager role) is listed on at least
     one active shift is limited to those shifts plus the ones open to everyone; a department listed on no
     shift keeps every shift. */
export const MANAGERS = '@managers';

const list = (a) => (Array.isArray(a) && a.length ? a : null);

export function scopeKeys(emp) {
  const keys = [];
  if (emp && emp.department) keys.push(emp.department);
  if (emp && emp.role === 'Manager') keys.push(MANAGERS);
  return keys;
}

/** true when some active shift names this staff member's department or Manager role */
export function hasDepartmentShifts(emp, shifts) {
  const keys = scopeKeys(emp);
  if (!keys.length) return false;
  return (shifts || []).some(s => !s.suspended && (list(s.allowedDepartments) || []).some(d => keys.includes(d)));
}

export function shiftAllowed(shift, emp, shifts) {
  if (!shift) return false;
  const ad = list(shift.allowedDesignations);
  if (ad) {
    if (!emp) return false;
    const ok = ad.includes(emp.designation) || (ad.includes('ADMIN') && (emp.role === 'admin' || emp.role === 'super_admin'));
    if (!ok) return false;
  }
  const dp = list(shift.allowedDepartments);
  if (!dp || !emp) return true;
  if (!hasDepartmentShifts(emp, shifts)) return true;
  const keys = scopeKeys(emp);
  return dp.some(d => keys.includes(d));
}

/** shifts a planner may offer for a group of staff (the union of what each may use) */
export function shiftsForStaff(shifts, staff) {
  const people = staff || [];
  return (shifts || []).filter(s => people.some(p => shiftAllowed(s, p, shifts)));
}

/** short label for the Shift Master column */
export function departmentsLabel(shift, departments) {
  const dp = list(shift && shift.allowedDepartments);
  if (!dp) return 'All departments';
  const name = (c) => c === MANAGERS ? 'Reporting managers' : ((departments || []).find(d => d.code === c) || {}).name || c;
  return dp.map(name).join(', ');
}
