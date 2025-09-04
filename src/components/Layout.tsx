import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import PasswordChange from '@/components/PasswordChange';
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
  UserCog
} from 'lucide-react';

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
    ];

    if (userRole === 'doctor') {
      return [
        ...baseItems,
        { id: 'visits', label: 'My Visits', icon: Calendar },
        { id: 'payments', label: 'My Payments', icon: CreditCard },
        { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (userRole === 'manager') {
      return [
        ...baseItems,
        { id: 'doctors', label: 'Doctors', icon: Users },
        { id: 'payments', label: 'Payment Approvals', icon: CreditCard },
        { id: 'tasks', label: 'Task Management', icon: ClipboardList },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (userRole === 'admin') {
      return [
        ...baseItems,
        { id: 'staff', label: 'Staff Management', icon: UserCog },
        { id: 'doctors', label: 'Doctor Management', icon: Users },
        { id: 'visits', label: 'Visit Management', icon: Calendar },
        { id: 'payments', label: 'Payment Management', icon: CreditCard },
        { id: 'tasks', label: 'Task Management', icon: ClipboardList },
        { id: 'complaints', label: 'Complaint Management', icon: MessageCircle },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader 
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Desktop Header */}
      <header className="bg-card border-b border-border shadow-sm hidden md:block">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">WestMed Hospital</h1>
              <p className="text-sm text-muted-foreground">Hospital Management System</p>
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

      <div className="flex">
        {/* Desktop Sidebar */}
        <nav className="w-64 bg-card border-r border-border min-h-[calc(100vh-80px)] hidden md:block">
          <div className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {activeTab === 'settings' ? <PasswordChange /> : children}
        </main>
      </div>
    </div>
  );
};

export default Layout;