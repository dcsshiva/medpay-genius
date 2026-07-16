import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, Download, Printer, Check, X as XIcon, Loader2, CalendarClock } from "lucide-react";
import { formatDateIST } from "@/lib/dateUtils";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────
type AppStatus = "pending" | "approved" | "rejected";
type AppType = "leave" | "permission";

interface StaffLite {
  full_name: string;
  staff_code: string;
}

interface AppRow {
  id: string;
  applicant_id: string;
  application_type: AppType;
  status: AppStatus;
  approver_id: string;
  reason_details: string | null;
  notes: string | null;
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
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // enriched client-side
  applicantName?: string;
  applicantCode?: string;
  approverName?: string;
  rejecterName?: string;
}

interface TabViewState {
  search: string;
  typeFilter: "all" | AppType;
  rows: AppRow[];
  loading: boolean;
}

const emptyTabState = (): TabViewState => ({ search: "", typeFilter: "all", rows: [], loading: false });

const TAB_CONFIG: { key: AppStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

// ── Helpers ────────────────────────────────────────────────────────
const typeLabel = (t: AppType) => (t === "leave" ? "Leave" : "Permission");

const formatPeriod = (row: AppRow) => {
  if (row.application_type === "leave") {
    if (!row.leave_start_date) return "-";
    const start = formatDateIST(new Date(row.leave_start_date));
    if (row.leave_start_date === row.leave_end_date) {
      return row.is_half_day ? `${start} (Half day)` : start;
    }
    const end = row.leave_end_date ? formatDateIST(new Date(row.leave_end_date)) : "";
    return `${start} → ${end}`;
  }
  if (!row.permission_date) return "-";
  const date = formatDateIST(new Date(row.permission_date));
  const start = row.permission_start_time?.slice(0, 5) ?? "";
  const end = row.permission_end_time?.slice(0, 5) ?? "";
  return `${date}, ${start}–${end}`;
};

const formatReason = (row: AppRow) =>
  (row.application_type === "leave" ? row.leave_reason : row.permission_reason)?.replace(/_/g, " ") || "-";

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${formatDateIST(d)} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
};

// ── Component ──────────────────────────────────────────────────────
const LeavePermissionApprovals = () => {
  const { user } = useAuth();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppStatus>("pending");
  const [tabState, setTabState] = useState<Record<AppStatus, TabViewState>>({
    pending: emptyTabState(),
    approved: emptyTabState(),
    rejected: emptyTabState(),
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AppRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const loadStaff = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from("staff").select("id").eq("user_id", user.id).single();
      if (data) setStaffId(data.id);
    };
    loadStaff();
  }, [user?.id]);

  const patchTab = (status: AppStatus, patch: Partial<TabViewState>) => {
    setTabState((prev) => ({ ...prev, [status]: { ...prev[status], ...patch } }));
  };

  const fetchTab = useCallback(async (status: AppStatus) => {
    patchTab(status, { loading: true });
    try {
      const orderCol = status === "pending" ? "created_at" : status === "approved" ? "approved_at" : "rejected_at";
      const { data, error } = await supabase
        .from("leave_permission_applications" as any)
        .select("*")
        .eq("status", status)
        .order(orderCol, { ascending: false });
      if (error) throw error;

      const rows = (data || []) as AppRow[];
      const staffIds = Array.from(
        new Set(rows.flatMap((r) => [r.applicant_id, r.approved_by, r.rejected_by].filter(Boolean) as string[])),
      );
      let staffMap: Record<string, StaffLite> = {};
      if (staffIds.length > 0) {
        const { data: staffRows } = await supabase.from("staff").select("id, full_name, staff_code").in("id", staffIds);
        staffMap = Object.fromEntries(
          (staffRows || []).map((s: any) => [s.id, { full_name: s.full_name, staff_code: s.staff_code }]),
        );
      }

      const enriched = rows.map((r) => ({
        ...r,
        applicantName: staffMap[r.applicant_id]?.full_name ?? "Unknown",
        applicantCode: staffMap[r.applicant_id]?.staff_code ?? "-",
        approverName: r.approved_by ? (staffMap[r.approved_by]?.full_name ?? "Unknown") : undefined,
        rejecterName: r.rejected_by ? (staffMap[r.rejected_by]?.full_name ?? "Unknown") : undefined,
      }));

      patchTab(status, { rows: enriched, loading: false });
    } catch (error: any) {
      console.error(`Error loading ${status} applications:`, error);
      toast({ title: "Error", description: `Failed to load ${status} applications`, variant: "destructive" });
      patchTab(status, { loading: false });
    }
  }, []);

  useEffect(() => {
    fetchTab("pending");
    fetchTab("approved");
    fetchTab("rejected");
  }, [fetchTab]);

  const filteredRows = (status: AppStatus) => {
    const { rows, search, typeFilter } = tabState[status];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.applicantName?.toLowerCase().includes(q) || r.applicantCode?.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || r.application_type === typeFilter;
      return matchesSearch && matchesType;
    });
  };

  const handleApprove = async (row: AppRow) => {
    if (!staffId) return;
    setActionLoadingId(row.id);
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: staffId })
        .eq("id", row.id);
      if (error) throw error;
      toast({ title: "Approved", description: `${row.applicantName}'s application has been approved.` });
      fetchTab("pending");
      fetchTab("approved");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve", variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget || !staffId) return;
    if (!rejectReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a rejection reason.", variant: "destructive" });
      return;
    }
    setActionLoadingId(rejectTarget.id);
    try {
      const { error } = await supabase
        .from("leave_permission_applications" as any)
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: staffId,
          rejection_reason: rejectReason.trim(),
        })
        .eq("id", rejectTarget.id);
      if (error) throw error;
      toast({ title: "Rejected", description: `${rejectTarget.applicantName}'s application has been rejected.` });
      setRejectTarget(null);
      setRejectReason("");
      fetchTab("pending");
      fetchTab("rejected");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject", variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Export to Excel ────────────────────────────────────────────
  const exportToExcel = (status: AppStatus) => {
    const rows = filteredRows(status);
    if (rows.length === 0) {
      toast({ title: "Nothing to export", description: "There are no rows in the current view." });
      return;
    }
    const data = rows.map((r) => {
      const base = {
        Applicant: r.applicantName,
        "Staff Code": r.applicantCode,
        Type: typeLabel(r.application_type),
        "Date/Period": formatPeriod(r),
        Reason: formatReason(r),
        "Applied On": formatDateTime(r.created_at),
      };
      if (status === "approved") {
        return { ...base, "Approved By": r.approverName, "Approved On": formatDateTime(r.approved_at) };
      }
      if (status === "rejected") {
        return {
          ...base,
          "Rejected By": r.rejecterName,
          "Rejected On": formatDateTime(r.rejected_at),
          "Rejection Reason": r.rejection_reason,
        };
      }
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, status.charAt(0).toUpperCase() + status.slice(1));
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `leave-permission-${status}-${today}.xlsx`);
  };

  // ── Print ──────────────────────────────────────────────────────
  const printTab = (status: AppStatus) => {
    const rows = filteredRows(status);
    if (rows.length === 0) {
      toast({ title: "Nothing to print", description: "There are no rows in the current view." });
      return;
    }
    const label = TAB_CONFIG.find((t) => t.key === status)?.label ?? status;
    const generatedOn = new Date().toLocaleString("en-IN");

    let extraHeadCols = "";
    let extraRowCols = (r: AppRow) => "";
    if (status === "approved") {
      extraHeadCols = "<th>Approved By</th><th>Approved On</th>";
      extraRowCols = (r) => `<td>${r.approverName ?? "-"}</td><td>${formatDateTime(r.approved_at)}</td>`;
    } else if (status === "rejected") {
      extraHeadCols = "<th>Rejected By</th><th>Rejected On</th><th>Rejection Reason</th>";
      extraRowCols = (r) =>
        `<td>${r.rejecterName ?? "-"}</td><td>${formatDateTime(r.rejected_at)}</td><td>${r.rejection_reason ?? "-"}</td>`;
    }

    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td>${r.applicantName} (${r.applicantCode})</td>
          <td>${typeLabel(r.application_type)}</td>
          <td>${formatPeriod(r)}</td>
          <td>${formatReason(r)}</td>
          <td>${formatDateTime(r.created_at)}</td>
          ${extraRowCols(r)}
        </tr>`,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Leave & Permission — ${label}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
            h1 { font-size: 18px; margin-bottom: 2px; }
            p.meta { font-size: 12px; color: #555; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h1>Leave &amp; Permission Approvals — ${label}</h1>
          <p class="meta">Generated on ${generatedOn} • ${rows.length} record(s)</p>
          <table>
            <thead>
              <tr>
                <th>Applicant</th><th>Type</th><th>Date/Period</th><th>Reason</th><th>Applied On</th>${extraHeadCols}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups to print.", variant: "destructive" });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-card">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AppStatus)}>
        <div className="flex items-center justify-between px-4 pt-4 md:px-6 md:pt-6">
          <TabsList>
            {TAB_CONFIG.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label} ({tabState[t.key].rows.length})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TAB_CONFIG.map(({ key: status, label }) => {
          const state = tabState[status];
          const rows = filteredRows(status);
          return (
            <TabsContent key={status} value={status} className="p-4 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or staff code..."
                      className="pl-9"
                      value={state.search}
                      onChange={(e) => patchTab(status, { search: e.target.value })}
                    />
                  </div>
                  <Select value={state.typeFilter} onValueChange={(v) => patchTab(status, { typeFilter: v as any })}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                      <SelectItem value="permission">Permission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToExcel(status)}
                    disabled={rows.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export to Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => printTab(status)} disabled={rows.length === 0}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>APPLICANT</TableHead>
                      <TableHead>TYPE</TableHead>
                      <TableHead>DATE/PERIOD</TableHead>
                      <TableHead>REASON</TableHead>
                      <TableHead>APPLIED ON</TableHead>
                      {status === "approved" && (
                        <>
                          <TableHead>APPROVED BY</TableHead>
                          <TableHead>APPROVED ON</TableHead>
                        </>
                      )}
                      {status === "rejected" && (
                        <>
                          <TableHead>REJECTED BY</TableHead>
                          <TableHead>REJECTED ON</TableHead>
                          <TableHead>REJECTION REASON</TableHead>
                        </>
                      )}
                      {status === "pending" && <TableHead>ACTIONS</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No {label.toLowerCase()} applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.applicantName}</div>
                            <div className="text-xs text-muted-foreground">{r.applicantCode}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {typeLabel(r.application_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatPeriod(r)}</TableCell>
                          <TableCell className="capitalize">{formatReason(r)}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(r.created_at)}
                          </TableCell>
                          {status === "approved" && (
                            <>
                              <TableCell>{r.approverName}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {formatDateTime(r.approved_at)}
                              </TableCell>
                            </>
                          )}
                          {status === "rejected" && (
                            <>
                              <TableCell>{r.rejecterName}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {formatDateTime(r.rejected_at)}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={r.rejection_reason ?? ""}>
                                {r.rejection_reason}
                              </TableCell>
                            </>
                          )}
                          {status === "pending" && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApprove(r)} disabled={actionLoadingId === r.id}>
                                  {actionLoadingId === r.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectTarget(r)}
                                  disabled={actionLoadingId === r.id}
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">
              Rejecting {rejectTarget?.applicantName}'s{" "}
              {rejectTarget && typeLabel(rejectTarget.application_type).toLowerCase()} application
            </Label>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReject} disabled={actionLoadingId === rejectTarget?.id}>
              {actionLoadingId === rejectTarget?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeavePermissionApprovals;
