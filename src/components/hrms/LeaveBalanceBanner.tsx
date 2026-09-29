import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { fetchLeaveBalance, LeaveBalance, fmtMinutes } from '@/lib/hrms/leaveBalance';

interface Props {
  staffId: string | null;
  /** re-fetch when this changes (e.g. after a submit) */
  refreshKey?: number;
  compact?: boolean;
}

/** HRMS: CL and permission balance for the current pay cycle. */
const LeaveBalanceBanner: React.FC<Props> = ({ staffId, refreshKey, compact }) => {
  const [bal, setBal] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    if (!staffId) return;
    fetchLeaveBalance(staffId).then(setBal).catch(() => setBal(null));
  }, [staffId, refreshKey]);

  if (!bal) return null;

  const tile = (label: string, main: string, sub: string) => (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold leading-tight">{main}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wallet className="h-4 w-4 text-primary" />
        <span>My balance</span>
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">Pay cycle {bal.cycle.label}</span>
      </div>
      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 md:grid-cols-4 gap-2'}>
        {tile('CL remaining', `${bal.clRemaining} / ${bal.monthlyCL}`, `${bal.clApproved} used${bal.clPending ? ` · ${bal.clPending} pending` : ''}`)}
        {tile('Permission remaining', fmtMinutes(bal.permRemainingMin), `of ${fmtMinutes(bal.permQuotaMin)}${bal.permPendingMin ? ` · ${fmtMinutes(bal.permPendingMin)} pending` : ''}`)}
        {!compact && tile('CL used', String(bal.clApproved), 'approved this cycle')}
        {!compact && tile('Permission used', fmtMinutes(bal.permApprovedMin), 'approved this cycle')}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Leave beyond your CL balance is unpaid. Unplanned absences and lateness can also use CL and permission.
      </p>
    </div>
  );
};

export default LeaveBalanceBanner;
