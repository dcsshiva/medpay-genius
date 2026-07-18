import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ClipboardCheck, CalendarCheck, Wallet, Receipt, History, Layers, Building2 } from "lucide-react";
import StaffManagement from "./StaffManagement";
import StaffAppraisalManagement from "./StaffAppraisalManagement";
import StaffAttendanceManagement from "./StaffAttendanceManagement";
import StaffSalaryStructure from "./StaffSalaryStructure";
import StaffPayrollGeneration from "./StaffPayrollGeneration";
import { StaffPaymentHistoryTab } from "./quick-payment/StaffPaymentHistoryTab";
import { StaffBulkPaymentTab } from "./quick-payment/StaffBulkPaymentTab";

const TAB_ITEMS = [
  { value: "directory", label: "Staff Directory", icon: Users },
  { value: "appraisals", label: "Appraisals & Reviews", icon: ClipboardCheck },
  { value: "attendance", label: "Attendance", icon: CalendarCheck },
  { value: "salary", label: "Salary Structure", icon: Layers },
  { value: "payroll", label: "Payroll", icon: Wallet },
  { value: "payment-history", label: "Payment History", icon: History },
  { value: "bulk-payment", label: "Bulk Payment", icon: Receipt },
];

export default function StaffManagementDashboard() {
  const { userRole, userDesignation } = useAuth();
  const [activeTab, setActiveTab] = useState("directory");
  const [visited, setVisited] = useState<Set<string>>(new Set(["directory"]));

  const isAllowed =
    userRole === "admin" || userRole === "manager" ||
    userDesignation === "admin" || userDesignation === "manager" ||
    userRole === "super_admin" || userDesignation === "super_admin";

  if (!isAllowed) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          You don't have permission to view this page.
        </CardContent>
      </Card>
    );
  }

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setVisited((prev) => {
      if (prev.has(val)) return prev;
      const next = new Set(prev);
      next.add(val);
      return next;
    });
  };

  const renderTab = (value: string, node: React.ReactNode) => (
    <TabsContent value={value} forceMount={visited.has(value) as any} hidden={activeTab !== value}>
      {visited.has(value) ? node : null}
    </TabsContent>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Staff Management Dashboard
          </CardTitle>
          <CardDescription>
            All staff records, performance, attendance, and payroll in one place
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max min-w-full flex flex-nowrap">
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5 whitespace-nowrap">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {renderTab("directory", <StaffManagement excludeAdminAndDoctor />)}
        {renderTab("appraisals", <StaffAppraisalManagement />)}
        {renderTab("attendance", <StaffAttendanceManagement />)}
        {renderTab("salary", <StaffSalaryStructure />)}
        {renderTab("payroll", <StaffPayrollGeneration />)}
        {renderTab("payment-history", <StaffPaymentHistoryTab />)}
        {renderTab("bulk-payment", <StaffBulkPaymentTab />)}
      </Tabs>
    </div>
  );
}
