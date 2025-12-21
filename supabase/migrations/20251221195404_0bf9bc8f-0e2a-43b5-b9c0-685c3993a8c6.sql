-- ============================================
-- YEARLY PLANNING SYSTEM - DATABASE SCHEMA
-- ============================================

-- 1. YEARLY_PLANS (Master Table)
-- ============================================
CREATE TABLE public.yearly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('Finish What I Start', 'Evidence Over Emotion', 'Action Creates Clarity')),
  theme_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

CREATE INDEX idx_yearly_plans_user_id ON public.yearly_plans(user_id);
CREATE INDEX idx_yearly_plans_year ON public.yearly_plans(year);

ALTER TABLE public.yearly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own yearly plans" ON public.yearly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own yearly plans" ON public.yearly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own yearly plans" ON public.yearly_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own yearly plans" ON public.yearly_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_yearly_plans_updated_at BEFORE UPDATE ON public.yearly_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. LIFE_RESUME (Identity Layer)
-- ============================================
CREATE TABLE public.life_resume (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yearly_plan_id UUID NOT NULL REFERENCES public.yearly_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('physical', 'mental_emotional', 'creative_impact')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, yearly_plan_id, category)
);

CREATE INDEX idx_life_resume_user_id ON public.life_resume(user_id);
CREATE INDEX idx_life_resume_yearly_plan_id ON public.life_resume(yearly_plan_id);

ALTER TABLE public.life_resume ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own life resume" ON public.life_resume FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own life resume" ON public.life_resume FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own life resume" ON public.life_resume FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own life resume" ON public.life_resume FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_life_resume_updated_at BEFORE UPDATE ON public.life_resume FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. MISOGI (Anchor Layer - One Big Challenge)
-- ============================================
CREATE TABLE public.misogi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yearly_plan_id UUID NOT NULL REFERENCES public.yearly_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('physical', 'mental_emotional', 'creative')),
  start_date DATE,
  end_date DATE,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  daily_action_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, yearly_plan_id)
);

CREATE INDEX idx_misogi_user_id ON public.misogi(user_id);
CREATE INDEX idx_misogi_yearly_plan_id ON public.misogi(yearly_plan_id);
CREATE INDEX idx_misogi_status ON public.misogi(status);

ALTER TABLE public.misogi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own misogi" ON public.misogi FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own misogi" ON public.misogi FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own misogi" ON public.misogi FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own misogi" ON public.misogi FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_misogi_updated_at BEFORE UPDATE ON public.misogi FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. PLANNING_CONSTRAINTS (Rules/Limits)
-- ============================================
CREATE TABLE public.planning_constraints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yearly_plan_id UUID NOT NULL REFERENCES public.yearly_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('projects', 'shipping', 'habit', 'ritual')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_planning_constraints_user_id ON public.planning_constraints(user_id);
CREATE INDEX idx_planning_constraints_yearly_plan_id ON public.planning_constraints(yearly_plan_id);
CREATE INDEX idx_planning_constraints_active ON public.planning_constraints(active);

ALTER TABLE public.planning_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own constraints" ON public.planning_constraints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own constraints" ON public.planning_constraints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own constraints" ON public.planning_constraints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own constraints" ON public.planning_constraints FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_planning_constraints_updated_at BEFORE UPDATE ON public.planning_constraints FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. DAILY_SCORES (Execution Layer)
-- ============================================
CREATE TABLE public.daily_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_score DATE NOT NULL,
  hard_thing TEXT,
  discomfort_faced TEXT,
  small_win TEXT,
  life_resume_worthy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_score)
);

CREATE INDEX idx_daily_scores_user_id ON public.daily_scores(user_id);
CREATE INDEX idx_daily_scores_date ON public.daily_scores(date_score);
CREATE INDEX idx_daily_scores_user_date ON public.daily_scores(user_id, date_score);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily scores" ON public.daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily scores" ON public.daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily scores" ON public.daily_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily scores" ON public.daily_scores FOR DELETE USING (auth.uid() = user_id);

-- 6. YEARLY_WEEKLY_REFLECTIONS (Accountability Layer)
-- ============================================
CREATE TABLE public.yearly_weekly_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yearly_plan_id UUID REFERENCES public.yearly_plans(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  comfort_choices TEXT,
  action_choices TEXT,
  earned_respect TEXT,
  proud_of_week BOOLEAN NOT NULL DEFAULT false,
  theme_alignment_score INTEGER CHECK (theme_alignment_score >= 0 AND theme_alignment_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX idx_yearly_weekly_reflections_user_id ON public.yearly_weekly_reflections(user_id);
CREATE INDEX idx_yearly_weekly_reflections_week ON public.yearly_weekly_reflections(week_start_date);
CREATE INDEX idx_yearly_weekly_reflections_yearly_plan ON public.yearly_weekly_reflections(yearly_plan_id);

ALTER TABLE public.yearly_weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly reflections" ON public.yearly_weekly_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weekly reflections" ON public.yearly_weekly_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weekly reflections" ON public.yearly_weekly_reflections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weekly reflections" ON public.yearly_weekly_reflections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_yearly_weekly_reflections_updated_at BEFORE UPDATE ON public.yearly_weekly_reflections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. CALENDAR_EVENTS (Time Intelligence Layer)
-- ============================================
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  color_category TEXT NOT NULL CHECK (color_category IN ('growth', 'maintenance', 'escape')),
  quality_rating INTEGER CHECK (quality_rating >= 0 AND quality_rating <= 10),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX idx_calendar_events_color_category ON public.calendar_events(color_category);
CREATE INDEX idx_calendar_events_user_date ON public.calendar_events(user_id, start_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();