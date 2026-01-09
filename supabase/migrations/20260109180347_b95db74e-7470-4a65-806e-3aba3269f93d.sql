-- Create contacts table for second brain CRM
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  context TEXT,
  follow_up TEXT,
  last_touched DATE DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learning_insights table for knowledge capture
CREATE TABLE public.learning_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  key_insight TEXT NOT NULL,
  application TEXT,
  source TEXT,
  related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  related_domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create capture_log table for intake tracking
CREATE TABLE public.capture_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  classified_as TEXT NOT NULL,
  destination_table TEXT,
  destination_id UUID,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  corrected BOOLEAN NOT NULL DEFAULT false,
  correction_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts
CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for learning_insights
CREATE POLICY "Users can view their own learning insights" ON public.learning_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own learning insights" ON public.learning_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own learning insights" ON public.learning_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own learning insights" ON public.learning_insights FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for capture_log
CREATE POLICY "Users can view their own capture logs" ON public.capture_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own capture logs" ON public.capture_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own capture logs" ON public.capture_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own capture logs" ON public.capture_log FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_last_touched ON public.contacts(user_id, last_touched DESC);
CREATE INDEX idx_learning_insights_user_id ON public.learning_insights(user_id);
CREATE INDEX idx_learning_insights_category ON public.learning_insights(user_id, category);
CREATE INDEX idx_capture_log_user_id ON public.capture_log(user_id);
CREATE INDEX idx_capture_log_needs_review ON public.capture_log(user_id, needs_review) WHERE needs_review = true;

-- Add updated_at triggers using existing function
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_learning_insights_updated_at
  BEFORE UPDATE ON public.learning_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();