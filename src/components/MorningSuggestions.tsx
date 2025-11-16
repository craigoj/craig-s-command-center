import { useState } from "react";
import { Sparkles, TrendingUp, Target, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MorningSuggestionsData {
  wins: string[];
  missed: string[];
  recommendations: Array<{
    action: string;
    reason: string;
  }>;
  focusStatement: string;
}

export function MorningSuggestions() {
  const [suggestions, setSuggestions] = useState<MorningSuggestionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('morning-suggestions');

      if (error) throw error;

      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load morning suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!suggestions && !isLoading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Morning Suggestions</CardTitle>
          </div>
          <CardDescription>
            Get personalized recommendations based on yesterday's performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadSuggestions} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Analyzing your progress...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) return null;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Morning Suggestions</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadSuggestions}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Personalized insights for today</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Focus Statement */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-lg font-semibold text-center text-foreground">
            "{suggestions.focusStatement}"
          </p>
        </div>

        {/* Wins */}
        {suggestions.wins && suggestions.wins.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">Yesterday's Wins</h3>
            </div>
            <ul className="space-y-2">
              {suggestions.wins.map((win, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5 bg-green-500/10 text-green-700 border-green-500/20">
                    ✓
                  </Badge>
                  <span className="flex-1">{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missed Items */}
        {suggestions.missed && suggestions.missed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Opportunities for Today</h3>
            </div>
            <ul className="space-y-2">
              {suggestions.missed.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-amber-500">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Today's Recommendations</h3>
          </div>
          <div className="space-y-3">
            {suggestions.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-1"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="default" className="mt-0.5">
                    {idx + 1}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{rec.action}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
