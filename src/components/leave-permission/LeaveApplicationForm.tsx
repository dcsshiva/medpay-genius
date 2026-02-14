import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, ArrowRight, Info, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  formatInputDateIST, 
  getMinLeaveDate,
  getMaxLeaveDate,
  formatDateIST 
} from "@/lib/dateUtils";

const formSchema = z.object({
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  leaveType: z.enum(["full", "half"], { required_error: "Please select leave type" }),
  reason: z.string({ required_error: "Please select a reason" }),
  reasonDetails: z.string().optional(),
  approverId: z.string({ required_error: "Please select an approver" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LeaveApplicationFormProps {
  onSuccess: () => void;
}

const LeaveApplicationForm = ({ onSuccess }: LeaveApplicationFormProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Array<{ id: string; staff_code: string; full_name: string }>>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [leaveReasons, setLeaveReasons] = useState<Array<{ id: string; reason_code: string; reason_name: string }>>([]);
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { leaveType: "full" },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const leaveType = form.watch("leaveType");

  useEffect(() => {
    loadManagersAndStaffInfo();
    fetchLeaveReasons();
  }, []);

  const fetchLeaveReasons = async () => {
    const { data, error } = await supabase
      .from('leave_reasons_master')
      .select('id, reason_code, reason_name')
      .eq('is_active', true)
      .order('display_order');
    if (!error && data) setLeaveReasons(data);
  };

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
      const isManager = staffData.role === "manager";
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

  const calculateLeaveDays = (start: Date, end: Date, isHalfDay: boolean): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay && diffDays === 1 ? 0.5 : diffDays;
  };

  const leaveDays = startDate && endDate ? calculateLeaveDays(startDate, endDate, leaveType === "half") : null;

  const onSubmit = async (values: FormValues) => {
    if (!staffId) {
      toast({ title: "Error", description: "Staff information not found", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_leave_application" as any, {
          _applicant_id: staffId,
          _leave_start_date: formatInputDateIST(values.startDate),
          _leave_end_date: formatInputDateIST(values.endDate),
        });
      if (validationError) throw validationError;
      const validation = validationResult as any as { valid: boolean; error?: string };
      if (!validation.valid) {
        toast({ title: "Validation Failed", description: validation.error, variant: "destructive" });
        setLoading(false);
        return;
      }
      const days = calculateLeaveDays(values.startDate, values.endDate, values.leaveType === "half");
      const { error: insertError } = await supabase
        .from("leave_permission_applications" as any)
        .insert({
          applicant_id: staffId,
          application_type: "leave",
          leave_start_date: formatInputDateIST(values.startDate),
          leave_end_date: formatInputDateIST(values.endDate),
          leave_days: days,
          leave_reason: values.reason,
          is_half_day: values.leaveType === "half",
          reason_details: values.reasonDetails,
          notes: values.notes,
          approver_id: values.approverId,
          status: "pending",
        });
      if (insertError) throw insertError;
      toast({ title: "Success", description: "Leave application submitted successfully" });
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting leave:", error);
      toast({ title: "Error", description: error.message || "Failed to submit leave application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const minDate = getMinLeaveDate();
  const maxDate = getMaxLeaveDate();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Section 1: When */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>When</span>
            {leaveDays !== null && (
              <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold">
                {leaveDays} {leaveDays === 0.5 ? "half day" : leaveDays === 1 ? "day" : "days"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
                  <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("min-h-[44px] pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          {field.value ? format(field.value, "dd MMM yyyy") : "Pick start date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => { field.onChange(date); setOpenStart(false); }}
                        disabled={(date) => {
                          const d = new Date(date); d.setHours(0,0,0,0);
                          const mn = new Date(minDate); mn.setHours(0,0,0,0);
                          const mx = new Date(maxDate); mx.setHours(23,59,59,999);
                          return d < mn || d > mx;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
                  <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("min-h-[44px] pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          {field.value ? format(field.value, "dd MMM yyyy") : "Pick end date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => { field.onChange(date); setOpenEnd(false); }}
                        disabled={(date) => {
                          const sd = form.getValues("startDate");
                          const d = new Date(date); d.setHours(0,0,0,0);
                          const mn = sd ? new Date(sd) : new Date(minDate); mn.setHours(0,0,0,0);
                          const mx = new Date(maxDate); mx.setHours(23,59,59,999);
                          return d < mn || d > mx;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDateIST(minDate)} to {formatDateIST(maxDate)} (IST)
          </p>
        </div>

        {/* Leave summary banner */}
        {startDate && endDate && leaveDays !== null && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              Requesting <strong>{leaveDays} {leaveDays === 0.5 ? "half day" : leaveDays === 1 ? "day" : "days"}</strong> from{" "}
              <strong>{format(startDate, "dd MMM")}</strong>
              <ArrowRight className="inline h-3 w-3 mx-1" />
              <strong>{format(endDate, "dd MMM yyyy")}</strong>
            </span>
          </div>
        )}

        {/* Section 2: Leave Type - Pill toggles */}
        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Leave Type</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  {[
                    { value: "full", label: "Full Day" },
                    { value: "half", label: "Half Day" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "flex-1 min-h-[44px] rounded-lg border-2 text-sm font-medium transition-all",
                        field.value === opt.value
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Section 3: Reason */}
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
                      <SelectValue placeholder="Select leave reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leaveReasons.map((reason) => (
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

        {/* Section 4: Approval */}
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
          <Button type="submit" disabled={loading} className={cn("min-h-[44px]", isMobile && "order-1")}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Leave
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LeaveApplicationForm;
