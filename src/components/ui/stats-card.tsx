import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'bg-gradient-to-br from-primary/10 via-primary/5 to-background hover:from-primary/15',
  success: 'bg-gradient-to-br from-success/10 via-success/5 to-background hover:from-success/15',
  warning: 'bg-gradient-to-br from-warning/10 via-warning/5 to-background hover:from-warning/15',
  danger: 'bg-gradient-to-br from-destructive/10 via-destructive/5 to-background hover:from-destructive/15',
  info: 'bg-gradient-to-br from-accent/10 via-accent/5 to-background hover:from-accent/15',
};

const iconVariantClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-accent/10 text-accent',
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default',
  className 
}: StatsCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-0',
      variantClasses[variant],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110',
          iconVariantClasses[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className={cn(
            'text-xs font-medium mt-2 flex items-center gap-1',
            trend.isPositive ? 'text-success' : 'text-destructive'
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
