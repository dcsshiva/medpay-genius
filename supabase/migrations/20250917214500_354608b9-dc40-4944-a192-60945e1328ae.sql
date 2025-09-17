-- Add session timeout fields to user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN last_activity_at timestamp with time zone DEFAULT now(),
ADD COLUMN idle_timeout_seconds integer DEFAULT 180, -- default for staff/doctors
ADD COLUMN warning_shown_at timestamp with time zone,
ADD COLUMN timeout_warnings_count integer DEFAULT 0;