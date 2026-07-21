import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScreenRegistryEntry {
  screen_key: string;
  screen_name: string;
  group_name: string;
  route_path: string | null;
  sort_order: number;
  super_admin_only: boolean;
}

export interface ApprovalRegistryEntry {
  permission_key: string;
  permission_name: string;
  applicable_role: string; // 'manager' | 'admin' | 'any'
  group_name: string;
  sort_order: number;
}

export const useScreenRegistry = () => {
  const [data, setData] = useState<ScreenRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows, error } = await (supabase.rpc as any)('list_screen_registry');
    if (!error && rows) setData(rows as ScreenRegistryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('screen_registry_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screen_registry' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { data, loading, reload: load };
};

export const useApprovalRegistry = () => {
  const [data, setData] = useState<ApprovalRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows, error } = await (supabase.rpc as any)('list_approval_registry');
    if (!error && rows) setData(rows as ApprovalRegistryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('approval_registry_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_permission_registry' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { data, loading, reload: load };
};
