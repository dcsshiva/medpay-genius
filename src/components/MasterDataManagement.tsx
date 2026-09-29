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

import DepartmentRoleMappingTab from '@/components/masters/DepartmentRoleMappingTab';

const MasterDataManagement = () => {
  const [activeTab, setActiveTab] = useState('departments');
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
            <TabsTrigger value="departments" className="text-xs sm:text-sm">Departments</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs sm:text-sm">Designations</TabsTrigger>
            <TabsTrigger value="branches" className="text-xs sm:text-sm">Units / Branches</TabsTrigger>
            <TabsTrigger value="shifts" className="text-xs sm:text-sm">Shift Master</TabsTrigger>
            <TabsTrigger value="leave-reasons" className="text-xs sm:text-sm">Leave Reasons</TabsTrigger>
            <TabsTrigger value="permission-reasons" className="text-xs sm:text-sm">Permission Reasons</TabsTrigger>
            <TabsTrigger value="dept-role-mapping" className="text-xs sm:text-sm">Dept–Designation Mapping</TabsTrigger>
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
        <TabsContent value="dept-role-mapping" className="mt-6">
          <DepartmentRoleMappingTab searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
