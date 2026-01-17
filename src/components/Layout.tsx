import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import { AppSidebar } from '@/components/AppSidebar';
import VersionDisplay from '@/components/VersionDisplay';
import Footer from '@/components/Footer';
import { PaymentStatsColorPicker } from '@/components/PaymentStatsColorPicker';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import westmedLogo from '@/assets/westmed-logo.png';
import { getNavigationItems } from '@/lib/navigationItems';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, userRole, userDesignation, userProfile, signOut } = useAuth();

  const navigationItems = getNavigationItems({
    userRole,
    userDesignation,
    userProfile
  });

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
          
          <SidebarInset className="flex flex-col h-screen overflow-hidden">
            {/* Desktop Header */}
            <header className="bg-card border-b border-border shadow-sm flex-shrink-0">
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
                  {(userRole === 'manager' || userRole === 'admin' || userDesignation === 'super_admin' || userDesignation === 'admin' || userDesignation === 'manager') && (
                    <PaymentStatsColorPicker variant="icon" />
                  )}
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

            {/* Main Content with Scroll */}
            <main className="flex-1 overflow-y-auto p-6">
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
        
        {/* Footer */}
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default Layout;