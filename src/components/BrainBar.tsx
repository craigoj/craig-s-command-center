import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/useHaptic";

interface BrainBarProps {
  onTaskCreated?: () => void;
}

export const BrainBar = ({ onTaskCreated }: BrainBarProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const haptic = useHaptic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create tasks",
          variant: "destructive",
        });
        return;
      }

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
            .eq('user_id', user.id)
            .ilike('name', classification.suggested_project)
            .single();

          if (existingProject) {
            projectId = existingProject.id;
          } else {
            // Get domain id
            const { data: domain } = await supabase
              .from('domains')
              .select('id')
              .eq('user_id', user.id)
              .ilike('name', classification.suggested_domain || 'SSC')
              .single();

            // Create new project
            const { data: newProject } = await supabase
              .from('projects')
              .insert({
                name: classification.suggested_project,
                domain_id: domain?.id,
                priority: classification.priority || 3,
                user_id: user.id
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
            is_top_priority: classification.priority === 1,
            user_id: user.id
          });

        if (taskError) throw taskError;

        haptic.success();
        toast({
          title: "Task created",
          description: classification.task_name,
        });

        onTaskCreated?.();
      } else {
        haptic.light();
        // Show AI response for questions
        toast({
          title: "AI Response",
          description: classification.response || "Processed your request",
        });
      }

      setInput("");
    } catch (error) {
      console.error('Error processing input:', error);
      haptic.error();
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
        <Sparkles className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-primary" />
        <Input
          type="text"
          placeholder="What's on your mind?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
          className="pl-10 md:pl-12 pr-20 md:pr-24 h-12 md:h-14 text-sm md:text-base bg-card border-2 border-primary/20 focus:border-primary transition-colors"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isProcessing}
          size="sm"
          className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 min-h-9 md:min-h-10"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-xs md:text-sm">Process</span>
          )}
        </Button>
      </div>
    </form>
  );
};