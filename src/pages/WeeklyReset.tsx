import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { Command, ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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
  const navigate = useNavigate();
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
      for (const pillarName of HARADA_PILLARS) {
        const pillarData = pillarScores[pillarName];
        if (pillarData) {
          await supabase
            .from('harada_pillars')
            .upsert({
              user_id: user.id,
              week_start_date: thisWeekStart,
              pillar_name: pillarName,
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

      navigate('/');
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
      [pillarName]: { ...prev[pillarName], score }
    }));
  };

  const updatePillarNotes = (pillarName: string, notes: string) => {
    setPillarScores(prev => ({
      ...prev,
      [pillarName]: { ...prev[pillarName], notes }
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-64 pointer-events-none" />
        
        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Command className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Weekly Reset</h1>
                    <p className="text-sm text-muted-foreground">
                      Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Reset
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-8">
        {/* Reflection: Wins & Misses */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Reflection</CardTitle>
            <CardDescription>Review your wins and misses from this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Wins 🎉</Label>
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
                />
              ))}
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Misses 🎯</Label>
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
                />
              ))}
            </div>

            <div className="space-y-2">
              <Label>Why did I miss these? What was the root cause?</Label>
              <Textarea
                placeholder="Reflect on the reasons behind your misses..."
                value={missReasons}
                onChange={(e) => setMissReasons(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Harada Pillar Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Harada Pillar Health Check</CardTitle>
            <CardDescription>Rate each life pillar from 1-10 and add notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {HARADA_PILLARS.map((pillar) => {
              const pillarData = pillarScores[pillar] || { score: 5, notes: '' };
              return (
                <div key={pillar} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{pillar}</Label>
                    <span className="text-2xl font-bold text-primary">{pillarData.score}/10</span>
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
                    className="min-h-[60px]"
                  />
                </div>
              );
            })}

            <div className="space-y-2 pt-4">
              <Label>Which pillar needs the most attention this week?</Label>
              <Input
                placeholder="e.g., Physical Health, Relationships..."
                value={pillarNeedsAttention}
                onChange={(e) => setPillarNeedsAttention(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Next Week Priorities */}
        <Card>
          <CardHeader>
            <CardTitle>Next Week's Priorities</CardTitle>
            <CardDescription>Set your top 3 priorities for the upcoming week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weekPriorities.map((priority, idx) => (
              <div key={`priority-${idx}`} className="space-y-2">
                <Label>Priority #{idx + 1}</Label>
                <Input
                  placeholder={`What's priority #${idx + 1}?`}
                  value={priority}
                  onChange={(e) => {
                    const newPriorities = [...weekPriorities];
                    newPriorities[idx] = e.target.value;
                    setWeekPriorities(newPriorities);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Environment Reset */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Reset</CardTitle>
            <CardDescription>Physical environment setup for success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="environment-reset"
                checked={environmentReset}
                onCheckedChange={(checked) => setEnvironmentReset(checked as boolean)}
              />
              <Label
                htmlFor="environment-reset"
                className="text-base font-medium cursor-pointer"
              >
                I have reset my environment (desk, workspace, digital files)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Weekly Reset
          </Button>
        </div>
      </main>
    </div>
  );
}
