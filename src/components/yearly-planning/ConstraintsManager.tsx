import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Goal,
  Plus,
  Edit2,
  Trash2,
  FolderKanban,
  Rocket,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from '@/components/ui/animations';

interface Constraint {
  id: string;
  title: string;
  description: string | null;
  constraint_type: string;
  active: boolean;
}

interface ConstraintsManagerProps {
  yearlyPlanId: string;
}

const constraintTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; examples: string }> = {
  projects: { 
    label: "Projects", 
    icon: FolderKanban, 
    color: "text-blue-600",
    examples: "e.g., Max 3 active projects"
  },
  shipping: { 
    label: "Shipping", 
    icon: Rocket, 
    color: "text-green-600",
    examples: "e.g., Ship something every week"
  },
  habit: { 
    label: "Habit", 
    icon: Repeat, 
    color: "text-purple-600",
    examples: "e.g., No phone first 30 min"
  },
  ritual: { 
    label: "Ritual", 
    icon: Sparkles, 
    color: "text-orange-600",
    examples: "e.g., Weekly review every Sunday"
  },
};

export default function ConstraintsManager({ yearlyPlanId }: ConstraintsManagerProps) {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    constraint_type: 'projects',
  });

  useEffect(() => {
    fetchConstraints();
  }, [yearlyPlanId]);

  const fetchConstraints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('planning_constraints')
        .select('*')
        .eq('yearly_plan_id', yearlyPlanId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConstraints(data || []);
    } catch (error) {
      console.error('Error fetching constraints:', error);
      toast.error('Failed to load constraints');
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
        .from('planning_constraints')
        .insert({
          user_id: user.id,
          yearly_plan_id: yearlyPlanId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          constraint_type: form.constraint_type,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setConstraints([...constraints, data]);
      setShowAddModal(false);
      setForm({ title: '', description: '', constraint_type: 'projects' });
      toast.success('Constraint added!');
    } catch (error) {
      console.error('Error adding constraint:', error);
      toast.error('Failed to add constraint');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingConstraint || !form.title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('planning_constraints')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          constraint_type: form.constraint_type,
        })
        .eq('id', editingConstraint.id);

      if (error) throw error;

      setConstraints(constraints.map(c => 
        c.id === editingConstraint.id 
          ? { ...c, title: form.title.trim(), description: form.description.trim() || null, constraint_type: form.constraint_type }
          : c
      ));
      setShowEditModal(false);
      setEditingConstraint(null);
      toast.success('Constraint updated!');
    } catch (error) {
      console.error('Error updating constraint:', error);
      toast.error('Failed to update constraint');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (constraint: Constraint) => {
    try {
      const { error } = await supabase
        .from('planning_constraints')
        .update({ active: !constraint.active })
        .eq('id', constraint.id);

      if (error) throw error;

      setConstraints(constraints.map(c => 
        c.id === constraint.id ? { ...c, active: !c.active } : c
      ));
      toast.success(constraint.active ? 'Constraint paused' : 'Constraint activated');
    } catch (error) {
      console.error('Error toggling constraint:', error);
      toast.error('Failed to update constraint');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('planning_constraints')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConstraints(constraints.filter(c => c.id !== id));
      toast.success('Constraint removed');
    } catch (error) {
      console.error('Error deleting constraint:', error);
      toast.error('Failed to delete constraint');
    }
  };

  const openEditModal = (constraint: Constraint) => {
    setEditingConstraint(constraint);
    setForm({
      title: constraint.title,
      description: constraint.description || '',
      constraint_type: constraint.constraint_type,
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setForm({ title: '', description: '', constraint_type: 'projects' });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Goal className="w-5 h-5" />
            Constraints
          </CardTitle>
          <CardDescription>Rules that keep you focused</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Goal className="w-5 h-5" />
                Constraints
              </CardTitle>
              <CardDescription>Personal rules that keep you focused and disciplined</CardDescription>
            </div>
            <Button size="sm" onClick={openAddModal} className="gap-1">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {constraints.length === 0 ? (
            <motion.div 
              className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Goal className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">No constraints yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Constraints reduce decision paralysis and keep you focused
              </p>
              <Button variant="outline" size="sm" onClick={openAddModal} className="gap-1">
                <Plus className="w-4 h-4" />
                Add your first constraint
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {constraints.map((constraint) => {
                  const config = constraintTypeConfig[constraint.constraint_type] || constraintTypeConfig.projects;
                  const TypeIcon = config.icon;
                  
                  return (
                    <motion.div
                      key={constraint.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        constraint.active ? "bg-card" : "bg-muted/30 opacity-60"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", 
                        constraint.active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <TypeIcon className={cn("w-5 h-5", constraint.active ? config.color : "text-muted-foreground")} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("font-medium truncate", !constraint.active && "text-muted-foreground")}>
                            {constraint.title}
                          </p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        {constraint.description && (
                          <p className="text-sm text-muted-foreground truncate">{constraint.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={constraint.active}
                          onCheckedChange={() => handleToggleActive(constraint)}
                          aria-label={constraint.active ? 'Pause constraint' : 'Activate constraint'}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal(constraint)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(constraint.id)}
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
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Add Constraint</DialogTitle>
            <DialogDescription>
              Create a personal rule to keep you focused and disciplined
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="constraint-type">Type</Label>
              <Select 
                value={form.constraint_type} 
                onValueChange={(value) => setForm({ ...form, constraint_type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(constraintTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {constraintTypeConfig[form.constraint_type]?.examples}
              </p>
            </div>
            <div>
              <Label htmlFor="constraint-title">Title</Label>
              <Input
                id="constraint-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Max 3 active projects"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="constraint-description">Description (optional)</Label>
              <Textarea
                id="constraint-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Why this constraint matters to you..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !form.title.trim()}>
              {saving ? 'Adding...' : 'Add Constraint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Edit Constraint</DialogTitle>
            <DialogDescription>
              Update your constraint details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-constraint-type">Type</Label>
              <Select 
                value={form.constraint_type} 
                onValueChange={(value) => setForm({ ...form, constraint_type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(constraintTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-constraint-title">Title</Label>
              <Input
                id="edit-constraint-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-constraint-description">Description (optional)</Label>
              <Textarea
                id="edit-constraint-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
