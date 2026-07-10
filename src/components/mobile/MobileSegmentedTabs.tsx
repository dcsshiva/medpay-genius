import React from 'react';
import { cn } from '@/lib/utils';

export interface MobileSegment {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MobileSegmentedTabsProps {
  segments: MobileSegment[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  sticky?: boolean;
}

/**
 * Mobile-first segmented control. Use inside `md:hidden` branches; keep
 * the desktop `<Tabs>` untouched.
 */
export const MobileSegmentedTabs: React.FC<MobileSegmentedTabsProps> = ({
  segments,
  value,
  onValueChange,
  className,
  sticky = true,
}) => {
  return (
    <div
      className={cn(
        'md:hidden -mx-4 px-4 bg-background/95 backdrop-blur',
        sticky && 'sticky top-14 z-30',
        className,
      )}
    >
      <div
        role="tablist"
        className="flex gap-1 p-1 my-2 bg-muted rounded-full overflow-x-auto scrollbar-thin"
      >
        {segments.map((seg) => {
          const active = seg.value === value;
          const Icon = seg.icon;
          return (
            <button
              key={seg.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onValueChange(seg.value)}
              className={cn(
                'flex-1 min-w-fit whitespace-nowrap flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px]',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {seg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileSegmentedTabs;
