import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description?: string;
    priority: number;
    progress: number;
    due_date?: string;
    project?: {
      name: string;
      domain?: {
        name: string;
        color: string;
        icon: string;
      };
    };
  };
  onClick?: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const priorityLabel = ['Critical', 'High', 'Medium', 'Low', 'Backlog'][task.priority - 1];
  const domainColor = task.project?.domain?.color || '#3B82F6';

  return (
    <Card 
      className="p-6 hover:border-primary cursor-pointer transition-all bg-card/50 backdrop-blur-sm"
      onClick={onClick}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: domainColor,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            {task.progress === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className="font-semibold text-lg">{task.name}</h3>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

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
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
          </div>

          {task.progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};