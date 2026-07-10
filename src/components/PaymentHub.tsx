import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, PlusCircle, CheckSquare } from 'lucide-react';
import PaymentHubDashboard from './payment-hub/PaymentHubDashboard';
import UnifiedPaymentCreation from './payment-hub/UnifiedPaymentCreation';
import PaymentBatchApproval from './payment-hub/PaymentBatchApproval';
import MobileSegmentedTabs from '@/components/mobile/MobileSegmentedTabs';

/**
 * Payment Hub - Unified interface for managing all payment types
 * Provides dashboard, creation, and approval workflows
 */
const PaymentHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePaymentCreated = () => {
    // Refresh dashboard after payment creation
    setRefreshKey(prev => prev + 1);
    setActiveTab('approval');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="space-y-1 md:space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Hub</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Unified interface for managing cash, insurance, and quick payments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Desktop tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Payment
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Approval & Status
          </TabsTrigger>
        </TabsList>

        {/* Mobile segmented control */}
        <MobileSegmentedTabs
          value={activeTab}
          onValueChange={setActiveTab}
          segments={[
            { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { value: 'create', label: 'Create', icon: PlusCircle },
            { value: 'approval', label: 'Approve', icon: CheckSquare },
          ]}
        />

        <TabsContent value="dashboard" className="mt-6">
          <PaymentHubDashboard 
            key={refreshKey}
            onNavigateToCreate={() => setActiveTab('create')}
            onNavigateToApproval={() => setActiveTab('approval')}
          />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <UnifiedPaymentCreation onPaymentCreated={handlePaymentCreated} />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <PaymentBatchApproval key={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentHub;
