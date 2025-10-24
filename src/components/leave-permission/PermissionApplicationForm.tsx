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
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock } from "lucide-react";
import { formatInputDateIST } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  startTime: z.string({
    required_error: "Start time is required",
  }),
  endTime: z.string({
    required_error: "End time is required",
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

interface PermissionApplicationFormProps {
  onSuccess: () => void;
}

const PermissionApplicationForm = ({ onSuccess }: PermissionApplicationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Array<{ id: string; staff_code: string; full_name: string }>>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [durationValid, setDurationValid] = useState(true);
  const [permissionReasons, setPermissionReasons] = useState<Array<{ id: string; reason_code: string; reason_name: string }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

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
    
    if (!error && data) {
      setPermissionReasons(data);
    }
  };

  useEffect(() => {
    if (startTime && endTime) {
      calculateDuration(startTime, endTime);
    }
  }, [startTime, endTime]);

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

      // If manager, auto-select admin
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

  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const diff = endMinutes - startMinutes;
    setDuration(diff);
    setDurationValid(diff >= 0 && diff <= 120);
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

    if (!durationValid) {
      toast({
        title: "Validation Failed",
        description: "Permission duration must be between 0 and 120 minutes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const todayStr = formatInputDateIST(today);

      // Validate permission application
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_permission_application" as any, {
          _applicant_id: staffId,
          _permission_date: todayStr,
          _duration_minutes: duration,
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

      // Submit application
      const { error: insertError } = await supabase
        .from("leave_permission_applications" as any)
        .insert({
          applicant_id: staffId,
          application_type: "permission",
          permission_date: todayStr,
          permission_start_time: values.startTime,
          permission_end_time: values.endTime,
          permission_duration_minutes: duration,
          permission_reason: values.reason,
          reason_details: values.reasonDetails,
          notes: values.notes,
          approver_id: values.approverId,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Permission application submitted successfully",
      });

      form.reset();
      setDuration(0);
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting permission:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit permission application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-CA');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Today's Date:</span>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Permission can only be applied for current day
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {startTime && endTime && (
          <div className={cn(
            "p-4 rounded-lg border-2",
            durationValid 
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          )}>
            <div className="flex items-center justify-between">
              <span className="font-medium">Duration:</span>
              <span className={cn(
                "text-lg font-bold",
                durationValid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
              )}>
                {duration} minutes
              </span>
            </div>
            <p className={cn(
              "text-xs mt-1",
              durationValid ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            )}>
              {durationValid 
                ? "✓ Duration is valid (0-120 minutes)" 
                : "✗ Duration must be between 0 and 120 minutes"}
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Reason Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide additional details about your permission request..."
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
          <Button type="submit" disabled={loading || !durationValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Permission Request
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PermissionApplicationForm;
