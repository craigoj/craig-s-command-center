import { useState, useEffect } from "react";
import { format, startOfWeek } from "date-fns";
import { Command, Save, Loader2, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-64 pointer-events-none" />
        
        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Command className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Midweek Check-in</h1>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Check-in
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
        {/* Weekly Priorities Review */}
        {weeklyPriorities.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>This Week's Priorities</CardTitle>
              </div>
              <CardDescription>Review your progress on this week's goals</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {weeklyPriorities.map((priority, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-foreground">{priority}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Pillar Needing Attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Pillar Needing Attention</CardTitle>
            </div>
            <CardDescription>
              Which area of your life needs focus this week?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pillar-select">Select Harada Pillar</Label>
              <Select value={pillarAttention} onValueChange={setPillarAttention}>
                <SelectTrigger id="pillar-select">
                  <SelectValue placeholder="Choose a pillar..." />
                </SelectTrigger>
                <SelectContent>
                  {HARADA_PILLARS.map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>
                      {pillar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction-plan">Correction Plan</Label>
              <Textarea
                id="correction-plan"
                placeholder="What specific actions will you take to address this pillar? What changes will you make for the rest of the week?"
                value={correctionPlan}
                onChange={(e) => setCorrectionPlan(e.target.value)}
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Be specific and actionable. What can you do in the next 2-3 days to improve this area?
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reflection Prompts */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Reflection Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Are you on track with your weekly priorities? If not, what's blocking you?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>What's one thing you can do differently in the second half of the week?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Which daily actions have you been consistent with? Which need more attention?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>How can you better support the pillar that needs attention?</span>
              </li>
            </ul>
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
            Save Check-in
          </Button>
        </div>
      </main>
    </div>
  );
}
