-- Add archived_at column to tasks table
ALTER TABLE public.tasks ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;