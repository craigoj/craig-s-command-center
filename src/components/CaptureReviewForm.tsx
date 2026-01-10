import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/useHaptic";
import { Loader2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CaptureReviewFormProps {
  category: string;
  rawText: string;
  intakeItemId: string;
  onSaveSuccess: () => void;
  onSkip: () => void;
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

const personTags = ["client", "collaborator", "competitor", "personal", "university"];
const learningCategories = ["AI", "Automation", "Business", "Health", "Tech"];
const healthTypes = ["Training", "Nutrition", "Peptides", "Recovery"];
const contentTypes = ["Video", "Blog", "Social"];
const priorityOptions = [
  { value: "1", label: "High" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Low" },
];
const projectStatuses = ["Active", "Planning", "On Hold", "Completed"];

export const CaptureReviewForm = ({
  category,
  rawText,
  intakeItemId,
  onSaveSuccess,
  onSkip,
}: CaptureReviewFormProps) => {
  const { toast } = useToast();
  const haptic = useHaptic();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({
    // Pre-fill with raw text as default title/name
    name: rawText,
    title: rawText,
    key_insight: rawText,
    details: rawText,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user's domains for project form
  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("domains")
        .select("id, name")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: category === "project",
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let destinationTable: string | null = null;
      let destinationId: string | null = null;

      switch (category) {
        case "task": {
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              name: formData.name || rawText,
              description: formData.description,
              priority: parseInt(formData.priority || "3"),
              due_date: dueDate?.toISOString().split("T")[0],
              is_top_priority: formData.priority === "1",
            })
            .select("id")
            .single();
          if (error) throw error;
          destinationTable = "tasks";
          destinationId = data.id;
          break;
        }

        case "person": {
          const { data, error } = await supabase
            .from("contacts")
            .insert({
              user_id: user.id,
              name: formData.name || rawText,
              context: formData.context,
              follow_up: formData.follow_up,
              tags: selectedTags,
            })
            .select("id")
            .single();
          if (error) throw error;
          destinationTable = "contacts";
          destinationId = data.id;
          break;
        }

        case "learning": {
          const { data, error } = await supabase
            .from("learning_insights")
            .insert({
              user_id: user.id,
              title: formData.title || rawText,
              category: formData.category,
              key_insight: formData.key_insight || rawText,
              application: formData.application,
              source: formData.source,
            })
            .select("id")
            .single();
          if (error) throw error;
          destinationTable = "learning_insights";
          destinationId = data.id;
          break;
        }

        case "project": {
          const { data, error } = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              name: formData.name || rawText,
              domain_id: formData.domain_id || null,
              status: formData.status?.toLowerCase() || "active",
            })
            .select("id")
            .single();
          if (error) throw error;
          destinationTable = "projects";
          destinationId = data.id;

          // Create first task if next_action provided
          if (formData.next_action && data.id) {
            await supabase.from("tasks").insert({
              user_id: user.id,
              name: formData.next_action,
              project_id: data.id,
              priority: 2,
            });
          }
          break;
        }

        case "health":
        case "content": {
          // Save to intake with processed flag
          await supabase.from("intake_items").insert({
            user_id: user.id,
            raw_text: JSON.stringify({ ...formData, category }),
            classified_category: category,
            auto_processed: true,
            needs_review: false,
          });
          destinationTable = "intake_items";
          break;
        }

        case "question": {
          // Questions don't create records
          break;
        }
      }

      // Log to capture_log
      await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: rawText,
        classified_as: category,
        destination_table: destinationTable,
        destination_id: destinationId,
        corrected: true,
        needs_review: false,
      });

      // Update original intake item
      await supabase
        .from("intake_items")
        .update({
          auto_processed: true,
          needs_review: false,
          classified_category: category,
        })
        .eq("id", intakeItemId);

      haptic.success();
      toast({
        title: `${categoryEmojis[category]} Filed as ${categoryLabels[category]}`,
        description: formData.name || formData.title || rawText,
      });

      onSaveSuccess();
    } catch (error) {
      console.error("Error saving:", error);
      haptic.error();
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render category-specific form
  const renderForm = () => {
    switch (category) {
      case "task":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority || "3"}
                  onValueChange={(v) => updateField("priority", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Add details..."
                rows={2}
              />
            </div>
          </div>
        );

      case "person":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Person's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">Context</Label>
              <Input
                id="context"
                value={formData.context || ""}
                onChange={(e) => updateField("context", e.target.value)}
                placeholder="How do you know them?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="follow_up">Follow-up Action</Label>
              <Input
                id="follow_up"
                value={formData.follow_up || ""}
                onChange={(e) => updateField("follow_up", e.target.value)}
                placeholder="What's the next action?"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {personTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "learning":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="What did you learn?"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category || ""}
                onValueChange={(v) => updateField("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {learningCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key_insight">Key Insight</Label>
              <Textarea
                id="key_insight"
                value={formData.key_insight || ""}
                onChange={(e) => updateField("key_insight", e.target.value)}
                placeholder="One-sentence takeaway"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application">How to Apply</Label>
              <Input
                id="application"
                value={formData.application || ""}
                onChange={(e) => updateField("application", e.target.value)}
                placeholder="How will you use this?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source || ""}
                onChange={(e) => updateField("source", e.target.value)}
                placeholder="Where did this come from?"
              />
            </div>
          </div>
        );

      case "health":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type || ""}
                onValueChange={(v) => updateField("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {healthTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                value={formData.details || ""}
                onChange={(e) => updateField("details", e.target.value)}
                placeholder="What happened?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metrics">Metrics</Label>
              <Input
                id="metrics"
                value={formData.metrics || ""}
                onChange={(e) => updateField("metrics", e.target.value)}
                placeholder="Numbers: weight, time, distance..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reflection">Reflection</Label>
              <Input
                id="reflection"
                value={formData.reflection || ""}
                onChange={(e) => updateField("reflection", e.target.value)}
                placeholder="How did it feel?"
              />
            </div>
          </div>
        );

      case "content":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Content title"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type || ""}
                onValueChange={(v) => updateField("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={formData.topic || ""}
                onChange={(e) => updateField("topic", e.target.value)}
                placeholder="Main theme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={formData.audience || ""}
                onChange={(e) => updateField("audience", e.target.value)}
                placeholder="Who is this for?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Research or ideas..."
                rows={2}
              />
            </div>
          </div>
        );

      case "project":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select
                  value={formData.domain_id || ""}
                  onValueChange={(v) => updateField("domain_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain: { id: string; name: string }) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status || "Active"}
                  onValueChange={(v) => updateField("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_action">First Action</Label>
              <Input
                id="next_action"
                value={formData.next_action || ""}
                onChange={(e) => updateField("next_action", e.target.value)}
                placeholder="What's the first step?"
              />
            </div>
          </div>
        );

      case "question":
        return (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              This will search your knowledge base for an answer.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {renderForm()}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save
        </Button>
        <Button variant="outline" onClick={onSkip} disabled={isSaving}>
          Skip
        </Button>
      </div>
    </div>
  );
};
