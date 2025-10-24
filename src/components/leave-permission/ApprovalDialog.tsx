import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { formatDateIST } from "@/lib/dateUtils";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
  action: "approve" | "reject";
  onComplete: () => void;
}

const ApprovalDialog = ({ open, onOpenChange, application, action, onComplete }: ApprovalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const formatReason = (reason: string) => {
    return reason.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const handleSubmit = async () => {
    if (action === "reject" && !notes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) throw new Error("Staff data not found");

      const updateData: any = {
        status: action === "approve" ? "approved" : "rejected",
        approved_by: staffData.id,
        approved_at: new Date().toISOString(),
      };

      if (action === "reject") {
        updateData.rejection_reason = notes;
      }

      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update(updateData)
        .eq("id", application.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application ${action === "approve" ? "approved" : "rejected"} successfully`,
      });

      onComplete();
    } catch (error: any) {
      console.error("Error processing approval:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approve Application
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Application
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Review the application details before {action === "approve" ? "approving" : "rejecting"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <span className="text-sm font-medium">Applicant:</span>
              <p>{application.applicant.full_name} ({application.applicant.staff_code})</p>
            </div>
            <div>
              <span className="text-sm font-medium">Type:</span>
              <p className="capitalize">{application.application_type}</p>
            </div>
          </div>

          {application.application_type === "leave" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Start Date:</span>
                <p>{formatDateIST(application.leave_start_date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium">End Date:</span>
                <p>{formatDateIST(application.leave_end_date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Days:</span>
                <p>{application.leave_days} {application.is_half_day ? "half day" : "days"}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Reason:</span>
                <p>{formatReason(application.leave_reason)}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Date:</span>
                <p>{formatDateIST(application.permission_date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Duration:</span>
                <p>{application.permission_duration_minutes} minutes</p>
              </div>
              <div>
                <span className="text-sm font-medium">Time:</span>
                <p>{application.permission_start_time} - {application.permission_end_time}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Reason:</span>
                <p>{formatReason(application.permission_reason)}</p>
              </div>
            </div>
          )}

          {application.reason_details && (
            <div>
              <span className="text-sm font-medium">Reason Details:</span>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                {application.reason_details}
              </p>
            </div>
          )}

          {application.notes && (
            <div>
              <span className="text-sm font-medium">Applicant Notes:</span>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                {application.notes}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="approval-notes">
              {action === "approve" ? "Approval Notes (Optional)" : "Rejection Reason (Required) *"}
            </Label>
            <Textarea
              id="approval-notes"
              placeholder={action === "approve" 
                ? "Add any notes or conditions for approval..." 
                : "Explain why this application is being rejected..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={action === "approve" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === "approve" ? "Approve Application" : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDialog;
