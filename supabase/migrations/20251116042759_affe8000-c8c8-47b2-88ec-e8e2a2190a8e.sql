-- Add unique constraints for upsert operations on weekly_resets
ALTER TABLE public.weekly_resets
DROP CONSTRAINT IF EXISTS weekly_resets_user_week_unique;

ALTER TABLE public.weekly_resets
ADD CONSTRAINT weekly_resets_user_week_unique UNIQUE (user_id, week_start_date);

-- Add unique constraints for upsert operations on harada_pillars
ALTER TABLE public.harada_pillars
DROP CONSTRAINT IF EXISTS harada_pillars_user_week_pillar_unique;

ALTER TABLE public.harada_pillars
ADD CONSTRAINT harada_pillars_user_week_pillar_unique UNIQUE (user_id, week_start_date, pillar_name);
