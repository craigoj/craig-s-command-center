import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DailyBriefing = () => {
  const [briefing, setBriefing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if briefing was generated today
    const lastGen = localStorage.getItem('lastBriefingDate');
    const today = new Date().toDateString();
    
    if (lastGen !== today) {
      generateBriefing();
    } else {
      const cached = localStorage.getItem('dailyBriefing');
      if (cached) {
        setBriefing(cached);
        setLastGenerated(new Date(lastGen));
      }
    }
  }, []);

  const generateBriefing = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('daily-briefing');

      if (error) throw error;

      setBriefing(data.briefing);
      const now = new Date();
      setLastGenerated(now);
      
      // Cache the briefing
      localStorage.setItem('dailyBriefing', data.briefing);
      localStorage.setItem('lastBriefingDate', now.toDateString());

      toast({
        title: "Briefing generated",
        description: "Your daily strategic overview is ready",
      });
    } catch (error) {
      console.error('Error generating briefing:', error);
      toast({
        title: "Error",
        description: "Failed to generate briefing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!briefing && !isLoading) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Daily Briefing</h2>
              {lastGenerated && (
                <p className="text-xs text-muted-foreground">
                  Generated {lastGenerated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generateBriefing}
              disabled={isLoading}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {briefing}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};