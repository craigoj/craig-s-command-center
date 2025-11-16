-- Create consistency_logs table for daily tracking
CREATE TABLE public.consistency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  morning_reflection TEXT,
  identity_statement TEXT DEFAULT 'I am a consistent man',
  emotion_label TEXT,
  visualization_done BOOLEAN DEFAULT false,
  phone_free_30min BOOLEAN DEFAULT false,
  non_negotiable_1 TEXT,
  non_negotiable_2 TEXT,
  non_negotiable_3 TEXT,
  non_negotiable_completed BOOLEAN[] DEFAULT ARRAY[false, false, false],
  lesson_learned TEXT,
  mood_evening TEXT,
  tomorrow_adjustment TEXT,
  identity_proof_moment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Create daily_actions table for tracking 8 daytime behaviors
CREATE TABLE public.daily_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  movement_30min BOOLEAN DEFAULT false,
  water_64oz BOOLEAN DEFAULT false,
  declutter_item BOOLEAN DEFAULT false,
  thoughtful_text BOOLEAN DEFAULT false,
  uncomfortable_action BOOLEAN DEFAULT false,
  kept_promise BOOLEAN DEFAULT false,
  reframed_thought BOOLEAN DEFAULT false,
  confident_posture BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Create weekly_resets table for Sunday reflections
CREATE TABLE public.weekly_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  wins TEXT[] DEFAULT ARRAY[]::TEXT[],
  misses TEXT[] DEFAULT ARRAY[]::TEXT[],
  miss_reasons TEXT,
  pillar_needs_attention TEXT,
  week_priorities TEXT[] DEFAULT ARRAY[]::TEXT[],
  environment_reset_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create harada_pillars table for tracking 8 pillar health
CREATE TABLE public.harada_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  pillar_name TEXT NOT NULL CHECK (pillar_name IN (
    'Mental Clarity',
    'Emotional Stability & Self-Acceptance',
    'Execution & Productivity',
    'Physical Foundation',
    'Environment & Structure',
    'Identity & Confidence',
    'Relationships & Support',
    'Character & Integrity'
  )),
  health_score INTEGER CHECK (health_score >= 1 AND health_score <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date, pillar_name)
);

-- Create midweek_checkins table for Wednesday check-ins
CREATE TABLE public.midweek_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  pillar_attention TEXT,
  correction_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.consistency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harada_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midweek_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consistency_logs
CREATE POLICY "Users can view their own consistency logs"
  ON public.consistency_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consistency logs"
  ON public.consistency_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consistency logs"
  ON public.consistency_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consistency logs"
  ON public.consistency_logs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_actions
CREATE POLICY "Users can view their own daily actions"
  ON public.daily_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily actions"
  ON public.daily_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily actions"
  ON public.daily_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily actions"
  ON public.daily_actions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for weekly_resets
CREATE POLICY "Users can view their own weekly resets"
  ON public.weekly_resets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly resets"
  ON public.weekly_resets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly resets"
  ON public.weekly_resets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly resets"
  ON public.weekly_resets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for harada_pillars
CREATE POLICY "Users can view their own harada pillars"
  ON public.harada_pillars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own harada pillars"
  ON public.harada_pillars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own harada pillars"
  ON public.harada_pillars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own harada pillars"
  ON public.harada_pillars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for midweek_checkins
CREATE POLICY "Users can view their own midweek checkins"
  ON public.midweek_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own midweek checkins"
  ON public.midweek_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own midweek checkins"
  ON public.midweek_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own midweek checkins"
  ON public.midweek_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_consistency_logs_updated_at
  BEFORE UPDATE ON public.consistency_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_daily_actions_updated_at
  BEFORE UPDATE ON public.daily_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_weekly_resets_updated_at
  BEFORE UPDATE ON public.weekly_resets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_harada_pillars_updated_at
  BEFORE UPDATE ON public.harada_pillars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_midweek_checkins_updated_at
  BEFORE UPDATE ON public.midweek_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for common queries
CREATE INDEX idx_consistency_logs_user_date ON public.consistency_logs(user_id, log_date DESC);
CREATE INDEX idx_daily_actions_user_date ON public.daily_actions(user_id, log_date DESC);
CREATE INDEX idx_weekly_resets_user_date ON public.weekly_resets(user_id, week_start_date DESC);
CREATE INDEX idx_harada_pillars_user_date ON public.harada_pillars(user_id, week_start_date DESC);
CREATE INDEX idx_midweek_checkins_user_date ON public.midweek_checkins(user_id, checkin_date DESC);