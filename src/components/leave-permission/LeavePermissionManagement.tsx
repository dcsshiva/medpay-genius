import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import LeaveApplicationForm from "./LeaveApplicationForm";
import PermissionApplicationForm from "./PermissionApplicationForm";
import ApplicationHistory from "./ApplicationHistory";

const LeavePermissionManagement = () => {
  const [activeTab, setActiveTab] = useState("leave");
  const [refreshHistory, setRefreshHistory] = useState(0);
  const isMobile = useIsMobile();

  const handleApplicationSubmitted = () => {
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Leave & Permission</h1>
        <p className="text-sm text-muted-foreground">
          Apply for leave or permission and track status
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-3">
            <TabsTrigger value="leave" className="flex items-center gap-2 min-h-[44px] px-4">
              <Calendar className="h-4 w-4" />
              {isMobile ? "Leave" : "Leave Application"}
            </TabsTrigger>
            <TabsTrigger value="permission" className="flex items-center gap-2 min-h-[44px] px-4">
              <Clock className="h-4 w-4" />
              {isMobile ? "Permission" : "Permission Application"}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 min-h-[44px] px-4">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="leave" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Apply for Leave</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Submit at least one day in advance (before 11:59 PM IST). Up to 15 days ahead.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <LeaveApplicationForm onSuccess={handleApplicationSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permission" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Apply for Permission</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Request for today only. Max 120 minutes (2 hours).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <PermissionApplicationForm onSuccess={handleApplicationSubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-0">
          <ApplicationHistory key={refreshHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeavePermissionManagement;
