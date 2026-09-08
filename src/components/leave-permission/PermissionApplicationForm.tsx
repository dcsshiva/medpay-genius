import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, ArrowRight, Info, UserCheck } from "lucide-react";
import { formatInputDateIST, formatLongDateIST } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const formSchema = z.object({
  startTime: z.string({ required_error: "Start time is required" }),
  endTime: z.string({ required_error: "End time is required" }),
  reason: z.string({ required_error: "Please select a reason" }),
  reasonDetails: z.string().optional(),
  approverId: z.string({ required_error: "Please select an approver" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PermissionApplicationFormProps {
  onSuccess: () => void;
}

const PermissionApplicationForm = ({ onSuccess }: PermissionApplicationFormProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Array<{ id: string; staff_code: string; full_name: string }>>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [durationValid, setDurationValid] = useState(true);
  const [permissionReasons, setPermissionReasons] = useState<Array<{ id: string; reason_code: string; reason_name: string }>>([]);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  useEffect(() => {
    loadManagersAndStaffInfo();
    fetchPermissionReasons();
  }, []);

  const fetchPermissionReasons = async () => {
    const { data, error } = await supabase
      .from('permission_reasons_master')
      .select('id, reason_code, reason_name')
      .eq('is_active', true)
      .order('display_order');
    if (!error && data) setPermissionReasons(data);
  };

  useEffect(() => {
    if (startTime && endTime) calculateDuration(startTime, endTime);
  }, [startTime, endTime]);

  const loadManagersAndStaffInfo = async () => {
    try {
      if (!user?.id) {
        toast({ title: "Error", description: "You are not logged in", variant: "destructive" });
        return;
      }
      const { data: staffData, error: staffError } = await supabase
        .from("staff").select("id, role").eq("user_id", user.id).single();
      if (staffError) throw staffError;
      setStaffId(staffData.id);
      const isManager = ["manager", "staff_manager", "admin"].includes(staffData.role as string);
      setIsManagerRole(isManager);

      const { data: managersData, error: managersError } = await supabase.rpc("get_available_managers" as any);
      if (managersError) throw managersError;
      const mgrs = (managersData || []) as Array<{ id: string; staff_code: string; full_name: string }>;
      setManagers(mgrs);
      if (mgrs.length === 0) {
        toast({ title: "No approvers found", description: "Please contact the administrator.", variant: "destructive" });
        return;
      }
      if (isManager && mgrs.length > 0) {
        const admin = mgrs.find((m: any) => m.full_name?.toLowerCase().includes("admin")) || mgrs[0];
        form.setValue("approverId", admin.id);
      } else if (mgrs.length === 1) {
        form.setValue("approverId", mgrs[0].id);
      }
    } catch (error: any) {
      console.error("Error loading managers:", error);
      toast({ title: "Error", description: "Failed to load approvers", variant: "destructive" });
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const diff = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    setDuration(diff);
    setDurationValid(diff >= 0 && diff <= 120);
  };

  const onSubmit = async (values: FormValues) => {
    if (!staffId) {
      toast({ title: "Error", description: "Staff information not found", variant: "destructive" });
      return;
    }
    if (!durationValid) {
      toast({ title: "Validation Failed", description: "Duration must be 0–120 minutes", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const todayStr = formatInputDateIST(new Date());
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_permission_application" as any, {
          _applicant_id: staffId, _permission_date: todayStr, _duration_minutes: duration,
        });
      if (validationError) throw validationError;
      const validation = validationResult as any as { valid: boolean; error?: string };
      if (!validation.valid) {
        toast({ title: "Validation Failed", description: validation.error, variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error: insertError } = await supabase
        .from("leave_permission_applications" as any)
        .insert({
          applicant_id: staffId, application_type: "permission", permission_date: todayStr,
          permission_start_time: values.startTime, permission_end_time: values.endTime,
          permission_duration_minutes: duration, permission_reason: values.reason,
          reason_details: values.reasonDetails?.trim() || '-', notes: values.notes ?? null,
          approver_id: values.approverId, status: "pending",
        });
      if (insertError) throw insertError;
      toast({ title: "Success", description: "Permission application submitted successfully" });
      form.reset();
      setDuration(0);
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting permission:", error);
      toast({ title: "Error", description: error.message || "Failed to submit permission application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Today's date compact banner */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{formatLongDateIST(new Date())}</span>
          <span className="text-xs text-muted-foreground ml-auto">Today only</span>
        </div>

        {/* Time section */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>Time</span>
          </div>

          <div className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
                  <FormControl>
                    <Input type="time" className="min-h-[44px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ArrowRight className="h-5 w-5 text-muted-foreground mb-2 shrink-0" />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
                  <FormControl>
                    <Input type="time" className="min-h-[44px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Inline duration indicator */}
          {startTime && endTime && (
            <div className={cn(
              "flex items-center justify-between rounded-md px-3 py-1.5 text-sm",
              durationValid
                ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                : "bg-destructive/10 text-destructive"
            )}>
              <span>{durationValid ? "✓" : "✗"} {duration} min</span>
              <span className="text-xs">
                {durationValid ? "Valid (0–120 min)" : "Must be 0–120 min"}
              </span>
            </div>
          )}
        </div>

        {/* Reason section */}
        <div className="rounded-lg border border-border p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span>Reason</span>
          </div>

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select permission reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {permissionReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.reason_code}>
                        {reason.reason_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reasonDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Details (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide additional details..."
                    className="resize-none"
                    rows={isMobile ? 2 : 3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Approval section */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCheck className="h-4 w-4 text-primary" />
            <span>Approval</span>
          </div>

          <FormField
            control={form.control}
            name="approverId"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isManagerRole}>
                  <FormControl>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name} ({manager.staff_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {isManagerRole ? "Sent to admin automatically" : "Select reviewing manager"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional information..."
                    className="resize-none"
                    rows={isMobile ? 2 : 3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit buttons */}
        <div className={cn(
          "flex gap-3 pt-2",
          isMobile ? "flex-col" : "justify-end"
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={loading}
            className={cn("min-h-[44px]", isMobile && "order-2")}
          >
            Reset
          </Button>
          <Button type="submit" disabled={loading || !durationValid} className={cn("min-h-[44px]", isMobile && "order-1")}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Permission
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PermissionApplicationForm;
