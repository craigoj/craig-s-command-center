import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BrainBarProps {
  onTaskCreated?: () => void;
}

export const BrainBar = ({ onTaskCreated }: BrainBarProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      // Call AI to classify input
      const { data: classification, error: aiError } = await supabase.functions.invoke('classify-input', {
        body: { input: input.trim() }
      });

      if (aiError) throw aiError;

      if (classification.type === 'task') {
        // Find or create project
        let projectId = null;
        
        if (classification.suggested_project) {
          // Check if project exists
          const { data: existingProject } = await supabase
            .from('projects')
            .select('id')
            .ilike('name', classification.suggested_project)
            .single();

          if (existingProject) {
            projectId = existingProject.id;
          } else {
            // Get domain id
            const { data: domain } = await supabase
              .from('domains')
              .select('id')
              .ilike('name', classification.suggested_domain || 'SSC')
              .single();

            // Create new project
            const { data: newProject } = await supabase
              .from('projects')
              .insert({
                name: classification.suggested_project,
                domain_id: domain?.id,
                priority: classification.priority || 3
              })
              .select()
              .single();

            projectId = newProject?.id;
          }
        }

        // Create task
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            name: classification.task_name,
            description: classification.description,
            project_id: projectId,
            priority: classification.priority || 3,
            is_top_priority: classification.priority === 1
          });

        if (taskError) throw taskError;

        toast({
          title: "Task created",
          description: classification.task_name,
        });

        onTaskCreated?.();
      } else {
        // Show AI response for questions
        toast({
          title: "AI Response",
          description: classification.response || "Processed your request",
        });
      }

      setInput("");
    } catch (error) {
      console.error('Error processing input:', error);
      toast({
        title: "Error",
        description: "Failed to process input",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto">
      <div className="relative">
        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What do you want clarity on?"
          disabled={isProcessing}
          className="h-14 pl-12 pr-32 text-lg bg-card border-border focus:border-primary transition-all"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Process"
          )}
        </Button>
      </div>
    </form>
  );
};