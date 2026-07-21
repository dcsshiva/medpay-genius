import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScreenPermRow {
  screen_key: string;
  can_view: boolean;
  can_edit: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface ApprovalPermRow {
  permission_key: string;
  can_approve: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface LastUpdate {
  key: string;
  at: string;
  by: string | null;
}

interface Options {
  /** When true, uses admin_screen_permissions instead of staff_screen_permissions and admin_user_id column. */
  isAdmin?: boolean;
}

/**
 * Live permissions for a given staff (or admin) row.
 * Subscribes to realtime changes so the modal and any consumer stay in sync
 * without a reload.
 */
export const useStaffPermissions = (targetId: string | null | undefined, opts: Options = {}) => {
  const { isAdmin = false } = opts;
  const screenTable = isAdmin ? 'admin_screen_permissions' : 'staff_screen_permissions';
  const idColumn = isAdmin ? 'admin_user_id' : 'staff_id';

  const [screens, setScreens] = useState<Record<string, ScreenPermRow>>({});
  const [approvals, setApprovals] = useState<Record<string, ApprovalPermRow>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);

    const [scr, apr] = await Promise.all([
      (supabase as any)
        .from(screenTable)
        .select('screen_key, can_view, can_edit, updated_by, updated_at')
        .eq(idColumn, targetId),
      isAdmin
        ? Promise.resolve({ data: [], error: null })
        : (supabase as any)
            .from('staff_approval_permissions')
            .select('permission_key, can_approve, updated_by, updated_at')
            .eq('staff_id', targetId),
    ]);

    const sMap: Record<string, ScreenPermRow> = {};
    (scr.data || []).forEach((r: any) => { sMap[r.screen_key] = r; });
    setScreens(sMap);

    const aMap: Record<string, ApprovalPermRow> = {};
    (apr.data || []).forEach((r: any) => { aMap[r.permission_key] = r; });
    setApprovals(aMap);

    setLoading(false);
  }, [targetId, screenTable, idColumn, isAdmin]);

  useEffect(() => {
    load();
    if (!targetId) return;

    const ch = supabase
      .channel(`perm_${screenTable}_${targetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: screenTable, filter: `${idColumn}=eq.${targetId}` },
        (payload: any) => {
          const row = (payload.new || payload.old) as ScreenPermRow;
          if (!row) return;
          setScreens((prev) => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') {
              delete next[row.screen_key];
            } else {
              next[row.screen_key] = row;
            }
            return next;
          });
          if (payload.new) {
            setLastUpdate({ key: row.screen_key, at: (row as any).updated_at, by: (row as any).updated_by });
          }
        }
      )
      .subscribe();

    let apprCh: any = null;
    if (!isAdmin) {
      apprCh = supabase
        .channel(`perm_approvals_${targetId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'staff_approval_permissions', filter: `staff_id=eq.${targetId}` },
          (payload: any) => {
            const row = (payload.new || payload.old) as ApprovalPermRow;
            if (!row) return;
            setApprovals((prev) => {
              const next = { ...prev };
              if (payload.eventType === 'DELETE') {
                delete next[row.permission_key];
              } else {
                next[row.permission_key] = row;
              }
              return next;
            });
            if (payload.new) {
              setLastUpdate({ key: row.permission_key, at: (row as any).updated_at, by: (row as any).updated_by });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(ch);
      if (apprCh) supabase.removeChannel(apprCh);
    };
  }, [targetId, screenTable, idColumn, isAdmin, load]);

  const api = useMemo(() => ({
    canView:    (key: string) => !!screens[key]?.can_view,
    canEdit:    (key: string) => !!screens[key]?.can_edit,
    canApprove: (key: string) => !!approvals[key]?.can_approve,
  }), [screens, approvals]);

  return { screens, approvals, loading, lastUpdate, reload: load, ...api };
};
