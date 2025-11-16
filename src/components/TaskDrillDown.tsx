import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ContextLinker } from "@/components/ContextLinker";
import { TaskWithRelations, TaskStep } from "@/types/database";

interface TaskDrillDownProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const TaskDrillDown = ({ taskId, isOpen, onClose, onTaskUpdated }: TaskDrillDownProps) => {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (taskId && isOpen) {
      loadTask();
      loadSteps();
    }
  }, [taskId, isOpen]);

  const loadTask = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(
          name,
          domain:domains(name, color, icon)
        )
      `)
      .eq('id', taskId)
      .single();

    setTask(data as TaskWithRelations);
  };

  const loadSteps = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index');

    setSteps(data || []);
  };

  const generateSteps = async () => {
    if (!task) return;

    setIsGeneratingSteps(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-steps', {
        body: {
          taskName: task.name,
          taskDescription: task.description
        }
      });

      if (error) throw error;

      // Delete existing steps
      await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskId);

      // Insert new steps
      const newSteps = data.steps.map((text: string, index: number) => ({
        task_id: taskId,
        text,
        order_index: index,
        is_complete: false
      }));

      const { error: insertError } = await supabase
        .from('task_steps')
        .insert(newSteps);

      if (insertError) throw insertError;

      await loadSteps();

      toast({
        title: "Steps generated",
        description: `${data.steps.length} execution steps created`,
      });
    } catch (error) {
      console.error('Error generating steps:', error);
      toast({
        title: "Error",
        description: "Failed to generate steps",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const toggleStep = async (stepId: string, isComplete: boolean) => {
    await supabase
      .from('task_steps')
      .update({ is_complete: isComplete })
      .eq('id', stepId);

    await loadSteps();
    await updateTaskProgress();
  };

  const updateTaskProgress = async () => {
    if (!taskId || steps.length === 0) return;

    const completedSteps = steps.filter(s => s.is_complete).length;
    const progress = Math.round((completedSteps / steps.length) * 100);

    await supabase
      .from('tasks')
      .update({ progress })
      .eq('id', taskId);

    await loadTask();
    onTaskUpdated?.();
  };

  const priorityLabel = task ? ['Critical', 'High', 'Medium', 'Low', 'Backlog'][task.priority - 1] : '';

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            {task.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            {task.project?.domain && (
              <Badge variant="secondary" className="gap-1">
                <span>{task.project.domain.icon}</span>
                {task.project.domain.name}
              </Badge>
            )}
            {task.project?.name && (
              <Badge variant="outline">{task.project.name}</Badge>
            )}
            <Badge variant={task.priority === 1 ? "destructive" : "secondary"}>
              {priorityLabel}
            </Badge>
            {task.due_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h3 className="font-semibold">Description</h3>
              <p className="text-muted-foreground">{task.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Progress</span>
              <span className="text-muted-foreground">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-3" />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Execution Steps</h3>
              <Button
                onClick={generateSteps}
                disabled={isGeneratingSteps}
                size="sm"
                variant="outline"
              >
                {isGeneratingSteps ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {steps.length > 0 ? 'Regenerate' : 'Generate'} Steps
              </Button>
            </div>

            {steps.length > 0 ? (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
                  >
                    <Checkbox
                      checked={step.is_complete}
                      onCheckedChange={(checked) => toggleStep(step.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <span className={step.is_complete ? 'line-through text-muted-foreground' : ''}>
                        {index + 1}. {step.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No steps yet. Generate steps using AI to get started.
              </p>
            )}
          </div>

          {/* Context Linker */}
          <Separator className="my-6" />
          <div className="space-y-4">
            <h3 className="font-semibold">Related Knowledge</h3>
            <ContextLinker taskId={taskId!} onLinked={loadTask} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};