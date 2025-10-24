import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from 'lucide-react';
import RolesTab from '@/components/masters/RolesTab';
import DepartmentsTab from '@/components/masters/DepartmentsTab';
import LeaveReasonsTab from '@/components/masters/LeaveReasonsTab';
import PermissionReasonsTab from '@/components/masters/PermissionReasonsTab';
import VisitReasonsTab from '@/components/masters/VisitReasonsTab';
import InsuranceCompaniesTab from '@/components/masters/InsuranceCompaniesTab';
import AppraisalReasonsTab from '@/components/masters/AppraisalReasonsTab';
import ComplaintCategoriesTab from '@/components/masters/ComplaintCategoriesTab';

const MasterDataManagement = () => {
  const [activeTab, setActiveTab] = useState('roles');
  
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="leave-reasons">Leave Reasons</TabsTrigger>
          <TabsTrigger value="permission-reasons">Permission Reasons</TabsTrigger>
          <TabsTrigger value="visit-reasons">Visit Reasons</TabsTrigger>
          <TabsTrigger value="insurance-companies">Insurance</TabsTrigger>
          <TabsTrigger value="appraisal-reasons">Appraisals</TabsTrigger>
          <TabsTrigger value="complaint-categories">Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="leave-reasons" className="mt-6">
          <LeaveReasonsTab />
        </TabsContent>

        <TabsContent value="permission-reasons" className="mt-6">
          <PermissionReasonsTab />
        </TabsContent>

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
