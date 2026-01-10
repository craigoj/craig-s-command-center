import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

interface CaptureLog {
  id: string;
  raw_input: string;
  classified_as: string;
  confidence_score: number | null;
  destination_table: string | null;
  destination_id: string | null;
  needs_review: boolean;
  corrected: boolean;
  correction_note: string | null;
  created_at: string;
}

interface FixCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capture: CaptureLog | null;
  onSubmit: (values: {
    new_category: string;
    correction_note: string;
    // Category-specific fields
    task_name?: string;
    project_name?: string;
    contact_name?: string;
    contact_context?: string;
    insight_title?: string;
    insight_content?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const categories = [
  { value: "task", label: "Task", icon: "✓" },
  { value: "project", label: "Project", icon: "📁" },
  { value: "person", label: "Person", icon: "👤" },
  { value: "learning", label: "Learning", icon: "💡" },
  { value: "health", label: "Health", icon: "❤️" },
  { value: "content", label: "Content", icon: "📝" },
  { value: "question", label: "Question", icon: "❓" },
];

const fixSchema = z.object({
  new_category: z.string().min(1, "Select a category"),
  correction_note: z.string().min(1, "Please explain why this was wrong"),
  task_name: z.string().optional(),
  project_name: z.string().optional(),
  contact_name: z.string().optional(),
  contact_context: z.string().optional(),
  insight_title: z.string().optional(),
  insight_content: z.string().optional(),
});

type FixFormValues = z.infer<typeof fixSchema>;

export function FixCaptureDialog({
  open,
  onOpenChange,
  capture,
  onSubmit,
  isLoading,
}: FixCaptureDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const form = useForm<FixFormValues>({
    resolver: zodResolver(fixSchema),
    defaultValues: {
      new_category: "",
      correction_note: "",
      task_name: "",
      project_name: "",
      contact_name: "",
      contact_context: "",
      insight_title: "",
      insight_content: "",
    },
  });

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    form.setValue("new_category", value);
  };

  const handleSubmit = async (values: FixFormValues) => {
    await onSubmit({
      new_category: values.new_category,
      correction_note: values.correction_note,
      task_name: values.task_name,
      project_name: values.project_name,
      contact_name: values.contact_name,
      contact_context: values.contact_context,
      insight_title: values.insight_title,
      insight_content: values.insight_content,
    });
    form.reset();
    setSelectedCategory("");
  };

  if (!capture) return null;

  const confidencePercent = (capture.confidence_score || 0) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Fix Classification
          </DialogTitle>
          <DialogDescription>
            Correct the AI classification for this capture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Input */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">Original Input</p>
            <p className="text-sm">{capture.raw_input}</p>
          </div>

          {/* Current Classification */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Classification</p>
              <Badge variant="outline" className="capitalize">
                {categories.find((c) => c.value === capture.classified_as)?.icon}{" "}
                {capture.classified_as}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <Progress value={confidencePercent} className="w-16 h-2" />
                <span className="text-sm font-medium">
                  {confidencePercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* New Category */}
              <FormField
                control={form.control}
                name="new_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Category *</FormLabel>
                    <Select
                      onValueChange={handleCategoryChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="What should this be?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category-specific fields */}
              {selectedCategory === "task" && (
                <FormField
                  control={form.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl>
                        <Input placeholder="What's the task?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedCategory === "project" && (
                <FormField
                  control={form.control}
                  name="project_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Project name..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedCategory === "person" && (
                <>
                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Person's name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_context"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Context</FormLabel>
                        <FormControl>
                          <Input placeholder="How do you know them?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedCategory === "learning" && (
                <>
                  <FormField
                    control={form.control}
                    name="insight_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insight Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insight_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Insight</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="The main learning..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Correction Note */}
              <FormField
                control={form.control}
                name="correction_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Why was this wrong? *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Help the AI learn from this mistake..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Fixing..." : "Fix & Reclassify"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
