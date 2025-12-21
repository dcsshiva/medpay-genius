import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DailyStats {
  date: string;
  navigation_name: string;
  count: number;
}

interface OverallStats {
  navigation_name: string;
  count: number;
}

export default function NavigationAnalytics() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch daily stats
      const { data: dailyData, error: dailyError } = await supabase
        .from('navigation_analytics')
        .select('navigation_name, clicked_at')
        .gte('clicked_at', dateRange.from.toISOString())
        .lte('clicked_at', dateRange.to.toISOString())
        .order('clicked_at', { ascending: false });

      if (dailyError) throw dailyError;

      // Group by date and navigation_name
      const dailyMap = new Map<string, Map<string, number>>();
      (dailyData || []).forEach((item) => {
        const date = format(new Date(item.clicked_at), 'yyyy-MM-dd');
        if (!dailyMap.has(date)) {
          dailyMap.set(date, new Map());
        }
        const navMap = dailyMap.get(date)!;
        navMap.set(item.navigation_name, (navMap.get(item.navigation_name) || 0) + 1);
      });

      const dailyResult: DailyStats[] = [];
      dailyMap.forEach((navMap, date) => {
        navMap.forEach((count, navigation_name) => {
          dailyResult.push({ date, navigation_name, count });
        });
      });
      // Sort by date desc, then by count desc
      dailyResult.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.count - a.count;
      });
      setDailyStats(dailyResult);

      // Fetch overall stats
      const { data: overallData, error: overallError } = await supabase
        .from('navigation_analytics')
        .select('navigation_name, clicked_at')
        .gte('clicked_at', dateRange.from.toISOString())
        .lte('clicked_at', dateRange.to.toISOString());

      if (overallError) throw overallError;

      // Group by navigation_name
      const overallMap = new Map<string, number>();
      (overallData || []).forEach((item) => {
        overallMap.set(item.navigation_name, (overallMap.get(item.navigation_name) || 0) + 1);
      });

      const overallResult: OverallStats[] = [];
      overallMap.forEach((count, navigation_name) => {
        overallResult.push({ navigation_name, count });
      });
      overallResult.sort((a, b) => b.count - a.count);
      setOverallStats(overallResult);
    } catch (error) {
      console.error('Error fetching navigation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const totalClicks = overallStats.reduce((sum, stat) => sum + stat.count, 0);
  const uniquePages = overallStats.length;
  const topPage = overallStats[0]?.navigation_name || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Navigation Analytics</h2>
          <p className="text-muted-foreground">Track sidebar menu usage</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Pages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePages}</div>
            <p className="text-xs text-muted-foreground">Pages visited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{topPage}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats[0]?.count.toLocaleString() || 0} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList>
          <TabsTrigger value="overall">Overall Summary</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Usage (Overall)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : overallStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No navigation data available yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Rank</TableHead>
                      <TableHead>Navigation Name</TableHead>
                      <TableHead className="text-right">Total Clicks</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallStats.map((stat, index) => (
                      <TableRow key={stat.navigation_name}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{stat.navigation_name}</TableCell>
                        <TableCell className="text-right">{stat.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {totalClicks > 0 ? ((stat.count / totalClicks) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Usage (Daily)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : dailyStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No navigation data available yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Navigation Name</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map((stat, index) => (
                      <TableRow key={`${stat.date}-${stat.navigation_name}`}>
                        <TableCell>{format(new Date(stat.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{stat.navigation_name}</TableCell>
                        <TableCell className="text-right">{stat.count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
