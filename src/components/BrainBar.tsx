import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/useHaptic";
import { BrainBarFixDialog } from "./BrainBarFixDialog";

interface BrainBarProps {
  onTaskCreated?: () => void;
}

interface ClassificationResult {
  category: "task" | "project" | "person" | "learning" | "health" | "content" | "question";
  confidence: number;
  title: string;
  extracted_data: Record<string, unknown>;
}

const categoryEmojis: Record<string, string> = {
  task: "✅",
  project: "📁",
  person: "📇",
  learning: "💡",
  health: "💪",
  content: "🎬",
  question: "❓",
};

const categoryLabels: Record<string, string> = {
  task: "Task",
  project: "Project",
  person: "Contact",
  learning: "Learning",
  health: "Health",
  content: "Content",
  question: "Question",
};

/**
 * BrainBar - Universal AI-powered input for the Second Brain system.
 * 
 * Classifies user input into categories (task, project, person, learning, etc.)
 * using AI and automatically routes to appropriate database tables.
 * 
 * Features:
 * - Real-time AI classification with confidence scores
 * - Auto-routing for high-confidence inputs (≥70%)
 * - Review queue for low-confidence inputs
 * - Fix dialog for manual correction
 * 
 * @param onTaskCreated - Callback fired after successful record creation
 */
export const BrainBar = ({ onTaskCreated }: BrainBarProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [pendingClassification, setPendingClassification] = useState<{
    rawInput: string;
    classification: ClassificationResult;
    captureLogId?: string;
  } | null>(null);
  const { toast } = useToast();
  const haptic = useHaptic();

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "bg-green-500";
    if (conf >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const saveToIntakeForReview = async (
    userId: string,
    rawInput: string,
    classification: ClassificationResult
  ) => {
    const { error } = await supabase.from("intake_items").insert({
      user_id: userId,
      raw_text: rawInput,
      classified_category: classification.category,
      confidence_score: classification.confidence,
      needs_review: true,
      auto_processed: false,
      parsed_type: classification.category,
    });
    if (error) throw error;
  };

  const logToCapture = async (
    userId: string,
    rawInput: string,
    classification: ClassificationResult,
    destinationTable?: string,
    destinationId?: string
  ) => {
    const { data, error } = await supabase
      .from("capture_log")
      .insert({
        user_id: userId,
        raw_input: rawInput,
        classified_as: classification.category,
        destination_table: destinationTable,
        destination_id: destinationId,
        confidence_score: classification.confidence,
        needs_review: classification.confidence < 0.7,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  };

  const createRecordByCategory = async (
    userId: string,
    classification: ClassificationResult
  ): Promise<{ table: string; id: string } | null> => {
    const { category, extracted_data, title } = classification;

    switch (category) {
      case "task": {
        const data = extracted_data as {
          task_name?: string;
          description?: string;
          priority?: string;
          suggested_project?: string;
          suggested_domain?: string;
        };

        let projectId = null;
        if (data.suggested_project) {
          const { data: existingProject } = await supabase
            .from("projects")
            .select("id")
            .eq("user_id", userId)
            .ilike("name", data.suggested_project)
            .single();

          if (existingProject) {
            projectId = existingProject.id;
          } else {
            const { data: domain } = await supabase
              .from("domains")
              .select("id")
              .eq("user_id", userId)
              .ilike("name", data.suggested_domain || "SSC")
              .single();

            const { data: newProject } = await supabase
              .from("projects")
              .insert({
                name: data.suggested_project,
                domain_id: domain?.id,
                priority: data.priority === "high" ? 1 : data.priority === "medium" ? 2 : 3,
                user_id: userId,
              })
              .select()
              .single();

            projectId = newProject?.id;
          }
        }

        const priorityMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            name: data.task_name || title,
            description: data.description,
            project_id: projectId,
            priority: priorityMap[data.priority || "medium"] || 3,
            is_top_priority: data.priority === "high",
            user_id: userId,
          })
          .select("id")
          .single();

        if (error) throw error;
        return { table: "tasks", id: task.id };
      }

      case "person": {
        const data = extracted_data as {
          name?: string;
          context?: string;
          follow_up?: string;
          tags?: string[];
        };

        const { data: contact, error } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            name: data.name || title,
            context: data.context,
            follow_up: data.follow_up,
            tags: data.tags || [],
          })
          .select("id")
          .single();

        if (error) throw error;
        return { table: "contacts", id: contact.id };
      }

      case "learning": {
        const data = extracted_data as {
          title?: string;
          category?: string;
          key_insight?: string;
          application?: string;
          source?: string;
        };

        const { data: insight, error } = await supabase
          .from("learning_insights")
          .insert({
            user_id: userId,
            title: data.title || title,
            category: data.category,
            key_insight: data.key_insight || title,
            application: data.application,
            source: data.source,
          })
          .select("id")
          .single();

        if (error) throw error;
        return { table: "learning_insights", id: insight.id };
      }

      case "project": {
        const data = extracted_data as {
          project_name?: string;
          domain?: string;
          status?: string;
          next_action?: string;
        };

        const { data: domain } = await supabase
          .from("domains")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", data.domain || "SSC")
          .single();

        const { data: project, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            name: data.project_name || title,
            domain_id: domain?.id,
            status: data.status?.toLowerCase() || "active",
          })
          .select("id")
          .single();

        if (error) throw error;

        // Create first task if next_action provided
        if (data.next_action && project) {
          await supabase.from("tasks").insert({
            user_id: userId,
            name: data.next_action,
            project_id: project.id,
            priority: 2,
          });
        }

        return { table: "projects", id: project.id };
      }

      case "health":
      case "content": {
        // For health and content, save to intake for now until dedicated tables exist
        await supabase.from("intake_items").insert({
          user_id: userId,
          raw_text: title,
          classified_category: category,
          confidence_score: classification.confidence,
          needs_review: false,
          auto_processed: true,
          parsed_type: category,
        });
        return { table: "intake_items", id: "logged" };
      }

      case "question": {
        // Questions don't create records - they get AI responses
        return null;
      }

      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setConfidence(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to use Brain Bar",
          variant: "destructive",
        });
        return;
      }

      // Call AI to classify input
      const { data: classification, error: aiError } = await supabase.functions.invoke(
        "classify-input",
        {
          body: { input: input.trim() },
        }
      );

      if (aiError) throw aiError;

      const result = classification as ClassificationResult;
      setConfidence(result.confidence);

      // Handle low confidence - save for review
      if (result.confidence < 0.7) {
        await saveToIntakeForReview(user.id, input.trim(), result);
        await logToCapture(user.id, input.trim(), result);

        haptic.light();
        toast({
          title: "⚠️ Saved for review",
          description: `Confidence ${Math.round(result.confidence * 100)}% - need more details`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingClassification({
                  rawInput: input.trim(),
                  classification: result,
                });
                setFixDialogOpen(true);
              }}
            >
              Review Now
            </Button>
          ),
        });

        setInput("");
        onTaskCreated?.();
        return;
      }

      // High confidence - auto-route to appropriate table
      if (result.category === "question") {
        // Handle questions with AI response
        haptic.light();
        toast({
          title: `${categoryEmojis[result.category]} AI Response`,
          description: (result.extracted_data as { response?: string })?.response || result.title,
        });
        await logToCapture(user.id, input.trim(), result);
      } else {
        // Create record in appropriate table
        const created = await createRecordByCategory(user.id, result);
        const captureLogId = await logToCapture(
          user.id,
          input.trim(),
          result,
          created?.table,
          created?.id
        );

        haptic.success();
        toast({
          title: `${categoryEmojis[result.category]} Filed as ${categoryLabels[result.category]}`,
          description: result.title,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingClassification({
                  rawInput: input.trim(),
                  classification: result,
                  captureLogId,
                });
                setFixDialogOpen(true);
              }}
            >
              Fix
            </Button>
          ),
        });
      }

      setInput("");
      onTaskCreated?.();
    } catch (error) {
      console.error("Error processing input:", error);
      haptic.error();
      toast({
        title: "Error",
        description: "Failed to process input",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Clear confidence after a delay
      setTimeout(() => setConfidence(null), 3000);
    }
  };

  const handleFixSave = async (
    newCategory: string,
    editedInput: string
  ) => {
    if (!pendingClassification) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update capture_log with correction
      if (pendingClassification.captureLogId) {
        await supabase
          .from("capture_log")
          .update({
            corrected: true,
            correction_note: `Changed from ${pendingClassification.classification.category} to ${newCategory}`,
            classified_as: newCategory,
          })
          .eq("id", pendingClassification.captureLogId);
      }

      // Re-classify if needed
      if (newCategory !== pendingClassification.classification.category) {
        const newClassification: ClassificationResult = {
          ...pendingClassification.classification,
          category: newCategory as ClassificationResult["category"],
          title: editedInput,
        };

        await createRecordByCategory(user.id, newClassification);

        haptic.success();
        toast({
          title: `${categoryEmojis[newCategory]} Re-filed as ${categoryLabels[newCategory]}`,
          description: editedInput,
        });
      }

      setFixDialogOpen(false);
      setPendingClassification(null);
    } catch (error) {
      console.error("Error fixing classification:", error);
      toast({
        title: "Error",
        description: "Failed to update classification",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-primary" />
            <Input
              type="text"
              placeholder="What's on your mind?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              className="pl-10 md:pl-12 pr-4 h-12 md:h-14 text-sm md:text-base bg-card border-2 border-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Confidence Badge */}
          {confidence !== null && (
            <Badge
              className={`${getConfidenceColor(confidence)} text-white font-medium min-w-[3rem] justify-center`}
            >
              {Math.round(confidence * 100)}%
            </Badge>
          )}

          <Button
            type="submit"
            disabled={!input.trim() || isProcessing}
            size="sm"
            className="min-h-10 md:min-h-12 px-4"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-xs md:text-sm">Process</span>
            )}
          </Button>
        </div>
      </form>

      <BrainBarFixDialog
        open={fixDialogOpen}
        onOpenChange={setFixDialogOpen}
        rawInput={pendingClassification?.rawInput || ""}
        currentCategory={pendingClassification?.classification.category || "task"}
        confidence={pendingClassification?.classification.confidence || 0}
        onSave={handleFixSave}
      />
    </>
  );
};
