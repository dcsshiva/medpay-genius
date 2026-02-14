import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Clock,
  CheckCircle,
  Sparkles,
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
import { useNavigationTracking } from '@/hooks/useNavigationTracking';
import { useQuickAccessItems } from '@/hooks/useQuickAccessItems';
import { useMenuVisibility } from '@/hooks/useMenuVisibility';
import { NotificationCenter } from '@/components/NotificationCenter';
import { usePaymentStatsColors } from '@/hooks/usePaymentStatsColors';
import { cn } from '@/lib/utils';

interface NavigationStats {
  paidAmount: number;
  unpaidAmount: number;
  totalAmount: number;
}

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { userRole, userDesignation, userProfile } = useAuth();
  const { open } = useSidebar();
  const { trackNavigation } = useNavigationTracking();
  const { isItemVisible } = useMenuVisibility();
  const { paidColor, unpaidColor, totalColor } = usePaymentStatsColors();
  const [stats, setStats] = useState<NavigationStats>({
    paidAmount: 0,
    unpaidAmount: 0,
    totalAmount: 0
  });

  const handleNavigationClick = (item: { id: string; label: string }) => {
    trackNavigation(item.id, item.label);
    onTabChange(item.id);
  };

  const fetchStats = async () => {
    if (!(userRole === 'manager' || userRole === 'admin' || userDesignation === 'super_admin' || userDesignation === 'admin' || userDesignation === 'manager')) return;
    
    try {
      const [paymentsRes, visitsRes] = await Promise.all([
        supabase.from('payments').select('net_amount').eq('bank_advice_generated', true),
        supabase.from('visits').select('visit_payment').eq('is_processed', false)
      ]);

      const paidAmount = (paymentsRes.data || []).reduce((sum: number, p: any) => 
        sum + (Number(p.net_amount) || 0), 0);
      
      const unpaidAmount = (visitsRes.data || []).reduce((sum: number, v: any) => 
        sum + (Number(v.visit_payment) || 0), 0);

      setStats({
        paidAmount,
        unpaidAmount,
        totalAmount: paidAmount + unpaidAmount
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

  const allNavigationItems = getNavigationItems({
    userRole,
    userDesignation,
    userProfile
  });
  // Filter by admin-configured visibility
  const navigationItems = allNavigationItems.filter(item => isItemVisible(item.id));
  const quickAccessItems = useQuickAccessItems(allNavigationItems);
  const isCollapsed = !open;

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={westmedLogo} alt="WestMed Hospital" className="h-8 w-8" />
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold">WestMed</h1>
                <p className="text-xs text-muted-foreground">Hospital System</p>
              </div>
            )}
          </div>
          {!isCollapsed && <NotificationCenter onNavigate={onTabChange} />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Access - Before main navigation */}
        {quickAccessItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1 text-foreground font-semibold">
              <Sparkles className="h-3 w-3" />
              Quick Access
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={`qa-${item.id}`}>
                      <SidebarMenuButton
                        isActive={activeTab === item.id}
                        tooltip={isCollapsed ? item.label : undefined}
                        onClick={() => handleNavigationClick(item)}
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
        )}

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
                      onClick={() => handleNavigationClick(item)}
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

        {/* Doctor Payments Section - Only for managers and admins */}
        {(userRole === 'manager' || userRole === 'admin' || userDesignation === 'super_admin' || userDesignation === 'admin' || userDesignation === 'manager') && (
          <SidebarGroup>
            <SidebarGroupLabel>Doctor Payments</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                {/* Paid Amount */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={cn("h-4 w-4", paidColor)} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Paid</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xs font-bold", paidColor)}>
                          {isCollapsed ? '₹' : formatCurrency(stats.paidAmount).slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Unpaid Amount */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className={cn("h-4 w-4", unpaidColor)} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Unpaid</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xs font-bold", unpaidColor)}>
                          {isCollapsed ? '₹' : formatCurrency(stats.unpaidAmount).slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Amount */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className={cn("h-4 w-4", totalColor)} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Total</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xs font-bold", totalColor)}>
                          {isCollapsed ? '₹' : formatCurrency(stats.totalAmount).slice(0, 8)}
                        </div>
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