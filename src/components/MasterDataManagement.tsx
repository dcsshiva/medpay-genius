import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Database, Search } from 'lucide-react';
import RolesTab from '@/components/masters/RolesTab';
import DepartmentsTab from '@/components/masters/DepartmentsTab';
import BranchesTab from '@/components/masters/BranchesTab';
import LeaveReasonsTab from '@/components/masters/LeaveReasonsTab';
import ShiftsTab from '@/components/masters/ShiftsTab';
import PermissionReasonsTab from '@/components/masters/PermissionReasonsTab';
import VisitReasonsTab from '@/components/masters/VisitReasonsTab';
import InsuranceCompaniesTab from '@/components/masters/InsuranceCompaniesTab';

import AppraisalCriteriaTab from '@/components/masters/AppraisalCriteriaTab';
import ComplaintCategoriesTab from '@/components/masters/ComplaintCategoriesTab';
import QuickPaymentTypesTab from '@/components/masters/QuickPaymentTypesTab';
import VendorDetailsTab from '@/components/masters/VendorDetailsTab';
import DepartmentRoleMappingTab from '@/components/masters/DepartmentRoleMappingTab';
import RoleAppraisalCriteriaTab from '@/components/masters/RoleAppraisalCriteriaTab';

const MasterDataManagement = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Masters</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Manage system master data and reference lists</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchTerm(''); }} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-10 w-max gap-1 p-1">
            <TabsTrigger value="roles" className="text-xs sm:text-sm">Roles</TabsTrigger>
            <TabsTrigger value="departments" className="text-xs sm:text-sm">Departments</TabsTrigger>
            <TabsTrigger value="branches" className="text-xs sm:text-sm">Branches</TabsTrigger>
            <TabsTrigger value="shifts" className="text-xs sm:text-sm">Shifts</TabsTrigger>
            <TabsTrigger value="leave-reasons" className="text-xs sm:text-sm">Leave Reasons</TabsTrigger>
            <TabsTrigger value="permission-reasons" className="text-xs sm:text-sm">Permission Reasons</TabsTrigger>
            <TabsTrigger value="visit-reasons" className="text-xs sm:text-sm">Visit Reasons</TabsTrigger>
            <TabsTrigger value="insurance-companies" className="text-xs sm:text-sm">Insurance</TabsTrigger>
            <TabsTrigger value="dept-role-mapping" className="text-xs sm:text-sm">Dept-Role Mapping</TabsTrigger>
            <TabsTrigger value="parameter-master" className="text-xs sm:text-sm">Parameter Master</TabsTrigger>
            <TabsTrigger value="appraisal-criteria" className="text-xs sm:text-sm">Appraisal Criteria</TabsTrigger>
            <TabsTrigger value="complaint-categories" className="text-xs sm:text-sm">Complaints</TabsTrigger>
            <TabsTrigger value="quick-payment-types" className="text-xs sm:text-sm">Quick Pay</TabsTrigger>
            <TabsTrigger value="vendors" className="text-xs sm:text-sm">Vendors</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="roles" className="mt-6">
          <RolesTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="departments" className="mt-6">
          <DepartmentsTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="branches" className="mt-6">
          <BranchesTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="shifts" className="mt-6">
          <ShiftsTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="leave-reasons" className="mt-6">
          <LeaveReasonsTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="permission-reasons" className="mt-6">
          <PermissionReasonsTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="visit-reasons" className="mt-6">
          <VisitReasonsTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="insurance-companies" className="mt-6">
          <InsuranceCompaniesTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="dept-role-mapping" className="mt-6">
          <DepartmentRoleMappingTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="parameter-master" className="mt-6">
          <RoleAppraisalCriteriaTab />
        </TabsContent>
        <TabsContent value="appraisal-criteria" className="mt-6">
          <AppraisalCriteriaTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="complaint-categories" className="mt-6">
          <ComplaintCategoriesTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="quick-payment-types" className="mt-6">
          <QuickPaymentTypesTab searchTerm={searchTerm} />
        </TabsContent>
        <TabsContent value="vendors" className="mt-6">
          <VendorDetailsTab searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
