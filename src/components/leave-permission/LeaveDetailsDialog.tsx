import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateIST, formatDateTimeIST } from "@/lib/dateUtils";
import { LeaveRow } from "@/lib/leaveExportUtils";
import { RotateCcw, Ban } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  application: LeaveRow | null;
  isAdmin: boolean;
  onRevoke?: (a: LeaveRow) => void;
  onCancel?: (a: LeaveRow) => void;
}

const titleCase = (s?: string | null) =>
  (s || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium mt-0.5">{value || "-"}</div>
  </div>
);

const LeaveDetailsDialog = ({ open, onOpenChange, application, isAdmin, onRevoke, onCancel }: Props) => {
  if (!application) return null;
  const a = application;
  const isLeave = a.application_type === "leave";
  const isApproved = a.status === "approved";
  const isFutureLeave = isApproved && isLeave && a.leave_start_date && new Date(a.leave_start_date) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Application Details
            <Badge variant="outline" className="capitalize">{a.status}</Badge>
          </DialogTitle>
          <DialogDescription>Full application information</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Applicant" value={`${a.applicant?.full_name} (${a.applicant?.staff_code})`} />
          <Field label="Role" value={titleCase(a.applicant?.role)} />
          <Field label="Type" value={titleCase(a.application_type)} />
          <Field label="Applied On" value={formatDateTimeIST(a.created_at)} />

          {isLeave ? (
            <>
              <Field label="Start Date" value={formatDateIST(a.leave_start_date!)} />
              <Field label="End Date" value={formatDateIST(a.leave_end_date!)} />
              <Field label="Duration" value={`${a.leave_days} ${a.is_half_day ? "half day" : "day(s)"}`} />
              <Field label="Reason" value={titleCase(a.leave_reason)} />
            </>
          ) : (
            <>
              <Field label="Date" value={formatDateIST(a.permission_date!)} />
              <Field label="Time" value={`${a.permission_start_time} - ${a.permission_end_time}`} />
              <Field label="Duration" value={`${a.permission_duration_minutes} min`} />
              <Field label="Reason" value={titleCase(a.permission_reason)} />
            </>
          )}
        </div>

        {a.reason_details && (
          <div>
            <div className="text-xs text-muted-foreground">Reason Details</div>
            <div className="text-sm mt-1 p-3 bg-muted rounded">{a.reason_details}</div>
          </div>
        )}
        {a.notes && (
          <div>
            <div className="text-xs text-muted-foreground">Applicant Notes</div>
            <div className="text-sm mt-1 p-3 bg-muted rounded">{a.notes}</div>
          </div>
        )}

        {(a.approved_at || a.rejection_reason) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <Field label={a.status === "approved" ? "Approved By" : "Actioned By"} value={a.approved_by_staff?.full_name} />
            <Field label={a.status === "approved" ? "Approved On" : "Actioned On"} value={a.approved_at && formatDateTimeIST(a.approved_at)} />
            {a.rejection_reason && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Rejection Reason</div>
                <div className="text-sm mt-1 p-3 bg-destructive/10 text-destructive rounded">{a.rejection_reason}</div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {isAdmin && isApproved && onRevoke && (
            <Button variant="outline" onClick={() => onRevoke(a)}>
              <RotateCcw className="h-4 w-4 mr-1" />Revoke Approval
            </Button>
          )}
          {isFutureLeave && onCancel && (
            <Button variant="outline" onClick={() => onCancel(a)}>
              <Ban className="h-4 w-4 mr-1" />Cancel Leave
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveDetailsDialog;
