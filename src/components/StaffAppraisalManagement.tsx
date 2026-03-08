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
import { Loader2, ClipboardCheck, AlertTriangle, Calendar, Search, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, User, FileText, MessageSquare, ClipboardList } from "lucide-react";
import { VendorSearchCombobox } from "@/components/ui/vendor-search-combobox";
import { formatDateIST, formatDateTimeIST, formatInputDateIST, getCurrentISTDate, formatLongDateIST } from '@/lib/dateUtils';
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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

interface AppraisalCriteria {
  id: string;
  criteria_name: string;
  criteria_code: string;
  description: string | null;
  max_score: number;
  weight: number;
  is_active: boolean;
  display_order: number;
}

interface RoleCriteria {
  id: string;
  role_id: string;
  criteria_name: string;
  criteria_code: string;
  max_score: number;
  has_yes_no: boolean;
  display_order: number;
  is_active: boolean;
}

interface RoleCriteriaScore {
  criteria_id: string;
  yes_no_value: boolean | null;
  obtained_score: number;
}

interface AppraisalScoreRow {
  criteria_id: string;
  score_value: number;
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

const getAutoRating = (percentage: number): string => {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 75) return 'good';
  if (percentage >= 60) return 'satisfactory';
  if (percentage >= 40) return 'needs_improvement';
  return 'poor';
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getProgressColor = (score: number): string => {
  if (score >= 90) return '[&>div]:bg-green-500';
  if (score >= 75) return '[&>div]:bg-blue-500';
  if (score >= 60) return '[&>div]:bg-yellow-500';
  if (score >= 40) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
};

export default function StaffAppraisalManagement() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [appraisalScoresMap, setAppraisalScoresMap] = useState<Record<string, AppraisalScoreRow[]>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("appraisals");
  const [expandedAppraisalId, setExpandedAppraisalId] = useState<string | null>(null);
  
  // Appraisal form state
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [selectedStaffForAppraisal, setSelectedStaffForAppraisal] = useState("");
  const [appraisalMonth, setAppraisalMonth] = useState("");
  const [appraisalYear, setAppraisalYear] = useState("");
  const [overallRating, setOverallRating] = useState("");
  const [overallRatingOverride, setOverallRatingOverride] = useState(false);
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [criteriaList, setCriteriaList] = useState<AppraisalCriteria[]>([]);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [roleCriteriaList, setRoleCriteriaList] = useState<RoleCriteria[]>([]);
  const [roleCriteriaScores, setRoleCriteriaScores] = useState<Record<string, RoleCriteriaScore>>({});
  const [useRoleCriteria, setUseRoleCriteria] = useState(false);

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

  // Load role-specific criteria when staff is selected
  useEffect(() => {
    if (selectedStaffForAppraisal) {
      const staff = staffList.find(s => s.id === selectedStaffForAppraisal);
      if (staff?.role) {
        fetchRoleCriteria(staff.role);
      }
    } else {
      setRoleCriteriaList([]);
      setRoleCriteriaScores({});
      setUseRoleCriteria(false);
    }
  }, [selectedStaffForAppraisal, staffList]);

  // Auto-calculate overall rating from criteria scores (role-based or legacy)
  useEffect(() => {
    if (!overallRatingOverride) {
      if (useRoleCriteria && roleCriteriaList.length > 0) {
        const totalMax = roleCriteriaList.reduce((sum, c) => sum + c.max_score, 0);
        const totalObtained = Object.values(roleCriteriaScores).reduce((sum, s) => sum + s.obtained_score, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        setOverallRating(getAutoRating(percentage));
      } else if (criteriaList.length > 0) {
        const weightedAvg = calculateWeightedAverage(criteriaScores);
        if (!isNaN(weightedAvg)) {
          setOverallRating(getAutoRating(weightedAvg));
        }
      }
    }
  }, [criteriaScores, criteriaList, roleCriteriaScores, roleCriteriaList, useRoleCriteria, overallRatingOverride]);

  const calculateWeightedAverage = (scores: Record<string, number>): number => {
    let totalWeight = 0;
    let totalScore = 0;
    criteriaList.forEach(c => {
      const score = scores[c.id] ?? 0;
      totalScore += score * c.weight;
      totalWeight += c.weight;
    });
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaff(),
        fetchAppraisals(),
        fetchWarnings(),
        fetchDailyActivities(),
        fetchCriteria(),
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

  const fetchCriteria = async () => {
    const { data, error } = await (supabase as any)
      .from("appraisal_criteria_master")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error) throw error;
    setCriteriaList(data || []);
  };

  const fetchRoleCriteria = async (roleCode: string) => {
    // Find role_id from roles_master by role_code
    const { data: roleData } = await supabase
      .from('roles_master')
      .select('id')
      .eq('role_code', roleCode)
      .eq('is_active', true)
      .maybeSingle();

    if (!roleData) {
      setUseRoleCriteria(false);
      setRoleCriteriaList([]);
      return;
    }

    const { data } = await (supabase as any)
      .from('role_appraisal_criteria')
      .select('*')
      .eq('role_id', roleData.id)
      .eq('is_active', true)
      .order('display_order');

    if (data && data.length > 0) {
      setRoleCriteriaList(data);
      setUseRoleCriteria(true);
      // Initialize scores
      const initScores: Record<string, RoleCriteriaScore> = {};
      data.forEach((c: RoleCriteria) => {
        initScores[c.id] = { criteria_id: c.id, yes_no_value: null, obtained_score: 0 };
      });
      setRoleCriteriaScores(initScores);
    } else {
      setUseRoleCriteria(false);
      setRoleCriteriaList([]);
    }
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

    // Fetch all scores
    const { data: scoresData } = await (supabase as any)
      .from("staff_appraisal_scores")
      .select("appraisal_id, criteria_id, score_value");
    
    const map: Record<string, AppraisalScoreRow[]> = {};
    (scoresData || []).forEach((s: any) => {
      if (!map[s.appraisal_id]) map[s.appraisal_id] = [];
      map[s.appraisal_id].push({ criteria_id: s.criteria_id, score_value: s.score_value });
    });
    setAppraisalScoresMap(map);
  };

  const fetchWarnings = async () => {
    const { data, error } = await supabase
      .from("staff_warnings")
      .select(`*, staff:staff_id (id, staff_code, full_name, role, department)`)
      .order("incident_date", { ascending: false });
    if (error) throw error;
    setWarnings(data || []);
  };

  const fetchDailyActivities = async () => {
    const { data, error } = await supabase
      .from("staff_daily_activities")
      .select(`*, staff:staff_id (id, staff_code, full_name, role, department)`)
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
    
    if (!selectedStaffForAppraisal || !appraisalMonth || !appraisalYear || !overallRating) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Ensure the current user has a profile record (required by FK constraint)
    if (user?.id) {
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email || 'Unknown',
          role: (user.user_metadata?.role as any) || 'admin',
        } as any);
        if (profileError) {
          console.error('Failed to create profile:', profileError);
          toast({ title: "Error", description: "Could not verify user profile. Please contact admin.", variant: "destructive" });
          return;
        }
      }
    }

    // Map criteria scores to legacy columns for backward compatibility
    const criteriaCodeMap: Record<string, number> = {};
    criteriaList.forEach(c => {
      criteriaCodeMap[c.criteria_code] = Math.round((criteriaScores[c.id] ?? 0) / 20); // Convert 0-100% to 1-5 scale
    });

    // Derive period start/end from selected month-year
    const year = parseInt(appraisalYear);
    const month = parseInt(appraisalMonth) - 1; // JS months are 0-indexed
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0); // last day of month
    const periodStartStr = `${year}-${appraisalMonth.padStart(2, '0')}-01`;
    const periodEndStr = `${year}-${appraisalMonth.padStart(2, '0')}-${periodEnd.getDate().toString().padStart(2, '0')}`;

    const { data: appraisalData, error } = await supabase.from("staff_appraisals").insert([{
      staff_id: selectedStaffForAppraisal,
      appraisal_period_start: periodStartStr,
      appraisal_period_end: periodEndStr,
      overall_rating: overallRating as any,
      punctuality_rating: criteriaCodeMap['punctuality'] || 3,
      work_quality_rating: criteriaCodeMap['work_quality'] || 3,
      teamwork_rating: criteriaCodeMap['teamwork'] || 3,
      communication_rating: criteriaCodeMap['communication'] || 3,
      professionalism_rating: criteriaCodeMap['professionalism'] || 3,
      patient_care_rating: criteriaCodeMap['patient_care'] || 3,
      infection_control_rating: criteriaCodeMap['infection_control'] || 3,
      documentation_rating: criteriaCodeMap['documentation'] || 3,
      attendance_reliability_rating: criteriaCodeMap['attendance_reliability'] || 3,
      initiative_rating: criteriaCodeMap['initiative'] || 3,
      training_participation_rating: criteriaCodeMap['training_participation'] || 3,
      strengths,
      areas_for_improvement: areasForImprovement,
      manager_comments: managerComments,
      action_plan: actionPlan,
      next_review_date: nextReviewDate || null,
      appraised_by: user?.id,
    } as any]).select('id').single();

    if (error) {
      toast({ title: "Error", description: "Failed to create appraisal", variant: "destructive" });
      return;
    }

    // Save dynamic scores
    if (appraisalData?.id) {
      if (useRoleCriteria && roleCriteriaList.length > 0) {
        // Save new role-based criteria scores
        const roleScoreInserts = roleCriteriaList.map(c => ({
          appraisal_id: appraisalData.id,
          criteria_id: c.id,
          yes_no_value: roleCriteriaScores[c.id]?.yes_no_value ?? null,
          obtained_score: roleCriteriaScores[c.id]?.obtained_score ?? 0,
        }));

        const { error: roleScoresError } = await (supabase as any)
          .from("staff_appraisal_criteria_scores")
          .insert(roleScoreInserts);

        if (roleScoresError) {
          console.error("Failed to save role criteria scores:", roleScoresError);
        }
      } else {
        // Legacy: save to staff_appraisal_scores
        const scoreInserts = criteriaList.map(c => ({
          appraisal_id: appraisalData.id,
          criteria_id: c.id,
          score_value: criteriaScores[c.id] ?? 0,
        }));

        const { error: scoresError } = await (supabase as any)
          .from("staff_appraisal_scores")
          .insert(scoreInserts);

        if (scoresError) {
          console.error("Failed to save scores:", scoresError);
        }
      }
    }

    toast({ title: "Success", description: "Appraisal created successfully" });
    resetAppraisalForm();
    fetchAppraisals();
  };

  const resetAppraisalForm = () => {
    setShowAppraisalForm(false);
    setSelectedStaffForAppraisal("");
    setAppraisalMonth("");
    setAppraisalYear("");
    setOverallRating("");
    setOverallRatingOverride(false);
    setStrengths("");
    setAreasForImprovement("");
    setManagerComments("");
    setActionPlan("");
    setNextReviewDate("");
    setCriteriaScores({});
    setRoleCriteriaList([]);
    setRoleCriteriaScores({});
    setUseRoleCriteria(false);
  };

  const handleRoleCriteriaYesNo = (criteriaId: string, value: boolean) => {
    const criteria = roleCriteriaList.find(c => c.id === criteriaId);
    setRoleCriteriaScores(prev => ({
      ...prev,
      [criteriaId]: {
        criteria_id: criteriaId,
        yes_no_value: value,
        obtained_score: value ? (criteria?.max_score ?? 0) : 0,
      }
    }));
  };

  const handleRoleCriteriaScore = (criteriaId: string, score: number) => {
    setRoleCriteriaScores(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        criteria_id: criteriaId,
        obtained_score: Math.max(0, score),
      }
    }));
  };

  const handleQuickFillAll = (value: boolean) => {
    const newScores: Record<string, RoleCriteriaScore> = {};
    roleCriteriaList.forEach(c => {
      newScores[c.id] = {
        criteria_id: c.id,
        yes_no_value: value,
        obtained_score: value ? c.max_score : 0,
      };
    });
    setRoleCriteriaScores(newScores);
  };

  const handleCriteriaScoreChange = (criteriaId: string, value: number) => {
    setCriteriaScores(prev => ({ ...prev, [criteriaId]: Math.min(100, Math.max(0, value)) }));
  };

  const handleSubmitWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForWarning || !warningType || !incidentDate || !severity || !warningDescription) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("staff_warnings").insert([{
      staff_id: selectedStaffForWarning, warning_type: warningType as any, incident_date: incidentDate,
      incident_time: incidentTime || null, severity: severity as any, description: warningDescription,
      action_taken: actionTaken, witness_name: witnessName, staff_response: staffResponse,
      follow_up_required: followUpRequired, follow_up_date: followUpRequired ? followUpDate : null,
      issued_by: user?.id,
    }]);
    if (error) { toast({ title: "Error", description: "Failed to issue warning", variant: "destructive" }); return; }
    toast({ title: "Success", description: "Warning issued successfully" });
    resetWarningForm();
    fetchWarnings();
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForActivity || !activityDate || !attendanceStatus) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("staff_daily_activities").insert([{
      staff_id: selectedStaffForActivity, activity_date: activityDate,
      shift_start_time: shiftStartTime || null, shift_end_time: shiftEndTime || null,
      attendance_status: attendanceStatus as any,
      tasks_completed: tasksCompleted.filter(t => t.trim() !== "") as any,
      patients_handled: patientsHandled ? parseInt(patientsHandled) : null,
      special_notes: specialNotes, supervisor_notes: supervisorNotes, recorded_by: user?.id,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "Activity already exists for this staff member on this date" : "Failed to record activity", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Activity recorded successfully" });
    resetActivityForm();
    fetchDailyActivities();
  };

  const resetWarningForm = () => {
    setShowWarningForm(false); setSelectedStaffForWarning(""); setWarningType("");
    setIncidentDate(""); setIncidentTime(""); setSeverity(""); setWarningDescription("");
    setActionTaken(""); setWitnessName(""); setStaffResponse("");
    setFollowUpRequired(false); setFollowUpDate("");
  };

  const resetActivityForm = () => {
    setShowActivityForm(false); setSelectedStaffForActivity("");
    setActivityDate(formatInputDateIST(getCurrentISTDate()));
    setShiftStartTime(""); setShiftEndTime(""); setAttendanceStatus("");
    setTasksCompleted([""]); setPatientsHandled(""); setSpecialNotes(""); setSupervisorNotes("");
  };

  const addTask = () => setTasksCompleted([...tasksCompleted, ""]);
  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasksCompleted]; newTasks[index] = value; setTasksCompleted(newTasks);
  };
  const removeTask = (index: number) => setTasksCompleted(tasksCompleted.filter((_, i) => i !== index));

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
        <Card><CardContent className="p-6">
          <p className="text-center text-muted-foreground">Access denied. This feature is only available for administrators and managers.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const weightedAvg = calculateWeightedAverage(criteriaScores);

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
          <Input placeholder="Search by staff name or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appraisals"><ClipboardCheck className="h-4 w-4 mr-2" />Appraisals ({appraisals.length})</TabsTrigger>
          <TabsTrigger value="warnings"><AlertTriangle className="h-4 w-4 mr-2" />Warnings ({warnings.length})</TabsTrigger>
          <TabsTrigger value="activities"><Calendar className="h-4 w-4 mr-2" />Daily Activities ({dailyActivities.length})</TabsTrigger>
        </TabsList>

        {/* Appraisals Tab */}
        <TabsContent value="appraisals" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAppraisalForm(!showAppraisalForm)}>
              <Plus className="h-4 w-4 mr-2" />New Appraisal
            </Button>
          </div>

          {showAppraisalForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Performance Appraisal</CardTitle>
                <CardDescription>Evaluate staff member's performance using criteria-based scoring</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAppraisal} className="space-y-6">
                  {/* Section: Staff & Period */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff & Period</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Staff Member *</Label>
                      <VendorSearchCombobox
                        items={staffList.map(s => ({ id: s.id, code: s.staff_code, name: s.full_name }))}
                        value={selectedStaffForAppraisal}
                        onValueChange={setSelectedStaffForAppraisal}
                        placeholder="Search staff by name or code..."
                        searchPlaceholder="Type to search staff..."
                        emptyMessage="No staff found."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Appraisal Month *</Label>
                      <div className="flex gap-2">
                        <Select value={appraisalMonth} onValueChange={setAppraisalMonth}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                          <SelectContent>
                            {[
                              { value: "1", label: "January" },
                              { value: "2", label: "February" },
                              { value: "3", label: "March" },
                              { value: "4", label: "April" },
                              { value: "5", label: "May" },
                              { value: "6", label: "June" },
                              { value: "7", label: "July" },
                              { value: "8", label: "August" },
                              { value: "9", label: "September" },
                              { value: "10", label: "October" },
                              { value: "11", label: "November" },
                              { value: "12", label: "December" },
                            ].map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={appraisalYear} onValueChange={setAppraisalYear}>
                          <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>
                            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Next Review Date</Label>
                      <Input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="hover:border-primary/50 transition-colors" />
                    </div>
                    </div>
                  </div>

                  {/* Step 2: Role-Based Yes/No Criteria Grid */}
                  {useRoleCriteria && roleCriteriaList.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-sm uppercase tracking-wide">
                          Performance Rating Grid — {staffList.find(s => s.id === selectedStaffForAppraisal)?.role}
                        </h3>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => handleQuickFillAll(true)} className="h-7 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> All YES
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => handleQuickFillAll(false)} className="h-7 text-xs">
                            <XCircle className="h-3 w-3 mr-1" /> All NO
                          </Button>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">S.No</TableHead>
                            <TableHead>Criteria</TableHead>
                            <TableHead className="w-28 text-center">Max Score (%)</TableHead>
                            <TableHead className="w-20 text-center">YES</TableHead>
                            <TableHead className="w-20 text-center">NO</TableHead>
                            <TableHead className="w-32 text-center">Obtained Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roleCriteriaList.map((criteria, index) => {
                            const score = roleCriteriaScores[criteria.id];
                            const yesNo = score?.yes_no_value;
                            const obtained = score?.obtained_score ?? 0;
                            return (
                              <TableRow key={criteria.id}>
                                <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                <TableCell>
                                  <span className="font-medium text-sm">{criteria.criteria_name}</span>
                                </TableCell>
                                <TableCell className="text-center font-semibold">{criteria.max_score}%</TableCell>
                                <TableCell className="text-center">
                                  {criteria.has_yes_no && (
                                    <button
                                      type="button"
                                      onClick={() => handleRoleCriteriaYesNo(criteria.id, true)}
                                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors mx-auto ${
                                        yesNo === true
                                          ? 'bg-green-500 border-green-500 text-white'
                                          : 'border-muted-foreground/30 hover:border-green-400'
                                      }`}
                                    >
                                      {yesNo === true && <CheckCircle2 className="h-4 w-4" />}
                                    </button>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {criteria.has_yes_no && (
                                    <button
                                      type="button"
                                      onClick={() => handleRoleCriteriaYesNo(criteria.id, false)}
                                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors mx-auto ${
                                        yesNo === false
                                          ? 'bg-red-500 border-red-500 text-white'
                                          : 'border-muted-foreground/30 hover:border-red-400'
                                      }`}
                                    >
                                      {yesNo === false && <XCircle className="h-4 w-4" />}
                                    </button>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={criteria.max_score}
                                    value={obtained}
                                    onChange={(e) => handleRoleCriteriaScore(criteria.id, parseFloat(e.target.value) || 0)}
                                    className={`w-20 text-center font-bold mx-auto ${getScoreColor((obtained / criteria.max_score) * 100)}`}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow className="bg-muted/30 font-bold">
                            <TableCell colSpan={2} className="text-right font-bold">TOTAL SCORE</TableCell>
                            <TableCell className="text-center font-bold">
                              {roleCriteriaList.reduce((sum, c) => sum + c.max_score, 0)}%
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                            <TableCell className="text-center">
                              <span className={`text-lg font-bold ${getScoreColor(
                                (Object.values(roleCriteriaScores).reduce((sum, s) => sum + s.obtained_score, 0) / 
                                  Math.max(1, roleCriteriaList.reduce((sum, c) => sum + c.max_score, 0))) * 100
                              )}`}>
                                {Object.values(roleCriteriaScores).reduce((sum, s) => sum + s.obtained_score, 0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Legacy: Percentage-based Rating Grid (fallback) */}
                  {!useRoleCriteria && criteriaList.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 border-b">
                        <h3 className="font-semibold text-sm uppercase tracking-wide">Performance Rating Grid (%)</h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Criteria</TableHead>
                            <TableHead className="w-[100px] text-center">Score (%)</TableHead>
                            <TableHead>Rating Bar</TableHead>
                            <TableHead className="w-[200px] text-center">Quick Select</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {criteriaList.map(criteria => {
                            const score = criteriaScores[criteria.id] ?? 0;
                            return (
                              <TableRow key={criteria.id}>
                                <TableCell>
                                  <div>
                                    <span className="font-medium text-sm">{criteria.criteria_name}</span>
                                    {criteria.weight !== 1 && (
                                      <Badge variant="outline" className="ml-2 text-xs">{criteria.weight}x</Badge>
                                    )}
                                  </div>
                                  {criteria.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{criteria.description}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={score}
                                    onChange={(e) => handleCriteriaScoreChange(criteria.id, parseInt(e.target.value) || 0)}
                                    className={`w-20 text-center font-bold mx-auto ${getScoreColor(score)}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Progress value={score} className={`h-3 flex-1 ${getProgressColor(score)}`} />
                                    <span className={`text-sm font-semibold w-12 text-right ${getScoreColor(score)}`}>{score}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 justify-center">
                                    {[25, 50, 75, 100].map(val => (
                                      <Button
                                        key={val}
                                        type="button"
                                        size="sm"
                                        variant={score === val ? "default" : "outline"}
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleCriteriaScoreChange(criteria.id, val)}
                                      >
                                        {val}%
                                      </Button>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Step 3: Auto-calculated Summary */}
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {useRoleCriteria ? 'Total Obtained' : 'Weighted Average'}
                          </p>
                          <p className={`text-2xl font-bold ${getScoreColor(
                            useRoleCriteria
                              ? (Object.values(roleCriteriaScores).reduce((sum, s) => sum + s.obtained_score, 0) / 
                                  Math.max(1, roleCriteriaList.reduce((sum, c) => sum + c.max_score, 0))) * 100
                              : weightedAvg
                          )}`}>
                            {useRoleCriteria
                              ? `${Object.values(roleCriteriaScores).reduce((sum, s) => sum + s.obtained_score, 0)}%`
                              : `${weightedAvg.toFixed(1)}%`
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Rating</p>
                          <Badge className={`text-sm ${overallRatings.find(r => r.value === overallRating)?.color || ''}`}>
                            {overallRatings.find(r => r.value === overallRating)?.label || 'Not Set'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="overrideRating"
                          checked={overallRatingOverride}
                          onCheckedChange={(checked) => setOverallRatingOverride(checked as boolean)}
                        />
                        <Label htmlFor="overrideRating" className="text-sm">Override rating</Label>
                        {overallRatingOverride && (
                          <Select value={overallRating} onValueChange={setOverallRating}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select rating" /></SelectTrigger>
                            <SelectContent>
                              {overallRatings.map(rating => (
                                <SelectItem key={rating.value} value={rating.value}>{rating.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Comments */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comments & Action Plan</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Strengths</Label>
                        <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="List key strengths..." rows={3} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Areas for Improvement</Label>
                        <Textarea value={areasForImprovement} onChange={(e) => setAreasForImprovement(e.target.value)} placeholder="List areas needing improvement..." rows={3} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Manager Comments</Label>
                        <Textarea value={managerComments} onChange={(e) => setManagerComments(e.target.value)} placeholder="Additional comments..." rows={3} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Action Plan</Label>
                        <Textarea value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} placeholder="Development action plan..." rows={3} className="hover:border-primary/50 transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetAppraisalForm}>Cancel</Button>
                    <Button type="submit">Submit Appraisal</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Appraisal List - Excel-like Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name (Code)</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  {criteriaList.slice(0, 5).map(c => (
                    <TableHead key={c.id} className="text-center text-xs hidden lg:table-cell">
                      {c.criteria_name.split(' ')[0]}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Avg %</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterBySearch(appraisals).map((appraisal) => {
                  const scores = appraisalScoresMap[appraisal.id] || [];
                  const scoreMap: Record<string, number> = {};
                  scores.forEach(s => { scoreMap[s.criteria_id] = s.score_value; });
                  const avg = scores.length > 0
                    ? scores.reduce((sum, s) => sum + s.score_value, 0) / scores.length
                    : 0;
                  const isExpanded = expandedAppraisalId === appraisal.id;

                  return (
                    <>
                      <TableRow 
                        key={appraisal.id} 
                        className="cursor-pointer"
                        onClick={() => setExpandedAppraisalId(isExpanded ? null : appraisal.id)}
                      >
                        <TableCell className="font-medium">
                          {appraisal.staff?.full_name} ({appraisal.staff?.staff_code})
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateIST(appraisal.appraisal_period_start)} - {formatDateIST(appraisal.appraisal_period_end)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={overallRatings.find(r => r.value === appraisal.overall_rating)?.color}>
                            {overallRatings.find(r => r.value === appraisal.overall_rating)?.label}
                          </Badge>
                        </TableCell>
                        {criteriaList.slice(0, 5).map(c => (
                          <TableCell key={c.id} className="text-center text-sm hidden lg:table-cell">
                            <span className={getScoreColor(scoreMap[c.id] ?? 0)}>
                              {scores.length > 0 ? `${scoreMap[c.id] ?? 0}%` : '-'}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <span className={`font-semibold ${getScoreColor(avg)}`}>
                            {scores.length > 0 ? `${avg.toFixed(0)}%` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${appraisal.id}-detail`}>
                          <TableCell colSpan={8 + Math.min(criteriaList.length, 5)} className="bg-muted/20 p-4">
                            <div className="space-y-4">
                              {/* Full criteria scores */}
                              {scores.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {criteriaList.map(c => {
                                    const val = scoreMap[c.id] ?? 0;
                                    return (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground w-32 truncate">{c.criteria_name}:</span>
                                        <Progress value={val} className={`h-2 flex-1 ${getProgressColor(val)}`} />
                                        <span className={`text-sm font-semibold w-10 text-right ${getScoreColor(val)}`}>{val}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Legacy display if no dynamic scores */}
                              {scores.length === 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                                  <div><span className="text-muted-foreground">Punctuality:</span> <span className="font-semibold">{appraisal.punctuality_rating}/5</span></div>
                                  <div><span className="text-muted-foreground">Work Quality:</span> <span className="font-semibold">{appraisal.work_quality_rating}/5</span></div>
                                  <div><span className="text-muted-foreground">Teamwork:</span> <span className="font-semibold">{appraisal.teamwork_rating}/5</span></div>
                                  <div><span className="text-muted-foreground">Communication:</span> <span className="font-semibold">{appraisal.communication_rating}/5</span></div>
                                  <div><span className="text-muted-foreground">Professionalism:</span> <span className="font-semibold">{appraisal.professionalism_rating}/5</span></div>
                                </div>
                              )}
                              {appraisal.strengths && (
                                <div><p className="text-sm font-semibold text-muted-foreground">Strengths:</p><p className="text-sm">{appraisal.strengths}</p></div>
                              )}
                              {appraisal.areas_for_improvement && (
                                <div><p className="text-sm font-semibold text-muted-foreground">Areas for Improvement:</p><p className="text-sm">{appraisal.areas_for_improvement}</p></div>
                              )}
                              {appraisal.manager_comments && (
                                <div><p className="text-sm font-semibold text-muted-foreground">Manager Comments:</p><p className="text-sm">{appraisal.manager_comments}</p></div>
                              )}
                              {appraisal.action_plan && (
                                <div><p className="text-sm font-semibold text-muted-foreground">Action Plan:</p><p className="text-sm">{appraisal.action_plan}</p></div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {filterBySearch(appraisals).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No appraisals found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Warnings Tab */}
        <TabsContent value="warnings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowWarningForm(!showWarningForm)}>
              <Plus className="h-4 w-4 mr-2" />Issue Warning
            </Button>
          </div>

          {showWarningForm && (
            <Card>
              <CardHeader>
                <CardTitle>Issue Warning</CardTitle>
                <CardDescription>Record disciplinary action</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitWarning} className="space-y-5">
                  {/* Section: Incident Details */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Incident Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Staff Member *</Label>
                        <Select value={selectedStaffForWarning} onValueChange={setSelectedStaffForWarning}>
                          <SelectTrigger className="hover:border-primary/50 transition-colors"><SelectValue placeholder="Select staff" /></SelectTrigger>
                          <SelectContent>
                            {staffList.map(staff => (
                              <SelectItem key={staff.id} value={staff.id}>{staff.full_name} ({staff.staff_code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Warning Type *</Label>
                        <Select value={warningType} onValueChange={setWarningType}>
                          <SelectTrigger className="hover:border-primary/50 transition-colors"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {warningTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Severity *</Label>
                        <Select value={severity} onValueChange={setSeverity}>
                          <SelectTrigger className="hover:border-primary/50 transition-colors"><SelectValue placeholder="Select severity" /></SelectTrigger>
                          <SelectContent>
                            {severityLevels.map(level => (
                              <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Incident Date *</Label>
                        <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Incident Time</Label>
                        <Input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Witness Name</Label>
                        <Input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="Optional" className="hover:border-primary/50 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Description & Response */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description & Response</h3>
                    </div>
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Textarea value={warningDescription} onChange={(e) => setWarningDescription(e.target.value)} placeholder="Detailed description of the incident..." rows={3} className="hover:border-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>Action Taken</Label>
                      <Textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="What action was taken..." rows={2} className="hover:border-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>Staff Response</Label>
                      <Textarea value={staffResponse} onChange={(e) => setStaffResponse(e.target.value)} placeholder="Staff member's response..." rows={2} className="hover:border-primary/50 transition-colors" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="followUp" checked={followUpRequired} onCheckedChange={(checked) => setFollowUpRequired(checked as boolean)} />
                      <Label htmlFor="followUp">Follow-up Required</Label>
                    </div>
                    {followUpRequired && (
                      <div className="space-y-2">
                        <Label>Follow-up Date</Label>
                        <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetWarningForm}>Cancel</Button>
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
                      <CardTitle className="text-lg">{warning.staff?.full_name} ({warning.staff?.staff_code})</CardTitle>
                      <CardDescription>{warningTypes.find(t => t.value === warning.warning_type)?.label}</CardDescription>
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
                    <div><p className="text-muted-foreground">Description:</p><p>{warning.description}</p></div>
                    {warning.action_taken && (<div><p className="text-muted-foreground">Action Taken:</p><p>{warning.action_taken}</p></div>)}
                    {warning.follow_up_required && (
                      <Badge variant="outline" className="mt-2">Follow-up: {warning.follow_up_date ? formatDateIST(warning.follow_up_date) : "Required"}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterBySearch(warnings).length === 0 && (
              <Card><CardContent className="p-6"><p className="text-center text-muted-foreground">No warnings found</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Daily Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowActivityForm(!showActivityForm)}>
              <Plus className="h-4 w-4 mr-2" />Record Activity
            </Button>
          </div>

          {showActivityForm && (
            <Card>
              <CardHeader>
                <CardTitle>Record Daily Activity</CardTitle>
                <CardDescription>Log staff member's daily activities</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitActivity} className="space-y-5">
                  {/* Section: Attendance */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Staff Member *</Label>
                        <Select value={selectedStaffForActivity} onValueChange={setSelectedStaffForActivity}>
                          <SelectTrigger className="hover:border-primary/50 transition-colors"><SelectValue placeholder="Select staff" /></SelectTrigger>
                          <SelectContent>
                            {staffList.map(staff => (
                              <SelectItem key={staff.id} value={staff.id}>{staff.full_name} ({staff.staff_code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Status *</Label>
                        <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                          <SelectTrigger className="hover:border-primary/50 transition-colors"><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            {attendanceStatuses.map(status => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Patients Handled</Label>
                        <Input type="number" value={patientsHandled} onChange={(e) => setPatientsHandled(e.target.value)} placeholder="Number of patients" min="0" className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Shift Start Time</Label>
                        <Input type="time" value={shiftStartTime} onChange={(e) => setShiftStartTime(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>Shift End Time</Label>
                        <Input type="time" value={shiftEndTime} onChange={(e) => setShiftEndTime(e.target.value)} className="hover:border-primary/50 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Work Details */}
                  <div className="rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Details</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Tasks Completed</Label>
                        <Button type="button" size="sm" variant="outline" onClick={addTask}><Plus className="h-3 w-3 mr-1" />Add Task</Button>
                      </div>
                      {tasksCompleted.map((task, index) => (
                        <div key={index} className="flex gap-2">
                          <Input value={task} onChange={(e) => updateTask(index, e.target.value)} placeholder={`Task ${index + 1}`} className="hover:border-primary/50 transition-colors" />
                          {tasksCompleted.length > 1 && (
                            <Button type="button" size="sm" variant="outline" onClick={() => removeTask(index)}>Remove</Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Special Notes</Label>
                      <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="Any special notes about the day..." rows={2} className="hover:border-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>Supervisor Notes</Label>
                      <Textarea value={supervisorNotes} onChange={(e) => setSupervisorNotes(e.target.value)} placeholder="Supervisor's observations..." rows={2} className="hover:border-primary/50 transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetActivityForm}>Cancel</Button>
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
                      <CardTitle className="text-lg">{activity.staff?.full_name} ({activity.staff?.staff_code})</CardTitle>
                      <CardDescription>{formatLongDateIST(activity.activity_date)}</CardDescription>
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
                        <span className="ml-2">{activity.shift_start_time || '?'} - {activity.shift_end_time || '?'}</span>
                      </div>
                    )}
                    {activity.patients_handled != null && (
                      <div><span className="text-muted-foreground">Patients:</span><span className="ml-2">{activity.patients_handled}</span></div>
                    )}
                    {activity.tasks_completed?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Tasks:</p>
                        <ul className="list-disc pl-5">{activity.tasks_completed.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
                      </div>
                    )}
                    {activity.special_notes && (<div><p className="text-muted-foreground">Notes:</p><p>{activity.special_notes}</p></div>)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterBySearch(dailyActivities).length === 0 && (
              <Card><CardContent className="p-6"><p className="text-center text-muted-foreground">No activities found</p></CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
