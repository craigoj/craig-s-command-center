-- Add user_id columns to all main tables
ALTER TABLE public.domains ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.intake_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update RLS policies for domains
DROP POLICY IF EXISTS "Allow all access to domains" ON public.domains;
CREATE POLICY "Users can view their own domains"
  ON public.domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains"
  ON public.domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
  ON public.domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
  ON public.domains FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for projects
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for knowledge_items
DROP POLICY IF EXISTS "Allow all access to knowledge_items" ON public.knowledge_items;
CREATE POLICY "Users can view their own knowledge items"
  ON public.knowledge_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge items"
  ON public.knowledge_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge items"
  ON public.knowledge_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge items"
  ON public.knowledge_items FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for intake_items
DROP POLICY IF EXISTS "Allow all access to intake_items" ON public.intake_items;
CREATE POLICY "Users can view their own intake items"
  ON public.intake_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intake items"
  ON public.intake_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intake items"
  ON public.intake_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intake items"
  ON public.intake_items FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for task_steps (inherits from task)
DROP POLICY IF EXISTS "Allow all access to task_steps" ON public.task_steps;
CREATE POLICY "Users can view steps for their own tasks"
  ON public.task_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_steps.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert steps for their own tasks"
  ON public.task_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_steps.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps for their own tasks"
  ON public.task_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_steps.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps for their own tasks"
  ON public.task_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_steps.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- Update RLS policies for task_knowledge_links (inherits from task)
DROP POLICY IF EXISTS "Allow all access to task_knowledge_links" ON public.task_knowledge_links;
CREATE POLICY "Users can view links for their own tasks"
  ON public.task_knowledge_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_knowledge_links.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert links for their own tasks"
  ON public.task_knowledge_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_knowledge_links.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete links for their own tasks"
  ON public.task_knowledge_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_knowledge_links.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();