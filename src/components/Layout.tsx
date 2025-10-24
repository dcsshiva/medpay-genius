import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { isStaffRole } from '@/lib/staffUtils';
import VersionDisplay from '@/components/VersionDisplay';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { 
  Stethoscope, 
  LogOut, 
  Users, 
  Calendar, 
  CreditCard, 
  Settings,
  Home,
  ClipboardList,
  MessageCircle,
  UserCog,
  MessageSquare,
  History as HistoryIcon,
  BookOpen,
  ClipboardCheck,
  Database,
  CalendarCheck
} from 'lucide-react';
import westmedLogo from '@/assets/westmed-logo.png';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, userRole, signOut } = useAuth();

  const getNavigationItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'user-guide', label: 'User Guide', icon: BookOpen },
    ];

    if (userRole === 'doctor') {
      return [
        ...baseItems,
        { id: 'visits', label: 'My Visits', icon: Calendar },
        { id: 'payments', label: 'My Payments', icon: CreditCard },
        { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      ];
    }

    if (userRole === 'manager') {
      return [
        ...baseItems,
        { id: 'doctors', label: 'Doctors', icon: Users },
        { id: 'payments', label: 'Payment Approvals', icon: CreditCard },
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
        { id: 'payments', label: 'Payment Management', icon: CreditCard },
        { id: 'tasks', label: 'Task Management', icon: ClipboardList },
        { id: 'appraisals', label: 'Staff Appraisals', icon: ClipboardCheck },
        { id: 'leave-approvals', label: 'Leave Approvals', icon: CalendarCheck },
        { id: 'complaints', label: 'Complaint Management', icon: MessageCircle },
        { id: 'chat', label: 'Team Chat', icon: MessageSquare },
        { id: 'version', label: 'Version Management', icon: HistoryIcon },
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

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full">
        {/* Mobile Header */}
        <MobileHeader 
          navigationItems={navigationItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />

        {/* Desktop Layout with Sidebar */}
        <div className="hidden md:flex w-full">
          <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />
          
          <SidebarInset>
            {/* Desktop Header */}
            <header className="bg-card border-b border-border shadow-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-3">
                  <SidebarTrigger />
                  <div className="flex items-center space-x-3">
                    <img src={westmedLogo} alt="WestMed Hospital" className="h-8 w-8" />
                    <div>
                      <h1 className="text-xl font-bold text-foreground">WestMed Hospital</h1>
                      <p className="text-sm text-muted-foreground">Hospital Management System</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {user?.user_metadata?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={signOut}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="p-6">
              {children}
            </main>
          </SidebarInset>
        </div>

        {/* Mobile Content - fallback for old mobile behavior */}
        <div className="md:hidden">
          <main className="p-4">
            {children}
          </main>
        </div>
        
        {/* Version Display */}
        <VersionDisplay />
      </div>
    </SidebarProvider>
  );
};

export default Layout;