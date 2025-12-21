import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Check, 
  X, 
  Calendar,
  Loader2,
  Sparkles,
  Target,
  Shield,
  Rocket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

interface WeeklyReflectionProps {
  yearlyPlanId?: string;
  theme?: string;
}

export default function WeeklyReflection({ yearlyPlanId, theme }: WeeklyReflectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  
  // Form state
  const [proudOfWeek, setProudOfWeek] = useState<boolean | null>(null);
  const [themeAlignment, setThemeAlignment] = useState(50);
  const [comfortChoices, setComfortChoices] = useState('');
  const [actionChoices, setActionChoices] = useState('');
  const [earnedRespect, setEarnedRespect] = useState('');
  
  // Week summary
  const [weekSummary, setWeekSummary] = useState({
    daysLogged: 0,
    lifeResumeWorthy: 0
  });

  // Calculate current week (Monday start - ISO standard)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartDate = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    loadExistingReflection();
    loadWeekSummary();
  }, [weekStartDate]);

  async function loadExistingReflection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('yearly_weekly_reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingId(data.id);
        setProudOfWeek(data.proud_of_week);
        setThemeAlignment(data.theme_alignment_score || 50);
        setComfortChoices(data.comfort_choices || '');
        setActionChoices(data.action_choices || '');
        setEarnedRespect(data.earned_respect || '');
      }
    } catch (error) {
      console.error('Error loading reflection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeekSummary() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekEndDate = format(weekEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_scores')
        .select('life_resume_worthy')
        .eq('user_id', user.id)
        .gte('date_score', weekStartDate)
        .lte('date_score', weekEndDate);

      if (error) throw error;

      if (data) {
        setWeekSummary({
          daysLogged: data.length,
          lifeResumeWorthy: data.filter(d => d.life_resume_worthy).length
        });
      }
    } catch (error) {
      console.error('Error loading week summary:', error);
    }
  }

  async function handleSave() {
    // Validation
    if (proudOfWeek === null) {
      toast({
        title: "Answer required",
        description: "Please answer whether you're proud of this week",
        variant: "destructive"
      });
      return;
    }

    if (!comfortChoices.trim() || !actionChoices.trim() || !earnedRespect.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill in all three reflection prompts",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const reflectionData = {
        user_id: user.id,
        yearly_plan_id: yearlyPlanId || null,
        week_start_date: weekStartDate,
        proud_of_week: proudOfWeek,
        theme_alignment_score: themeAlignment,
        comfort_choices: comfortChoices.trim(),
        action_choices: actionChoices.trim(),
        earned_respect: earnedRespect.trim()
      };

      if (existingId) {
        const { error } = await supabase
          .from('yearly_weekly_reflections')
          .update(reflectionData)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('yearly_weekly_reflections')
          .insert(reflectionData)
          .select()
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }

      toast({
        title: "Reflection saved",
        description: proudOfWeek 
          ? "Great week! Keep building on this momentum." 
          : "Honest reflection is the first step to a better week."
      });
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: "Error saving",
        description: "Failed to save reflection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  function getAlignmentLabel(score: number): string {
    if (score >= 90) return "Exceptional";
    if (score >= 75) return "Strong";
    if (score >= 50) return "Moderate";
    if (score >= 25) return "Weak";
    return "Minimal";
  }

  function getAlignmentColor(score: number): string {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const daysUntilSunday = 7 - today.getDay();
  const isSunday = today.getDay() === 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="text-center pb-2 px-4 md:px-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <CardDescription className="text-xs md:text-sm">
              Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </CardDescription>
          </div>
          <CardTitle className="text-xl md:text-2xl">Weekly Reflection</CardTitle>
          {existingId && (
            <Badge variant="secondary" className="mx-auto mt-2 text-xs">
              <Check className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0 px-4 md:px-6">
          {/* Week Summary */}
          {weekSummary.daysLogged > 0 && (
            <div className="flex justify-center gap-6 py-3 md:py-4 border-t border-border/50 mt-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">{weekSummary.daysLogged}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Days logged</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-500">{weekSummary.lifeResumeWorthy}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Resume-worthy</div>
              </div>
            </div>
          )}
          
          {!isSunday && daysUntilSunday > 0 && (
            <p className="text-center text-xs md:text-sm text-muted-foreground mt-2">
              {daysUntilSunday === 1 ? "Tomorrow is reflection day" : `${daysUntilSunday} days until Sunday`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Question */}
      <Card className="border-2">
        <CardContent className="py-6 md:py-8 px-4 md:px-6">
          <div className="text-center space-y-4 md:space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h2 className="text-lg md:text-xl lg:text-2xl font-serif italic text-foreground/90 max-w-md mx-auto leading-relaxed px-2">
              "Did I live a week I'd be proud to put on my Life Resume?"
            </h2>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4">
              <Button
                size="lg"
                variant={proudOfWeek === true ? "default" : "outline"}
                className={`min-w-[140px] h-12 md:h-14 text-base md:text-lg gap-2 transition-all ${
                  proudOfWeek === true ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => setProudOfWeek(true)}
              >
                <Check className="w-5 h-5" />
                Yes
              </Button>
              <Button
                size="lg"
                variant={proudOfWeek === false ? "destructive" : "outline"}
                className={`min-w-[140px] h-12 md:h-14 text-base md:text-lg gap-2 transition-all ${
                  proudOfWeek === false ? 'ring-2 ring-destructive ring-offset-2' : ''
                }`}
                onClick={() => setProudOfWeek(false)}
              >
                <X className="w-5 h-5" />
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Alignment */}
      <Card>
        <CardHeader className="pb-2 md:pb-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <CardTitle className="text-base md:text-lg">Theme Alignment</CardTitle>
          </div>
          {theme && (
            <CardDescription className="text-xs md:text-sm">
              How well did you live "{theme}"?
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">0%</span>
              <div className="text-center">
                <span className={`text-xl md:text-2xl font-bold ${getAlignmentColor(themeAlignment)}`}>
                  {themeAlignment}%
                </span>
                <span className={`block text-xs md:text-sm ${getAlignmentColor(themeAlignment)}`}>
                  {getAlignmentLabel(themeAlignment)}
                </span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">100%</span>
            </div>
            <Slider
              value={[themeAlignment]}
              onValueChange={(value) => setThemeAlignment(value[0])}
              max={100}
              step={5}
              className="py-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reflection Prompts */}
      <div className="space-y-3 md:space-y-4">
        {/* Comfort Choices */}
        <Card>
          <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 shrink-0" />
              <CardTitle className="text-sm md:text-lg">What kept you comfortable?</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">
              Be honest about where you played it safe
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Textarea
              value={comfortChoices}
              onChange={(e) => setComfortChoices(e.target.value)}
              placeholder="I avoided the hard client call..."
              className="min-h-[80px] md:min-h-[100px] resize-none text-base"
            />
          </CardContent>
        </Card>

        {/* Action Choices */}
        <Card>
          <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 md:w-5 md:h-5 text-green-500 shrink-0" />
              <CardTitle className="text-sm md:text-lg">What moved you forward?</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">
              Celebrate the steps you took
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Textarea
              value={actionChoices}
              onChange={(e) => setActionChoices(e.target.value)}
              placeholder="I shipped the new feature..."
              className="min-h-[80px] md:min-h-[100px] resize-none text-base"
            />
          </CardContent>
        </Card>

        {/* Earned Respect */}
        <Card>
          <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-500 shrink-0" />
              <CardTitle className="text-sm md:text-lg">What earned your self-respect?</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">
              What would you do again?
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Textarea
              value={earnedRespect}
              onChange={(e) => setEarnedRespect(e.target.value)}
              placeholder="I kept my word to myself..."
              className="min-h-[80px] md:min-h-[100px] resize-none text-base"
            />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <Card className="border-primary/20">
        <CardContent className="py-4 md:py-6 px-4 md:px-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="w-full h-12 md:h-14 text-base md:text-lg min-h-[48px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : existingId ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Update Reflection
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 mr-2" />
                Save Reflection
              </>
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground mt-3 md:mt-4 px-2">
            {proudOfWeek === null 
              ? "Answer all questions honestly. This is for you."
              : proudOfWeek 
                ? "A week worth remembering. What made it great?"
                : "Every week is a fresh start. What will you change?"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
