import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavigationItem } from '@/lib/navigationItems';
import { useAuth } from '@/lib/auth';
import { useQuickAccessConfig } from '@/hooks/useQuickAccessConfig';
import { subDays } from 'date-fns';

export const useQuickAccessItems = (navigationItems: NavigationItem[]): NavigationItem[] => {
  const { userRole, userDesignation } = useAuth();
  const { config } = useQuickAccessConfig();
  const [quickItems, setQuickItems] = useState<NavigationItem[]>([]);
  const lastFetchRef = useRef<number>(0);

  const isEligibleRole = 
    userRole === 'admin' || 
    userRole === 'manager' || 
    userDesignation === 'super_admin' || 
    userDesignation === 'admin' || 
    userDesignation === 'manager';

  // Build manual items from config
  const buildManualItems = useCallback(() => {
    if (!config?.manual_items || config.manual_items.length === 0) return [];
    
    const navByLabel = new Map(navigationItems.map(item => [item.label, item]));
    const result: NavigationItem[] = [];
    
    for (const label of config.manual_items) {
      const navItem = navByLabel.get(label);
      if (navItem) {
        result.push(navItem);
      }
    }
    
    return result;
  }, [config?.manual_items, navigationItems]);

  const fetchAnalyticsItems = useCallback(async (bypassCache = false) => {
    if (!isEligibleRole || navigationItems.length === 0) return;

    const now = Date.now();
    if (!bypassCache && now - lastFetchRef.current < 5 * 60 * 1000 && quickItems.length > 0) {
      return;
    }

    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('navigation_analytics')
        .select('navigation_name')
        .gte('clicked_at', thirtyDaysAgo)
        .limit(5000);

      if (error || !data || data.length === 0) return;

      const countMap = new Map<string, number>();
      for (const row of data) {
        countMap.set(row.navigation_name, (countMap.get(row.navigation_name) || 0) + 1);
      }

      const ranked = Array.from(countMap.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0].localeCompare(b[0]);
        });

      const navByLabel = new Map(navigationItems.map(item => [item.label, item]));

      const result: NavigationItem[] = [];
      for (const [navName] of ranked) {
        const navItem = navByLabel.get(navName);
        if (navItem) {
          result.push(navItem);
          if (result.length >= 6) break;
        }
      }

      lastFetchRef.current = Date.now();
      setQuickItems(result);
    } catch {
      // Silently fail
    }
  }, [isEligibleRole, navigationItems]);

  // Handle mode changes
  useEffect(() => {
    if (!isEligibleRole || navigationItems.length === 0) {
      setQuickItems([]);
      return;
    }

    // If manual mode, build items from config directly
    if (config?.mode === 'manual') {
      setQuickItems(buildManualItems());
      return;
    }

    // Analytics mode: fetch from navigation_analytics
    fetchAnalyticsItems();

    const interval = setInterval(() => fetchAnalyticsItems(), 5 * 60 * 1000);

    const channel = supabase
      .channel('quick-access-nav-analytics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'navigation_analytics' },
        () => {
          fetchAnalyticsItems(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isEligibleRole, navigationItems, config?.mode, fetchAnalyticsItems, buildManualItems]);

  return quickItems;
};
