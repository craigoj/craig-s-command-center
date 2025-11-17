import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StagnantTask {
  id: string;
  name: string;
  priority: number;
  daysSinceCreated: number;
}

export const TaskAgingAlert = () => {
  const [stagnantTasks, setStagnantTasks] = useState<StagnantTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStagnantTasks();
  }, []);

  const loadStagnantTasks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke<{ stagnantTasks: StagnantTask[] }>('stagnant-tasks');

      if (error) throw error;

      if (data?.stagnantTasks && data.stagnantTasks.length > 0) {
        setStagnantTasks(data.stagnantTasks);
      } else {
        setStagnantTasks([]);
      }
    } catch (error) {
      console.error('Error loading stagnant tasks:', error);
    }
  };

  const handleArchive = async (taskId: string) => {
    try {
      await supabase
        .from('tasks')
        .update({ progress: -1 }) // Use -1 to indicate archived
        .eq('id', taskId);

      setStagnantTasks(prev => prev.filter(t => t.id !== taskId));

      toast({
        title: "Task archived",
        description: "Moved to archive",
      });
    } catch (error) {
      console.error('Error archiving task:', error);
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
    }
  };

  const handleNeedHelp = (taskId: string, taskName: string) => {
    // This would open the task drill-down with focus on generating steps
    toast({
      title: "Opening task",
      description: "Generate steps to break this down",
    });
    // Could emit event or use callback to parent
  };

  if (stagnantTasks.length === 0) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">Task Aging Alert</h3>
              <p className="text-sm text-muted-foreground">
                {stagnantTasks.length} high-priority task{stagnantTasks.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {stagnantTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border bg-card/50 space-y-3"
              >
                <div>
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-muted-foreground">
                    No progress for {task.daysSinceCreated} days
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNeedHelp(task.id, task.name)}
                  >
                    Need Help Breaking Down
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(task.id)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};