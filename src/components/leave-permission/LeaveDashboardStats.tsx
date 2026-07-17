import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle, CalendarDays, Users, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeaveStats {
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  cancelled: number;
  leaveDaysThisMonth: number;
  onLeaveToday: number;
}

interface Props {
  stats: LeaveStats;
  activeTab: string;
  onSelect: (tab: string) => void;
}

const items = [
  { key: "pending", tab: "pending", label: "Pending", icon: Clock, tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  { key: "approvedThisMonth", tab: "approved", label: "Approved (This Month)", icon: CheckCircle2, tone: "text-green-600 bg-green-50 dark:bg-green-950/40" },
  { key: "rejectedThisMonth", tab: "rejected", label: "Rejected (This Month)", icon: XCircle, tone: "text-red-600 bg-red-50 dark:bg-red-950/40" },
  { key: "cancelled", tab: "cancelled", label: "Cancelled", icon: Ban, tone: "text-muted-foreground bg-muted" },
  { key: "leaveDaysThisMonth", tab: "approved", label: "Leave Days (This Month)", icon: CalendarDays, tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
  { key: "onLeaveToday", tab: "onleave", label: "On Leave Today", icon: Users, tone: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
] as const;

const LeaveDashboardStats = ({ stats, activeTab, onSelect }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {items.map(it => {
      const Icon = it.icon;
      const active = activeTab === it.tab;
      return (
        <Card
          key={it.key}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(it.tab)}
          onKeyDown={e => (e.key === "Enter" || e.key === " ") && onSelect(it.tab)}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            active && "ring-2 ring-primary"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{it.label}</p>
                <p className="text-2xl font-bold mt-1">{stats[it.key as keyof LeaveStats]}</p>
              </div>
              <div className={cn("p-2 rounded-md shrink-0", it.tone)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default LeaveDashboardStats;
