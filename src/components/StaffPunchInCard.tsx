import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PunchInCardProps {
  staffId: string;
}

const StaffPunchInCard: React.FC<PunchInCardProps> = ({ staffId }) => {
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchToday = async () => {
    const { data } = await supabase
      .from('staff_daily_activities')
      .select('id, shift_start_time, shift_end_time, attendance_status')
      .eq('staff_id', staffId)
      .eq('activity_date', today)
      .maybeSingle();
    setTodayRecord(data);
    setLoading(false);
  };

  useEffect(() => { fetchToday(); }, [staffId]);

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      const now = format(new Date(), 'HH:mm:ss');
      const { error } = await supabase.from('staff_daily_activities').upsert({
        staff_id: staffId,
        activity_date: today,
        shift_start_time: now,
        attendance_status: 'present' as any,
      }, { onConflict: 'staff_id,activity_date' });
      if (error) throw error;
      toast.success('Punched in successfully!');
      fetchToday();
    } catch (err: any) {
      toast.error(err.message || 'Failed to punch in');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!todayRecord?.id) return;
    setPunching(true);
    try {
      const now = format(new Date(), 'HH:mm:ss');
      const { error } = await supabase.from('staff_daily_activities')
        .update({ shift_end_time: now })
        .eq('id', todayRecord.id);
      if (error) throw error;
      toast.success('Punched out successfully!');
      fetchToday();
    } catch (err: any) {
      toast.error(err.message || 'Failed to punch out');
    } finally {
      setPunching(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const isPunchedIn = !!todayRecord?.shift_start_time;
  const isPunchedOut = !!todayRecord?.shift_end_time;

  return (
    <Card className={isPunchedIn && !isPunchedOut ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Today's Attendance</span>
          </div>
          {isPunchedIn && (
            <Badge variant={isPunchedOut ? 'secondary' : 'default'}>
              {isPunchedOut ? 'Shift Complete' : 'On Duty'}
            </Badge>
          )}
        </div>

        {isPunchedIn ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Punch In</span>
              <span className="font-medium">{todayRecord.shift_start_time?.slice(0, 5)}</span>
            </div>
            {isPunchedOut ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Punch Out</span>
                <span className="font-medium">{todayRecord.shift_end_time?.slice(0, 5)}</span>
              </div>
            ) : (
              <Button onClick={handlePunchOut} disabled={punching} className="w-full h-12" variant="destructive">
                <LogOut className="h-5 w-5 mr-2" /> {punching ? 'Processing...' : 'Punch Out'}
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={handlePunchIn} disabled={punching} className="w-full h-12">
            <LogIn className="h-5 w-5 mr-2" /> {punching ? 'Processing...' : 'Punch In'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffPunchInCard;
