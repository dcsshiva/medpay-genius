import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface QuickAccessConfig {
  id: string;
  mode: 'analytics' | 'manual';
  manual_items: string[];
  is_active: boolean;
}

export const useQuickAccessConfig = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['quick-access-config'],
    queryFn: async (): Promise<QuickAccessConfig | null> => {
      const { data, error } = await supabase
        .from('quick_access_config' as any)
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error || !data) return null;

      const row = data as any;
      return {
        id: row.id,
        mode: row.mode as 'analytics' | 'manual',
        manual_items: (row.manual_items || []) as string[],
        is_active: row.is_active,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: { mode: 'analytics' | 'manual'; manual_items: string[] }) => {
      if (!config?.id) throw new Error('No config found');

      const { error } = await supabase
        .from('quick_access_config' as any)
        .update({
          mode: updates.mode,
          manual_items: updates.manual_items as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-access-config'] });
    },
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('quick-access-config-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quick_access_config' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quick-access-config'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    config,
    isLoading,
    updateConfig,
  };
};
