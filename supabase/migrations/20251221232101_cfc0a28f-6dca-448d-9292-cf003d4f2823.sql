-- Create epic_experiences table for Jesse Itzler's "planned adventures/experiences"
CREATE TABLE public.epic_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  yearly_plan_id UUID NOT NULL REFERENCES public.yearly_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'adventure', 'learning', 'relationship', 'challenge'
  planned_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.epic_experiences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own experiences" 
ON public.epic_experiences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own experiences" 
ON public.epic_experiences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiences" 
ON public.epic_experiences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiences" 
ON public.epic_experiences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_epic_experiences_updated_at
BEFORE UPDATE ON public.epic_experiences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();