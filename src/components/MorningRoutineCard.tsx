import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sun, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MorningRoutineCard() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    checkMorningRoutineStatus();
  }, []);

  const checkMorningRoutineStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('consistency_logs')
        .select('morning_reflection, emotion_label, non_negotiable_1, non_negotiable_2, non_negotiable_3')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const completed = !!(
          data.morning_reflection &&
          data.emotion_label &&
          data.non_negotiable_1 &&
          data.non_negotiable_2 &&
          data.non_negotiable_3
        );
        setIsCompleted(completed);
      }
    } catch (error) {
      console.error('Error checking morning routine status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Sun className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-1">
                {isCompleted ? 'Morning Routine Complete!' : 'Start Your Morning Routine'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isCompleted 
                  ? 'Great start to your day! Your Non-Negotiable 3 are set.' 
                  : 'Set your intention and Non-Negotiable 3 for today (10-20 min)'}
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => navigate('/morning')}
            variant={isCompleted ? 'outline' : 'default'}
            size="lg"
            className="gap-2"
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Review
              </>
            ) : (
              <>
                Begin
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
