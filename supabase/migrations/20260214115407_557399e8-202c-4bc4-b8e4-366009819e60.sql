
-- Create chatbot_interactions table for self-learning
CREATE TABLE public.chatbot_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  ai_response text NOT NULL,
  feedback_rating integer CHECK (feedback_rating IN (1, -1)),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own interactions
CREATE POLICY "Users can insert own interactions"
ON public.chatbot_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions (for feedback)
CREATE POLICY "Users can update own interactions"
ON public.chatbot_interactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can read all interactions
CREATE POLICY "Admins can read all interactions"
ON public.chatbot_interactions
FOR SELECT
USING (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'super_admin'::app_designation));

-- Users can read their own interactions
CREATE POLICY "Users can read own interactions"
ON public.chatbot_interactions
FOR SELECT
USING (auth.uid() = user_id);

-- Add usage_count to knowledge base
ALTER TABLE public.chatbot_knowledge_base ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
