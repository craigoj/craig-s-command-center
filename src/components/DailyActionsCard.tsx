import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DailyActions {
  id?: string;
  movement_30min: boolean;
  water_64oz: boolean;
  declutter_item: boolean;
  thoughtful_text: boolean;
  uncomfortable_action: boolean;
  kept_promise: boolean;
  reframed_thought: boolean;
  confident_posture: boolean;
}

const ACTION_ITEMS = [
  { key: 'movement_30min', label: '30 minutes of movement', icon: '🏃' },
  { key: 'water_64oz', label: '64 oz water', icon: '💧' },
  { key: 'declutter_item', label: 'Declutter 1 small item', icon: '🧹' },
  { key: 'thoughtful_text', label: 'Send 1 thoughtful check-in text', icon: '💬' },
  { key: 'uncomfortable_action', label: 'Do one uncomfortable action', icon: '🎯' },
  { key: 'kept_promise', label: 'Keep one promise', icon: '🤝' },
  { key: 'reframed_thought', label: 'Reframe 1 distorted thought', icon: '🧠' },
  { key: 'confident_posture', label: 'Practice confident posture / presence', icon: '👑' },
] as const;

export function DailyActionsCard() {
  const [actions, setActions] = useState<DailyActions>({
    movement_30min: false,
    water_64oz: false,
    declutter_item: false,
    thoughtful_text: false,
    uncomfortable_action: false,
    kept_promise: false,
    reframed_thought: false,
    confident_posture: false,
  });
  const [recordId, setRecordId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadTodayActions();
    calculateStreak();
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('daily-actions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_actions',
          filter: `log_date=eq.${today}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as DailyActions;
            setActions({
              movement_30min: newData.movement_30min,
              water_64oz: newData.water_64oz,
              declutter_item: newData.declutter_item,
              thoughtful_text: newData.thoughtful_text,
              uncomfortable_action: newData.uncomfortable_action,
              kept_promise: newData.kept_promise,
              reframed_thought: newData.reframed_thought,
              confident_posture: newData.confident_posture,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [today]);

  const loadTodayActions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRecordId(data.id);
        setActions({
          movement_30min: data.movement_30min,
          water_64oz: data.water_64oz,
          declutter_item: data.declutter_item,
          thoughtful_text: data.thoughtful_text,
          uncomfortable_action: data.uncomfortable_action,
          kept_promise: data.kept_promise,
          reframed_thought: data.reframed_thought,
          confident_posture: data.confident_posture,
        });
      }
    } catch (error) {
      console.error('Error loading daily actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_actions')
        .select('log_date, movement_30min, water_64oz, declutter_item, thoughtful_text, uncomfortable_action, kept_promise, reframed_thought, confident_posture')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(90);

      if (error) throw error;

      let currentStreak = 0;
      if (data) {
        // Count consecutive days with all 8 actions completed
        for (const day of data) {
          const allCompleted = 
            day.movement_30min &&
            day.water_64oz &&
            day.declutter_item &&
            day.thoughtful_text &&
            day.uncomfortable_action &&
            day.kept_promise &&
            day.reframed_thought &&
            day.confident_posture;

          if (allCompleted) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  const handleActionToggle = async (actionKey: keyof DailyActions) => {
    const newValue = !actions[actionKey];
    const updatedActions = { ...actions, [actionKey]: newValue };
    
    // Optimistic update
    setActions(updatedActions);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const saveData = {
        user_id: user.id,
        log_date: today,
        ...updatedActions,
      };

      if (recordId) {
        const { error } = await supabase
          .from('daily_actions')
          .update(saveData)
          .eq('id', recordId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('daily_actions')
          .insert(saveData)
          .select()
          .single();

        if (error) throw error;
        if (data) setRecordId(data.id);
      }

      // Check if all actions are now complete
      const completedCount = Object.values(updatedActions).filter(Boolean).length;
      if (completedCount === 8) {
        toast.success('🎉 All 8 daily actions complete! You\'re crushing it!', {
          duration: 5000,
        });
        calculateStreak();
      }
    } catch (error) {
      console.error('Error saving action:', error);
      // Revert on error
      setActions(actions);
      toast.error('Failed to save action');
    }
  };

  const completedCount = Object.values(actions).filter(Boolean).length;
  const progress = (completedCount / 8) * 100;
  const allCompleted = completedCount === 8;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300",
      allCompleted && "border-2 border-primary shadow-lg shadow-primary/20"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daily Actions
              {allCompleted && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </CardTitle>
            <CardDescription>
              Complete all 8 actions to build consistency
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-bold">{streak}</span>
                <span className="text-xs">day{streak !== 1 ? 's' : ''}</span>
              </Badge>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{completedCount}/8</div>
              <div className="text-xs text-muted-foreground">completed</div>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTION_ITEMS.map((item) => {
            const isChecked = actions[item.key];
            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-all",
                  isChecked 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-background hover:bg-accent/50 border-border"
                )}
              >
                <Checkbox
                  id={item.key}
                  checked={isChecked}
                  onCheckedChange={() => handleActionToggle(item.key)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={item.key}
                  className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <span className="mr-2">{item.icon}</span>
                  <span className={cn(isChecked && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {allCompleted && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">Perfect Day!</p>
                <p className="text-sm text-muted-foreground">
                  You've completed all 8 daily actions. Keep this momentum going! 🚀
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
