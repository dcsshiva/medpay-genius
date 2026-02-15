import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from 'lucide-react';
import RolesTab from '@/components/masters/RolesTab';
import DepartmentsTab from '@/components/masters/DepartmentsTab';
import BranchesTab from '@/components/masters/BranchesTab';
import LeaveReasonsTab from '@/components/masters/LeaveReasonsTab';
import PermissionReasonsTab from '@/components/masters/PermissionReasonsTab';
import VisitReasonsTab from '@/components/masters/VisitReasonsTab';
import InsuranceCompaniesTab from '@/components/masters/InsuranceCompaniesTab';

import AppraisalCriteriaTab from '@/components/masters/AppraisalCriteriaTab';
import ComplaintCategoriesTab from '@/components/masters/ComplaintCategoriesTab';
import QuickPaymentTypesTab from '@/components/masters/QuickPaymentTypesTab';
import VendorDetailsTab from '@/components/masters/VendorDetailsTab';

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
        <TabsList className="flex flex-wrap gap-1 w-full h-auto justify-start p-1">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="leave-reasons">Leave Reasons</TabsTrigger>
          <TabsTrigger value="permission-reasons">Permission Reasons</TabsTrigger>
          <TabsTrigger value="visit-reasons">Visit Reasons</TabsTrigger>
          <TabsTrigger value="insurance-companies">Insurance</TabsTrigger>
          
          <TabsTrigger value="appraisal-criteria">Appraisal Criteria</TabsTrigger>
          <TabsTrigger value="complaint-categories">Complaints</TabsTrigger>
          <TabsTrigger value="quick-payment-types">Quick Pay</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="branches" className="mt-6">
          <BranchesTab />
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


        <TabsContent value="appraisal-criteria" className="mt-6">
          <AppraisalCriteriaTab />
        </TabsContent>

        <TabsContent value="complaint-categories" className="mt-6">
          <ComplaintCategoriesTab />
        </TabsContent>

        <TabsContent value="quick-payment-types" className="mt-6">
          <QuickPaymentTypesTab />
        </TabsContent>

        <TabsContent value="vendors" className="mt-6">
          <VendorDetailsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
