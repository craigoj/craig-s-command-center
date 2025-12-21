import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Flame, 
  Trophy,
  Zap,
  Heart,
  Sparkles,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface DailyScore {
  id: string;
  date_score: string;
  hard_thing: string | null;
  discomfort_faced: string | null;
  small_win: string | null;
  life_resume_worthy: boolean;
}

interface DailyScorecardProps {
  compact?: boolean;
  onSave?: () => void;
}

export default function DailyScorecard({ compact = false, onSave }: DailyScorecardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingScore, setExistingScore] = useState<DailyScore | null>(null);
  const [streak, setStreak] = useState(0);
  
  const [formData, setFormData] = useState({
    hard_thing: '',
    discomfort_faced: '',
    small_win: '',
    life_resume_worthy: false,
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    const loadTodayScore = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch today's score
        const { data: score } = await supabase
          .from('daily_scores')
          .select('*')
          .eq('user_id', user.id)
          .eq('date_score', todayStr)
          .maybeSingle();

        if (score) {
          setExistingScore(score);
          setFormData({
            hard_thing: score.hard_thing || '',
            discomfort_faced: score.discomfort_faced || '',
            small_win: score.small_win || '',
            life_resume_worthy: score.life_resume_worthy,
          });
        }

        // Calculate streak
        const { data: scores } = await supabase
          .from('daily_scores')
          .select('date_score')
          .eq('user_id', user.id)
          .order('date_score', { ascending: false })
          .limit(60);

        if (scores && scores.length > 0) {
          let currentStreak = 0;
          let checkDate = new Date();
          checkDate.setHours(0, 0, 0, 0);

          for (const s of scores) {
            const scoreDate = new Date(s.date_score);
            scoreDate.setHours(0, 0, 0, 0);
            const daysDiff = differenceInDays(checkDate, scoreDate);

            if (daysDiff === 0 || daysDiff === 1) {
              currentStreak++;
              checkDate = scoreDate;
            } else {
              break;
            }
          }
          setStreak(currentStreak);
        }
      } catch (error) {
        console.error('Error loading daily score:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTodayScore();
  }, [todayStr]);

  const handleSave = async () => {
    // Validate at least one field is filled
    if (!formData.hard_thing.trim() && !formData.discomfort_faced.trim() && !formData.small_win.trim()) {
      toast.error('Please fill in at least one field');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const scoreData = {
        user_id: user.id,
        date_score: todayStr,
        hard_thing: formData.hard_thing.trim() || null,
        discomfort_faced: formData.discomfort_faced.trim() || null,
        small_win: formData.small_win.trim() || null,
        life_resume_worthy: formData.life_resume_worthy,
      };

      if (existingScore) {
        // Update existing
        const { error } = await supabase
          .from('daily_scores')
          .update(scoreData)
          .eq('id', existingScore.id);

        if (error) throw error;
        toast.success('Daily score updated!');
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('daily_scores')
          .insert(scoreData)
          .select()
          .single();

        if (error) throw error;
        setExistingScore(data);
        setStreak(prev => prev + 1);
        toast.success('Daily score logged! Keep the streak going 🔥');
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving daily score:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!existingScore) {
      return formData.hard_thing.trim() || formData.discomfort_faced.trim() || formData.small_win.trim();
    }
    return (
      (formData.hard_thing || '') !== (existingScore.hard_thing || '') ||
      (formData.discomfort_faced || '') !== (existingScore.discomfort_faced || '') ||
      (formData.small_win || '') !== (existingScore.small_win || '') ||
      formData.life_resume_worthy !== existingScore.life_resume_worthy
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'shadow-lg'}>
      <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Daily Scorecard</CardTitle>
              <CardDescription className="text-xs md:text-sm">{format(today, 'EEE, MMM d')}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {streak > 0 && (
              <Badge variant="secondary" className="gap-1 bg-orange-500/10 text-orange-600 text-xs">
                <Flame className="w-3 h-3" />
                {streak}-day
              </Badge>
            )}
            {existingScore && (
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Logged
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-5 px-4 md:px-6">
        {/* Hard thing */}
        <div className="space-y-2">
          <Label htmlFor="hard-thing" className="flex items-center gap-2 text-sm font-medium">
            <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
            <span>What hard thing did you do today?</span>
          </Label>
          <Textarea
            id="hard-thing"
            placeholder="Coded for 4 hours straight on new feature..."
            value={formData.hard_thing}
            onChange={(e) => setFormData({ ...formData, hard_thing: e.target.value })}
            className="resize-none min-h-[80px] md:min-h-[80px] text-base"
          />
          <p className="text-xs text-muted-foreground">
            The thing that required effort, discipline, or focus.
          </p>
        </div>

        {/* Discomfort */}
        <div className="space-y-2">
          <Label htmlFor="discomfort" className="flex items-center gap-2 text-sm font-medium">
            <Heart className="w-4 h-4 text-red-500 shrink-0" />
            <span>What discomfort did you face?</span>
          </Label>
          <Textarea
            id="discomfort"
            placeholder="Had a difficult conversation with a client..."
            value={formData.discomfort_faced}
            onChange={(e) => setFormData({ ...formData, discomfort_faced: e.target.value })}
            className="resize-none min-h-[80px] md:min-h-[80px] text-base"
          />
          <p className="text-xs text-muted-foreground">
            Growth happens at the edge of comfort.
          </p>
        </div>

        {/* Small win */}
        <div className="space-y-2">
          <Label htmlFor="small-win" className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="w-4 h-4 text-primary shrink-0" />
            <span>What small win happened?</span>
          </Label>
          <Textarea
            id="small-win"
            placeholder="Got positive feedback from a user..."
            value={formData.small_win}
            onChange={(e) => setFormData({ ...formData, small_win: e.target.value })}
            className="resize-none min-h-[80px] md:min-h-[80px] text-base"
          />
          <p className="text-xs text-muted-foreground">
            Evidence matters. Capture the proof.
          </p>
        </div>

        {/* Life resume worthy */}
        <div className="flex items-start space-x-3 rounded-lg border p-3 md:p-4 bg-primary/5">
          <Checkbox
            id="life-resume"
            checked={formData.life_resume_worthy}
            onCheckedChange={(checked) => setFormData({ ...formData, life_resume_worthy: !!checked })}
            className="mt-0.5 h-5 w-5"
          />
          <div className="space-y-1 leading-none min-w-0">
            <Label htmlFor="life-resume" className="flex items-center gap-2 cursor-pointer text-sm md:text-base">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Life-resume-worthy day</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Would you proudly tell someone about today?
            </p>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges()}
          className="w-full gap-2 min-h-[48px] text-base"
          size="lg"
        >
          {saving ? (
            'Saving...'
          ) : existingScore ? (
            <>
              <Save className="w-4 h-4" />
              Update Score
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save & Done
            </>
          )}
        </Button>

        {/* Motivational footer */}
        <p className="text-center text-xs text-muted-foreground italic px-2">
          {streak === 0 && "Start your streak today. One day at a time."}
          {streak > 0 && streak < 7 && "Building momentum. Keep showing up!"}
          {streak >= 7 && streak < 30 && "One week strong! Consistency is your superpower."}
          {streak >= 30 && "30+ days! You're proving who you are. Legendary."}
        </p>
      </CardContent>
    </Card>
  );
}
