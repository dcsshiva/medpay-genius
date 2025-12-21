-- Create navigation analytics table
CREATE TABLE public.navigation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  navigation_id TEXT NOT NULL,
  navigation_name TEXT NOT NULL,
  user_role TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_navigation_analytics_clicked_at ON public.navigation_analytics(clicked_at DESC);
CREATE INDEX idx_navigation_analytics_navigation_id ON public.navigation_analytics(navigation_id);
CREATE INDEX idx_navigation_analytics_user_id ON public.navigation_analytics(user_id);

-- Enable RLS
ALTER TABLE public.navigation_analytics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own analytics
CREATE POLICY "Users can insert their own navigation analytics"
ON public.navigation_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all analytics (using correct enum values)
CREATE POLICY "Admins can view all navigation analytics"
ON public.navigation_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_designations
    WHERE user_id = auth.uid()
    AND designation IN ('admin', 'super_admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);