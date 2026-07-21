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
import { Eye, Edit, Shield, Save, Radio } from 'lucide-react';
import { useScreenRegistry } from '@/hooks/usePermissionRegistry';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
}

interface AdminAccessConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: AdminUser;
}

export const AdminAccessConfigDialog = ({ isOpen, onClose, adminUser }: AdminAccessConfigDialogProps) => {
  const { user, userDesignation } = useAuth();
  const { data: screensReg, loading: loadingScreens } = useScreenRegistry();
  const {
    screens: currentScreens,
    lastUpdate,
    loading: loadingPerms,
  } = useStaffPermissions(isOpen ? adminUser.user_id : null, { isAdmin: true });

  const [pending, setPending] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [notes, setNotes] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) { setPending({}); setNotes(''); }
  }, [isOpen, adminUser.user_id]);

  const effective = (key: string) => {
    if (pending[key]) return pending[key];
    const cur = currentScreens[key];
    return { can_view: !!cur?.can_view, can_edit: !!cur?.can_edit };
  };

  const grouped = useMemo(() => {
    const acc: Record<string, typeof screensReg> = {};
    screensReg.forEach((s) => { (acc[s.group_name] ||= []).push(s); });
    return acc;
  }, [screensReg]);

  const disabledScreen = (superAdminOnly: boolean) =>
    superAdminOnly && userDesignation !== 'super_admin';

  const handleChange = async (key: string, field: 'can_view' | 'can_edit', value: boolean) => {
    const cur = effective(key);
    const next = { ...cur, [field]: value };
    if (field === 'can_view' && !value) next.can_edit = false;
    if (field === 'can_edit' && value) next.can_view = true;
    setPending((p) => ({ ...p, [key]: next }));
    if (!user) return;
    setSavingKey(key);
    const { error } = await (supabase.rpc as any)('upsert_admin_screen_permission', {
      _admin_user_id: adminUser.user_id,
      _screen_key: key,
      _can_view: next.can_view,
      _can_edit: next.can_edit,
      _notes: notes || null,
      _actor_id: user.id,
    });
    setSavingKey(null);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      setPending((p) => { const n = { ...p }; delete n[key]; return n; });
    } else {
      setPending((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const handleDone = () => {
    setSaving(true);
    toast.success('Admin permissions updated successfully!');
    setSaving(false);
    onClose();
  };

  const loading = loadingScreens || loadingPerms;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configure Admin Access
          </DialogTitle>
          <DialogDescription>
            Configure screen access permissions for {adminUser.full_name} ({adminUser.email})
            <Badge variant="outline" className="ml-2">Admin</Badge>
            {lastUpdate && (
              <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                Live: last change on <code>{lastUpdate.key}</code>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading permissions…</div>
        ) : (
          <Tabs defaultValue="screens" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="screens" className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> Screen Access
              </TabsTrigger>
            </TabsList>
            <TabsContent value="screens" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {Object.entries(grouped).map(([category, screens]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                    <div className="space-y-3 ml-2">
                      {screens.map((screen) => {
                        const disabled = disabledScreen(screen.super_admin_only);
                        const eff = effective(screen.screen_key);
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
                                  onCheckedChange={(c) => handleChange(screen.screen_key, 'can_view', !!c)} />
                                <Label htmlFor={`${screen.screen_key}-view`} className="flex items-center gap-1 cursor-pointer">
                                  <Eye className="h-3 w-3" /> View
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id={`${screen.screen_key}-edit`} checked={eff.can_edit}
                                  disabled={disabled || !eff.can_view}
                                  onCheckedChange={(c) => handleChange(screen.screen_key, 'can_edit', !!c)} />
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
          </Tabs>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea id="notes" placeholder="Add any notes about these access changes…"
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleDone} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
