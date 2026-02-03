import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeatmapStat {
  navigation_name: string;
  count: number;
}

interface NavigationHeatmapProps {
  stats: HeatmapStat[];
  loading?: boolean;
}

const getHeatColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return 'bg-green-300';
  const intensity = count / maxCount;
  if (intensity >= 0.8) return 'bg-red-500';
  if (intensity >= 0.6) return 'bg-orange-500';
  if (intensity >= 0.4) return 'bg-yellow-500';
  if (intensity >= 0.2) return 'bg-lime-500';
  return 'bg-green-300';
};

const getHeatTextColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return 'text-green-700';
  const intensity = count / maxCount;
  if (intensity >= 0.6) return 'text-white';
  return 'text-gray-800';
};

const getIntensityLabel = (count: number, maxCount: number): string => {
  if (maxCount === 0) return 'No data';
  const intensity = count / maxCount;
  if (intensity >= 0.8) return 'Very High';
  if (intensity >= 0.6) return 'High';
  if (intensity >= 0.4) return 'Medium';
  if (intensity >= 0.2) return 'Low';
  return 'Very Low';
};

export default function NavigationHeatmap({ stats, loading }: NavigationHeatmapProps) {
  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const totalClicks = stats.reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Navigation Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Navigation Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No navigation data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sidebar Navigation Heatmap</span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalClicks.toLocaleString()} total clicks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="space-y-2">
            {stats.map((stat, index) => {
              const percentage = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
              const barWidth = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
              
              return (
                <Tooltip key={stat.navigation_name}>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      role="listitem"
                      aria-label={`${stat.navigation_name}: ${stat.count} clicks, ${percentage.toFixed(1)}% of total`}
                    >
                      {/* Rank */}
                      <span className="w-6 text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      
                      {/* Navigation name */}
                      <span className="w-40 text-sm font-medium truncate">
                        {stat.navigation_name}
                      </span>
                      
                      {/* Heat bar */}
                      <div className="flex-1 h-8 bg-muted/30 rounded-md overflow-hidden relative">
                        <div
                          className={cn(
                            "h-full transition-all duration-500 ease-out rounded-md flex items-center justify-end pr-2",
                            getHeatColor(stat.count, maxCount)
                          )}
                          style={{ width: `${Math.max(barWidth, 5)}%` }}
                        >
                          <span 
                            className={cn(
                              "text-xs font-bold",
                              getHeatTextColor(stat.count, maxCount)
                            )}
                          >
                            {stat.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Percentage */}
                      <span className="w-16 text-right text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">{stat.navigation_name}</p>
                      <p className="text-xs">
                        <span className="font-medium">{stat.count.toLocaleString()}</span> clicks
                        ({percentage.toFixed(1)}% of total)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Intensity: {getIntensityLabel(stat.count, maxCount)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Click Intensity Legend:</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-300" />
              <span className="text-xs">Very Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-lime-500" />
              <span className="text-xs">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-xs">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-xs">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-xs">Very High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
