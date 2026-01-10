import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, RefreshCw, Brain, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DigestData {
  digest: string;
  counts: {
    contacts: number;
    projects: number;
    insights: number;
    captures: number;
    tasks: number;
  };
}

export const DailyBriefing = () => {
  const [briefing, setBriefing] = useState<string>("");
  const [digestData, setDigestData] = useState<DigestData | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const lastGen = localStorage.getItem('lastBriefingDate');
    const today = new Date().toDateString();
    
    if (lastGen !== today) {
      generateAll();
    } else {
      const cachedBriefing = localStorage.getItem('dailyBriefing');
      const cachedDigest = localStorage.getItem('secondBrainDigest');
      
      if (cachedBriefing) {
        setBriefing(cachedBriefing);
        setLastGenerated(new Date(lastGen));
      }
      if (cachedDigest) {
        try {
          setDigestData(JSON.parse(cachedDigest));
        } catch {
          // Invalid cache, will regenerate
        }
      }
      
      // If we have cached briefing but no digest, generate digest
      if (cachedBriefing && !cachedDigest) {
        generateDigest();
      }
    }
  }, []);

  const generateAll = async () => {
    await Promise.all([generateBriefing(), generateDigest()]);
  };

  const generateBriefing = async () => {
    setIsBriefingLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('daily-briefing');

      if (error) throw error;

      setBriefing(data.briefing);
      const now = new Date();
      setLastGenerated(now);
      
      localStorage.setItem('dailyBriefing', data.briefing);
      localStorage.setItem('lastBriefingDate', now.toDateString());
    } catch (error) {
      console.error('Error generating briefing:', error);
      toast({
        title: "Error",
        description: "Failed to generate strategic briefing",
        variant: "destructive",
      });
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const generateDigest = async () => {
    setIsDigestLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('second-brain-digest');

      if (error) throw error;

      const digestResult: DigestData = {
        digest: data.digest,
        counts: data.counts || {
          contacts: 0,
          projects: 0,
          insights: 0,
          captures: 0,
          tasks: 0,
        },
      };
      
      setDigestData(digestResult);
      localStorage.setItem('secondBrainDigest', JSON.stringify(digestResult));
    } catch (error) {
      console.error('Error generating digest:', error);
      // Set fallback data
      setDigestData({
        digest: "No open loops today ✨\n\nYour second brain is clear. Focus on what matters most.",
        counts: { contacts: 0, projects: 0, insights: 0, captures: 0, tasks: 0 },
      });
    } finally {
      setIsDigestLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast({
      title: "Refreshing...",
      description: "Generating fresh briefing and digest",
    });
    await generateAll();
    toast({
      title: "Briefing updated",
      description: "Your daily strategic overview is ready",
    });
  };

  const openLoopsCount = digestData 
    ? digestData.counts.contacts + digestData.counts.projects 
    : 0;

  // Don't render if both are empty and not loading
  if (!briefing && !digestData && !isBriefingLoading && !isDigestLoading) return null;

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Daily Briefing</CardTitle>
              {lastGenerated && (
                <p className="text-xs text-muted-foreground">
                  Generated {lastGenerated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isBriefingLoading || isDigestLoading}
            size="sm"
            variant="ghost"
          >
            <RefreshCw className={`h-4 w-4 ${(isBriefingLoading || isDigestLoading) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Second Brain Digest Section */}
        <Accordion type="single" collapsible defaultValue="second-brain">
          <AccordionItem value="second-brain" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium">Second Brain Digest</span>
                {!isDigestLoading && openLoopsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {openLoopsCount} open loops
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              {isDigestLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : digestData ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {digestData.digest}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No open loops today ✨</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        {/* Strategic Focus Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Strategic Focus</h3>
          </div>
          
          {isBriefingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : briefing ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {briefing}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your strategic focus will appear here once generated.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
