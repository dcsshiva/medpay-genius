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
import { Calendar, Clock, Search, Eye, X, FileText } from "lucide-react";
import { formatDateIST, formatDateTimeIST } from "@/lib/dateUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  approver: { full_name: string; staff_code: string } | null;
  approved_by_staff: { full_name: string; staff_code: string } | null;
}

const ApplicationHistory = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const isMobile = useIsMobile();

  useEffect(() => { loadApplications(); }, []);
  useEffect(() => { filterApplications(); }, [applications, searchTerm, statusFilter]);

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: staffData } = await supabase
        .from("staff").select("id").eq("user_id", user.id).single();
      if (!staffData) return;
      const { data, error } = await supabase
        .from("leave_permission_applications" as any)
        .select(`*, approver:approver_id(full_name, staff_code), approved_by_staff:approved_by(full_name, staff_code)`)
        .eq("applicant_id", staffData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications(data as any || []);
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast({ title: "Error", description: "Failed to load applications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;
    if (statusFilter !== "all") filtered = filtered.filter(app => app.status === statusFilter);
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
      pending: "secondary", approved: "default", rejected: "destructive", cancelled: "outline",
    };
    return <Badge variant={variants[status] || "default"} className="capitalize">{status}</Badge>;
  };

  const formatReason = (reason: string) =>
    reason.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const handleViewDetails = (app: Application) => { setSelectedApp(app); setDetailsOpen(true); };

  const handleCancelApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
      if (error) throw error;
      toast({ title: "Success", description: "Application cancelled successfully" });
      loadApplications();
    } catch (error: any) {
      console.error("Error cancelling application:", error);
      toast({ title: "Error", description: "Failed to cancel application", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading applications...</div>
        </CardContent>
      </Card>
    );
  }

  const MobileCard = ({ app }: { app: Application }) => (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-2 active:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => handleViewDetails(app)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {app.application_type === "leave" ? (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium capitalize">{app.application_type}</p>
            <p className="text-xs text-muted-foreground">
              {app.application_type === "leave"
                ? `${formatDateIST(app.leave_start_date!)} — ${formatDateIST(app.leave_end_date!)}`
                : `${formatDateIST(app.permission_date!)} · ${app.permission_start_time}–${app.permission_end_time}`
              }
            </p>
          </div>
        </div>
        {getStatusBadge(app.status)}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatReason(app.application_type === "leave" ? app.leave_reason! : app.permission_reason!)}
        </span>
        {app.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleCancelApplication(app.id); }}
          >
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        )}
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No applications found</p>
      <p className="text-xs text-muted-foreground mt-1">
        {statusFilter === "all" ? "You haven't submitted any applications yet" : `No ${statusFilter} applications`}
      </p>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">Application History</CardTitle>
          <CardDescription className="text-xs md:text-sm">View and manage your applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reason or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <ScrollArea className="w-full">
              <TabsList className="inline-flex">
                <TabsTrigger value="all" className="min-h-[36px]">All</TabsTrigger>
                <TabsTrigger value="pending" className="min-h-[36px]">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="min-h-[36px]">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="min-h-[36px]">Rejected</TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value={statusFilter} className="mt-3">
              {filteredApplications.length === 0 ? (
                <EmptyState />
              ) : isMobile ? (
                <div className="space-y-2">
                  {filteredApplications.map((app) => (
                    <MobileCard key={app.id} app={app} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead>Date/Period</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[90px]">Status</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {app.application_type === "leave" ? (
                                <Calendar className="h-3.5 w-3.5" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" />
                              )}
                              <span className="capitalize text-sm">{app.application_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {app.application_type === "leave" ? (
                              <div>
                                <div>{formatDateIST(app.leave_start_date!)} – {formatDateIST(app.leave_end_date!)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {app.leave_days} {app.is_half_day ? "half day" : "days"}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div>{formatDateIST(app.permission_date!)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {app.permission_start_time}–{app.permission_end_time} ({app.permission_duration_minutes}m)
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatReason(app.application_type === "leave" ? app.leave_reason! : app.permission_reason!)}
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="text-sm">{app.approver?.full_name || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(app)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {app.status === "pending" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleCancelApplication(app.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Complete information about this application</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Type</span>
                  <p className="capitalize text-sm font-medium">{selectedApp.application_type}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedApp.status)}</div>
                </div>
              </div>

              {selectedApp.application_type === "leave" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Period</span>
                    <p className="text-sm">{formatDateIST(selectedApp.leave_start_date!)} – {formatDateIST(selectedApp.leave_end_date!)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Days</span>
                    <p className="text-sm">{selectedApp.leave_days} {selectedApp.is_half_day ? "half day" : "days"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">Reason</span>
                    <p className="text-sm">{formatReason(selectedApp.leave_reason!)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Date</span>
                    <p className="text-sm">{formatDateIST(selectedApp.permission_date!)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Duration</span>
                    <p className="text-sm">{selectedApp.permission_duration_minutes} min</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Time</span>
                    <p className="text-sm">{selectedApp.permission_start_time} – {selectedApp.permission_end_time}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Reason</span>
                    <p className="text-sm">{formatReason(selectedApp.permission_reason!)}</p>
                  </div>
                </div>
              )}

              {selectedApp.reason_details && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Details</span>
                  <p className="text-sm mt-0.5">{selectedApp.reason_details}</p>
                </div>
              )}
              {selectedApp.notes && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Notes</span>
                  <p className="text-sm mt-0.5">{selectedApp.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Approver</span>
                  <p className="text-sm">{selectedApp.approver?.full_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Applied</span>
                  <p className="text-sm">{formatDateTimeIST(selectedApp.created_at)}</p>
                </div>
              </div>

              {selectedApp.status === "approved" && selectedApp.approved_at && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Approved By</span>
                    <p className="text-sm">{selectedApp.approved_by_staff?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Approved On</span>
                    <p className="text-sm">{formatDateTimeIST(selectedApp.approved_at)}</p>
                  </div>
                </div>
              )}

              {selectedApp.status === "rejected" && selectedApp.rejection_reason && (
                <div className="rounded-lg bg-destructive/10 p-3">
                  <span className="text-xs font-medium text-muted-foreground">Rejection Reason</span>
                  <p className="text-sm mt-0.5">{selectedApp.rejection_reason}</p>
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
