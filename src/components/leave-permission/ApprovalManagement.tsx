import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, Search, CheckCircle, XCircle } from "lucide-react";
import { formatDateIST, formatDateTimeIST } from "@/lib/dateUtils";
import ApprovalDialog from "./ApprovalDialog";

interface Application {
  id: string;
  application_type: string;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_days: number | null;
  leave_reason: string | null;
  is_half_day: boolean | null;
  permission_date: string | null;
  permission_start_time: string | null;
  permission_end_time: string | null;
  permission_duration_minutes: number | null;
  permission_reason: string | null;
  reason_details: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  applicant: {
    full_name: string;
    staff_code: string;
    role: string;
  };
}

const ApprovalManagement = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");

  useEffect(() => {
    loadPendingApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, typeFilter]);

  const loadPendingApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) return;

      // Load applications where user is the approver or user is admin
      const { data, error } = await supabase
        .from("leave_permission_applications" as any)
        .select(`
          *,
          applicant:applicant_id(full_name, staff_code, role)
        `)
        .eq("status", "pending")
        .or(`approver_id.eq.${staffData.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data as any || []);
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (typeFilter !== "all") {
      filtered = filtered.filter(app => app.application_type === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.applicant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicant.staff_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleApproveClick = (app: Application) => {
    setSelectedApp(app);
    setApprovalAction("approve");
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = (app: Application) => {
    setSelectedApp(app);
    setApprovalAction("reject");
    setApprovalDialogOpen(true);
  };

  const handleApprovalComplete = () => {
    setApprovalDialogOpen(false);
    setSelectedApp(null);
    loadPendingApplications();
  };

  const formatReason = (reason: string) => {
    return reason.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leave & Permission Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve or reject leave and permission applications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Applications ({filteredApplications.length})</CardTitle>
            <CardDescription>Applications awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or staff code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="leave">Leave Only</SelectItem>
                  <SelectItem value="permission">Permission Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date/Period</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending applications
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((app) => (
                      <TableRow key={app.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-medium">{app.applicant.full_name}</div>
                            <div className="text-xs text-muted-foreground">{app.applicant.staff_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {app.application_type === "leave" ? (
                              <Calendar className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            <span className="capitalize">{app.application_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {app.application_type === "leave" ? (
                            <div>
                              <div>{formatDateIST(app.leave_start_date!)} - {formatDateIST(app.leave_end_date!)}</div>
                              <div className="text-xs text-muted-foreground">
                                {app.leave_days} {app.is_half_day ? "half day" : "days"}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{formatDateIST(app.permission_date!)}</div>
                              <div className="text-xs text-muted-foreground">
                                {app.permission_start_time} - {app.permission_end_time} ({app.permission_duration_minutes} min)
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatReason(app.application_type === "leave" ? app.leave_reason! : app.permission_reason!)}</div>
                            {app.reason_details && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{app.reason_details}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTimeIST(app.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveClick(app)}
                              className="min-h-[36px]"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectClick(app)}
                              className="min-h-[36px]"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedApp && (
        <ApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          application={selectedApp}
          action={approvalAction}
          onComplete={handleApprovalComplete}
        />
      )}
    </>
  );
};

export default ApprovalManagement;
