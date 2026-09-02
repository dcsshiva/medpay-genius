import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, CheckCircle, XCircle, RotateCcw, Ban } from "lucide-react";
import { formatDateIST, formatDateTimeIST } from "@/lib/dateUtils";
import { LeaveRow } from "@/lib/leaveExportUtils";

interface Props {
  applications: LeaveRow[];
  showActions: "approve-reject" | "view" | "revoke" | "cancel";
  isAdmin: boolean;
  onView: (a: LeaveRow) => void;
  onApprove?: (a: LeaveRow) => void;
  onReject?: (a: LeaveRow) => void;
  onRevoke?: (a: LeaveRow) => void;
  onCancel?: (a: LeaveRow) => void;
}

const titleCase = (s?: string | null) =>
  (s || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "approved": return "default";
    case "rejected": return "destructive";
    case "pending": return "secondary";
    default: return "outline";
  }
};

const LeaveApplicationsTable = ({
  applications, showActions, isAdmin, onView, onApprove, onReject, onRevoke, onCancel,
}: Props) => {
  const renderActions = (app: LeaveRow, full = false) => (
    <div className={full ? "flex flex-wrap gap-2" : "flex items-center justify-end gap-1"}>
      <Button size="sm" variant="ghost" onClick={() => onView(app)} title="View" className={full ? "flex-1 min-w-[90px] min-h-[40px] border" : ""}>
        <Eye className="h-4 w-4 mr-1" />{full && "View"}
      </Button>
      {showActions === "approve-reject" && (
        <>
          <Button size="sm" variant="default" onClick={() => onApprove?.(app)} className={full ? "flex-1 min-w-[90px] min-h-[40px]" : ""}>
            <CheckCircle className="h-4 w-4 mr-1" />Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onReject?.(app)} className={full ? "flex-1 min-w-[90px] min-h-[40px]" : ""}>
            <XCircle className="h-4 w-4 mr-1" />Reject
          </Button>
        </>
      )}
      {showActions === "revoke" && isAdmin && (
        <Button size="sm" variant="outline" onClick={() => onRevoke?.(app)} title="Revoke approval" className={full ? "flex-1 min-w-[90px] min-h-[40px]" : ""}>
          <RotateCcw className="h-4 w-4 mr-1" />Revoke
        </Button>
      )}
      {showActions === "cancel" && (
        <Button size="sm" variant="outline" onClick={() => onCancel?.(app)} title="Cancel" className={full ? "flex-1 min-w-[90px] min-h-[40px]" : ""}>
          <Ban className="h-4 w-4 mr-1" />Cancel
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {applications.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground text-sm">
            No applications found
          </div>
        ) : applications.map(app => {
          const isLeave = app.application_type === "leave";
          return (
            <div key={app.id} className="rounded-xl border bg-card p-3 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{app.applicant?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{app.applicant?.staff_code}</div>
                </div>
                <Badge variant={statusVariant(app.status)} className="capitalize shrink-0">{app.status}</Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {isLeave ? <Calendar className="h-4 w-4 text-muted-foreground shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                {isLeave ? (
                  <span>
                    {formatDateIST(app.leave_start_date!)} – {formatDateIST(app.leave_end_date!)}
                    <span className="text-muted-foreground"> · {app.leave_days} {app.is_half_day ? "half day" : "day(s)"}</span>
                  </span>
                ) : (
                  <span>
                    {formatDateIST(app.permission_date!)}
                    <span className="text-muted-foreground"> · {app.permission_start_time}–{app.permission_end_time} ({app.permission_duration_minutes}m)</span>
                  </span>
                )}
              </div>

              <div className="text-sm">
                {titleCase(isLeave ? app.leave_reason : app.permission_reason)}
                {app.reason_details && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{app.reason_details}</div>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                Applied {formatDateTimeIST(app.created_at)}
                {app.approved_at && ` · Actioned by ${app.approved_by_staff?.full_name || "-"} on ${formatDateTimeIST(app.approved_at)}`}
              </div>

              <div className="pt-1 border-t border-border/60">{renderActions(app, true)}</div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>

        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date / Period</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied On</TableHead>
            <TableHead>Actioned</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No applications found
              </TableCell>
            </TableRow>
          ) : applications.map(app => {
            const isLeave = app.application_type === "leave";
            return (
              <TableRow key={app.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium">{app.applicant?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{app.applicant?.staff_code}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isLeave ? <Calendar className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    <span className="capitalize">{app.application_type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isLeave ? (
                    <div>
                      <div className="text-sm">{formatDateIST(app.leave_start_date!)} - {formatDateIST(app.leave_end_date!)}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.leave_days} {app.is_half_day ? "half day" : "day(s)"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm">{formatDateIST(app.permission_date!)}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.permission_start_time} - {app.permission_end_time} ({app.permission_duration_minutes}m)
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{titleCase(isLeave ? app.leave_reason : app.permission_reason)}</div>
                  {app.reason_details && (
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{app.reason_details}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(app.status)} className="capitalize">{app.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{formatDateTimeIST(app.created_at)}</TableCell>
                <TableCell className="text-xs">
                  {app.approved_at ? (
                    <>
                      <div>{app.approved_by_staff?.full_name || "-"}</div>
                      <div className="text-muted-foreground">{formatDateTimeIST(app.approved_at)}</div>
                    </>
                  ) : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onView(app)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {showActions === "approve-reject" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => onApprove?.(app)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onReject?.(app)}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </>
                    )}
                    {showActions === "revoke" && isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => onRevoke?.(app)} title="Revoke approval">
                        <RotateCcw className="h-4 w-4 mr-1" />Revoke
                      </Button>
                    )}
                    {showActions === "cancel" && (
                      <Button size="sm" variant="outline" onClick={() => onCancel?.(app)} title="Cancel">
                        <Ban className="h-4 w-4 mr-1" />Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaveApplicationsTable;
