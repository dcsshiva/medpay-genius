import React from 'react';
import { Sparkles } from 'lucide-react';
import westmedLogo from '@/assets/westmed-logo.png';
import VersionDisplay from '@/components/VersionDisplay';
import { useNavigationItems } from '@/lib/navigationItems';
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
import { useAuth } from '@/lib/auth';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';
import { useQuickAccessItems } from '@/hooks/useQuickAccessItems';
import { useMenuVisibility } from '@/hooks/useMenuVisibility';
import { NotificationCenter } from '@/components/NotificationCenter';


interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { userRole, userDesignation, userProfile, loading: authLoading } = useAuth();
  const { open } = useSidebar();
  const { trackNavigation } = useNavigationTracking();
  const { isItemVisible } = useMenuVisibility();

  const handleNavigationClick = (item: { id: string; label: string }) => {
    trackNavigation(item.id, item.label);
    onTabChange(item.id);
  };


  const { items: allNavigationItems, loading: navItemsLoading } = useNavigationItems();
  const navLoading = authLoading || navItemsLoading;
  // Filter by admin-configured visibility
  const navigationItems = allNavigationItems.filter(item => isItemVisible(item.id));
  const quickAccessItems = useQuickAccessItems(allNavigationItems);
  const isCollapsed = !open;

  return (
    <Sidebar className="border-r" data-walkthrough="sidebar-nav">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={westmedLogo} alt="WestMed Hospital" className="h-8 w-8" />
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold leading-tight">WestMed</h1>
                <p className="text-xs text-muted-foreground leading-tight">Hospital System</p>
                <div className="mt-1 -ml-2">
                  <VersionDisplay inline />
                </div>
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
            {navLoading ? (
              <div className="space-y-2 px-2 py-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id} data-walkthrough={`nav-${item.id}`}>
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
            )}
          </SidebarGroupContent>
        </SidebarGroup>

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