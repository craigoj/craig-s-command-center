ALTER TABLE public.tasks
ADD COLUMN archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at);
