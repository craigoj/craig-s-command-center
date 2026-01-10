import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Brain, 
  RefreshCw, 
  AlertCircle, 
  Lightbulb, 
  Target, 
  Activity,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyStats {
  captures: number;
  capturesByCategory: Record<string, number>;
  stagnantProjects: number;
  insights: number;
  contacts: number;
  tasksCompleted: number;
  tasksCreated: number;
  avgConfidence: number;
  needsReview: number;
  mostCommonCategory: string;
}

export default function WeeklyDigest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [review, setReview] = useState<string>("");
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Check for cached data first
    const cachedReview = localStorage.getItem('weeklySecondBrainReview');
    const cachedStats = localStorage.getItem('weeklySecondBrainStats');
    const cachedDate = localStorage.getItem('weeklySecondBrainDate');
    const today = new Date().toDateString();

    if (cachedReview && cachedStats && cachedDate === today) {
      setReview(cachedReview);
      try {
        setStats(JSON.parse(cachedStats));
      } catch {
        // Invalid cache
      }
      setHasLoaded(true);
    } else {
      loadWeeklyReview();
    }
  }, []);

  const loadWeeklyReview = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-second-brain-review');

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setReview(data.review);
      setStats(data.stats);
      
      // Cache the results
      const today = new Date().toDateString();
      localStorage.setItem('weeklySecondBrainReview', data.review);
      localStorage.setItem('weeklySecondBrainStats', JSON.stringify(data.stats));
      localStorage.setItem('weeklySecondBrainDate', today);

      toast({
        title: "Review generated",
        description: "Your weekly second brain review is ready",
      });
    } catch (error) {
      console.error('Error loading weekly review:', error);
      toast({
        title: "Error",
        description: "Failed to generate weekly review",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  const handleRefresh = async () => {
    // Clear cache and reload
    localStorage.removeItem('weeklySecondBrainReview');
    localStorage.removeItem('weeklySecondBrainStats');
    localStorage.removeItem('weeklySecondBrainDate');
    await loadWeeklyReview();
  };

  // Parse sections from the review markdown
  const parseReviewSections = (reviewText: string) => {
    const sections: Record<string, string> = {};
    
    // Match each section heading and its content
    const sectionPatterns = [
      { key: 'captured', regex: /THIS WEEK YOU CAPTURED:\n([\s\S]*?)(?=\n\n[A-Z]|BIGGEST OPEN LOOPS:)/i },
      { key: 'openLoops', regex: /BIGGEST OPEN LOOPS:\n([\s\S]*?)(?=\n\n[A-Z]|PATTERNS NOTICED:)/i },
      { key: 'patterns', regex: /PATTERNS NOTICED:\n([\s\S]*?)(?=\n\n[A-Z]|SUGGESTED FOCUS)/i },
      { key: 'focus', regex: /SUGGESTED FOCUS FOR NEXT WEEK:\n([\s\S]*?)(?=\n\n[A-Z]|CAPTURE HEALTH:)/i },
      { key: 'health', regex: /CAPTURE HEALTH:\n([\s\S]*?)$/i },
    ];

    sectionPatterns.forEach(({ key, regex }) => {
      const match = reviewText.match(regex);
      if (match && match[1]) {
        sections[key] = match[1].trim();
      }
    });

    return sections;
  };

  const sections = review ? parseReviewSections(review) : {};

  // Empty state
  if (hasLoaded && !isLoading && !review && (!stats || stats.captures === 0)) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
        <CardContent className="py-8 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Captures This Week</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start capturing your thoughts this week to see patterns!
          </p>
          <Button variant="outline" onClick={() => navigate('/review-captures')}>
            View Capture Log
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Second Brain Review</CardTitle>
              {stats && (
                <p className="text-xs text-muted-foreground">
                  {stats.captures} captures • {stats.tasksCompleted} tasks completed
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            variant="ghost"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["captured", "open-loops", "focus"]} className="space-y-2">
            {/* This Week You Captured */}
            <AccordionItem value="captured" className="border rounded-lg bg-muted/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium">This Week You Captured</span>
                  {stats && (
                    <Badge variant="secondary" className="ml-2">
                      {stats.captures} items
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {sections.captured ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {sections.captured}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No capture data available</p>
                )}
                {stats && Object.keys(stats.capturesByCategory).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(stats.capturesByCategory).map(([category, count]) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Biggest Open Loops */}
            <AccordionItem value="open-loops" className="border rounded-lg bg-muted/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Biggest Open Loops</span>
                  {stats && stats.stagnantProjects > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.stagnantProjects} stagnant
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {sections.openLoops ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {sections.openLoops}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No open loops - you're all caught up! ✨</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Patterns Noticed */}
            <AccordionItem value="patterns" className="border rounded-lg bg-muted/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Patterns Noticed</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {sections.patterns ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {sections.patterns}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Keep capturing to reveal patterns!</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Suggested Focus */}
            <AccordionItem value="focus" className="border rounded-lg bg-muted/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Suggested Focus for Next Week</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {sections.focus ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {sections.focus}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Generate a review to see suggestions</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Capture Health */}
            <AccordionItem value="health" className="border rounded-lg bg-muted/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium">Capture Health</span>
                  {stats && (
                    <Badge variant="outline" className="ml-2">
                      {stats.avgConfidence}% confidence
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {stats ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Average Confidence</span>
                      <span className="font-medium">{stats.avgConfidence}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Items Needing Review</span>
                      <Badge variant={stats.needsReview > 0 ? "destructive" : "secondary"}>
                        {stats.needsReview}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Most Common Category</span>
                      <span className="font-medium capitalize">{stats.mostCommonCategory || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion Ratio</span>
                      <span className="font-medium">
                        {stats.tasksCreated > 0 
                          ? Math.round((stats.tasksCompleted / stats.tasksCreated) * 100)
                          : 0}%
                      </span>
                    </div>
                    {sections.health && (
                      <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                        {sections.health.split('\n').pop()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No health data available</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* View Capture Log Button */}
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => navigate('/review-captures')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Capture Log
        </Button>
      </CardContent>
    </Card>
  );
}
