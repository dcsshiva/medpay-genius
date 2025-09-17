import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionTimeoutConfig {
  staff: 180; // 3 minutes
  doctor: 180; // 3 minutes  
  admin: 300; // 5 minutes
  manager: 300; // 5 minutes
}

interface TimeoutState {
  isWarningShown: boolean;
  isActive: boolean;
  remainingTime: number;
  lastActivity: Date;
}

export const useSessionTimeout = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const [timeoutState, setTimeoutState] = useState<TimeoutState>({
    isWarningShown: false,
    isActive: false,
    remainingTime: 0,
    lastActivity: new Date()
  });

  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const finalTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout>();

  const timeoutConfig: SessionTimeoutConfig = {
    staff: 180,
    doctor: 180,
    admin: 300,
    manager: 300
  };

  const getTimeoutDuration = useCallback(() => {
    if (!userRole) return 180;
    return timeoutConfig[userRole as keyof SessionTimeoutConfig] || 180;
  }, [userRole]);

  const getWarningTime = useCallback(() => {
    const timeout = getTimeoutDuration();
    // For admin/manager: show warning at 240 seconds (60 seconds before timeout)
    // For staff/doctor: show warning at 120 seconds (60 seconds before timeout)
    return timeout === 300 ? 240 : 120;
  }, [getTimeoutDuration]);

  // Update last activity in Supabase
  const updateActivity = useCallback(async () => {
    if (!user) return;

    const sessionToken = window.sessionStorage.getItem('supabase_session_token');
    if (!sessionToken) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          warning_shown_at: null 
        })
        .eq('session_token', sessionToken)
        .eq('is_active', true);

      setTimeoutState(prev => ({
        ...prev,
        lastActivity: new Date(),
        isWarningShown: false
      }));
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, [user]);

  // Check session status from Supabase
  const checkSessionStatus = useCallback(async () => {
    if (!user) return;

    const sessionToken = window.sessionStorage.getItem('supabase_session_token');
    if (!sessionToken) return;

    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .maybeSingle();

      if (!session) {
        await signOut();
        return;
      }

      const lastActivity = new Date(session.last_activity_at);
      const now = new Date();
      const timeDiff = Math.floor((now.getTime() - lastActivity.getTime()) / 1000);
      const timeoutDuration = getTimeoutDuration();
      const warningTime = getWarningTime();

      setTimeoutState(prev => ({
        ...prev,
        remainingTime: Math.max(0, timeoutDuration - timeDiff),
        lastActivity: lastActivity,
        isActive: timeDiff < timeoutDuration
      }));

      // Check if session has expired
      if (timeDiff >= timeoutDuration) {
        await handleSessionTimeout();
        return;
      }

      // Check if warning should be shown
      if (timeDiff >= warningTime && !session.warning_shown_at) {
        await showTimeoutWarning();
      }

      // Auto-clear unsaved data 10 seconds before timeout
      if (timeDiff >= (timeoutDuration - 10) && timeDiff < timeoutDuration) {
        clearUnsavedData();
        toast({
          variant: "destructive",
          title: "Session Timeout Warning",
          description: "Unsaved data has been cleared. Session will expire in 10 seconds.",
          duration: 8000
        });
      }

    } catch (error) {
      console.error('Error checking session status:', error);
    }
  }, [user, getTimeoutDuration, getWarningTime, signOut, toast]);

  // Show timeout warning
  const showTimeoutWarning = useCallback(async () => {
    const sessionToken = window.sessionStorage.getItem('supabase_session_token');
    if (!sessionToken) return;

    setTimeoutState(prev => ({ ...prev, isWarningShown: true }));

    // Update warning timestamp in database
    const { data: currentSession } = await supabase
      .from('user_sessions')
      .select('timeout_warnings_count')
      .eq('session_token', sessionToken)
      .single();

    await supabase
      .from('user_sessions')
      .update({ 
        warning_shown_at: new Date().toISOString(),
        timeout_warnings_count: (currentSession?.timeout_warnings_count || 0) + 1
      })
      .eq('session_token', sessionToken);

    toast({
      title: "Session Timeout Warning",
      description: `Your session will expire in ${Math.floor((getTimeoutDuration() - getWarningTime()) / 60)} minute(s). Click to extend your session.`,
      duration: 0, // Don't auto-dismiss
      action: (
        <button
          onClick={handleExtendSession}
          className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
        >
          Extend Session
        </button>
      )
    });
  }, [getTimeoutDuration, getWarningTime]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async () => {
    clearUnsavedData();
    
    toast({
      variant: "destructive",
      title: "Session Expired",
      description: "Your session has expired. You will be redirected to login.",
      duration: 5000
    });

    setTimeout(async () => {
      await signOut();
      window.location.href = '/auth';
    }, 2000);
  }, [signOut, toast]);

  // Extend session
  const handleExtendSession = useCallback(async () => {
    await updateActivity();
    setTimeoutState(prev => ({ ...prev, isWarningShown: false }));
    
    toast({
      title: "Session Extended",
      description: "Your session has been extended successfully.",
      duration: 3000
    });
  }, [updateActivity, toast]);

  // Clear unsaved data (placeholder - implement based on your app's needs)
  const clearUnsavedData = useCallback(() => {
    // Clear any form data stored in component state
    // This is a placeholder - you should implement based on your specific unsaved data storage
    
    // Example: Clear any draft data from localStorage if used
    const draftKeys = Object.keys(window.localStorage).filter(key => key.startsWith('draft_'));
    draftKeys.forEach(key => window.localStorage.removeItem(key));

    // Clear any temporary form data from sessionStorage
    const tempKeys = Object.keys(window.sessionStorage).filter(key => key.startsWith('temp_form_'));
    tempKeys.forEach(key => window.sessionStorage.removeItem(key));

    // Dispatch custom event for components to clear their unsaved state
    window.dispatchEvent(new CustomEvent('clearUnsavedData'));
  }, []);

  // Activity event handlers
  const resetTimeout = useCallback(() => {
    if (!user) return;
    
    updateActivity();
    
    // Clear existing timeouts
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (finalTimeoutRef.current) clearTimeout(finalTimeoutRef.current);
  }, [user, updateActivity]);

  // Setup activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Start session checking interval
    sessionCheckIntervalRef.current = setInterval(checkSessionStatus, 5000); // Check every 5 seconds

    // Initial activity update
    updateActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
      
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (finalTimeoutRef.current) clearTimeout(finalTimeoutRef.current);
      if (sessionCheckIntervalRef.current) clearInterval(sessionCheckIntervalRef.current);
    };
  }, [user, resetTimeout, checkSessionStatus, updateActivity]);

  return {
    timeoutState,
    extendSession: handleExtendSession,
    clearUnsavedData,
    remainingTime: timeoutState.remainingTime
  };
};