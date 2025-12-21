import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export const useNavigationTracking = () => {
  const { user, userRole, userProfile } = useAuth();

  const trackNavigation = useCallback(async (navigationId: string, navigationName: string) => {
    if (!user?.id) return;

    try {
      // Get staff_id from userProfile if available
      const staffId = userProfile?.staff_id || null;

      await supabase.from('navigation_analytics').insert({
        user_id: user.id,
        staff_id: staffId,
        navigation_id: navigationId,
        navigation_name: navigationName,
        user_role: userRole || userProfile?.role || 'unknown',
      });
    } catch (error) {
      // Silently fail - don't block navigation for analytics
      console.error('Failed to track navigation:', error);
    }
  }, [user?.id, userRole, userProfile]);

  return { trackNavigation };
};
