import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, History } from "lucide-react";
import LeaveApplicationForm from "./LeaveApplicationForm";
import PermissionApplicationForm from "./PermissionApplicationForm";
import ApplicationHistory from "./ApplicationHistory";

const LeavePermissionManagement = () => {
  const [activeTab, setActiveTab] = useState("leave");
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleApplicationSubmitted = () => {
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Leave & Permission Management</h1>
        <p className="text-muted-foreground">
          Apply for leave or permission and track your application status
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Leave Application
          </TabsTrigger>
          <TabsTrigger value="permission" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Permission Application
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
              <CardDescription>
                Submit your leave application at least one day in advance (before 11:59 PM IST). 
                You can apply for dates up to 15 days in the future. All times are in Indian Standard Time (IST).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveApplicationForm onSuccess={handleApplicationSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permission" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Permission</CardTitle>
              <CardDescription>
                Request permission for today only. Duration must be between 0 to 120 minutes (2 hours maximum).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionApplicationForm onSuccess={handleApplicationSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ApplicationHistory key={refreshHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeavePermissionManagement;
