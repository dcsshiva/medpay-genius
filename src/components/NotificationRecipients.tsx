import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recipient {
  id: string;
  email: string;
  label: string | null;
  is_active: boolean;
  digest_enabled: boolean;
}

const NotificationRecipients = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('email_notification_recipients')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Could not load notification recipients');
    } else {
      setRecipients((data || []) as Recipient[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addRecipient = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email address');
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from('email_notification_recipients')
      .insert({ email: trimmed, label: label.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'This email is already on the list' : 'Could not add recipient');
      return;
    }
    setEmail('');
    setLabel('');
    toast.success('Recipient added');
    load();
  };

  const toggleField = async (r: Recipient, field: 'is_active' | 'digest_enabled', value: boolean) => {
    setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, [field]: value } : x)));
    const { error } = await (supabase as any)
      .from('email_notification_recipients')
      .update({ [field]: value })
      .eq('id', r.id);
    if (error) {
      toast.error('Could not update recipient');
      load();
    }
  };

  const removeRecipient = async (r: Recipient) => {
    const { error } = await (supabase as any)
      .from('email_notification_recipients')
      .delete()
      .eq('id', r.id);
    if (error) {
      toast.error('Could not remove recipient');
      return;
    }
    toast.success('Recipient removed');
    load();
  };

  const sendTest = async () => {
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke('daily-ops-digest', {
      body: { hours: 24 },
    });
    setSendingTest(false);
    if (error) {
      toast.error('Could not send the digest');
      return;
    }
    const sent = (data as any)?.sent ?? 0;
    if ((data as any)?.reason === 'no_activity') {
      toast.info('No activity in the last 24 hours — nothing was sent');
    } else {
      toast.success(`Digest sent to ${sent} recipient${sent === 1 ? '' : 's'}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Recipients
          </CardTitle>
          <CardDescription>
            These addresses receive the daily activity summary covering new visits and all payment
            transactions. It is sent every morning at 8:00 AM IST.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="recipient-email">Email address</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipient-label">Name (optional)</Label>
              <Input
                id="recipient-label"
                placeholder="Dr. Arulmani"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <Button onClick={addRecipient} disabled={saving} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Name</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Daily digest</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : recipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No recipients yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium break-all">{r.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {r.label || <Badge variant="outline">—</Badge>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={r.is_active}
                          onCheckedChange={(v) => toggleField(r, 'is_active', v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={r.digest_enabled}
                          onCheckedChange={(v) => toggleField(r, 'digest_enabled', v)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeRecipient(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Send the last 24 hours of activity right now to test the setup.
            </p>
            <Button variant="outline" onClick={sendTest} disabled={sendingTest}>
              <Send className="mr-2 h-4 w-4" />
              {sendingTest ? 'Sending…' : 'Send digest now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationRecipients;
