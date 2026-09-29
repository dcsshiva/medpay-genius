import { supabase } from '@/integrations/supabase/client';

export interface PtSlab { upto: number; amount: number }

/** Payroll Settings (table public.payroll_settings, single row). */
export interface PayrollSettings {
  cycle_start_day: number;
  pf_enabled: boolean;
  pf_rate: number;
  pf_on_basic: boolean;
  esi_enabled: boolean;
  esi_rate: number;
  esi_ceiling: number;
  pt_enabled: boolean;
  pt_slabs: PtSlab[];
  ot_enabled: boolean;
  ot_multiplier: number;
  ot_grace_minutes: number;
  consolidated_late_minutes: number;   // 480 = 8 h of uncovered lateness → 1 day
  weekly_off_day: number | null;       // 0 = Sunday … 6 = Saturday; null = none
}

/**
 * Indicative defaults only — confirm PF / ESI / PT rates and slabs with your accountant.
 */
export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  cycle_start_day: 25,
  pf_enabled: true,
  pf_rate: 12,
  pf_on_basic: true,
  esi_enabled: true,
  esi_rate: 0.75,
  esi_ceiling: 21000,
  pt_enabled: true,
  pt_slabs: [
    { upto: 21000, amount: 0 },
    { upto: 30000, amount: 135 },
    { upto: 45000, amount: 315 },
    { upto: 60000, amount: 690 },
    { upto: 75000, amount: 1025 },
    { upto: 99999999, amount: 1250 },
  ],
  ot_enabled: true,
  ot_multiplier: 1.5,
  ot_grace_minutes: 15,
  consolidated_late_minutes: 480,
  weekly_off_day: 0,
};

export async function fetchPayrollSettings(): Promise<PayrollSettings> {
  try {
    const { data, error } = await (supabase as any)
      .from('payroll_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error || !data) return DEFAULT_PAYROLL_SETTINGS;
    return {
      ...DEFAULT_PAYROLL_SETTINGS,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined)),
      weekly_off_day: data.weekly_off_day ?? null,
      pt_slabs: Array.isArray(data.pt_slabs) && data.pt_slabs.length ? data.pt_slabs : DEFAULT_PAYROLL_SETTINGS.pt_slabs,
    } as PayrollSettings;
  } catch {
    return DEFAULT_PAYROLL_SETTINGS;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export interface PayCycle {
  start: string;   // ISO, inclusive
  end: string;     // ISO, inclusive
  key: string;     // 'YYYY-MM' of the month the cycle ENDS in — used as payroll_month
  label: string;   // '25 Aug 2026 – 24 Sep 2026'
  dates: string[]; // every date in the cycle
}

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** The pay cycle whose END falls in the given month ('YYYY-MM'). */
export function cycleForMonth(monthKey: string, startDay: number): PayCycle {
  const [y, m] = monthKey.split('-').map(Number);
  let start: Date, end: Date;
  if (startDay <= 1) {
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0);
  } else {
    start = new Date(y, m - 2, startDay);
    end = new Date(y, m - 1, startDay - 1);
  }
  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(isoDate(d));
  return { start: isoDate(start), end: isoDate(end), key: monthKey, label: `${fmt(start)} – ${fmt(end)}`, dates };
}

/** The pay cycle that contains the given date. */
export function cycleContaining(date: Date | string, startDay: number): PayCycle {
  const d = typeof date === 'string' ? parseISO(date) : date;
  let y = d.getFullYear();
  let m = d.getMonth() + 1; // 1-12
  if (startDay > 1 && d.getDate() >= startDay) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return cycleForMonth(`${y}-${pad(m)}`, startDay);
}
