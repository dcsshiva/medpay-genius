
-- Chatbot knowledge base for self-learning
CREATE TABLE public.chatbot_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active entries
CREATE POLICY "Authenticated users can read active knowledge base"
ON public.chatbot_knowledge_base FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can manage knowledge base
CREATE POLICY "Admins can insert knowledge base"
ON public.chatbot_knowledge_base FOR INSERT
TO authenticated
WITH CHECK (
  public.has_designation(auth.uid(), 'admin'::app_designation)
  OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
);

CREATE POLICY "Admins can update knowledge base"
ON public.chatbot_knowledge_base FOR UPDATE
TO authenticated
USING (
  public.has_designation(auth.uid(), 'admin'::app_designation)
  OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
);

CREATE POLICY "Admins can delete knowledge base"
ON public.chatbot_knowledge_base FOR DELETE
TO authenticated
USING (
  public.has_designation(auth.uid(), 'admin'::app_designation)
  OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
);

-- Chatbot conversations for history
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
ON public.chatbot_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
ON public.chatbot_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.chatbot_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON public.chatbot_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_chatbot_knowledge_base_updated_at
BEFORE UPDATE ON public.chatbot_knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_conversations_updated_at
BEFORE UPDATE ON public.chatbot_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
