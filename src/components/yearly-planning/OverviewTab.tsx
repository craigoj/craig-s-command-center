import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  CheckCircle2,
  Flame,
  ArrowRight,
  CalendarDays,
  Trophy,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, startOfWeek, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { motion } from '@/components/ui/animations';

interface YearlyPlan {
  id: string;
  year: number;
  theme: string;
}

interface Misogi {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  completion_percentage: number;
  daily_action_required: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface DailyScore {
  id: string;
  date_score: string;
  life_resume_worthy: boolean;
}

interface WeeklyReflection {
  id: string;
  week_start_date: string;
  theme_alignment_score: number | null;
  proud_of_week: boolean;
}

interface CalendarEvent {
  color_category: string;
  duration_minutes: number | null;
}

interface OverviewData {
  dailyScores: DailyScore[];
  weeklyReflection: WeeklyReflection | null;
  calendarEvents: CalendarEvent[];
}

interface OverviewTabProps {
  yearlyPlan: YearlyPlan;
  misogi: Misogi | null;
  onTabChange: (tab: string) => void;
}

const themeData: Record<string, { title: string; emoji: string; filter: string }> = {
  "Finish What I Start": { 
    title: "Finish What I Start", 
    emoji: "🏁",
    filter: "Does this help me complete existing projects?"
  },
  "Evidence Over Emotion": { 
    title: "Evidence Over Emotion", 
    emoji: "📊",
    filter: "Does this create tangible evidence?"
  },
  "Action Creates Clarity": { 
    title: "Action Creates Clarity", 
    emoji: "⚡",
    filter: "Can I act on this now instead of planning?"
  },
};

export default function OverviewTab({ yearlyPlan, misogi, onTabChange }: OverviewTabProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData>({
    dailyScores: [],
    weeklyReflection: null,
    calendarEvents: [],
  });

  const theme = themeData[yearlyPlan.theme] || { 
    title: yearlyPlan.theme, 
    emoji: "🎯",
    filter: "Does this align with my theme?"
  };

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const thirtyDaysAgo = addDays(today, -30);

        const [dailyScoresRes, weeklyReflectionRes, calendarEventsRes] = await Promise.all([
          // Get last 30 days of daily scores for streak calculation
          supabase
            .from('daily_scores')
            .select('id, date_score, life_resume_worthy')
            .eq('user_id', user.id)
            .gte('date_score', format(thirtyDaysAgo, 'yyyy-MM-dd'))
            .order('date_score', { ascending: false }),
          // Get current week's reflection
          supabase
            .from('yearly_weekly_reflections')
            .select('*')
            .eq('user_id', user.id)
            .eq('week_start_date', format(weekStart, 'yyyy-MM-dd'))
            .maybeSingle(),
          // Get this week's calendar events
          supabase
            .from('calendar_events')
            .select('color_category, duration_minutes')
            .eq('user_id', user.id)
            .gte('start_date', format(weekStart, 'yyyy-MM-dd')),
        ]);

        setData({
          dailyScores: dailyScoresRes.data || [],
          weeklyReflection: weeklyReflectionRes.data,
          calendarEvents: calendarEventsRes.data || [],
        });
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  // Calculate streak
  const calculateStreak = () => {
    if (data.dailyScores.length === 0) return 0;
    
    const sortedDates = data.dailyScores
      .map(s => s.date_score)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    for (const dateStr of sortedDates) {
      const scoreDate = new Date(dateStr);
      scoreDate.setHours(0, 0, 0, 0);
      
      const daysDiff = differenceInDays(checkDate, scoreDate);
      
      if (daysDiff === 0 || daysDiff === 1) {
        streak++;
        checkDate = scoreDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calculate life resume worthy days
  const lifeResumeWorthyDays = data.dailyScores.filter(s => s.life_resume_worthy).length;

  // Calculate misogi days remaining
  const getMisogiDaysRemaining = () => {
    if (!misogi?.end_date) return null;
    const endDate = parseISO(misogi.end_date);
    const today = new Date();
    if (isAfter(today, endDate)) return 0;
    return differenceInDays(endDate, today);
  };

  // Calculate calendar breakdown
  const getCalendarBreakdown = () => {
    if (data.calendarEvents.length === 0) return null;
    
    const totals = { growth: 0, maintenance: 0, escape: 0 };
    let totalMinutes = 0;
    
    data.calendarEvents.forEach(event => {
      const minutes = event.duration_minutes || 60;
      totalMinutes += minutes;
      if (event.color_category === 'growth') totals.growth += minutes;
      else if (event.color_category === 'maintenance') totals.maintenance += minutes;
      else if (event.color_category === 'escape') totals.escape += minutes;
    });
    
    if (totalMinutes === 0) return null;
    
    return {
      growth: Math.round((totals.growth / totalMinutes) * 100),
      maintenance: Math.round((totals.maintenance / totalMinutes) * 100),
      escape: Math.round((totals.escape / totalMinutes) * 100),
    };
  };

  const streak = calculateStreak();
  const misogiDaysRemaining = getMisogiDaysRemaining();
  const calendarBreakdown = getCalendarBreakdown();
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Theme Card - Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative hover-glow">
          <motion.div 
            className="absolute top-0 right-0 text-[120px] leading-none opacity-10 select-none pointer-events-none"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          >
            {theme.emoji}
          </motion.div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-medium">
              {currentYear} Theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.span 
                  className="text-4xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  {theme.emoji}
                </motion.span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {theme.title}
                </h2>
              </div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground mb-1">When making decisions, ask:</p>
              <p className="text-lg font-medium text-foreground italic">
                "{theme.filter}"
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Misogi Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Sparkles className="w-4 h-4 text-orange-500" />
                  </motion.div>
                  <CardTitle className="text-base">Misogi Challenge</CardTitle>
                </div>
                {misogi && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    misogi.status === 'completed' 
                      ? 'bg-green-500/10 text-green-600' 
                      : misogi.status === 'in_progress'
                      ? 'bg-orange-500/10 text-orange-600'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {misogi.status === 'in_progress' ? 'In Progress' : misogi.status}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {misogi ? (
                <div className="space-y-4">
                  <p className="font-medium text-foreground line-clamp-2">{misogi.title}</p>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <motion.span 
                        key={misogi.completion_percentage}
                        className="font-semibold text-primary"
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                      >
                        {misogi.completion_percentage}%
                      </motion.span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${misogi.completion_percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  {misogiDaysRemaining !== null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {misogiDaysRemaining > 0 
                          ? `${misogiDaysRemaining} days remaining`
                          : 'Challenge period ended'
                        }
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">No Misogi challenge set</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/yearly-planning/onboarding')}>
                    Create Misogi
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <motion.div 
                  className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center"
                  animate={streak > 0 ? { 
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0]
                  } : {}}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                </motion.div>
                <CardTitle className="text-base">Daily Streak</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{streak}</p>
                <p className="text-xs text-muted-foreground">Day streak</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{lifeResumeWorthyDays}</p>
                <p className="text-xs text-muted-foreground">Resume-worthy days</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4 gap-2"
              onClick={() => onTabChange('tracking')}
            >
              <CheckCircle2 className="w-4 h-4" />
              Log Today's Score
            </Button>
          </CardContent>
          </Card>
        </motion.div>

        {/* This Week Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                </div>
                <CardTitle className="text-base">This Week</CardTitle>
              </div>
              {data.weeklyReflection && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.weeklyReflection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reflection complete</span>
                  <span className="text-green-600 text-sm font-medium">✓ Done</span>
                </div>
                {data.weeklyReflection.theme_alignment_score !== null && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Theme Alignment</span>
                      <span className={`font-semibold ${
                        data.weeklyReflection.theme_alignment_score >= 70 
                          ? 'text-green-600' 
                          : data.weeklyReflection.theme_alignment_score >= 40
                          ? 'text-orange-500'
                          : 'text-red-500'
                      }`}>
                        {data.weeklyReflection.theme_alignment_score}%
                      </span>
                    </div>
                    <Progress 
                      value={data.weeklyReflection.theme_alignment_score} 
                      className="h-2"
                    />
                  </div>
                )}
                {data.weeklyReflection.proud_of_week && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Proud of this week!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Weekly reflection not completed yet
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={() => onTabChange('tracking')}
                >
                  <TrendingUp className="w-4 h-4" />
                  Complete Reflection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Quality Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-base">Time Quality</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {calendarBreakdown ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Growth
                    </span>
                    <span className="font-medium text-green-600">{calendarBreakdown.growth}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${calendarBreakdown.growth}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      Maintenance
                    </span>
                    <span className="font-medium text-yellow-600">{calendarBreakdown.maintenance}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: `${calendarBreakdown.maintenance}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Escape
                    </span>
                    <span className="font-medium text-red-600">{calendarBreakdown.escape}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${calendarBreakdown.escape}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-3">No calendar events logged this week</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTabChange('tracking')}
                >
                  Log Time
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 gap-2" 
              onClick={() => onTabChange('tracking')}
            >
              <CheckCircle2 className="w-4 h-4" />
              Log Daily Score
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => onTabChange('tracking')}
            >
              <TrendingUp className="w-4 h-4" />
              Weekly Reflection
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
