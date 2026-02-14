import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MenuVisibilityConfig {
  menu_item_id: string;
  is_visible: boolean;
  display_order: number;
}

export function useMenuVisibility() {
  const [visibilityConfig, setVisibilityConfig] = useState<MenuVisibilityConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('sidebar_menu_config')
        .select('menu_item_id, is_visible, display_order')
        .order('display_order');

      if (error) throw error;
      setVisibilityConfig(data || []);
    } catch (error) {
      console.error('Error fetching menu visibility config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const isItemVisible = (menuItemId: string): boolean => {
    const config = visibilityConfig.find(c => c.menu_item_id === menuItemId);
    return config ? config.is_visible : true; // Default to visible if not in config
  };

  return { visibilityConfig, isLoading, isItemVisible, refetch: fetchConfig };
}
