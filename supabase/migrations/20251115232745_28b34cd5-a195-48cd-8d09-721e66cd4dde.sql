-- Create domains table
CREATE TABLE public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'active',
  priority int DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  created_at timestamp with time zone DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  priority int DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date date,
  progress int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_top_priority boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create task_steps table
CREATE TABLE public.task_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_complete boolean DEFAULT false,
  order_index int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create knowledge_items table
CREATE TABLE public.knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'link', 'transcript', 'idea')),
  content text NOT NULL,
  url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create intake_items table
CREATE TABLE public.intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  parsed_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (single-user app, allow all)
CREATE POLICY "Allow all access to domains" ON public.domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to task_steps" ON public.task_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to knowledge_items" ON public.knowledge_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to intake_items" ON public.intake_items FOR ALL USING (true) WITH CHECK (true);

-- Insert default domains
INSERT INTO public.domains (name, color, icon) VALUES
  ('SSC', '#3B82F6', '🔵'),
  ('Startups', '#A855F7', '🟣'),
  ('Skills', '#10B981', '🟢'),
  ('Health', '#EF4444', '❤️');