import React from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileListCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  amount?: React.ReactNode;
  status?: React.ReactNode;
  onClick?: () => void;
  onMore?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable mobile list row for turning desktop tables into touch-friendly
 * cards. Use inside `md:hidden` list containers.
 */
export const MobileListCard: React.FC<MobileListCardProps> = ({
  title,
  subtitle,
  amount,
  status,
  onClick,
  onMore,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'md:hidden rounded-xl border border-border bg-card p-3 shadow-sm active:scale-[0.99] transition-transform',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-foreground truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {amount && (
            <div className="font-bold text-sm text-foreground tabular-nums">
              {amount}
            </div>
          )}
          {status}
        </div>
        {onMore ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onMore();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        ) : onClick ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : null}
      </div>
      {children && <div className="mt-2 pt-2 border-t border-border/50">{children}</div>}
    </div>
  );
};

export default MobileListCard;
