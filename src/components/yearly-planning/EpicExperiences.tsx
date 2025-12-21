import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mountain, 
  BookOpen, 
  Heart, 
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from '@/components/ui/animations';
import { useConfetti } from '@/hooks/useConfetti';

interface EpicExperience {
  id: string;
  title: string;
  description: string | null;
  category: string;
  planned_date: string | null;
  completed: boolean;
  completed_date: string | null;
}

interface EpicExperiencesProps {
  yearlyPlanId: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; lifeResumeCategory: string }> = {
  adventure: { label: "Adventure", icon: Mountain, color: "text-emerald-600", bgColor: "bg-emerald-500/10", lifeResumeCategory: "physical" },
  learning: { label: "Learning", icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-500/10", lifeResumeCategory: "mental_emotional" },
  relationship: { label: "Relationship", icon: Heart, color: "text-pink-600", bgColor: "bg-pink-500/10", lifeResumeCategory: "mental_emotional" },
  challenge: { label: "Challenge", icon: Target, color: "text-orange-600", bgColor: "bg-orange-500/10", lifeResumeCategory: "creative_impact" },
};

const categoryExamples: Record<string, string[]> = {
  adventure: ["Mountain hike", "Travel destination", "Race or competition"],
  learning: ["Take a course", "Learn a new skill", "Deep immersion experience"],
  relationship: ["Family trip", "Meaningful reconnection", "Special date"],
  challenge: ["Speaking event", "Launch something", "Face a fear"],
};

export default function EpicExperiences({ yearlyPlanId }: EpicExperiencesProps) {
  const { fireCelebration } = useConfetti();
  const [experiences, setExperiences] = useState<EpicExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<EpicExperience | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'adventure',
    planned_date: '',
  });

  useEffect(() => {
    fetchExperiences();
  }, [yearlyPlanId]);

  const fetchExperiences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('epic_experiences')
        .select('*')
        .eq('user_id', user.id)
        .eq('yearly_plan_id', yearlyPlanId)
        .order('planned_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setExperiences(data || []);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      toast.error('Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('epic_experiences')
        .insert({
          user_id: user.id,
          yearly_plan_id: yearlyPlanId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          planned_date: form.planned_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      setExperiences([...experiences, data]);
      setShowAddModal(false);
      resetForm();
      toast.success('Experience added!');
    } catch (error) {
      console.error('Error adding experience:', error);
      toast.error('Failed to add experience');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingExperience || !form.title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('epic_experiences')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          planned_date: form.planned_date || null,
        })
        .eq('id', editingExperience.id);

      if (error) throw error;

      setExperiences(experiences.map(exp => 
        exp.id === editingExperience.id 
          ? { ...exp, ...form, description: form.description.trim() || null, planned_date: form.planned_date || null }
          : exp
      ));
      setShowEditModal(false);
      setEditingExperience(null);
      resetForm();
      toast.success('Experience updated!');
    } catch (error) {
      console.error('Error updating experience:', error);
      toast.error('Failed to update experience');
    } finally {
      setSaving(false);
    }
  };

  const addToLifeResume = async (experience: EpicExperience) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const config = categoryConfig[experience.category];
      const lifeResumeCategory = config?.lifeResumeCategory || 'physical';
      const itemText = `Completed: ${experience.title}`;

      // Check if life_resume entry exists for this category
      const { data: existing } = await supabase
        .from('life_resume')
        .select('id, items')
        .eq('user_id', user.id)
        .eq('yearly_plan_id', yearlyPlanId)
        .eq('category', lifeResumeCategory)
        .maybeSingle();

      if (existing) {
        // Add to existing items if not already there
        const currentItems = Array.isArray(existing.items) ? existing.items as string[] : [];
        if (!currentItems.includes(itemText)) {
          await supabase
            .from('life_resume')
            .update({ items: [...currentItems, itemText] })
            .eq('id', existing.id);
        }
      } else {
        // Create new life_resume entry
        await supabase
          .from('life_resume')
          .insert({
            user_id: user.id,
            yearly_plan_id: yearlyPlanId,
            category: lifeResumeCategory,
            items: [itemText],
          });
      }

      toast.success('Added to Life Resume!', {
        description: `"${experience.title}" added to your ${config?.label || 'Life'} Resume`,
      });
    } catch (error) {
      console.error('Error adding to life resume:', error);
      // Don't show error - this is a bonus feature
    }
  };

  const handleToggleComplete = async (experience: EpicExperience) => {
    const newCompleted = !experience.completed;
    
    try {
      const { error } = await supabase
        .from('epic_experiences')
        .update({
          completed: newCompleted,
          completed_date: newCompleted ? format(new Date(), 'yyyy-MM-dd') : null,
        })
        .eq('id', experience.id);

      if (error) throw error;

      setExperiences(experiences.map(exp => 
        exp.id === experience.id 
          ? { ...exp, completed: newCompleted, completed_date: newCompleted ? format(new Date(), 'yyyy-MM-dd') : null }
          : exp
      ));

      if (newCompleted) {
        fireCelebration();
        toast.success('Experience completed! 🎉');
        // Auto-add to life resume
        await addToLifeResume(experience);
      } else {
        toast.success('Experience marked as incomplete');
      }
    } catch (error) {
      console.error('Error toggling experience:', error);
      toast.error('Failed to update experience');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('epic_experiences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExperiences(experiences.filter(exp => exp.id !== id));
      toast.success('Experience deleted');
    } catch (error) {
      console.error('Error deleting experience:', error);
      toast.error('Failed to delete experience');
    }
  };

  const openEditModal = (experience: EpicExperience) => {
    setEditingExperience(experience);
    setForm({
      title: experience.title,
      description: experience.description || '',
      category: experience.category,
      planned_date: experience.planned_date || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: 'adventure',
      planned_date: '',
    });
  };

  const completedCount = experiences.filter(e => e.completed).length;
  const totalCount = experiences.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Epic Experiences</CardTitle>
              <CardDescription>
                {totalCount > 0 
                  ? `${completedCount}/${totalCount} completed`
                  : 'Plan your year\'s adventures'
                }
              </CardDescription>
            </div>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Epic Experience</DialogTitle>
                <DialogDescription>
                  Plan an adventure, learning experience, or meaningful moment for this year.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Hike the Grand Canyon"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className={cn("w-4 h-4", config.color)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Examples: {categoryExamples[form.category]?.join(', ')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What makes this experience meaningful?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned_date">Planned Date (optional)</Label>
                  <Input
                    id="planned_date"
                    type="date"
                    value={form.planned_date}
                    onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving || !form.title.trim()}>
                  {saving ? 'Adding...' : 'Add Experience'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Mountain className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-2">No experiences planned yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Add adventures, learning experiences, and meaningful moments you want to have this year.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {experiences.map((experience) => {
                const config = categoryConfig[experience.category] || categoryConfig.adventure;
                const CategoryIcon = config.icon;
                
                return (
                  <motion.div
                    key={experience.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      experience.completed && "bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={experience.completed}
                      onCheckedChange={() => handleToggleComplete(experience)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "font-medium",
                          experience.completed && "line-through text-muted-foreground"
                        )}>
                          {experience.title}
                        </span>
                        <Badge variant="secondary" className={cn("gap-1 text-xs", config.color, config.bgColor)}>
                          <CategoryIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </div>
                      {experience.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {experience.description}
                        </p>
                      )}
                      {experience.planned_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(experience.planned_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      {experience.completed && experience.completed_date && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed {format(parseISO(experience.completed_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditModal(experience)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(experience.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Experience</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={cn("w-4 h-4", config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-planned_date">Planned Date (optional)</Label>
                <Input
                  id="edit-planned_date"
                  type="date"
                  value={form.planned_date}
                  onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingExperience(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={saving || !form.title.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
