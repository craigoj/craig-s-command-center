import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  Sparkles,
  Star,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  format, 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval, 
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  parseISO,
  isWithinInterval,
  differenceInDays
} from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from '@/components/ui/animations';

interface Misogi {
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
}

interface DailyScore {
  date_score: string;
  life_resume_worthy: boolean;
}

interface EpicExperience {
  id: string;
  planned_date: string | null;
  completed: boolean;
  title: string;
}

interface WeeklyReflection {
  week_start_date: string;
}

interface YearlyCalendarViewProps {
  yearlyPlanId?: string;
  misogi?: Misogi | null;
}

export default function YearlyCalendarView({ yearlyPlanId, misogi }: YearlyCalendarViewProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [experiences, setExperiences] = useState<EpicExperience[]>([]);
  const [reflections, setReflections] = useState<WeeklyReflection[]>([]);

  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  useEffect(() => {
    fetchYearData();
  }, [selectedYear, yearlyPlanId]);

  const fetchYearData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const yearStartStr = format(yearStart, 'yyyy-MM-dd');
      const yearEndStr = format(yearEnd, 'yyyy-MM-dd');

      const [scoresRes, experiencesRes, reflectionsRes] = await Promise.all([
        supabase
          .from('daily_scores')
          .select('date_score, life_resume_worthy')
          .eq('user_id', user.id)
          .gte('date_score', yearStartStr)
          .lte('date_score', yearEndStr),
        yearlyPlanId ? supabase
          .from('epic_experiences')
          .select('id, planned_date, completed, title')
          .eq('yearly_plan_id', yearlyPlanId) : Promise.resolve({ data: [] }),
        supabase
          .from('yearly_weekly_reflections')
          .select('week_start_date')
          .eq('user_id', user.id)
          .gte('week_start_date', yearStartStr)
          .lte('week_start_date', yearEndStr),
      ]);

      setDailyScores(scoresRes.data || []);
      setExperiences(experiencesRes.data || []);
      setReflections(reflectionsRes.data || []);
    } catch (error) {
      console.error('Error fetching year data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const score = dailyScores.find(s => s.date_score === dateStr);
    const experience = experiences.find(e => e.planned_date === dateStr);
    
    // Check if date is within misogi range
    let inMisogiRange = false;
    if (misogi?.start_date && misogi?.end_date) {
      const misogiStart = parseISO(misogi.start_date);
      const misogiEnd = parseISO(misogi.end_date);
      inMisogiRange = isWithinInterval(date, { start: misogiStart, end: misogiEnd });
    }

    return {
      hasScore: !!score,
      isLifeResumeWorthy: score?.life_resume_worthy || false,
      hasExperience: !!experience,
      experienceCompleted: experience?.completed || false,
      inMisogiRange,
    };
  };

  // Calculate stats
  const lifeResumeWorthyDays = dailyScores.filter(s => s.life_resume_worthy).length;
  const totalScoreDays = dailyScores.length;
  const completedExperiences = experiences.filter(e => e.completed).length;
  const totalExperiences = experiences.length;
  const totalReflections = reflections.length;

  // Calculate days progress
  const today = new Date();
  const dayOfYear = differenceInDays(today, yearStart) + 1;
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;
  const daysRemaining = Math.max(0, totalDays - dayOfYear);

  return (
    <div className="space-y-6">
      {/* Header with year navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Year View</CardTitle>
                <CardDescription>Your big picture for {selectedYear}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSelectedYear(selectedYear - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[60px] text-center">{selectedYear}</span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSelectedYear(selectedYear + 1)}
                disabled={selectedYear >= currentYear}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{lifeResumeWorthyDays}</p>
              <p className="text-xs text-muted-foreground">Resume-worthy days</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalScoreDays}</p>
              <p className="text-xs text-muted-foreground">Days logged</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{completedExperiences}/{totalExperiences}</p>
              <p className="text-xs text-muted-foreground">Experiences</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalReflections}</p>
              <p className="text-xs text-muted-foreground">Weekly reflections</p>
            </div>
          </div>

          {/* Year Progress */}
          {selectedYear === currentYear && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Year Progress</span>
                <span className="font-medium">{daysRemaining} days remaining</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(dayOfYear / totalDays) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Resume-worthy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">Day logged</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-purple-500" />
              <span className="text-muted-foreground">Experience</span>
            </div>
            {misogi && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500/30" />
                <span className="text-muted-foreground">Misogi period</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Month Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {months.map((month) => (
            <MonthCard 
              key={month.toISOString()} 
              month={month} 
              getDayData={getDayData}
              experiences={experiences}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MonthCardProps {
  month: Date;
  getDayData: (date: Date) => {
    hasScore: boolean;
    isLifeResumeWorthy: boolean;
    hasExperience: boolean;
    experienceCompleted: boolean;
    inMisogiRange: boolean;
  };
  experiences: EpicExperience[];
}

function MonthCard({ month, getDayData, experiences }: MonthCardProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get experiences for this month
  const monthExperiences = experiences.filter(e => {
    if (!e.planned_date) return false;
    const expDate = parseISO(e.planned_date);
    return isSameMonth(expDate, month);
  });

  // Calculate stats
  const resumeWorthyCount = days.filter(d => getDayData(d).isLifeResumeWorthy).length;
  const hasData = days.some(d => getDayData(d).hasScore);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {format(month, 'MMMM')}
          </CardTitle>
          {resumeWorthyCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
              {resumeWorthyCount} ⭐
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Day grid - 7 columns for each day of week */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {[...Array(monthStart.getDay())].map((_, i) => (
            <div key={`empty-${i}`} className="w-full aspect-square" />
          ))}
          {days.map((day) => {
            const data = getDayData(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "w-full aspect-square rounded-sm flex items-center justify-center relative",
                  data.inMisogiRange && "bg-orange-500/10",
                  data.isLifeResumeWorthy && "bg-green-500",
                  data.hasScore && !data.isLifeResumeWorthy && "bg-muted-foreground/20",
                  isToday && "ring-2 ring-primary ring-offset-1",
                  !data.hasScore && !data.inMisogiRange && "bg-transparent"
                )}
                title={`${format(day, 'MMM d')}${data.isLifeResumeWorthy ? ' - Resume worthy!' : data.hasScore ? ' - Logged' : ''}`}
              >
                {data.hasExperience && (
                  <Star className={cn(
                    "w-2.5 h-2.5",
                    data.experienceCompleted ? "text-purple-600 fill-purple-600" : "text-purple-400"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Month experiences list */}
        {monthExperiences.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1">
            {monthExperiences.slice(0, 2).map(exp => (
              <div key={exp.id} className="flex items-center gap-1 text-xs">
                <Star className={cn(
                  "w-3 h-3 flex-shrink-0",
                  exp.completed ? "text-purple-600 fill-purple-600" : "text-purple-400"
                )} />
                <span className={cn(
                  "truncate",
                  exp.completed && "line-through text-muted-foreground"
                )}>
                  {exp.title}
                </span>
              </div>
            ))}
            {monthExperiences.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{monthExperiences.length - 2} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
