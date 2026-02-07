import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavigationItem } from '@/lib/navigationItems';
import { useAuth } from '@/lib/auth';

export const useQuickAccessItems = (navigationItems: NavigationItem[]): NavigationItem[] => {
  const { userRole, userDesignation } = useAuth();
  const [quickItems, setQuickItems] = useState<NavigationItem[]>([]);
  const lastFetchRef = useRef<number>(0);

  const isEligibleRole = 
    userRole === 'admin' || 
    userRole === 'manager' || 
    userDesignation === 'super_admin' || 
    userDesignation === 'admin' || 
    userDesignation === 'manager';

  const fetchQuickAccess = useCallback(async (bypassCache = false) => {
    if (!isEligibleRole || navigationItems.length === 0) return;

    // Cache for 5 minutes unless bypassing
    const now = Date.now();
    if (!bypassCache && now - lastFetchRef.current < 5 * 60 * 1000 && quickItems.length > 0) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('navigation_analytics')
        .select('navigation_id, navigation_name')
        .limit(5000);

      if (error || !data || data.length === 0) return;

      // Aggregate counts client-side
      const countMap = new Map<string, { name: string; count: number }>();
      for (const row of data) {
        const existing = countMap.get(row.navigation_id);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(row.navigation_id, { name: row.navigation_name, count: 1 });
        }
      }

      // Sort by count descending
      const ranked = Array.from(countMap.entries())
        .sort((a, b) => b[1].count - a[1].count);

      // Build a lookup map from user's navigation items
      const navMap = new Map(navigationItems.map(item => [item.id, item]));

      // Filter to only accessible items and take top 6
      const result: NavigationItem[] = [];
      for (const [navId] of ranked) {
        const navItem = navMap.get(navId);
        if (navItem) {
          result.push(navItem);
          if (result.length >= 6) break;
        }
      }

      lastFetchRef.current = Date.now();
      setQuickItems(result);
    } catch {
      // Silently fail - Quick Access hidden
    }
  }, [isEligibleRole, navigationItems]);

  useEffect(() => {
    if (!isEligibleRole || navigationItems.length === 0) {
      setQuickItems([]);
      return;
    }

    // Initial fetch
    fetchQuickAccess();

    // Poll every 5 minutes as fallback
    const interval = setInterval(() => fetchQuickAccess(), 5 * 60 * 1000);

    // Subscribe to Realtime INSERT events on navigation_analytics
    const channel = supabase
      .channel('quick-access-nav-analytics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'navigation_analytics' },
        () => {
          // Re-fetch immediately on new navigation click, bypass cache
          fetchQuickAccess(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isEligibleRole, navigationItems, fetchQuickAccess]);

  return quickItems;
};
