/** WestMed Payroll System — shared types for the ported HRMS prototype. */

/** Who is signed in (from the hr_whoami RPC). */
export interface HrWho {
  role: 'admin' | 'manager' | 'staff';
  empNo: string | null;
  name: string;
}

/** Result of an auth action: nothing on success, `{ error }` on failure. */
export type HrResult = { error?: string } | void | undefined;

export interface HrCycle {
  key: string;      // 'YYYY-MM' of the month the cycle ends in
  label: string;    // '25 Aug 2026 - 24 Sep 2026'
  start: string;    // ISO, inclusive
  end: string;      // ISO, inclusive
  dates: string[];
  /** cycle has ended (prototype per-day rule: gross ÷ days on record) */
  complete: boolean;
}

/** The prototype's in-memory collections, loaded from / saved to the hr_* tables. */
export interface HrData {
  STAFF: any[];
  ATTENDANCE: Record<string, { primaryShift: string | null; records: any[] }>;
  TASKS: any[];
  LEAVES: any[];
  UNITS: { code: string; name: string }[];
  DEPARTMENTS: { code: string; name: string }[];
  DESIGNATIONS: { code: string; name: string }[];
  SHIFT_MASTER: any[];
  PAYROLL_SETTINGS: any;
  HOLIDAYS: { date: string; name: string }[];
  TASK_TEMPLATES: { id: string; title: string; description: string }[];
  ROSTER: Record<string, string>;
  /** Phase 2: finalized (locked) cycle and its frozen payslips, keyed by emp_no */
  PAYROLL: { run: any | null; payslips: Record<string, { summary: any; rows: any[] }> };
}

/** One cycle in the month-on-month trend (null = not finalized / no data). */
export interface HrTrend {
  cycle: HrCycle;
  finalized: boolean;
  attendancePct: number | null;
  lateDays: number | null;
  gross: number | null;
  lop: number | null;
  statutory: number | null;
  otPay: number | null;
  net: number | null;
}

export interface HrAuth {
  staffSignIn(code: string, password: string): Promise<HrResult>;
  adminSignIn(username: string, password: string): Promise<HrResult>;
  signOut(): Promise<void>;
  changePassword(isStaffAccount: boolean, current: string, next: string): Promise<HrResult>;
}

/** What the React host hands to the ported prototype (read live — cycle/cycles are getters). */
export interface HrEnv {
  data: HrData;
  auth: HrAuth;
  orgName: string;
  tempId(prefix: string): string;
  readonly cycle: HrCycle;
  readonly cycles: HrCycle[];
  setCycle(key: string): void;
  scheduleSync(): void;
  ensureAllLogins(): Promise<any>;
  setStaffPassword(empNo: string, password: string): Promise<any>;
  /** Phase 2 */
  finalizeCycle(results: any[], byName: string): Promise<void>;
  reopenCycle(): Promise<void>;
  trends(count: number): Promise<HrTrend[]>;
  excelToCsv(file: File): Promise<string>;
  /** save an attendance import, then reload the selected cycle */
  afterImport(): Promise<void>;
}

/** Handle returned by mountHrms(). */
export interface HrController {
  applySession(who: HrWho | null, fresh: boolean): void;
  rerender(): void;
  takeover(): void;
  setSyncStatus(text: string, isError?: boolean): void;
  destroy(): void;
}
