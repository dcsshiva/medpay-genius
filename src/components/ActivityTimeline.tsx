import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTimeIST } from '@/lib/dateUtils';
import { Clock, ArrowRight, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AuditLogEntry {
  id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  changes: { field: string; from?: string; to?: string }[];
  actorName: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  tableName: string;
  recordId: string;
}

const TRACKED_FIELDS: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  assigned_to: 'Assigned To',
  notes: 'Notes',
  action_notes: 'Action Notes',
  admin_response: 'Admin Response',
  taken_care_by: 'Taken Care By',
  completed_at: 'Completed At',
  actual_completed_at: 'Verified At',
};

const formatFieldValue = (value: any): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try { return formatDateTimeIST(value); } catch { return value; }
  }
  return String(value).replace(/_/g, ' ');
};

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ tableName, recordId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});

  const resolveActorName = useCallback(async (userId: string | null): Promise<string> => {
    if (!userId) return 'System';
    if (profileCache[userId]) return profileCache[userId];

    // Try profiles first
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.full_name) {
      setProfileCache(prev => ({ ...prev, [userId]: profile.full_name }));
      return profile.full_name;
    }

    // Try staff table
    const { data: staff } = await supabase
      .from('staff')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    const name = staff?.full_name || 'Unknown User';
    setProfileCache(prev => ({ ...prev, [userId]: name }));
    return name;
  }, [profileCache]);

  const fetchLogs = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, old_values, new_values, changed_by, changed_at')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const logs = (data || []) as AuditLogEntry[];

      const timelineEvents: TimelineEvent[] = await Promise.all(
        logs.map(async (log) => {
          const changes: { field: string; from?: string; to?: string }[] = [];
          const oldVals = log.old_values || {};
          const newVals = log.new_values || {};

          if (log.action === 'INSERT') {
            changes.push({ field: 'Created', to: 'Record created' });
          } else if (log.action === 'UPDATE') {
            for (const key of Object.keys(TRACKED_FIELDS)) {
              if (key in newVals && String(oldVals[key] ?? '') !== String(newVals[key] ?? '')) {
                changes.push({
                  field: TRACKED_FIELDS[key],
                  from: formatFieldValue(oldVals[key]),
                  to: formatFieldValue(newVals[key]),
                });
              }
            }
            if (changes.length === 0) {
              changes.push({ field: 'Updated', to: 'Record updated' });
            }
          } else if (log.action === 'DELETE') {
            changes.push({ field: 'Deleted', to: 'Record deleted' });
          }

          const actorName = await resolveActorName(log.changed_by);

          return {
            id: log.id,
            action: log.action,
            changes,
            actorName,
            timestamp: log.changed_at,
          };
        })
      );

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [open, tableName, recordId, resolveActorName]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs gap-1 h-7 px-2">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Activity Log
          </span>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 border-l-2 border-border ml-3 pl-3 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-primary" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="relative">
              <div className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">{event.actorName}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {event.action}
                  </Badge>
                </div>
                {event.changes.map((change, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                    <span className="font-medium text-foreground">{change.field}:</span>
                    {change.from && (
                      <>
                        <span className="line-through opacity-60">{change.from}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </>
                    )}
                    <span>{change.to}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDateTimeIST(event.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ActivityTimeline;
