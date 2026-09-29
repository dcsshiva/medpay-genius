import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingDown } from 'lucide-react';
import LeaveBalanceBanner from './LeaveBalanceBanner';
import { loadCycleData, computeForStaff } from '@/lib/hrms/payrollData';
import { fetchPayrollSettings, cycleContaining } from '@/lib/hrms/payCycle';
import { formatCurrency } from '@/lib/currency';
import type { PayrollResult } from '@/lib/hrms/payrollEngine';

/** HRMS: staff dashboard card — balances, deduction so far this cycle, holidays this cycle. */
const StaffCycleSummaryCard: React.FC<{ staffId: string }> = ({ staffId }) => {
  const [result, setResult] = useState<PayrollResult | null>(null);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const settings = await fetchPayrollSettings();
        const cycle = cycleContaining(new Date(), settings.cycle_start_day);
        const data = await loadCycleData(cycle.key, [staffId]);
        setLabel(data.cycle.label);
        const me = data.staff.find(s => s.id === staffId);
        setHolidays(data.holidays.filter(h => !h.branch_id || h.branch_id === me?.work_branch_id));
        setResult(computeForStaff(data, staffId)); // null when salary structure isn't visible / set
      } catch {
        setResult(null);
      }
    })();
  }, [staffId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> This pay cycle
          {label && <span className="ml-auto text-xs font-normal text-muted-foreground">{label}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <LeaveBalanceBanner staffId={staffId} compact />
        {result && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border p-2">
              <div className="text-[11px] text-muted-foreground">Late (charged)</div>
              <div className="font-bold">{result.lateMinutes}m</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-[11px] text-muted-foreground">LOP days</div>
              <div className="font-bold">{result.lopDays}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3" /> Deduction so far
              </div>
              <div className="font-bold text-destructive">{formatCurrency(result.attendanceDeduction)}</div>
            </div>
          </div>
        )}
        {holidays.length > 0 && (
          <div className="text-xs">
            <div className="text-muted-foreground mb-1">Holidays this cycle</div>
            <div className="flex flex-wrap gap-1.5">
              {holidays.map(h => (
                <span key={h.date + h.name} className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {h.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffCycleSummaryCard;
