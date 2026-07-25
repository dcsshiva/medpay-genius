import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import { AppSidebar } from '@/components/AppSidebar';
import VersionDisplay from '@/components/VersionDisplay';
import Footer from '@/components/Footer';
import { PaymentStatsColorPicker } from '@/components/PaymentStatsColorPicker';
import { PaymentStatsColorsProvider } from '@/hooks/usePaymentStatsColors';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import CheckUpdateButton from '@/components/CheckUpdateButton';
import MobileBottomNav from '@/components/MobileBottomNav';
import westmedLogo from '@/assets/westmed-logo.png';
import { useNavigationItems } from '@/lib/navigationItems';
import AIChatbot from '@/components/AIChatbot';
import WalkthroughOverlay from '@/components/WalkthroughOverlay';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { useVersionLoginToast } from '@/hooks/useVersionLoginToast';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, userRole, userDesignation, userProfile, signOut } = useAuth();

  useVersionLoginToast(user?.id);

  const walkthrough = useWalkthrough({
    userId: user?.id,
    userRole,
    userDesignation,
    userType: userProfile?.user_type,
  });

  const { items: navigationItems } = useNavigationItems();

  return (
    <PaymentStatsColorsProvider>
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
                    <CheckUpdateButton />
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

          {/* Mobile Content - padded to clear the bottom tab bar */}
          <div className="md:hidden pl-safe pr-safe">
            <main className="p-4 pb-[calc(4rem+env(safe-area-inset-bottom))] min-h-[calc(100dvh-3.5rem)]">
              {children}
            </main>
          </div>

          {/* Mobile Bottom Navigation (Phase 1) */}
          <MobileBottomNav
            navigationItems={navigationItems}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
          


          
          {/* Footer */}
          <Footer />
          
          {/* AI Chatbot */}
          <div data-walkthrough="ai-chatbot">
            <AIChatbot onTabChange={onTabChange} />
          </div>

          {/* Walkthrough Overlay */}
          <WalkthroughOverlay
            isActive={walkthrough.isActive}
            currentStep={walkthrough.currentStep}
            currentStepIndex={walkthrough.currentStepIndex}
            totalSteps={walkthrough.totalSteps}
            onNext={walkthrough.nextStep}
            onPrevious={walkthrough.previousStep}
            onSkip={walkthrough.skipWalkthrough}
          />
        </div>
      </SidebarProvider>
    </PaymentStatsColorsProvider>
  );
};

export default Layout;