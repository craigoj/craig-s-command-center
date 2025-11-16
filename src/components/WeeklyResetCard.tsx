import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function WeeklyResetCard() {
  const navigate = useNavigate();
  const [hasReset, setHasReset] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weekPriorities, setWeekPriorities] = useState<string[]>([]);

  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    checkWeeklyReset();
  }, []);

  const checkWeeklyReset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('weekly_resets')
        .select('week_priorities')
        .eq('user_id', user.id)
        .eq('week_start_date', thisWeekStart)
        .maybeSingle();

      if (data) {
        setHasReset(true);
        setWeekPriorities(data.week_priorities?.filter((p: string) => p.trim()) || []);
      }
    } catch (error) {
      console.error('Error checking weekly reset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Weekly Reset</CardTitle>
          </div>
          {hasReset ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Pending
            </Badge>
          )}
        </div>
        <CardDescription>
          Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasReset && weekPriorities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">This Week's Priorities:</p>
            <ul className="space-y-1">
              {weekPriorities.map((priority, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-semibold">{idx + 1}.</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete your weekly reset to reflect on last week and set priorities for this week.
          </p>
        )}
        
        <Button 
          onClick={() => navigate('/weekly-reset')}
          className="w-full"
          variant={hasReset ? "outline" : "default"}
        >
          {hasReset ? "Update Weekly Reset" : "Start Weekly Reset"}
        </Button>
      </CardContent>
    </Card>
  );
}
