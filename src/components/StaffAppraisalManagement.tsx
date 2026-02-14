import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardCheck, AlertTriangle, Calendar, Search, Plus } from "lucide-react";
import { formatDateIST, formatDateTimeIST, formatInputDateIST, getCurrentISTDate, formatLongDateIST } from '@/lib/dateUtils';
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

interface Staff {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string | null;
}

interface Appraisal {
  id: string;
  staff_id: string;
  appraisal_date: string;
  appraisal_period_start: string;
  appraisal_period_end: string;
  overall_rating: string;
  punctuality_rating: number;
  work_quality_rating: number;
  teamwork_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  strengths: string | null;
  areas_for_improvement: string | null;
  manager_comments: string | null;
  action_plan: string | null;
  next_review_date: string | null;
  appraised_by: string | null;
  created_at: string;
  staff?: Staff;
}

interface Warning {
  id: string;
  staff_id: string;
  warning_type: string;
  incident_date: string;
  incident_time: string | null;
  severity: string;
  description: string;
  action_taken: string | null;
  witness_name: string | null;
  staff_response: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  issued_by: string | null;
  created_at: string;
  staff?: Staff;
}

interface DailyActivity {
  id: string;
  staff_id: string;
  activity_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
  attendance_status: string;
  tasks_completed: any;
  patients_handled: number | null;
  special_notes: string | null;
  supervisor_notes: string | null;
  recorded_by: string | null;
  created_at: string;
  staff?: Staff;
}

const warningTypes = [
  { value: 'late_coming', label: 'Late Coming (Tardiness)' },
  { value: 'unauthorized_absence', label: 'Unauthorized Absence' },
  { value: 'leaving_early', label: 'Leaving Early' },
  { value: 'excessive_absenteeism', label: 'Excessive Absenteeism' },
  { value: 'insubordination', label: 'Insubordination' },
  { value: 'improper_mobile_use', label: 'Improper Use of Mobile Phones' },
  { value: 'unprofessional_language', label: 'Unprofessional Language' },
  { value: 'gossip_rumors', label: 'Gossip and Spreading Rumors' },
  { value: 'arguments_colleagues', label: 'Arguments with Colleagues' },
  { value: 'breach_confidentiality', label: 'Breach of Patient Confidentiality' },
  { value: 'medication_errors', label: 'Medication Errors' },
  { value: 'hygiene_violations', label: 'Hygiene and Infection Control Violations' },
  { value: 'improper_documentation', label: 'Improper Documentation' },
  { value: 'patient_neglect', label: 'Patient Neglect' },
  { value: 'dress_code_violations', label: 'Dress Code Violations' },
  { value: 'misuse_hospital_property', label: 'Misuse of Hospital Property' },
  { value: 'safety_protocol_failure', label: 'Failure to Follow Safety Protocols' },
  { value: 'sleeping_on_duty', label: 'Sleeping on Duty' },
];

const severityLevels = [
  { value: 'verbal_warning', label: 'Verbal Warning', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'written_warning', label: 'Written Warning', color: 'bg-orange-100 text-orange-800' },
  { value: 'final_warning', label: 'Final Warning', color: 'bg-red-100 text-red-800' },
  { value: 'suspension', label: 'Suspension', color: 'bg-red-200 text-red-900' },
];

const attendanceStatuses = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
  { value: 'half_day', label: 'Half Day', color: 'bg-blue-100 text-blue-800' },
  { value: 'leave', label: 'Leave', color: 'bg-gray-100 text-gray-800' },
];

const overallRatings = [
  { value: 'excellent', label: 'Excellent', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800' },
  { value: 'satisfactory', label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'needs_improvement', label: 'Needs Improvement', color: 'bg-orange-100 text-orange-800' },
  { value: 'poor', label: 'Poor', color: 'bg-red-100 text-red-800' },
];

export default function StaffAppraisalManagement() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("appraisals");
  
  // Appraisal form state
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [selectedStaffForAppraisal, setSelectedStaffForAppraisal] = useState("");
  const [appraisalPeriodStart, setAppraisalPeriodStart] = useState("");
  const [appraisalPeriodEnd, setAppraisalPeriodEnd] = useState("");
  const [punctualityRating, setPunctualityRating] = useState([3]);
  const [workQualityRating, setWorkQualityRating] = useState([3]);
  const [teamworkRating, setTeamworkRating] = useState([3]);
  const [communicationRating, setCommunicationRating] = useState([3]);
  const [professionalismRating, setProfessionalismRating] = useState([3]);
  const [patientCareRating, setPatientCareRating] = useState([3]);
  const [infectionControlRating, setInfectionControlRating] = useState([3]);
  const [documentationRating, setDocumentationRating] = useState([3]);
  const [attendanceReliabilityRating, setAttendanceReliabilityRating] = useState([3]);
  const [initiativeRating, setInitiativeRating] = useState([3]);
  const [trainingParticipationRating, setTrainingParticipationRating] = useState([3]);
  const [selectedAppraisalReasonId, setSelectedAppraisalReasonId] = useState("");
  const [appraisalReasons, setAppraisalReasons] = useState<{ id: string; reason_name: string }[]>([]);
  const [overallRating, setOverallRating] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // Warning form state
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [selectedStaffForWarning, setSelectedStaffForWarning] = useState("");
  const [warningType, setWarningType] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [severity, setSeverity] = useState("");
  const [warningDescription, setWarningDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [staffResponse, setStaffResponse] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  // Daily activity form state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedStaffForActivity, setSelectedStaffForActivity] = useState("");
  const [activityDate, setActivityDate] = useState(formatInputDateIST(getCurrentISTDate()));
  const [shiftStartTime, setShiftStartTime] = useState("");
  const [shiftEndTime, setShiftEndTime] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [tasksCompleted, setTasksCompleted] = useState<string[]>([""]);
  const [patientsHandled, setPatientsHandled] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");

  useEffect(() => {
    if (user && (userRole === 'admin' || userRole === 'manager')) {
      fetchData();
    }
  }, [user, userRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaff(),
        fetchAppraisals(),
        fetchWarnings(),
        fetchDailyActivities(),
        fetchAppraisalReasons(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAppraisalReasons = async () => {
    const { data, error } = await supabase
      .from("appraisal_reasons")
      .select("id, reason_name")
      .eq("is_active", true)
      .order("display_order");
    if (error) throw error;
    setAppraisalReasons(data || []);
  };

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("id, staff_code, full_name, role, department")
      .eq("is_active", true)
      .order("full_name");

    if (error) throw error;
    setStaffList(data || []);
  };

  const fetchAppraisals = async () => {
    const { data, error } = await supabase
      .from("staff_appraisals")
      .select(`
        *,
        staff:staff_id (id, staff_code, full_name, role, department)
      `)
      .order("appraisal_date", { ascending: false });

    if (error) throw error;
    setAppraisals(data || []);
  };

  const fetchWarnings = async () => {
    const { data, error } = await supabase
      .from("staff_warnings")
      .select(`
        *,
        staff:staff_id (id, staff_code, full_name, role, department)
      `)
      .order("incident_date", { ascending: false });

    if (error) throw error;
    setWarnings(data || []);
  };

  const fetchDailyActivities = async () => {
    const { data, error } = await supabase
      .from("staff_daily_activities")
      .select(`
        *,
        staff:staff_id (id, staff_code, full_name, role, department)
      `)
      .order("activity_date", { ascending: false })
      .limit(100);

    if (error) throw error;
    const parsedData = (data || []).map(activity => ({
      ...activity,
      tasks_completed: Array.isArray(activity.tasks_completed) ? activity.tasks_completed : []
    }));
    setDailyActivities(parsedData);
  };

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStaffForAppraisal || !appraisalPeriodStart || !appraisalPeriodEnd || !overallRating) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("staff_appraisals").insert([{
      staff_id: selectedStaffForAppraisal,
      appraisal_period_start: appraisalPeriodStart,
      appraisal_period_end: appraisalPeriodEnd,
      overall_rating: overallRating as any,
      punctuality_rating: punctualityRating[0],
      work_quality_rating: workQualityRating[0],
      teamwork_rating: teamworkRating[0],
      communication_rating: communicationRating[0],
      professionalism_rating: professionalismRating[0],
      patient_care_rating: patientCareRating[0],
      infection_control_rating: infectionControlRating[0],
      documentation_rating: documentationRating[0],
      attendance_reliability_rating: attendanceReliabilityRating[0],
      initiative_rating: initiativeRating[0],
      training_participation_rating: trainingParticipationRating[0],
      appraisal_reason_id: selectedAppraisalReasonId || null,
      strengths,
      areas_for_improvement: areasForImprovement,
      manager_comments: managerComments,
      action_plan: actionPlan,
      next_review_date: nextReviewDate || null,
      appraised_by: user?.id,
    } as any]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create appraisal",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Appraisal created successfully",
    });

    resetAppraisalForm();
    fetchAppraisals();
  };

  const handleSubmitWarning = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffForWarning || !warningType || !incidentDate || !severity || !warningDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("staff_warnings").insert([{
      staff_id: selectedStaffForWarning,
      warning_type: warningType as any,
      incident_date: incidentDate,
      incident_time: incidentTime || null,
      severity: severity as any,
      description: warningDescription,
      action_taken: actionTaken,
      witness_name: witnessName,
      staff_response: staffResponse,
      follow_up_required: followUpRequired,
      follow_up_date: followUpRequired ? followUpDate : null,
      issued_by: user?.id,
    }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to issue warning",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Warning issued successfully",
    });

    resetWarningForm();
    fetchWarnings();
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffForActivity || !activityDate || !attendanceStatus) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("staff_daily_activities").insert([{
      staff_id: selectedStaffForActivity,
      activity_date: activityDate,
      shift_start_time: shiftStartTime || null,
      shift_end_time: shiftEndTime || null,
      attendance_status: attendanceStatus as any,
      tasks_completed: tasksCompleted.filter(t => t.trim() !== "") as any,
      patients_handled: patientsHandled ? parseInt(patientsHandled) : null,
      special_notes: specialNotes,
      supervisor_notes: supervisorNotes,
      recorded_by: user?.id,
    }]);

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate") 
          ? "Activity already exists for this staff member on this date"
          : "Failed to record activity",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Activity recorded successfully",
    });

    resetActivityForm();
    fetchDailyActivities();
  };

  const resetAppraisalForm = () => {
    setShowAppraisalForm(false);
    setSelectedStaffForAppraisal("");
    setAppraisalPeriodStart("");
    setAppraisalPeriodEnd("");
    setPunctualityRating([3]);
    setWorkQualityRating([3]);
    setTeamworkRating([3]);
    setCommunicationRating([3]);
    setProfessionalismRating([3]);
    setPatientCareRating([3]);
    setInfectionControlRating([3]);
    setDocumentationRating([3]);
    setAttendanceReliabilityRating([3]);
    setInitiativeRating([3]);
    setTrainingParticipationRating([3]);
    setSelectedAppraisalReasonId("");
    setOverallRating("");
    setStrengths("");
    setAreasForImprovement("");
    setManagerComments("");
    setActionPlan("");
    setNextReviewDate("");
  };

  const resetWarningForm = () => {
    setShowWarningForm(false);
    setSelectedStaffForWarning("");
    setWarningType("");
    setIncidentDate("");
    setIncidentTime("");
    setSeverity("");
    setWarningDescription("");
    setActionTaken("");
    setWitnessName("");
    setStaffResponse("");
    setFollowUpRequired(false);
    setFollowUpDate("");
  };

  const resetActivityForm = () => {
    setShowActivityForm(false);
    setSelectedStaffForActivity("");
    setActivityDate(formatInputDateIST(getCurrentISTDate()));
    setShiftStartTime("");
    setShiftEndTime("");
    setAttendanceStatus("");
    setTasksCompleted([""]);
    setPatientsHandled("");
    setSpecialNotes("");
    setSupervisorNotes("");
  };

  const addTask = () => {
    setTasksCompleted([...tasksCompleted, ""]);
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasksCompleted];
    newTasks[index] = value;
    setTasksCompleted(newTasks);
  };

  const removeTask = (index: number) => {
    setTasksCompleted(tasksCompleted.filter((_, i) => i !== index));
  };

  const filterBySearch = <T extends { staff?: Staff }>(items: T[]): T[] => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.staff?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.staff?.staff_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!user || (userRole !== 'admin' && userRole !== 'manager')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Access denied. This feature is only available for administrators and managers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Appraisal Management</h1>
          <p className="text-muted-foreground">Manage performance, warnings, and daily activities</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appraisals">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Appraisals ({appraisals.length})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Warnings ({warnings.length})
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Calendar className="h-4 w-4 mr-2" />
            Daily Activities ({dailyActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* Appraisals Tab */}
        <TabsContent value="appraisals" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAppraisalForm(!showAppraisalForm)}>
              <Plus className="h-4 w-4 mr-2" />
              New Appraisal
            </Button>
          </div>

          {showAppraisalForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Performance Appraisal</CardTitle>
                <CardDescription>Evaluate staff member's performance</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAppraisal} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Staff Member *</Label>
                      <Select value={selectedStaffForAppraisal} onValueChange={setSelectedStaffForAppraisal}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name} ({staff.staff_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Overall Rating *</Label>
                      <Select value={overallRating} onValueChange={setOverallRating}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {overallRatings.map(rating => (
                            <SelectItem key={rating.value} value={rating.value}>
                              {rating.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Period Start *</Label>
                      <Input
                        type="date"
                        value={appraisalPeriodStart}
                        onChange={(e) => setAppraisalPeriodStart(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Period End *</Label>
                      <Input
                        type="date"
                        value={appraisalPeriodEnd}
                        onChange={(e) => setAppraisalPeriodEnd(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Next Review Date</Label>
                      <Input
                        type="date"
                        value={nextReviewDate}
                        onChange={(e) => setNextReviewDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold">Core Performance Ratings (1-5)</h3>
                    
                    <div className="space-y-2">
                      <Label>Punctuality: {punctualityRating[0]}</Label>
                      <Slider value={punctualityRating} onValueChange={setPunctualityRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Work Quality: {workQualityRating[0]}</Label>
                      <Slider value={workQualityRating} onValueChange={setWorkQualityRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teamwork: {teamworkRating[0]}</Label>
                      <Slider value={teamworkRating} onValueChange={setTeamworkRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Communication: {communicationRating[0]}</Label>
                      <Slider value={communicationRating} onValueChange={setCommunicationRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Professionalism: {professionalismRating[0]}</Label>
                      <Slider value={professionalismRating} onValueChange={setProfessionalismRating} min={1} max={5} step={1} />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold">Hospital-Specific Ratings (1-5)</h3>
                    
                    <div className="space-y-2">
                      <Label>Patient Care Quality: {patientCareRating[0]}</Label>
                      <Slider value={patientCareRating} onValueChange={setPatientCareRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Infection Control Compliance: {infectionControlRating[0]}</Label>
                      <Slider value={infectionControlRating} onValueChange={setInfectionControlRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Documentation Accuracy: {documentationRating[0]}</Label>
                      <Slider value={documentationRating} onValueChange={setDocumentationRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Attendance & Reliability: {attendanceReliabilityRating[0]}</Label>
                      <Slider value={attendanceReliabilityRating} onValueChange={setAttendanceReliabilityRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Initiative & Problem Solving: {initiativeRating[0]}</Label>
                      <Slider value={initiativeRating} onValueChange={setInitiativeRating} min={1} max={5} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>Training Participation: {trainingParticipationRating[0]}</Label>
                      <Slider value={trainingParticipationRating} onValueChange={setTrainingParticipationRating} min={1} max={5} step={1} />
                    </div>

                    {appraisalReasons.length > 0 && (
                      <div className="space-y-2">
                        <Label>Appraisal Reason</Label>
                        <Select value={selectedAppraisalReasonId} onValueChange={setSelectedAppraisalReasonId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {appraisalReasons.map(reason => (
                              <SelectItem key={reason.id} value={reason.id}>
                                {reason.reason_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Strengths</Label>
                      <Textarea
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="List key strengths..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Areas for Improvement</Label>
                      <Textarea
                        value={areasForImprovement}
                        onChange={(e) => setAreasForImprovement(e.target.value)}
                        placeholder="List areas needing improvement..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Manager Comments</Label>
                      <Textarea
                        value={managerComments}
                        onChange={(e) => setManagerComments(e.target.value)}
                        placeholder="Additional comments..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Action Plan</Label>
                      <Textarea
                        value={actionPlan}
                        onChange={(e) => setActionPlan(e.target.value)}
                        placeholder="Development action plan..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetAppraisalForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Submit Appraisal</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filterBySearch(appraisals).map((appraisal) => (
              <Card key={appraisal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {appraisal.staff?.full_name} ({appraisal.staff?.staff_code})
                      </CardTitle>
                      <CardDescription>
                        {formatDateIST(appraisal.appraisal_period_start)} - {formatDateIST(appraisal.appraisal_period_end)}
                      </CardDescription>
                    </div>
                    <Badge className={overallRatings.find(r => r.value === appraisal.overall_rating)?.color}>
                      {overallRatings.find(r => r.value === appraisal.overall_rating)?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Punctuality:</span>
                        <span className="ml-2 font-semibold">{appraisal.punctuality_rating}/5</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Work Quality:</span>
                        <span className="ml-2 font-semibold">{appraisal.work_quality_rating}/5</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teamwork:</span>
                        <span className="ml-2 font-semibold">{appraisal.teamwork_rating}/5</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Communication:</span>
                        <span className="ml-2 font-semibold">{appraisal.communication_rating}/5</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Professionalism:</span>
                        <span className="ml-2 font-semibold">{appraisal.professionalism_rating}/5</span>
                      </div>
                    </div>
                    {appraisal.strengths && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Strengths:</p>
                        <p className="text-sm">{appraisal.strengths}</p>
                      </div>
                    )}
                    {appraisal.areas_for_improvement && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Areas for Improvement:</p>
                        <p className="text-sm">{appraisal.areas_for_improvement}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterBySearch(appraisals).length === 0 && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No appraisals found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Warnings Tab */}
        <TabsContent value="warnings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowWarningForm(!showWarningForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Issue Warning
            </Button>
          </div>

          {showWarningForm && (
            <Card>
              <CardHeader>
                <CardTitle>Issue Warning</CardTitle>
                <CardDescription>Record disciplinary action</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitWarning} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Staff Member *</Label>
                      <Select value={selectedStaffForWarning} onValueChange={setSelectedStaffForWarning}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name} ({staff.staff_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Warning Type *</Label>
                      <Select value={warningType} onValueChange={setWarningType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {warningTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Severity *</Label>
                      <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          {severityLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Incident Date *</Label>
                      <Input
                        type="date"
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Incident Time</Label>
                      <Input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Witness Name</Label>
                      <Input
                        value={witnessName}
                        onChange={(e) => setWitnessName(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={warningDescription}
                      onChange={(e) => setWarningDescription(e.target.value)}
                      placeholder="Detailed description of the incident..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Action Taken</Label>
                    <Textarea
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="What action was taken..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Staff Response</Label>
                    <Textarea
                      value={staffResponse}
                      onChange={(e) => setStaffResponse(e.target.value)}
                      placeholder="Staff member's response..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followUp"
                      checked={followUpRequired}
                      onCheckedChange={(checked) => setFollowUpRequired(checked as boolean)}
                    />
                    <Label htmlFor="followUp">Follow-up Required</Label>
                  </div>

                  {followUpRequired && (
                    <div className="space-y-2">
                      <Label>Follow-up Date</Label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetWarningForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Issue Warning</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filterBySearch(warnings).map((warning) => (
              <Card key={warning.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {warning.staff?.full_name} ({warning.staff?.staff_code})
                      </CardTitle>
                      <CardDescription>
                        {warningTypes.find(t => t.value === warning.warning_type)?.label}
                      </CardDescription>
                    </div>
                    <Badge className={severityLevels.find(s => s.value === warning.severity)?.color}>
                      {severityLevels.find(s => s.value === warning.severity)?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2">{formatDateIST(warning.incident_date)}</span>
                      {warning.incident_time && <span className="ml-2">at {warning.incident_time}</span>}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Description:</p>
                      <p>{warning.description}</p>
                    </div>
                    {warning.action_taken && (
                      <div>
                        <p className="text-muted-foreground">Action Taken:</p>
                        <p>{warning.action_taken}</p>
                      </div>
                    )}
                    {warning.follow_up_required && (
                      <Badge variant="outline" className="mt-2">
                        Follow-up: {warning.follow_up_date ? formatDateIST(warning.follow_up_date) : "Required"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterBySearch(warnings).length === 0 && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No warnings found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Daily Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowActivityForm(!showActivityForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Activity
            </Button>
          </div>

          {showActivityForm && (
            <Card>
              <CardHeader>
                <CardTitle>Record Daily Activity</CardTitle>
                <CardDescription>Log staff member's daily activities</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitActivity} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Staff Member *</Label>
                      <Select value={selectedStaffForActivity} onValueChange={setSelectedStaffForActivity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name} ({staff.staff_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={activityDate}
                        onChange={(e) => setActivityDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Attendance Status *</Label>
                      <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {attendanceStatuses.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Patients Handled</Label>
                      <Input
                        type="number"
                        value={patientsHandled}
                        onChange={(e) => setPatientsHandled(e.target.value)}
                        placeholder="Number of patients"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Shift Start Time</Label>
                      <Input
                        type="time"
                        value={shiftStartTime}
                        onChange={(e) => setShiftStartTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Shift End Time</Label>
                      <Input
                        type="time"
                        value={shiftEndTime}
                        onChange={(e) => setShiftEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Tasks Completed</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addTask}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Task
                      </Button>
                    </div>
                    {tasksCompleted.map((task, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={task}
                          onChange={(e) => updateTask(index, e.target.value)}
                          placeholder={`Task ${index + 1}`}
                        />
                        {tasksCompleted.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeTask(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Special Notes</Label>
                    <Textarea
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      placeholder="Any special notes about the day..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Supervisor Notes</Label>
                    <Textarea
                      value={supervisorNotes}
                      onChange={(e) => setSupervisorNotes(e.target.value)}
                      placeholder="Supervisor's observations..."
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetActivityForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Record Activity</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filterBySearch(dailyActivities).map((activity) => (
              <Card key={activity.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {activity.staff?.full_name} ({activity.staff?.staff_code})
                      </CardTitle>
                      <CardDescription>
                        {formatLongDateIST(activity.activity_date)}
                      </CardDescription>
                    </div>
                    <Badge className={attendanceStatuses.find(s => s.value === activity.attendance_status)?.color}>
                      {attendanceStatuses.find(s => s.value === activity.attendance_status)?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {(activity.shift_start_time || activity.shift_end_time) && (
                      <div>
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="ml-2">
                          {activity.shift_start_time || "N/A"} - {activity.shift_end_time || "N/A"}
                        </span>
                      </div>
                    )}
                    {activity.patients_handled !== null && (
                      <div>
                        <span className="text-muted-foreground">Patients Handled:</span>
                        <span className="ml-2 font-semibold">{activity.patients_handled}</span>
                      </div>
                    )}
                    {activity.tasks_completed && Array.isArray(activity.tasks_completed) && activity.tasks_completed.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Tasks Completed:</p>
                        <ul className="list-disc list-inside ml-2">
                          {activity.tasks_completed.map((task: string, idx: number) => (
                            <li key={idx}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activity.special_notes && (
                      <div>
                        <p className="text-muted-foreground">Notes:</p>
                        <p>{activity.special_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterBySearch(dailyActivities).length === 0 && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No activities found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
