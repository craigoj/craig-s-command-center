-- Create junction table for task-knowledge relationships
CREATE TABLE public.task_knowledge_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  knowledge_item_id uuid REFERENCES public.knowledge_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(task_id, knowledge_item_id)
);

-- Enable RLS
ALTER TABLE public.task_knowledge_links ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to task_knowledge_links" 
ON public.task_knowledge_links 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_task_knowledge_task_id ON public.task_knowledge_links(task_id);
CREATE INDEX idx_task_knowledge_knowledge_id ON public.task_knowledge_links(knowledge_item_id);