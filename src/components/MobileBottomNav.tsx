import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MoreHorizontal } from 'lucide-react';
import type { NavigationItem } from '@/lib/navigationItems';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  navigationItems: NavigationItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Role-aware priority list for the bottom bar. First 4 available items are
 * pinned; everything else moves into the "More" sheet as a grid.
 */
const PRIORITY_ORDER = [
  'dashboard',
  'doctor-hub',
  'staff-dashboard',
  'visits',
  'quick-payment',
  'bank-advice-history',
  'tasks',
  'leave-permission',
  'complaints',
  'cash-payments-lite',
  'insurance-payments-lite',
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  navigationItems,
  activeTab,
  onTabChange,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, secondary } = useMemo(() => {
    const byId = new Map(navigationItems.map((i) => [i.id, i]));
    const primaryPicked: NavigationItem[] = [];
    for (const id of PRIORITY_ORDER) {
      if (primaryPicked.length >= 4) break;
      const item = byId.get(id);
      if (item) primaryPicked.push(item);
    }
    // Fill from remaining items if role has fewer priority matches
    if (primaryPicked.length < 4) {
      for (const item of navigationItems) {
        if (primaryPicked.length >= 4) break;
        if (!primaryPicked.find((p) => p.id === item.id)) primaryPicked.push(item);
      }
    }
    const primaryIds = new Set(primaryPicked.map((i) => i.id));
    const secondaryList = navigationItems.filter((i) => !primaryIds.has(i.id));
    return { primary: primaryPicked, secondary: secondaryList };
  }, [navigationItems]);

  // Doctor role or minimal nav — skip bottom bar
  if (navigationItems.length <= 1) return null;

  const handleTap = (id: string) => {
    onTabChange(id);
    setMoreOpen(false);
  };

  const isMoreActive = secondary.some((i) => i.id === activeTab);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border pb-safe shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      aria-label="Primary mobile navigation"
    >
      <ul className="grid grid-cols-5 h-14">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <li key={item.id} className="flex">
              <button
                type="button"
                onClick={() => handleTap(item.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 px-1 min-h-[44px] transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('h-5 w-5', active && 'scale-110')} />
                <span className="text-[10px] leading-tight font-medium truncate max-w-full">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            </li>
          );
        })}

        <li className="flex">
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 px-1 min-h-[44px] transition-colors',
                  isMoreActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] leading-tight font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] p-0 flex flex-col">
              <div className="px-4 pt-5 pb-3 border-b">
                <h2 className="text-lg font-semibold">More</h2>
                <p className="text-xs text-muted-foreground">
                  All modules available to your role
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 pb-safe">
                <div className="grid grid-cols-3 gap-3">
                  {secondary.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTap(item.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 rounded-xl border p-3 min-h-[88px] text-center transition-all active:scale-95',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:bg-accent'
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-[11px] leading-tight font-medium line-clamp-2">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
