// WestMed Payroll System — only the HRMS screens from the Selvantra HRMS prototype are shown.
// Everything else (doctors, visits, patient payments, bank advice, TDS, complaints, chat,
// appraisals, AI assistant, website settings…) is hidden from navigation, permissions UI and
// tab dispatch. Historical data and backend privileges are left untouched.

/** Screen keys that may appear / open in this app, in sidebar order. */
export const HRMS_SCREEN_ORDER = [
  'dashboard',         // Overview
  'appraisals',        // Staff Master (staff hub; key kept for existing permissions)
  'masters',           // Masters
  'attendance',        // Attendance / Shift Ledger
  'tasks',             // Tasks
  'leave-permission',  // Leave & Permission (apply)
  'leave-approvals',   // Leave & Permission approvals
  'payroll',           // Salary
  'audit-trail',       // Audit (admin)
  'settings',          // Settings / user access (admin)
] as const;

const allowed = new Set<string>([...HRMS_SCREEN_ORDER, 'staff', 'staff-dashboard']);

/** Menu labels matching the HRMS prototype (override screen_registry names). */
export const HRMS_SCREEN_LABELS: Record<string, string> = {
  'dashboard': 'Overview',
  'appraisals': 'Staff Master',
  'staff': 'Staff Master',
  'masters': 'Masters',
  'attendance': 'Attendance',
  'tasks': 'Tasks',
  'leave-permission': 'Leave & Permission',
  'leave-approvals': 'Leave Approvals',
  'payroll': 'Salary',
  'audit-trail': 'Audit Trail',
  'settings': 'Settings',
};

export const isStaffOnlyScreen = (screen: string): boolean => allowed.has(screen);
export const staffOnlyTab = (screen: string): string => isStaffOnlyScreen(screen) ? screen : 'dashboard';
export const hrmsLabel = (screen: string, fallback: string): string => HRMS_SCREEN_LABELS[screen] ?? fallback;
export const hrmsOrder = (screen: string): number => {
  const i = (HRMS_SCREEN_ORDER as readonly string[]).indexOf(screen);
  return i === -1 ? 999 : i;
};
