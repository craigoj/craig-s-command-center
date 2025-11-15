import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MomentumScore = () => {
  const [momentum, setMomentum] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMomentum();
  }, []);

  const loadMomentum = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('momentum-score');

      if (error) throw error;

      setMomentum(data);
    } catch (error) {
      console.error('Error loading momentum:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !momentum) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Momentum Score</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{momentum.emoji}</span>
            <span className="text-3xl font-bold text-primary">{momentum.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {momentum.percentile}th percentile this week
          </p>
        </div>

        <div className="text-right space-y-1 text-sm">
          <div className="text-muted-foreground">
            <span className="font-semibold text-foreground">{momentum.stats.completedTasks}</span> tasks done
          </div>
          <div className="text-muted-foreground">
            <span className="font-semibold text-foreground">{momentum.stats.completedSteps}</span> steps done
          </div>
          <div className="text-muted-foreground">
            <span className="font-semibold text-foreground">{momentum.stats.openTasks}</span> in progress
          </div>
          {momentum.stats.stagnantTasks > 0 && (
            <div className="text-destructive">
              <span className="font-semibold">{momentum.stats.stagnantTasks}</span> stagnant
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};