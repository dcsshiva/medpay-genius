import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Clock,
  CheckCircle,
} from 'lucide-react';
import westmedLogo from '@/assets/westmed-logo.png';
import { getNavigationItems } from '@/lib/navigationItems';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { isStaffRole } from '@/lib/staffUtils';

interface NavigationStats {
  pendingRequests: number;
  pendingAmount: number;
  paidAmount: number;
}

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { userRole, userDesignation, userProfile } = useAuth();
  const { open } = useSidebar();
  const [stats, setStats] = useState<NavigationStats>({
    pendingRequests: 0,
    pendingAmount: 0,
    paidAmount: 0
  });

  const fetchStats = async () => {
    if (!(userRole === 'manager' || userRole === 'admin' || userDesignation === 'super_admin' || userDesignation === 'admin' || userDesignation === 'manager')) return;
    
    try {
      const [visitsRes, transactionsRes, paymentsRes] = await Promise.all([
        supabase.from('visits').select('visit_payment'),
        supabase.from('payment_transactions').select('amount'),
        supabase.from('payments').select('status').eq('status', 'pending')
      ]);

      const totalVisitAmount = (visitsRes.data || []).reduce((sum: number, v: any) => 
        sum + (Number(v.visit_payment) || 0), 0);
      
      const totalPaidAmount = (transactionsRes.data || []).reduce((sum: number, t: any) => 
        sum + (Number(t.amount) || 0), 0);

      const pendingAmount = Math.max(0, totalVisitAmount - totalPaidAmount);
      const pendingRequests = paymentsRes.data?.length || 0;

      setStats({
        pendingRequests,
        pendingAmount,
        paidAmount: totalPaidAmount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const navigationItems = getNavigationItems({
    userRole,
    userDesignation,
    userProfile
  });
  const isCollapsed = !open;

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center space-x-3">
          <img src={westmedLogo} alt="WestMed Hospital" className="h-8 w-8" />
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold">WestMed</h1>
              <p className="text-xs text-muted-foreground">Hospital System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Flat Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={isActive}
                      tooltip={isCollapsed ? item.label : undefined}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Payment Stats Section - Only for managers and admins */}
        {(userRole === 'manager' || userRole === 'admin' || userDesignation === 'super_admin' || userDesignation === 'admin' || userDesignation === 'manager') && (
          <SidebarGroup>
            <SidebarGroupLabel>Payment Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                {/* Pending Requests */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-warning" />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Pending</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stats.pendingRequests}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Amount */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Amount</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-primary">
                          {isCollapsed ? '₹' : formatCurrency(stats.pendingAmount).slice(0, 8)}
                        </div>
                        {!isCollapsed && (
                          <div className="text-xs text-muted-foreground">Pending</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Paid Amount */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Paid</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-green-600">
                          {isCollapsed ? '₹' : formatCurrency(stats.paidAmount).slice(0, 8)}
                        </div>
                        {!isCollapsed && (
                          <div className="text-xs text-muted-foreground">Total</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground text-center">
            Hospital Management System
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}