import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, Edit, Shield, MonitorPlay, Save, Radio } from 'lucide-react';
import { useScreenRegistry, useApprovalRegistry } from '@/hooks/usePermissionRegistry';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { hasFullAccess } from '@/lib/accessLevels';

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string;
}

interface AccessConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember;
}

export const AccessConfigDialog = ({ isOpen, onClose, staffMember }: AccessConfigDialogProps) => {
  const { user, userDesignation } = useAuth();
  const { data: screensReg, loading: loadingScreens } = useScreenRegistry();
  const { data: approvalsReg, loading: loadingApprovals } = useApprovalRegistry();
  const {
    screens: currentScreens,
    approvals: currentApprovals,
    lastUpdate,
    loading: loadingPerms,
  } = useStaffPermissions(isOpen ? staffMember.id : null);

  const [pendingScreens, setPendingScreens] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset pending edits when dialog closes/opens for a different staff.
  useEffect(() => {
    if (!isOpen) {
      setPendingScreens({});
      setPendingApprovals({});
      setNotes('');
    }
  }, [isOpen, staffMember.id]);

  const effectiveScreen = (key: string) => {
    if (pendingScreens[key]) return pendingScreens[key];
    const cur = currentScreens[key];
    return { can_view: !!cur?.can_view, can_edit: !!cur?.can_edit };
  };
  const effectiveApproval = (key: string) => {
    if (key in pendingApprovals) return pendingApprovals[key];
    return !!currentApprovals[key]?.can_approve;
  };

  const groupedScreens = useMemo(() => {
    const acc: Record<string, typeof screensReg> = {};
    screensReg.forEach((s) => {
      (acc[s.group_name] ||= []).push(s);
    });
    return acc;
  }, [screensReg]);

  const groupedApprovals = useMemo(() => {
    const acc: Record<string, typeof approvalsReg> = {};
    approvalsReg.forEach((a) => {
      (acc[a.group_name] ||= []).push(a);
    });
    return acc;
  }, [approvalsReg]);

  const handleScreenChange = async (key: string, field: 'can_view' | 'can_edit', value: boolean) => {
    const cur = effectiveScreen(key);
    const next = { ...cur, [field]: value };
    // Cascade: uncheck view → uncheck edit; check edit → check view.
    if (field === 'can_view' && !value) next.can_edit = false;
    if (field === 'can_edit' && value) next.can_view = true;

    setPendingScreens((p) => ({ ...p, [key]: next }));
    if (!user) return;
    setSavingKey(key);
    let { error } = await (supabase.rpc as any)('upsert_staff_screen_permission', {
      _staff_id: staffMember.id,
      _screen_key: key,
      _can_view: next.can_view,
      _can_edit: next.can_edit,
      _notes: notes || null,
      _actor_id: user.id,
    });
    // Fallback when the RPC isn't deployed yet (PGRST202 / 404)
    if (error && (error.code === 'PGRST202' || /function .* does not exist|schema cache/i.test(error.message || ''))) {
      const res = await (supabase as any)
        .from('staff_screen_permissions')
        .upsert(
          {
            staff_id: staffMember.id,
            screen_key: key,
            can_view: next.can_view,
            can_edit: next.can_edit,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'staff_id,screen_key' }
        );
      error = res.error;
    }
    setSavingKey(null);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      setPendingScreens((p) => { const n = { ...p }; delete n[key]; return n; });
    } else {
      // Realtime will refresh; clear pending after a tick.
      setPendingScreens((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const handleApprovalChange = async (key: string, value: boolean) => {
    setPendingApprovals((p) => ({ ...p, [key]: value }));
    if (!user) return;
    setSavingKey(key);
    let { error } = await (supabase.rpc as any)('upsert_staff_approval_permission', {
      _staff_id: staffMember.id,
      _permission_key: key,
      _can_approve: value,
      _notes: notes || null,
      _actor_id: user.id,
    });
    if (error && (error.code === 'PGRST202' || /function .* does not exist|schema cache/i.test(error.message || ''))) {
      const res = await (supabase as any)
        .from('staff_approval_permissions')
        .upsert(
          {
            staff_id: staffMember.id,
            permission_key: key,
            can_approve: value,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'staff_id,permission_key' }
        );
      error = res.error;
    }
    setSavingKey(null);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      setPendingApprovals((p) => { const n = { ...p }; delete n[key]; return n; });
    } else {
      setPendingApprovals((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };


  const handleSaveAll = async () => {
    setSaving(true);
    // Individual toggles auto-save; button just closes with confirmation.
    toast.success(`Access permissions saved for ${staffMember.full_name}`);
    setSaving(false);
    onClose();
  };

  const loading = loadingScreens || loadingApprovals || loadingPerms;
  // super_admin / admin have unrestricted access by design — nothing to configure.
  const targetFullAccess = hasFullAccess(staffMember.role);
  const disabledScreen = (superAdminOnly: boolean) =>
    targetFullAccess || (superAdminOnly && userDesignation !== 'super_admin');
  const disabledApproval = (level: string) =>
    targetFullAccess || (level === 'admin' && userDesignation !== 'super_admin' && userDesignation !== 'admin');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configure Access for {staffMember.full_name}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge>{staffMember.staff_code}</Badge>
              <Badge variant="outline">{staffMember.role}</Badge>
              {staffMember.department && <Badge variant="secondary">{staffMember.department}</Badge>}
              {lastUpdate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                  <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                  Live: last change on <code>{lastUpdate.key}</code>
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading permissions…</div>
        ) : (
          <Tabs defaultValue="screens" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="screens" className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4" /> Screen Access
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Approval Permissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screens" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {Object.entries(groupedScreens).map(([category, screens]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                    <div className="space-y-3 ml-2">
                      {screens.map((screen) => {
                        const disabled = disabledScreen(screen.super_admin_only);
                        const eff = effectiveScreen(screen.screen_key);
                        const isSaving = savingKey === screen.screen_key;
                        return (
                          <div key={screen.screen_key}
                            className={`flex items-center justify-between p-3 rounded-lg border ${disabled ? 'opacity-50 bg-muted/50' : 'bg-card'}`}>
                            <Label className="font-medium flex-1 flex items-center gap-2">
                              {screen.screen_name}
                              {isSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
                            </Label>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox id={`${screen.screen_key}-view`} checked={eff.can_view} disabled={disabled}
                                  onCheckedChange={(c) => handleScreenChange(screen.screen_key, 'can_view', !!c)} />
                                <Label htmlFor={`${screen.screen_key}-view`} className="flex items-center gap-1 cursor-pointer">
                                  <Eye className="h-3 w-3" /> View
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id={`${screen.screen_key}-edit`} checked={eff.can_edit}
                                  disabled={disabled || !eff.can_view}
                                  onCheckedChange={(c) => handleScreenChange(screen.screen_key, 'can_edit', !!c)} />
                                <Label htmlFor={`${screen.screen_key}-edit`} className="flex items-center gap-1 cursor-pointer">
                                  <Edit className="h-3 w-3" /> Edit
                                </Label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {Object.entries(groupedApprovals).map(([category, approvals]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                    <div className="space-y-3 ml-2">
                      {approvals.map((approval) => {
                        const disabled = disabledApproval(approval.applicable_role);
                        const eff = effectiveApproval(approval.permission_key);
                        const isSaving = savingKey === approval.permission_key;
                        return (
                          <div key={approval.permission_key}
                            className={`flex items-center justify-between p-4 rounded-lg border ${disabled ? 'opacity-50 bg-muted/50' : 'bg-card'}`}>
                            <div className="flex-1">
                              <Label className="font-medium">{approval.permission_name}</Label>
                              <Badge variant="outline" className="ml-2 text-xs">{approval.applicable_role}</Badge>
                              {isSaving && <span className="ml-2 text-xs text-muted-foreground">Saving…</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id={`approval-${approval.permission_key}`} checked={eff} disabled={disabled}
                                onCheckedChange={(c) => handleApprovalChange(approval.permission_key, !!c)} />
                              <Label htmlFor={`approval-${approval.permission_key}`} className="cursor-pointer">
                                Can Approve
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea id="notes" placeholder="Add any notes about these permission changes…"
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveAll} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
