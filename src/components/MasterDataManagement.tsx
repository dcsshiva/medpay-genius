import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from 'lucide-react';
import VisitReasonsTab from '@/components/masters/VisitReasonsTab';
import InsuranceCompaniesTab from '@/components/masters/InsuranceCompaniesTab';
import AppraisalReasonsTab from '@/components/masters/AppraisalReasonsTab';
import ComplaintCategoriesTab from '@/components/masters/ComplaintCategoriesTab';

const MasterDataManagement = () => {
  const [activeTab, setActiveTab] = useState('visit-reasons');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Masters</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage system master data and reference lists</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visit-reasons">Visit Reasons</TabsTrigger>
          <TabsTrigger value="insurance-companies">Insurance Companies</TabsTrigger>
          <TabsTrigger value="appraisal-reasons">Appraisal Reasons</TabsTrigger>
          <TabsTrigger value="complaint-categories">Complaint Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="visit-reasons" className="mt-6">
          <VisitReasonsTab />
        </TabsContent>

        <TabsContent value="insurance-companies" className="mt-6">
          <InsuranceCompaniesTab />
        </TabsContent>

        <TabsContent value="appraisal-reasons" className="mt-6">
          <AppraisalReasonsTab />
        </TabsContent>

        <TabsContent value="complaint-categories" className="mt-6">
          <ComplaintCategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
