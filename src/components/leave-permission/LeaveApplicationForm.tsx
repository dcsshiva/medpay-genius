import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  formatInputDateIST, 
  getCurrentISTDate, 
  toISOStringIST,
  getMinLeaveDate,
  getMaxLeaveDate,
  formatDateIST 
} from "@/lib/dateUtils";

const formSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  leaveType: z.enum(["full", "half"], {
    required_error: "Please select leave type",
  }),
  reason: z.string({
    required_error: "Please select a reason",
  }),
  reasonDetails: z.string().optional(),
  approverId: z.string({
    required_error: "Please select an approver",
  }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LeaveApplicationFormProps {
  onSuccess: () => void;
}

const LeaveApplicationForm = ({ onSuccess }: LeaveApplicationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Array<{ id: string; staff_code: string; full_name: string }>>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [leaveReasons, setLeaveReasons] = useState<Array<{ id: string; reason_code: string; reason_name: string }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "full",
    },
  });

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
    
    if (!error && data) {
      setLeaveReasons(data);
    }
  };

  const loadManagersAndStaffInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get staff ID and check if manager
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (staffError) throw staffError;
      setStaffId(staffData.id);

      // Check if user is a manager
      const { data: designationData } = await supabase
        .from("user_designations")
        .select("designation")
        .eq("user_id", user.id)
        .single();

      const isManager = designationData?.designation === "manager";
      setIsManagerRole(isManager);

      // Load managers
      const { data: managersData, error: managersError } = await supabase
        .rpc("get_available_managers" as any);

      if (managersError) throw managersError;
      
      const managers = managersData as any as Array<{ id: string; staff_code: string; full_name: string }>;
      setManagers(managers || []);

      // If manager, auto-select admin (first in list if any)
      if (isManager && managers && managers.length > 0) {
        const admin = managers.find((m: any) => m.full_name.includes("Admin")) || managers[0];
        form.setValue("approverId", admin.id);
      }
    } catch (error: any) {
      console.error("Error loading managers:", error);
      toast({
        title: "Error",
        description: "Failed to load approvers",
        variant: "destructive",
      });
    }
  };

  const calculateLeaveDays = (start: Date, end: Date, isHalfDay: boolean): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay && diffDays === 1 ? 0.5 : diffDays;
  };

  const onSubmit = async (values: FormValues) => {
    if (!staffId) {
      toast({
        title: "Error",
        description: "Staff information not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Validate leave application
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_leave_application" as any, {
          _applicant_id: staffId,
          _leave_start_date: formatInputDateIST(values.startDate),
          _leave_end_date: formatInputDateIST(values.endDate),
        });

      if (validationError) throw validationError;

      const validation = validationResult as any as { valid: boolean; error?: string };
      if (!validation.valid) {
        toast({
          title: "Validation Failed",
          description: validation.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calculate leave days
      const leaveDays = calculateLeaveDays(values.startDate, values.endDate, values.leaveType === "half");

      // Submit application
      const { error: insertError } = await supabase
        .from("leave_permission_applications" as any)
        .insert({
          applicant_id: staffId,
          application_type: "leave",
          leave_start_date: formatInputDateIST(values.startDate),
          leave_end_date: formatInputDateIST(values.endDate),
          leave_days: leaveDays,
          leave_reason: values.reason,
          is_half_day: values.leaveType === "half",
          reason_details: values.reasonDetails,
          notes: values.notes,
          approver_id: values.approverId,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Leave application submitted successfully",
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting leave:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const minDate = getMinLeaveDate();
  const maxDate = getMaxLeaveDate();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const dateAtMidnight = new Date(date);
                        dateAtMidnight.setHours(0, 0, 0, 0);
                        const minDateAtMidnight = new Date(minDate);
                        minDateAtMidnight.setHours(0, 0, 0, 0);
                        const maxDateAtMidnight = new Date(maxDate);
                        maxDateAtMidnight.setHours(23, 59, 59, 999);
                        
                        return dateAtMidnight < minDateAtMidnight || dateAtMidnight > maxDateAtMidnight;
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select a date from {formatDateIST(minDate)} to {formatDateIST(maxDate)} (IST)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        const dateAtMidnight = new Date(date);
                        dateAtMidnight.setHours(0, 0, 0, 0);
                        const minDateAtMidnight = startDate ? new Date(startDate) : new Date(minDate);
                        minDateAtMidnight.setHours(0, 0, 0, 0);
                        const maxDateAtMidnight = new Date(maxDate);
                        maxDateAtMidnight.setHours(23, 59, 59, 999);
                        
                        return dateAtMidnight < minDateAtMidnight || dateAtMidnight > maxDateAtMidnight;
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Must be on or after start date
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Leave Type *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="full" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Full Day
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="half" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Half Day
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Reason Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide additional details about your leave..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="approverId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Approver *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isManagerRole}
              >
                <FormControl>
                  <SelectTrigger>
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
              <FormDescription>
                {isManagerRole 
                  ? "As a manager, your application will be sent to admin"
                  : "Select the manager who will review your application"}
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
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={loading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Leave Application
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LeaveApplicationForm;
