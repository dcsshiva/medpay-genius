import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Stethoscope, Menu, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

  return (
    <header className="bg-card border-b border-border shadow-sm md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="bg-primary p-2 rounded-lg">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WestMed</h1>
            <p className="text-xs text-muted-foreground">Payment System</p>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="space-y-6">
              {/* User Info */}
              <div className="border-b pb-4">
                <p className="font-medium text-foreground">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
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

              {/* Logout */}
              <div className="border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="w-full flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default MobileHeader;