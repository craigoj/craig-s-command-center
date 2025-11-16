import { useState, useEffect } from "react";
import { format, startOfWeek } from "date-fns";
import { Command, Save, Loader2, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const HARADA_PILLARS = [
  "Physical Health",
  "Mental Health",
  "Relationships",
  "Career/Work",
  "Finance",
  "Personal Growth",
  "Environment",
  "Spirituality"
];

export default function MidweekCheckin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  const [pillarAttention, setPillarAttention] = useState('');
  const [correctionPlan, setCorrectionPlan] = useState('');
  const [weeklyPriorities, setWeeklyPriorities] = useState<string[]>([]);

  // Progress tracking
  const progress = pillarAttention && correctionPlan ? 100 : pillarAttention ? 50 : 0;

  useEffect(() => {
    loadCheckinData();
  }, []);

  const loadCheckinData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load existing midweek check-in
      const { data: checkinData } = await supabase
        .from('midweek_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();

      if (checkinData) {
        setPillarAttention(checkinData.pillar_attention || '');
        setCorrectionPlan(checkinData.correction_plan || '');
      }

      // Load weekly priorities to review
      const { data: resetData } = await supabase
        .from('weekly_resets')
        .select('week_priorities')
        .eq('user_id', user.id)
        .eq('week_start_date', thisWeekStart)
        .maybeSingle();

      if (resetData?.week_priorities) {
        setWeeklyPriorities(resetData.week_priorities.filter((p: string) => p.trim()));
      }

    } catch (error) {
      console.error('Error loading check-in data:', error);
      toast({
        title: "Error",
        description: "Failed to load check-in data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pillarAttention) {
      toast({
        title: "Missing Information",
        description: "Please select which pillar needs attention",
        variant: "destructive",
      });
      return;
    }

    if (!correctionPlan.trim()) {
      toast({
        title: "Missing Information",
        description: "Please write a correction plan",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('midweek_checkins')
        .upsert({
          user_id: user.id,
          checkin_date: today,
          pillar_attention: pillarAttention,
          correction_plan: correctionPlan,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,checkin_date'
        });

      if (error) throw error;

      toast({
        title: "Check-in Saved",
        description: "Your midweek check-in has been saved successfully!",
      });
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast({
        title: "Error",
        description: "Failed to save check-in",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-64 pointer-events-none" />
        
        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Command className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">Midweek Check-in</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {format(new Date(), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Desktop Save Button */}
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="hidden md:flex min-h-10"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Check-in
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-2 md:px-4 py-6 md:py-12 space-y-6 max-w-4xl">
        {/* Weekly Priorities Review */}
        {weeklyPriorities.length > 0 && (
          <Card className="border-primary/20 bg-primary/5 animate-fade-in">
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <CardTitle className="text-base md:text-lg">This Week's Priorities</CardTitle>
              </div>
              <CardDescription className="text-xs md:text-sm">Review your progress on this week's goals</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 md:space-y-3">
                {weeklyPriorities.map((priority, idx) => (
                  <li key={idx} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-background rounded-lg">
                    <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs md:text-sm shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-xs md:text-sm text-foreground">{priority}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Accordion type="single" collapsible defaultValue="pillar" className="space-y-4">
          {/* Pillar Needing Attention */}
          <AccordionItem value="pillar" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                <h2 className="text-base md:text-lg font-semibold">Pillar Needing Attention</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6 space-y-4">
              <p className="text-xs md:text-sm text-muted-foreground">
                Which area of your life needs focus this week?
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="pillar-select" className="text-sm md:text-base">Select Harada Pillar</Label>
                <Select value={pillarAttention} onValueChange={setPillarAttention}>
                  <SelectTrigger id="pillar-select" className="min-h-12">
                    <SelectValue placeholder="Choose a pillar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {HARADA_PILLARS.map((pillar) => (
                      <SelectItem key={pillar} value={pillar} className="min-h-10">
                        {pillar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Correction Plan */}
          <AccordionItem value="plan" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-base md:text-lg font-semibold">Correction Plan</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6 space-y-2">
              <Label htmlFor="correction-plan" className="text-sm md:text-base">
                What specific actions will you take?
              </Label>
              <Textarea
                id="correction-plan"
                placeholder="What specific actions will you take to address this pillar? What changes will you make for the rest of the week?"
                value={correctionPlan}
                onChange={(e) => setCorrectionPlan(e.target.value)}
                className="min-h-[150px] md:min-h-[200px] text-sm md:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Be specific and actionable. What will you do differently?
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

      {/* Mobile Floating Save Button */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full min-h-12 text-base shadow-lg"
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Save className="mr-2 h-5 w-5" />
          )}
          Save Check-in
        </Button>
      </div>
    </div>
  );
}
