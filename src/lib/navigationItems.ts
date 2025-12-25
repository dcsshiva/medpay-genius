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
  TrendingUp,
  History as HistoryIcon,
  Globe,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  CalendarCheck,
  Zap,
  Building2,
  FolderOpen,
  Stethoscope,
  BarChart3
} from 'lucide-react';
import { isStaffRole } from './staffUtils';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface GetNavigationItemsParams {
  userRole?: string;
  userDesignation?: string;
  userProfile?: any;
}

export const getNavigationItems = ({
  userRole,
  userDesignation,
  userProfile
}: GetNavigationItemsParams): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'user-guide', label: 'User Guide', icon: BookOpen },
  ];

  // Super Admin - Full access to everything
  if (userDesignation === 'super_admin' || userRole === 'super_admin') {
    return [
      ...baseItems,
      { id: 'masters', label: 'Masters', icon: Database },
      { id: 'staff', label: 'Staff Management', icon: UserCog },
      { id: 'doctors', label: 'Doctor Management', icon: Users },
      { id: 'visits', label: 'Visit Management', icon: Calendar },
      { id: 'doctor-hub', label: 'Doctor Hub', icon: Stethoscope },
      { id: 'cash-payments-lite', label: 'Cash Payments (Lite)', icon: CreditCard },
      { id: 'insurance-payments-lite', label: 'Insurance Payments (Lite)', icon: CreditCard },
      { id: 'quick-payment', label: 'Quick Payment', icon: Zap },
      { id: 'bank-advice-generation-beta', label: 'Bank Advice (Beta)', icon: Building2 },
      { id: 'bank-advice-generation', label: 'Bank Advice (Legacy)', icon: Building2 },
      { id: 'bank-advice-history', label: 'BANK ADVICE HUB', icon: FolderOpen },
      { id: 'bank-advice-records', label: 'Bank Advice Records', icon: FileText },
      { id: 'tds-reports', label: 'TDS Reports', icon: FileText },
      { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
      { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
      { id: 'bank-advice-payment-report', label: 'BA Payment Report', icon: FileText },
      { id: 'quick-payment-bank-advice-report', label: 'Quick Payment BA Report', icon: FileText },
      { id: 'tasks', label: 'Task Management', icon: ClipboardList },
      { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
      { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
      { id: 'complaints', label: 'Complaint Management', icon: MessageCircle },
      { id: 'login-reports', label: 'Login Reports', icon: TrendingUp },
      { id: 'navigation-analytics', label: 'Navigation Analytics', icon: BarChart3 },
      { id: 'chat', label: 'Team Chat', icon: MessageSquare },
      { id: 'version', label: 'Version Management', icon: HistoryIcon },
      { id: 'website-settings', label: 'Website Settings', icon: Globe },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  }

  // Doctor - Simplified dashboard view
  if (userRole === 'doctor' || userProfile?.user_type === 'doctor') {
    return [
      { id: 'doctor-hub', label: 'My Dashboard', icon: Stethoscope },
    ];
  }

  // Manager - Full payment and management access
  if (userRole === 'manager' || userDesignation === 'manager') {
    return [
      ...baseItems,
      { id: 'masters', label: 'Masters', icon: Database },
      { id: 'staff', label: 'Staff Management', icon: UserCog },
      { id: 'visits', label: 'Visit Management', icon: Calendar },
      { id: 'doctors', label: 'Doctors', icon: Users },
      { id: 'doctor-hub', label: 'Doctor Hub', icon: Stethoscope },
      { id: 'cash-payments-lite', label: 'Cash Payments (Lite)', icon: CreditCard },
      { id: 'insurance-payments-lite', label: 'Insurance Payments (Lite)', icon: CreditCard },
      { id: 'quick-payment', label: 'Quick Payment', icon: Zap },
      { id: 'bank-advice-generation-beta', label: 'Bank Advice (Beta)', icon: Building2 },
      { id: 'bank-advice-generation', label: 'Bank Advice (Legacy)', icon: Building2 },
      { id: 'bank-advice-history', label: 'BANK ADVICE HUB', icon: FolderOpen },
      { id: 'bank-advice-records', label: 'Bank Advice Records', icon: FileText },
      { id: 'tds-reports', label: 'TDS Reports', icon: FileText },
      { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
      { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
      { id: 'bank-advice-payment-report', label: 'BA Payment Report', icon: FileText },
      { id: 'quick-payment-bank-advice-report', label: 'Quick Payment BA Report', icon: FileText },
      { id: 'tasks', label: 'Task Management', icon: ClipboardList },
      { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
      { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
      { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    ];
  }

  // Admin - Full access including settings
  if (userRole === 'admin' || userDesignation === 'admin') {
    return [
      ...baseItems,
      { id: 'masters', label: 'Masters', icon: Database },
      { id: 'staff', label: 'Staff Management', icon: UserCog },
      { id: 'doctors', label: 'Doctor Management', icon: Users },
      { id: 'doctor-hub', label: 'Doctor Hub', icon: Stethoscope },
      { id: 'visits', label: 'Visit Management', icon: Calendar },
      { id: 'cash-payments-lite', label: 'Cash Payments (Lite)', icon: CreditCard },
      { id: 'insurance-payments-lite', label: 'Insurance Payments (Lite)', icon: CreditCard },
      { id: 'quick-payment', label: 'Quick Payment', icon: Zap },
      { id: 'bank-advice-generation-beta', label: 'Bank Advice (Beta)', icon: Building2 },
      { id: 'bank-advice-generation', label: 'Bank Advice (Legacy)', icon: Building2 },
      { id: 'bank-advice-history', label: 'BANK ADVICE HUB', icon: FolderOpen },
      { id: 'bank-advice-records', label: 'Bank Advice Records', icon: FileText },
      { id: 'tds-reports', label: 'TDS Reports', icon: FileText },
      { id: 'cash-payments', label: 'Cash Payments', icon: CreditCard },
      { id: 'insurance-payments', label: 'Insurance Payments', icon: CreditCard },
      { id: 'bank-advice-payment-report', label: 'BA Payment Report', icon: FileText },
      { id: 'quick-payment-bank-advice-report', label: 'Quick Payment BA Report', icon: FileText },
      { id: 'tasks', label: 'Task Management', icon: ClipboardList },
      { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
      { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
      { id: 'complaints', label: 'Complaint Management', icon: MessageCircle },
      { id: 'login-reports', label: 'Login Reports', icon: TrendingUp },
      { id: 'navigation-analytics', label: 'Navigation Analytics', icon: BarChart3 },
      { id: 'chat', label: 'Team Chat', icon: MessageSquare },
      { id: 'version', label: 'Version Management', icon: HistoryIcon },
      { id: 'website-settings', label: 'Website Settings', icon: Globe },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  }

  // Staff users (nurse, technician, receptionist, pharmacist, cleaner, security, etc.)
  if (userRole && isStaffRole(userRole)) {
    return [
      ...baseItems,
      { id: 'leave-permission', label: 'Leave & Permission', icon: CalendarCheck },
      { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
      { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    ];
  }

  return baseItems;
};
