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
import { Treemap, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Cell } from 'recharts';
import NavigationHeatmap from './NavigationHeatmap';

interface DailyStats {
  date: string;
  navigation_name: string;
  count: number;
}

interface OverallStats {
  navigation_name: string;
  count: number;
}

interface RoleStats {
  navigation_name: string;
  admin: number;
  manager: number;
  staff: number;
  doctor: number;
  unknown: number;
}

const TREEMAP_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

const ROLE_COLORS = {
  admin: '#ef4444',
  manager: '#f97316',
  staff: '#22c55e',
  doctor: '#3b82f6',
  unknown: '#9ca3af',
};

export default function NavigationAnalytics() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch all navigation data for the period
      const { data: rawData, error } = await supabase
        .from('navigation_analytics')
        .select('navigation_name, clicked_at, user_role')
        .gte('clicked_at', dateRange.from.toISOString())
        .lte('clicked_at', dateRange.to.toISOString())
        .order('clicked_at', { ascending: false });

      if (error) throw error;

      const data = rawData || [];

      // Process daily stats
      const dailyMap = new Map<string, Map<string, number>>();
      data.forEach((item) => {
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
      dailyResult.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.count - a.count;
      });
      setDailyStats(dailyResult);

      // Process overall stats
      const overallMap = new Map<string, number>();
      data.forEach((item) => {
        overallMap.set(item.navigation_name, (overallMap.get(item.navigation_name) || 0) + 1);
      });

      const overallResult: OverallStats[] = [];
      overallMap.forEach((count, navigation_name) => {
        overallResult.push({ navigation_name, count });
      });
      overallResult.sort((a, b) => b.count - a.count);
      setOverallStats(overallResult);

      // Process role-based stats
      const roleMap = new Map<string, { admin: number; manager: number; staff: number; doctor: number; unknown: number }>();
      data.forEach((item) => {
        if (!roleMap.has(item.navigation_name)) {
          roleMap.set(item.navigation_name, { admin: 0, manager: 0, staff: 0, doctor: 0, unknown: 0 });
        }
        const roleData = roleMap.get(item.navigation_name)!;
        const role = item.user_role?.toLowerCase() || 'unknown';
        if (role === 'admin' || role === 'super_admin') {
          roleData.admin += 1;
        } else if (role === 'manager') {
          roleData.manager += 1;
        } else if (role === 'staff' || role.includes('nurse') || role.includes('receptionist')) {
          roleData.staff += 1;
        } else if (role === 'doctor') {
          roleData.doctor += 1;
        } else {
          roleData.unknown += 1;
        }
      });

      const roleResult: RoleStats[] = [];
      roleMap.forEach((counts, navigation_name) => {
        roleResult.push({ navigation_name, ...counts });
      });
      roleResult.sort((a, b) => {
        const totalA = a.admin + a.manager + a.staff + a.doctor + a.unknown;
        const totalB = b.admin + b.manager + b.staff + b.doctor + b.unknown;
        return totalB - totalA;
      });
      setRoleStats(roleResult);

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

  // Prepare treemap data
  const treemapData = overallStats.map((stat, index) => ({
    name: stat.navigation_name,
    size: stat.count,
    fill: TREEMAP_COLORS[index % TREEMAP_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Navigation Analytics</h2>
          <p className="text-muted-foreground">Track sidebar menu usage with heatmap visualization</p>
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

      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="treemap">Treemap</TabsTrigger>
          <TabsTrigger value="by-role">By Role</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
          <NavigationHeatmap stats={overallStats} loading={loading} />
        </TabsContent>

        {/* Treemap Tab */}
        <TabsContent value="treemap">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Usage Treemap</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : treemapData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No navigation data available yet
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                    >
                      {treemapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload || !payload[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.size.toLocaleString()} clicks
                              </p>
                            </div>
                          );
                        }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Role Tab */}
        <TabsContent value="by-role">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Usage by Role</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : roleStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No navigation data available yet
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={roleStats.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="navigation_name" 
                        width={90}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="admin" stackId="a" fill={ROLE_COLORS.admin} name="Admin" />
                      <Bar dataKey="manager" stackId="a" fill={ROLE_COLORS.manager} name="Manager" />
                      <Bar dataKey="doctor" stackId="a" fill={ROLE_COLORS.doctor} name="Doctor" />
                      <Bar dataKey="staff" stackId="a" fill={ROLE_COLORS.staff} name="Staff" />
                      <Bar dataKey="unknown" stackId="a" fill={ROLE_COLORS.unknown} name="Other" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overall Tab */}
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

        {/* Daily Tab */}
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
                    {dailyStats.map((stat) => (
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
