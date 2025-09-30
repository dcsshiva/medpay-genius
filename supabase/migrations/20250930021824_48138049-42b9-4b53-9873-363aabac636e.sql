-- Create version_history table for tracking application versions (simplified)
CREATE TABLE public.version_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    version TEXT NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    git_commit TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    environment TEXT NOT NULL DEFAULT 'production',
    changelog TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.version_history ENABLE ROW LEVEL SECURITY;

-- Create simple policies for version_history access (allow authenticated users to read)
CREATE POLICY "Authenticated users can view version history" 
ON public.version_history 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert version history" 
ON public.version_history 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update version history" 
ON public.version_history 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_version_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_version_history_updated_at
BEFORE UPDATE ON public.version_history
FOR EACH ROW
EXECUTE FUNCTION public.update_version_history_updated_at();

-- Create index for better performance
CREATE INDEX idx_version_history_active ON public.version_history(is_active);
CREATE INDEX idx_version_history_release_date ON public.version_history(release_date DESC);