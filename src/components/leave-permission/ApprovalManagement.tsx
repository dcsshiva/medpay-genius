import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isManagerLike } from "@/lib/accessLevels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Search, Download, Printer, RefreshCw } from "lucide-react";
import ApprovalDialog from "./ApprovalDialog";
import LeaveDashboardStats, { LeaveStats } from "./LeaveDashboardStats";
import LeaveApplicationsTable from "./LeaveApplicationsTable";
import LeaveDetailsDialog from "./LeaveDetailsDialog";
import {
  exportLeaveApplicationsToExcel,
  printLeaveApplications,
  LeaveRow,
} from "@/lib/leaveExportUtils";

const TAB_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  onleave: "On Leave Today",
  all: "All Applications",
};

const ApprovalManagement = () => {
  const { userDesignation, userRole, userProfile } = useAuth();
  const isAdmin = userDesignation === "admin" || userDesignation === "super_admin" || userRole === "admin";
  const isManager = !isAdmin && isManagerLike(userRole, userDesignation, (userProfile as any)?.role);
  const canAccess = isAdmin || isManager;

  const [applications, setApplications] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedApp, setSelectedApp] = useState<LeaveRow | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => { if (canAccess) loadApplications(); else setLoading(false); }, [canAccess]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: staffData } = await supabase
        .from("staff").select("id").eq("user_id", user.id).single();

      let query = supabase
        .from("leave_permission_applications" as any)
        .select(`*, applicant:applicant_id(full_name, staff_code, role), approved_by_staff:approved_by(full_name, staff_code)`)
        .order("created_at", { ascending: false });

      // Managers see only apps where they are the approver; admin sees all
      if (!isAdmin && staffData) {
        query = query.eq("approver_id", staffData.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications((data as any) || []);
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast({ title: "Error", description: "Failed to load applications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<LeaveStats>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toISOString().slice(0, 10);
    const inThisMonth = (iso?: string | null) => !!iso && new Date(iso) >= monthStart;

    const approvedThisMonth = applications.filter(a => a.status === "approved" && inThisMonth(a.approved_at || a.created_at));
    return {
      pending: applications.filter(a => a.status === "pending").length,
      approvedThisMonth: approvedThisMonth.length,
      rejectedThisMonth: applications.filter(a => a.status === "rejected" && inThisMonth(a.approved_at || a.created_at)).length,
      cancelled: applications.filter(a => a.status === "cancelled").length,
      leaveDaysThisMonth: approvedThisMonth
        .filter(a => a.application_type === "leave")
        .reduce((s, a) => s + (Number(a.leave_days) || 0), 0),
      onLeaveToday: applications.filter(a =>
        a.status === "approved" && a.application_type === "leave" &&
        a.leave_start_date && a.leave_end_date &&
        a.leave_start_date <= today && a.leave_end_date >= today
      ).length,
    };
  }, [applications]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let rows = applications;
    if (activeTab === "pending") rows = rows.filter(a => a.status === "pending");
    else if (activeTab === "approved") rows = rows.filter(a => a.status === "approved");
    else if (activeTab === "rejected") rows = rows.filter(a => a.status === "rejected");
    else if (activeTab === "cancelled") rows = rows.filter(a => a.status === "cancelled");
    else if (activeTab === "onleave") {
      rows = rows.filter(a =>
        a.status === "approved" && a.application_type === "leave" &&
        a.leave_start_date && a.leave_end_date &&
        a.leave_start_date <= today && a.leave_end_date >= today
      );
    }
    if (typeFilter !== "all") rows = rows.filter(a => a.application_type === typeFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(a =>
        a.applicant?.full_name?.toLowerCase().includes(q) ||
        a.applicant?.staff_code?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) rows = rows.filter(a => a.created_at.slice(0, 10) >= dateFrom);
    if (dateTo) rows = rows.filter(a => a.created_at.slice(0, 10) <= dateTo);
    return rows;
  }, [applications, activeTab, typeFilter, searchTerm, dateFrom, dateTo]);

  const handleView = (a: LeaveRow) => { setSelectedApp(a); setDetailsOpen(true); };
  const handleApproveClick = (a: LeaveRow) => { setSelectedApp(a); setApprovalAction("approve"); setApprovalDialogOpen(true); };
  const handleRejectClick = (a: LeaveRow) => { setSelectedApp(a); setApprovalAction("reject"); setApprovalDialogOpen(true); };

  const handleRevoke = async (a: LeaveRow) => {
    if (!confirm(`Revoke approval for ${a.applicant?.full_name}? It will return to pending.`)) return;
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({ status: "pending", approved_at: null, approved_by: null, rejection_reason: null })
        .eq("id", a.id);
      if (error) throw error;
      toast({ title: "Approval revoked" });
      setDetailsOpen(false);
      loadApplications();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCancel = async (a: LeaveRow) => {
    if (!confirm(`Cancel this approved leave for ${a.applicant?.full_name}?`)) return;
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({ status: "cancelled" })
        .eq("id", a.id);
      if (error) throw error;
      toast({ title: "Leave cancelled" });
      setDetailsOpen(false);
      loadApplications();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    exportLeaveApplicationsToExcel(filtered, TAB_LABELS[activeTab] || activeTab);
    toast({ title: "Exported to Excel" });
  };

  const handlePrint = () => {
    if (!filtered.length) {
      toast({ title: "Nothing to print", variant: "destructive" });
      return;
    }
    const sub: string[] = [];
    if (typeFilter !== "all") sub.push(`Type: ${typeFilter}`);
    if (searchTerm) sub.push(`Search: ${searchTerm}`);
    if (dateFrom || dateTo) sub.push(`Applied: ${dateFrom || "…"} to ${dateTo || "…"}`);
    printLeaveApplications(filtered, TAB_LABELS[activeTab] || activeTab, sub.join(" • ") || undefined);
  };

  const resetFilters = () => { setSearchTerm(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); };

  const actionMode: "approve-reject" | "revoke" | "cancel" | "view" =
    activeTab === "pending" ? "approve-reject"
      : activeTab === "approved" ? (isAdmin ? "revoke" : "cancel")
      : "view";

  if (!canAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          You do not have access to the Leave Management Dashboard.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Leave Management Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Review, manage and audit all leave and permission applications
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full md:w-auto min-h-[40px]" onClick={loadApplications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <LeaveDashboardStats stats={stats} activeTab={activeTab} onSelect={setActiveTab} />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>{TAB_LABELS[activeTab]} ({filtered.length})</CardTitle>
                <CardDescription>Filtered results across all applications</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 md:flex-none min-h-[40px]" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />Excel
                </Button>
                <Button variant="outline" size="sm" className="flex-1 md:flex-none min-h-[40px]" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" />Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="-mx-2 px-2 overflow-x-auto">
                <TabsList className="inline-flex md:flex md:flex-wrap h-auto w-max md:w-auto">
                  <TabsTrigger value="pending" className="min-h-[40px] whitespace-nowrap">Pending</TabsTrigger>
                  <TabsTrigger value="approved" className="min-h-[40px] whitespace-nowrap">Approved</TabsTrigger>
                  <TabsTrigger value="rejected" className="min-h-[40px] whitespace-nowrap">Rejected</TabsTrigger>
                  <TabsTrigger value="cancelled" className="min-h-[40px] whitespace-nowrap">Cancelled</TabsTrigger>
                  <TabsTrigger value="onleave" className="min-h-[40px] whitespace-nowrap">On Leave Today</TabsTrigger>
                  <TabsTrigger value="all" className="min-h-[40px] whitespace-nowrap">All</TabsTrigger>
                </TabsList>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or staff code..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Applied from" />
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Applied to" />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
              </div>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : (
                  <LeaveApplicationsTable
                    applications={filtered}
                    showActions={actionMode}
                    isAdmin={isAdmin}
                    onView={handleView}
                    onApprove={handleApproveClick}
                    onReject={handleRejectClick}
                    onRevoke={handleRevoke}
                    onCancel={handleCancel}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedApp && approvalDialogOpen && (
        <ApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          application={selectedApp}
          action={approvalAction}
          onComplete={() => { setApprovalDialogOpen(false); setSelectedApp(null); loadApplications(); }}
        />
      )}

      <LeaveDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        application={selectedApp}
        isAdmin={isAdmin}
        onRevoke={handleRevoke}
        onCancel={handleCancel}
      />
    </>
  );
};

export default ApprovalManagement;
