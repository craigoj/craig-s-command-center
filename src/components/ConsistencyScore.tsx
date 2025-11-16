import { useState, useEffect } from "react";
import { format, subDays, parseISO } from "date-fns";
import { Flame, Trophy, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ConsistencyData {
  currentStreak: number;
  longestStreak: number;
  morningRoutineRate: number;
  dailyActionsRate: number;
  totalDays: number;
}

const MILESTONES = [
  { days: 3, label: "3 Day Streak", emoji: "🔥", color: "text-orange-500" },
  { days: 7, label: "Week Warrior", emoji: "⚡", color: "text-yellow-500" },
  { days: 14, label: "Two Weeks Strong", emoji: "💪", color: "text-blue-500" },
  { days: 21, label: "Habit Former", emoji: "🌟", color: "text-purple-500" },
  { days: 30, label: "Monthly Master", emoji: "👑", color: "text-amber-500" },
  { days: 60, label: "Unstoppable", emoji: "🚀", color: "text-green-500" },
  { days: 90, label: "Legend", emoji: "🏆", color: "text-pink-500" },
];

export function ConsistencyScore() {
  const [data, setData] = useState<ConsistencyData>({
    currentStreak: 0,
    longestStreak: 0,
    morningRoutineRate: 0,
    dailyActionsRate: 0,
    totalDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [achievedMilestone, setAchievedMilestone] = useState<typeof MILESTONES[0] | null>(null);

  useEffect(() => {
    loadConsistencyData();
  }, []);

  const loadConsistencyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 90 days of data
      const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      // Fetch consistency logs
      const { data: logs } = await supabase
        .from('consistency_logs')
        .select('log_date, morning_reflection, non_negotiable_completed, visualization_done')
        .eq('user_id', user.id)
        .gte('log_date', ninetyDaysAgo)
        .order('log_date', { ascending: false });

      // Fetch daily actions
      const { data: actions } = await supabase
        .from('daily_actions')
        .select('log_date, movement_30min, water_64oz, declutter_item, thoughtful_text, uncomfortable_action, kept_promise, reframed_thought, confident_posture')
        .eq('user_id', user.id)
        .gte('log_date', ninetyDaysAgo)
        .order('log_date', { ascending: false });

      // Calculate morning routine completion
      const morningRoutineCompletions = logs?.filter(log => {
        const hasReflection = log.morning_reflection && log.morning_reflection.length > 0;
        const hasNonNegotiables = log.non_negotiable_completed && 
          log.non_negotiable_completed.filter(Boolean).length >= 2;
        return hasReflection || hasNonNegotiables;
      }) || [];

      // Calculate daily actions completion
      const dailyActionsCompletions = actions?.filter(action => {
        const completedCount = [
          action.movement_30min,
          action.water_64oz,
          action.declutter_item,
          action.thoughtful_text,
          action.uncomfortable_action,
          action.kept_promise,
          action.reframed_thought,
          action.confident_posture
        ].filter(Boolean).length;
        return completedCount >= 5; // At least 5 out of 8 actions
      }) || [];

      // Calculate streaks
      const { currentStreak, longestStreak } = calculateStreaks(logs || []);

      // Calculate completion rates
      const morningRoutineRate = logs && logs.length > 0 
        ? Math.round((morningRoutineCompletions.length / logs.length) * 100)
        : 0;
      
      const dailyActionsRate = actions && actions.length > 0
        ? Math.round((dailyActionsCompletions.length / actions.length) * 100)
        : 0;

      setData({
        currentStreak,
        longestStreak,
        morningRoutineRate,
        dailyActionsRate,
        totalDays: logs?.length || 0,
      });

      // Check for milestone achievement
      checkMilestone(currentStreak);

    } catch (error) {
      console.error('Error loading consistency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreaks = (logs: any[]) => {
    if (!logs || logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );

    // Check current streak (must include today or yesterday)
    const mostRecentDate = parseISO(sortedLogs[0].log_date);
    const daysSinceRecent = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceRecent <= 1) {
      // Calculate current streak
      let expectedDate = new Date(today);
      
      for (const log of sortedLogs) {
        const logDate = parseISO(log.log_date);
        const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');
        const logDateStr = format(logDate, 'yyyy-MM-dd');
        
        if (logDateStr === expectedDateStr) {
          currentStreak++;
          expectedDate = subDays(expectedDate, 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 0; i < sortedLogs.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = parseISO(sortedLogs[i].log_date);
        const previousDate = parseISO(sortedLogs[i - 1].log_date);
        const dayDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  };

  const checkMilestone = (streak: number) => {
    const milestone = MILESTONES.find(m => m.days === streak);
    if (milestone) {
      setAchievedMilestone(milestone);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-amber-500";
    if (streak >= 14) return "text-purple-500";
    if (streak >= 7) return "text-blue-500";
    if (streak >= 3) return "text-orange-500";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Consistency Score</CardTitle>
            </div>
            {data.currentStreak >= 3 && (
              <Badge variant="default" className="gap-1 animate-pulse">
                <Flame className="h-3 w-3" />
                {data.currentStreak} Days
              </Badge>
            )}
          </div>
          <CardDescription>
            Track your daily habits and build momentum
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Streak Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className={`text-4xl font-bold ${getStreakColor(data.currentStreak)} transition-colors`}>
                {data.currentStreak}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Flame className="h-4 w-4" />
                <span>Current Streak</span>
              </div>
            </div>

            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <div className="text-4xl font-bold text-foreground">
                {data.longestStreak}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Trophy className="h-4 w-4" />
                <span>Best Streak</span>
              </div>
            </div>
          </div>

          {/* Completion Rates */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Morning Routine</span>
                <span className="text-muted-foreground">{data.morningRoutineRate}%</span>
              </div>
              <Progress value={data.morningRoutineRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Daily Actions</span>
                <span className="text-muted-foreground">{data.dailyActionsRate}%</span>
              </div>
              <Progress value={data.dailyActionsRate} className="h-2" />
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>Milestones</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.slice(0, 5).map((milestone) => (
                <Badge
                  key={milestone.days}
                  variant={data.longestStreak >= milestone.days ? "default" : "outline"}
                  className={`gap-1 transition-all ${
                    data.longestStreak >= milestone.days ? milestone.color : "opacity-50"
                  }`}
                >
                  <span>{milestone.emoji}</span>
                  <span className="text-xs">{milestone.days}d</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Total Days */}
          <div className="pt-4 border-t border-border/50">
            <div className="text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.totalDays}</span> days tracked in the last 90 days
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Celebration Modal */}
      {showCelebration && achievedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card className="max-w-md mx-4 animate-scale-in shadow-2xl border-2 border-primary">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                  <div className="absolute inset-0 animate-ping opacity-75">
                    <Sparkles className="h-16 w-16 text-primary" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className={`text-6xl ${achievedMilestone.color}`}>
                  {achievedMilestone.emoji}
                </div>
                <h3 className="text-2xl font-bold">
                  {achievedMilestone.label}!
                </h3>
                <p className="text-muted-foreground">
                  You've completed {achievedMilestone.days} consecutive days! Keep up the amazing work!
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
