-- Add unique constraint for upsert operations on midweek_checkins
ALTER TABLE public.midweek_checkins
DROP CONSTRAINT IF EXISTS midweek_checkins_user_date_unique;

ALTER TABLE public.midweek_checkins
ADD CONSTRAINT midweek_checkins_user_date_unique UNIQUE (user_id, checkin_date);
