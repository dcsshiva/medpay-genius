import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import westmedLogo from '@/assets/westmed-logo.png';
import { NotificationCenter } from '@/components/NotificationCenter';
import { PaymentStatsColorPicker } from '@/components/PaymentStatsColorPicker';

interface MobileHeaderProps {
  navigationItems: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<any>;
  }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  navigationItems, 
  activeTab, 
  onTabChange 
}) => {
  const { user, userRole, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-card border-b border-border shadow-sm md:hidden pt-safe sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={westmedLogo} alt="WestMed Hospital" className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-bold text-foreground">WestMed</h1>
            <p className="text-xs text-muted-foreground">HMS</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <NotificationCenter onNavigate={(tab) => {
            onTabChange(tab);
          }} />
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 flex flex-col h-full">
              {/* User Info */}
              <div className="flex-shrink-0 border-b p-6 bg-background">
                <p className="font-medium text-foreground">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-6 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
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
              </nav>

              {/* Accessibility & Logout */}
              <div className="flex-shrink-0 border-t p-6 bg-background space-y-3">
                {(userRole === 'manager' || userRole === 'admin') && (
                  <PaymentStatsColorPicker variant="full" />
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;