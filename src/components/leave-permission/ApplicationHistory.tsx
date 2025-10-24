import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, Search, Eye, X } from "lucide-react";
import { formatDateIST, formatDateTimeIST } from "@/lib/dateUtils";

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
  approved_at: string | null;
  rejection_reason: string | null;
  approver: {
    full_name: string;
    staff_code: string;
  } | null;
  approved_by_staff: {
    full_name: string;
    staff_code: string;
  } | null;
}

const ApplicationHistory = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) return;

      const { data, error } = await supabase
        .from("leave_permission_applications" as any)
        .select(`
          *,
          approver:approver_id(full_name, staff_code),
          approved_by_staff:approved_by(full_name, staff_code)
        `)
        .eq("applicant_id", staffData.id)
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

    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.reason_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatReason = (reason: string) => {
    return reason.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApp(app);
    setDetailsOpen(true);
  };

  const handleCancelApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "pending");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application cancelled successfully",
      });

      loadApplications();
    } catch (error: any) {
      console.error("Error cancelling application:", error);
      toast({
        title: "Error",
        description: "Failed to cancel application",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
          <CardDescription>View and manage your leave and permission applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reason or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date/Period</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No applications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((app) => (
                        <TableRow key={app.id}>
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
                            {formatReason(app.application_type === "leave" ? app.leave_reason! : app.permission_reason!)}
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {app.approver?.full_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(app)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {app.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelApplication(app.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              View complete information about this application
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Type:</span>
                  <p className="capitalize">{selectedApp.application_type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                </div>
              </div>

              {selectedApp.application_type === "leave" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Start Date:</span>
                      <p>{formatDateIST(selectedApp.leave_start_date!)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">End Date:</span>
                      <p>{formatDateIST(selectedApp.leave_end_date!)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Days:</span>
                      <p>{selectedApp.leave_days} {selectedApp.is_half_day ? "half day" : "days"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Reason:</span>
                      <p>{formatReason(selectedApp.leave_reason!)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Date:</span>
                      <p>{formatDateIST(selectedApp.permission_date!)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Duration:</span>
                      <p>{selectedApp.permission_duration_minutes} minutes</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Time:</span>
                      <p>{selectedApp.permission_start_time} - {selectedApp.permission_end_time}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Reason:</span>
                      <p>{formatReason(selectedApp.permission_reason!)}</p>
                    </div>
                  </div>
                </>
              )}

              {selectedApp.reason_details && (
                <div>
                  <span className="text-sm font-medium">Reason Details:</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedApp.reason_details}</p>
                </div>
              )}

              {selectedApp.notes && (
                <div>
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedApp.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Approver:</span>
                  <p>{selectedApp.approver?.full_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Applied On:</span>
                  <p>{formatDateTimeIST(selectedApp.created_at)}</p>
                </div>
              </div>

              {selectedApp.status === "approved" && selectedApp.approved_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Approved By:</span>
                    <p>{selectedApp.approved_by_staff?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Approved On:</span>
                    <p>{formatDateTimeIST(selectedApp.approved_at)}</p>
                  </div>
                </div>
              )}

              {selectedApp.status === "rejected" && selectedApp.rejection_reason && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <span className="text-sm font-medium">Rejection Reason:</span>
                  <p className="text-sm mt-1">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicationHistory;
