import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Sparkles, 
  Calendar,
  Flame,
  Target,
  Edit2,
  Dumbbell,
  Brain,
  Lightbulb,
  Trophy,
  PartyPopper,
  Clock,
  TrendingUp,
} from 'lucide-react';
import ConstraintsManager from './ConstraintsManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, AnimatedProgress, AnimatedFlame } from '@/components/ui/animations';
import { useConfetti } from '@/hooks/useConfetti';

interface Misogi {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  completion_percentage: number;
  daily_action_required: boolean;
  start_date: string | null;
  end_date: string | null;
  difficulty_level: number | null;
}

interface GoalsTabProps {
  misogi: Misogi | null;
  yearlyPlanId: string;
  onMisogiUpdate: (misogi: Misogi) => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  physical: { label: "Physical", icon: Dumbbell, color: "text-green-600" },
  mental_emotional: { label: "Mental/Emotional", icon: Brain, color: "text-purple-600" },
  creative: { label: "Creative", icon: Lightbulb, color: "text-orange-600" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-orange-500/10 text-orange-600" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600" },
  abandoned: { label: "Abandoned", color: "bg-red-500/10 text-red-600" },
};

const milestoneMessages: Record<number, string> = {
  25: "Great start! You're 1/4 of the way there! 🚀",
  50: "Halfway there! Keep pushing! 💪",
  75: "Amazing progress! The finish line is in sight! 🔥",
  100: "INCREDIBLE! You completed your Misogi! 🎉🏆",
};

export default function GoalsTab({ misogi: initialMisogi, yearlyPlanId, onMisogiUpdate }: GoalsTabProps) {
  const navigate = useNavigate();
  const { fireCelebration } = useConfetti();
  const [misogi, setMisogi] = useState<Misogi | null>(initialMisogi);
  const [progressValue, setProgressValue] = useState(initialMisogi?.completion_percentage || 0);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    daily_action_required: false,
  });
  const [todayActionDone, setTodayActionDone] = useState(false);
  const [actionStreak, setActionStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    setMisogi(initialMisogi);
    setProgressValue(initialMisogi?.completion_percentage || 0);
    if (initialMisogi) {
      setEditForm({
        title: initialMisogi.title,
        description: initialMisogi.description || '',
        daily_action_required: initialMisogi.daily_action_required,
      });
    }
  }, [initialMisogi]);

  // Check if today's action was logged
  useEffect(() => {
    const checkTodayAction = async () => {
      if (!misogi?.daily_action_required) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_scores')
        .select('id')
        .eq('user_id', user.id)
        .eq('date_score', today)
        .maybeSingle();

      setTodayActionDone(!!data);

      // Calculate streak
      const { data: scores } = await supabase
        .from('daily_scores')
        .select('date_score')
        .eq('user_id', user.id)
        .order('date_score', { ascending: false })
        .limit(30);

      if (scores) {
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        for (const score of scores) {
          const scoreDate = new Date(score.date_score);
          scoreDate.setHours(0, 0, 0, 0);
          const daysDiff = differenceInDays(checkDate, scoreDate);
          
          if (daysDiff === 0 || daysDiff === 1) {
            streak++;
            checkDate = scoreDate;
          } else {
            break;
          }
        }
        setActionStreak(streak);
      }
    };

    checkTodayAction();
  }, [misogi]);

  const handleProgressUpdate = async () => {
    if (!misogi) return;
    
    const clampedValue = Math.min(100, Math.max(0, progressValue));
    const previousValue = misogi.completion_percentage;
    
    setSaving(true);
    try {
      const updates: Partial<Misogi> = {
        completion_percentage: clampedValue,
      };

      // Auto-update status based on progress
      if (clampedValue === 100 && misogi.status !== 'completed') {
        updates.status = 'completed';
      } else if (clampedValue > 0 && misogi.status === 'planned') {
        updates.status = 'in_progress';
      }

      const { error } = await supabase
        .from('misogi')
        .update(updates)
        .eq('id', misogi.id);

      if (error) throw error;

      const updatedMisogi = { ...misogi, ...updates };
      setMisogi(updatedMisogi);
      onMisogiUpdate(updatedMisogi);

      // Check for milestone
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (previousValue < milestone && clampedValue >= milestone) {
          toast.success(milestoneMessages[milestone]);
          if (milestone === 100) {
            fireCelebration();
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 3000);
          }
          break;
        }
      }

      toast.success('Progress updated!');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!misogi) return;

    // Validate status transitions
    if (misogi.status === 'completed' && newStatus === 'planned') {
      toast.error("Can't go back to planned from completed");
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<Misogi> = { status: newStatus };
      
      // Auto-set progress for completed
      if (newStatus === 'completed' && misogi.completion_percentage < 100) {
        updates.completion_percentage = 100;
        setProgressValue(100);
      }

      const { error } = await supabase
        .from('misogi')
        .update(updates)
        .eq('id', misogi.id);

      if (error) throw error;

      const updatedMisogi = { ...misogi, ...updates };
      setMisogi(updatedMisogi);
      onMisogiUpdate(updatedMisogi);

      if (newStatus === 'completed') {
        fireCelebration();
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      toast.success('Status updated!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!misogi) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('misogi')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          daily_action_required: editForm.daily_action_required,
        })
        .eq('id', misogi.id);

      if (error) throw error;

      const updatedMisogi = { 
        ...misogi, 
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        daily_action_required: editForm.daily_action_required,
      };
      setMisogi(updatedMisogi);
      onMisogiUpdate(updatedMisogi);
      setShowEditModal(false);
      toast.success('Misogi updated!');
    } catch (error) {
      console.error('Error updating misogi:', error);
      toast.error('Failed to update Misogi');
    } finally {
      setSaving(false);
    }
  };

  const getDaysInfo = () => {
    if (!misogi?.start_date || !misogi?.end_date) return null;
    
    const start = parseISO(misogi.start_date);
    const end = parseISO(misogi.end_date);
    const today = new Date();
    
    const totalDays = differenceInDays(end, start);
    const daysElapsed = Math.max(0, differenceInDays(today, start));
    const daysRemaining = Math.max(0, differenceInDays(end, today));
    
    return { totalDays, daysElapsed, daysRemaining };
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 3) return 'bg-green-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const currentYear = new Date().getFullYear();
  const daysInfo = getDaysInfo();

  // No Misogi state
  if (!misogi) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Misogi Challenge
            </CardTitle>
            <CardDescription>Your impossible goal for the year</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-center py-12"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <motion.div 
                className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 3 
                }}
              >
                <Sparkles className="w-10 h-10 text-orange-500" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">No Misogi Set</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                A Misogi is ONE impossible-seeming challenge that drives daily discipline. 
                Create yours to transform your year.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => navigate('/yearly-planning/onboarding')} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create Misogi
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Constraints Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <ConstraintsManager yearlyPlanId={yearlyPlanId} />
        </motion.div>
      </motion.div>
    );
  }

  const category = categoryConfig[misogi.category] || { label: misogi.category, icon: Target, color: "text-primary" };
  const CategoryIcon = category.icon;
  const status = statusConfig[misogi.status] || statusConfig.planned;

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="text-center space-y-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <PartyPopper className="w-24 h-24 text-primary mx-auto" />
              </motion.div>
              <motion.h2 
                className="text-3xl font-bold"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                MISOGI COMPLETE! 🎉
              </motion.h2>
              <motion.p 
                className="text-muted-foreground"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                You did the impossible. You're legendary.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Misogi Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-1" />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{currentYear} Misogi Challenge</p>
                <CardTitle className="text-xl">{misogi.title}</CardTitle>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {misogi.description && (
            <p className="text-muted-foreground">{misogi.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className={cn("gap-1", category.color)}>
              <CategoryIcon className="w-3 h-3" />
              {category.label}
            </Badge>
            {misogi.difficulty_level && (
              <Badge variant="outline" className="gap-1">
                <div className={cn("w-2 h-2 rounded-full", getDifficultyColor(misogi.difficulty_level))} />
                Difficulty: {misogi.difficulty_level}/10
              </Badge>
            )}
            {misogi.daily_action_required && (
              <Badge variant="outline" className="gap-1 text-orange-600">
                <Flame className="w-3 h-3" />
                Daily Action Required
              </Badge>
            )}
          </div>

          {/* Date range */}
          {daysInfo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {misogi.start_date && format(parseISO(misogi.start_date), 'MMM d, yyyy')}
                {' → '}
                {misogi.end_date && format(parseISO(misogi.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-4">
            <Label className="text-sm">Status:</Label>
            <Select value={misogi.status} onValueChange={handleStatusChange} disabled={saving}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Progress Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Large Progress Bar */}
          <div>
            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-bold text-primary">{misogi.completion_percentage}%</span>
              {daysInfo && (
                <div className="text-right text-sm text-muted-foreground">
                  <p>{daysInfo.daysElapsed} days elapsed</p>
                  <p className="font-medium text-foreground">{daysInfo.daysRemaining} days remaining</p>
                </div>
              )}
            </div>
            <Progress value={misogi.completion_percentage} className="h-4" />
            
            {/* Milestone markers */}
            <div className="relative mt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Progress Update */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="progress">Update Progress</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="progress"
                  type="number"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <Button onClick={handleProgressUpdate} disabled={saving || progressValue === misogi.completion_percentage}>
              {saving ? 'Saving...' : 'Update Progress'}
            </Button>
          </div>

          {/* Motivational message based on progress */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground italic">
              {misogi.completion_percentage === 0 && "Every journey starts with a single step. Begin today."}
              {misogi.completion_percentage > 0 && misogi.completion_percentage < 25 && "You've started! Keep the momentum going."}
              {misogi.completion_percentage >= 25 && misogi.completion_percentage < 50 && "Solid progress! You're building unstoppable momentum."}
              {misogi.completion_percentage >= 50 && misogi.completion_percentage < 75 && "Halfway there! The impossible is becoming possible."}
              {misogi.completion_percentage >= 75 && misogi.completion_percentage < 100 && "Almost there! Push through to the finish line."}
              {misogi.completion_percentage === 100 && "You did it! You completed the impossible. 🏆"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Action Tracker */}
      {misogi.daily_action_required && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5 text-orange-500" />
              Daily Action Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="today-action"
                    checked={todayActionDone}
                    disabled
                  />
                  <Label htmlFor="today-action" className="cursor-pointer">
                    Today's action {todayActionDone ? 'completed' : 'pending'}
                  </Label>
                </div>
                {todayActionDone && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    ✓ Done
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>{actionStreak}-day streak</span>
              </div>
            </div>
            {!todayActionDone && (
              <p className="text-sm text-muted-foreground mt-3">
                Log your daily score in the Tracking tab to mark today's action as complete.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Constraints Manager */}
      <ConstraintsManager yearlyPlanId={yearlyPlanId} />

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Edit Misogi</DialogTitle>
            <DialogDescription>
              Update your Misogi challenge details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-daily"
                checked={editForm.daily_action_required}
                onCheckedChange={(checked) => setEditForm({ ...editForm, daily_action_required: !!checked })}
              />
              <Label htmlFor="edit-daily">Requires daily action</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={saving || !editForm.title.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
