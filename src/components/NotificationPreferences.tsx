import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bell, Loader2 } from 'lucide-react';

interface Preferences {
  payment_status: boolean;
  attendance: boolean;
  leave_status: boolean;
  task_deadline: boolean;
  complaint_update: boolean;
}

const DEFAULT_PREFS: Preferences = {
  payment_status: true,
  attendance: true,
  leave_status: true,
  task_deadline: true,
  complaint_update: true,
};

const PREF_LABELS: Record<keyof Preferences, { label: string; description: string }> = {
  payment_status: { label: 'Payment Updates', description: 'Approved, rejected, or released payments' },
  attendance: { label: 'Attendance Alerts', description: 'Absent or late attendance notifications' },
  leave_status: { label: 'Leave & Permission', description: 'Approval or rejection of leave/permission' },
  task_deadline: { label: 'Task Reminders', description: 'Upcoming task deadlines' },
  complaint_update: { label: 'Complaint Updates', description: 'Status changes on complaints' },
};

const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();
      if (data?.notification_preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences as Partial<Preferences>) });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: updated as any })
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to save preference');
      setPrefs(prefs); // revert
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(PREF_LABELS) as (keyof Preferences)[]).map(key => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{PREF_LABELS[key].label}</Label>
              <p className="text-xs text-muted-foreground">{PREF_LABELS[key].description}</p>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={v => updatePref(key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
