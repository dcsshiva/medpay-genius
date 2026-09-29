import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShiftDefinition {
  id: string;
  shift_name: string;
  start_time: string;   // 'HH:MM:SS'
  end_time: string;
  window_from: string;
  window_to: string;
  grace_minutes: number;
  is_active: boolean;
  sort_order: number;
  /** HRMS: short code (S1, S2…) used by Staff Master default shift and the Shift Planner. */
  shift_code?: string | null;
  /** HRMS: one-letter badge (G / S / N) shown in grids. */
  shift_letter?: string | null;
  /** HRMS: extra band after grace that is forgiven a limited number of times per pay cycle. */
  extra_late_minutes?: number | null;
  /** HRMS: how many times per pay cycle the extra-late band may be used. */
  extra_late_max_per_month?: number | null;
}

export interface ResolvedShift {
  shiftName: string | null;
  isLate: boolean;
  start: string | null; // 'HH:MM'
  end: string | null;   // 'HH:MM'
}

export const hhmm = (t?: string | null): string | null =>
  t ? String(t).slice(0, 5) : null;

export const toMinutes = (t?: string | null): number | null => {
  const v = hhmm(t);
  if (!v || !/^\d{1,2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
};

/** Circular distance in minutes between two clock times (handles midnight wrap). */
const clockDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};

/** True when `min` sits inside [from, to], supporting windows that cross midnight. */
const inWindow = (min: number, from: number, to: number): boolean =>
  from <= to ? min >= from && min <= to : min >= from || min <= to;

/**
 * Decides which configured shift a punch-in belongs to and whether it is late.
 * - Punch inside a shift's detection window → that shift.
 * - Punch outside every window → nearest shift by start time, always Late.
 * - Late = more than `grace_minutes` after the shift start.
 */
export const resolveShift = (
  inTime: string | null | undefined,
  shifts: ShiftDefinition[],
): ResolvedShift => {
  const min = toMinutes(inTime);
  const active = (shifts || []).filter(s => s.is_active);
  if (min === null || active.length === 0) {
    return { shiftName: null, isLate: false, start: null, end: null };
  }

  let matched = active.find(s => {
    const from = toMinutes(s.window_from);
    const to = toMinutes(s.window_to);
    return from !== null && to !== null && inWindow(min, from, to);
  });
  let outsideAllWindows = false;

  if (!matched) {
    outsideAllWindows = true;
    matched = active.reduce((best, s) => {
      const bs = toMinutes(best.start_time) ?? 0;
      const ss = toMinutes(s.start_time) ?? 0;
      return clockDistance(min, ss) < clockDistance(min, bs) ? s : best;
    }, active[0]);
  }

  const start = toMinutes(matched.start_time) ?? 0;
  const lateThreshold = (start + (matched.grace_minutes ?? 0)) % 1440;
  const minutesAfterStart = (min - start + 1440) % 1440;
  const isLate =
    outsideAllWindows || minutesAfterStart > (matched.grace_minutes ?? 0);

  return {
    shiftName: matched.shift_name,
    isLate,
    start: hhmm(matched.start_time),
    end: hhmm(matched.end_time),
  };
};

export const useShiftDefinitions = () => {
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('shift_definitions')
      .select('*')
      .order('sort_order', { ascending: true });
    setShifts((data || []) as ShiftDefinition[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { shifts, loading, reload: load };
};
