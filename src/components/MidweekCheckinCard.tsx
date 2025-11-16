import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function MidweekCheckinCard() {
  const navigate = useNavigate();
  const [hasCheckin, setHasCheckin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pillarAttention, setPillarAttention] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    checkMidweekCheckin();
  }, []);

  const checkMidweekCheckin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('midweek_checkins')
        .select('pillar_attention')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();

      if (data) {
        setHasCheckin(true);
        setPillarAttention(data.pillar_attention || '');
      }
    } catch (error) {
      console.error('Error checking midweek check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  const dayOfWeek = new Date().getDay();
  const isMidweek = dayOfWeek >= 3 && dayOfWeek <= 4; // Wednesday or Thursday

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Midweek Check-in</CardTitle>
          </div>
          {hasCheckin ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Badge>
          ) : isMidweek ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Due Today
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Upcoming
            </Badge>
          )}
        </div>
        <CardDescription>
          Course-correct and stay on track
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCheckin ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Focus Area:</p>
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{pillarAttention}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You've identified this pillar for mid-week correction.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {isMidweek ? (
              <p className="text-sm text-muted-foreground">
                Time to check in! Review your weekly priorities and adjust your course if needed.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Take a moment mid-week to review progress and make adjustments to stay on track with your goals.
              </p>
            )}
          </div>
        )}
        
        <Button 
          onClick={() => navigate('/midweek-checkin')}
          className="w-full"
          variant={hasCheckin ? "outline" : isMidweek ? "default" : "outline"}
        >
          {hasCheckin ? "Update Check-in" : "Start Check-in"}
        </Button>
      </CardContent>
    </Card>
  );
}
