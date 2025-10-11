import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

export function FilterChip({ 
  label, 
  value, 
  onRemove,
  variant = 'secondary',
  className 
}: FilterChipProps) {
  return (
    <Badge 
      variant={variant}
      className={cn(
        'px-3 py-1.5 gap-2 transition-all hover:scale-105',
        onRemove && 'pr-1.5',
        className
      )}
    >
      <span className="text-xs font-medium">
        {label}: <span className="font-normal">{value}</span>
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-background/50 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${label} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

interface FilterChipsProps {
  filters: Array<{
    label: string;
    value: string;
    onRemove?: () => void;
  }>;
  onClearAll?: () => void;
  className?: string;
}

export function FilterChips({ filters, onClearAll, className }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {filters.map((filter, index) => (
        <FilterChip
          key={index}
          label={filter.label}
          value={filter.value}
          onRemove={filter.onRemove}
        />
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
