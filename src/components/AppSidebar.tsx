import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Settings,
  Home,
  ClipboardList,
  MessageCircle,
  UserCog,
  MessageSquare,
  Clock,
  CheckCircle,
  TrendingUp,
  History as HistoryIcon,
  Globe,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  CalendarCheck,
  Zap,
  Building2
} from 'lucide-react';
import westmedLogo from '@/assets/westmed-logo.png';
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
  const { userRole } = useAuth();
  const { open } = useSidebar();
  const [stats, setStats] = useState<NavigationStats>({
    pendingRequests: 0,
    pendingAmount: 0,
    paidAmount: 0
  });

  const fetchStats = async () => {
    if (!(userRole === 'manager' || userRole === 'admin')) return;
    
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

  const getNavigationItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'user-guide', label: 'User Guide', icon: BookOpen },
    ];

    if (userRole === 'doctor') {
      return [
        ...baseItems,
        { id: 'visits', label: 'My Visits', icon: Calendar },
        { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
        { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
        { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      ];
    }

    if (userRole === 'manager') {
      return [
        ...baseItems,
        { id: 'doctors', label: 'Doctors', icon: Users },
        { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
        { id: 'cash-payments-lite', label: 'Cash Payments (Lite)', icon: CreditCard },
        { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
        { id: 'insurance-payments-lite', label: 'Insurance Payments (Lite)', icon: CreditCard },
        { id: 'bank-advice-payment-report', label: 'Bank Advice Payment Report', icon: FileText },
        { id: 'quick-payment-bank-advice-report', label: 'Quick Payment Bank Advice Report', icon: FileText },
        { id: 'bank-advice-generation', label: 'Bank Advice Generation (Central)', icon: Building2 },
        { id: 'quick-payment', label: 'Quick Payment', icon: Zap },
        { id: 'tds-reports', label: 'TDS Reports', icon: FileText },
        { id: 'tasks', label: 'Task Management', icon: ClipboardList },
        { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
        { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
        { id: 'chat', label: 'Team Chat', icon: MessageSquare },
      ];
    }

  if (userRole === 'admin') {
    return [
      ...baseItems,
      { id: 'staff', label: 'Staff Management', icon: UserCog },
      { id: 'masters', label: 'Masters', icon: Database },
      { id: 'doctors', label: 'Doctor Management', icon: Users },
      { id: 'visits', label: 'Visit Management', icon: Calendar },
      { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
      { id: 'cash-payments-lite', label: 'Cash Payments (Lite)', icon: CreditCard },
      { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
      { id: 'insurance-payments-lite', label: 'Insurance Payments (Lite)', icon: CreditCard },
      { id: 'bank-advice-payment-report', label: 'Bank Advice Payment Report', icon: FileText },
      { id: 'quick-payment-bank-advice-report', label: 'Quick Payment Bank Advice Report', icon: FileText },
      { id: 'bank-advice-generation', label: 'Bank Advice Generation (Central)', icon: Building2 },
      { id: 'quick-payment', label: 'Quick Payment', icon: Zap },
      { id: 'tds-reports', label: 'TDS Reports', icon: FileText },
      { id: 'tasks', label: 'Task Management', icon: ClipboardList },
      { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
      { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
      { id: 'complaints', label: 'Complaint Management', icon: MessageCircle },
      { id: 'login-reports', label: 'Login Reports', icon: TrendingUp },
      { id: 'chat', label: 'Team Chat', icon: MessageSquare },
      { id: 'version', label: 'Version Management', icon: HistoryIcon },
      { id: 'website-settings', label: 'Website Settings', icon: Globe },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
    }

    // Staff users (nurse, technician, receptionist, pharmacist, cleaner, security, etc.)
    if (isStaffRole(userRole)) {
      return [
        ...baseItems,
        { id: 'leave-permission', label: 'Leave & Permission', icon: CalendarCheck },
        { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();
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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
        {(userRole === 'manager' || userRole === 'admin') && (
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