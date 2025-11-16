import { useState, useEffect } from "react";
import { format, startOfWeek } from "date-fns";
import { Command, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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

export default function WeeklyReset() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Weekly Reset State
  const [wins, setWins] = useState<string[]>(['', '', '']);
  const [misses, setMisses] = useState<string[]>(['', '', '']);
  const [missReasons, setMissReasons] = useState('');
  const [pillarNeedsAttention, setPillarNeedsAttention] = useState('');
  const [weekPriorities, setWeekPriorities] = useState<string[]>(['', '', '']);
  const [environmentReset, setEnvironmentReset] = useState(false);
  
  // Harada Pillars State
  const [pillarScores, setPillarScores] = useState<Record<string, { score: number; notes: string }>>({});

  // Progress tracking
  const completedSections = [
    wins.some(w => w.trim()),
    Object.keys(pillarScores).length > 0,
    weekPriorities.some(p => p.trim()),
    environmentReset
  ].filter(Boolean).length;

  const progress = (completedSections / 4) * 100;

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load weekly reset
      const { data: resetData } = await supabase
        .from('weekly_resets')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', thisWeekStart)
        .maybeSingle();

      if (resetData) {
        setWins(resetData.wins || ['', '', '']);
        setMisses(resetData.misses || ['', '', '']);
        setMissReasons(resetData.miss_reasons || '');
        setPillarNeedsAttention(resetData.pillar_needs_attention || '');
        setWeekPriorities(resetData.week_priorities || ['', '', '']);
        setEnvironmentReset(resetData.environment_reset_done || false);
      }

      // Load Harada pillars
      const { data: pillarsData } = await supabase
        .from('harada_pillars')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', thisWeekStart);

      const scoresMap: Record<string, { score: number; notes: string }> = {};
      pillarsData?.forEach(pillar => {
        scoresMap[pillar.pillar_name] = {
          score: pillar.health_score || 5,
          notes: pillar.notes || ''
        };
      });
      setPillarScores(scoresMap);

    } catch (error) {
      console.error('Error loading weekly data:', error);
      toast({
        title: "Error",
        description: "Failed to load weekly data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save weekly reset
      const { error: resetError } = await supabase
        .from('weekly_resets')
        .upsert({
          user_id: user.id,
          week_start_date: thisWeekStart,
          wins: wins.filter(w => w.trim()),
          misses: misses.filter(m => m.trim()),
          miss_reasons: missReasons,
          pillar_needs_attention: pillarNeedsAttention,
          week_priorities: weekPriorities.filter(p => p.trim()),
          environment_reset_done: environmentReset,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,week_start_date'
        });

      if (resetError) throw resetError;

      // Save Harada pillars
      for (const pillar of HARADA_PILLARS) {
        const pillarData = pillarScores[pillar];
        if (pillarData) {
          await supabase
            .from('harada_pillars')
            .upsert({
              user_id: user.id,
              week_start_date: thisWeekStart,
              pillar_name: pillar,
              health_score: pillarData.score,
              notes: pillarData.notes,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,week_start_date,pillar_name'
            });
        }
      }

      toast({
        title: "Weekly Reset Saved",
        description: "Your weekly reset has been saved successfully!",
      });
    } catch (error) {
      console.error('Error saving weekly reset:', error);
      toast({
        title: "Error",
        description: "Failed to save weekly reset",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePillarScore = (pillarName: string, score: number) => {
    setPillarScores(prev => ({
      ...prev,
      [pillarName]: { score, notes: prev[pillarName]?.notes || '' }
    }));
  };

  const updatePillarNotes = (pillarName: string, notes: string) => {
    setPillarScores(prev => ({
      ...prev,
      [pillarName]: { score: prev[pillarName]?.score || 5, notes }
    }));
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
                  <h1 className="text-xl md:text-2xl font-bold">Weekly Reset</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
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
                Save Reset
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
        <Accordion type="multiple" defaultValue={["wins-misses"]} className="space-y-4">
          {/* Wins & Misses */}
          <AccordionItem value="wins-misses" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-base md:text-lg font-semibold">Last Week Review</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-sm md:text-base font-semibold">Wins 🎉</Label>
                {wins.map((win, idx) => (
                  <Input
                    key={`win-${idx}`}
                    placeholder={`Win #${idx + 1}`}
                    value={win}
                    onChange={(e) => {
                      const newWins = [...wins];
                      newWins[idx] = e.target.value;
                      setWins(newWins);
                    }}
                    className="min-h-12"
                  />
                ))}
              </div>

              <div className="space-y-4">
                <Label className="text-sm md:text-base font-semibold">Misses 🎯</Label>
                {misses.map((miss, idx) => (
                  <Input
                    key={`miss-${idx}`}
                    placeholder={`Miss #${idx + 1}`}
                    value={miss}
                    onChange={(e) => {
                      const newMisses = [...misses];
                      newMisses[idx] = e.target.value;
                      setMisses(newMisses);
                    }}
                    className="min-h-12"
                  />
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-sm md:text-base">Why did I miss these? What was the root cause?</Label>
                <Textarea
                  placeholder="Reflect on the reasons behind your misses..."
                  value={missReasons}
                  onChange={(e) => setMissReasons(e.target.value)}
                  className="min-h-[100px] text-sm md:text-base"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Harada Pillars */}
          <AccordionItem value="harada-pillars" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-base md:text-lg font-semibold">Harada Pillar Health Check</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6 space-y-6">
              <p className="text-xs md:text-sm text-muted-foreground">Rate each life pillar from 1-10 and add notes</p>
              {HARADA_PILLARS.map((pillar) => {
                const pillarData = pillarScores[pillar] || { score: 5, notes: '' };
                return (
                  <div key={pillar} className="space-y-3 p-3 md:p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm md:text-base font-semibold">{pillar}</Label>
                      <span className="text-xl md:text-2xl font-bold text-primary">{pillarData.score}/10</span>
                    </div>
                    <Slider
                      value={[pillarData.score]}
                      onValueChange={([value]) => updatePillarScore(pillar, value)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <Textarea
                      placeholder={`Notes about ${pillar}...`}
                      value={pillarData.notes}
                      onChange={(e) => updatePillarNotes(pillar, e.target.value)}
                      className="min-h-[60px] text-sm md:text-base"
                    />
                  </div>
                );
              })}

              <div className="space-y-2 pt-4">
                <Label className="text-sm md:text-base">Which pillar needs the most attention this week?</Label>
                <Input
                  placeholder="e.g., Physical Health, Relationships..."
                  value={pillarNeedsAttention}
                  onChange={(e) => setPillarNeedsAttention(e.target.value)}
                  className="min-h-12"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Next Week Priorities */}
          <AccordionItem value="priorities" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-base md:text-lg font-semibold">Next Week's Priorities</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6 space-y-4">
              <p className="text-xs md:text-sm text-muted-foreground">Set your top 3 priorities for the upcoming week</p>
              {weekPriorities.map((priority, idx) => (
                <div key={`priority-${idx}`} className="space-y-2">
                  <Label className="text-sm md:text-base">Priority #{idx + 1}</Label>
                  <Textarea
                    placeholder={`What's your ${idx === 0 ? 'top' : idx === 1 ? 'second' : 'third'} priority?`}
                    value={priority}
                    onChange={(e) => {
                      const newPriorities = [...weekPriorities];
                      newPriorities[idx] = e.target.value;
                      setWeekPriorities(newPriorities);
                    }}
                    className="min-h-[80px] text-sm md:text-base"
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Environment Reset */}
          <AccordionItem value="environment" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 md:px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-base md:text-lg font-semibold">Environment Reset</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 md:px-6 pb-6">
              <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
                <Checkbox
                  id="environment-reset"
                  checked={environmentReset}
                  onCheckedChange={(checked) => setEnvironmentReset(checked as boolean)}
                  className="h-6 w-6"
                />
                <Label
                  htmlFor="environment-reset"
                  className="text-sm md:text-base flex-1 cursor-pointer"
                >
                  I have reset my environment (cleaned workspace, organized files, prepared for the week)
                </Label>
              </div>
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
          Save Weekly Reset
        </Button>
      </div>
    </div>
  );
}
