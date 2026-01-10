import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const learningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  key_insight: z.string().min(1, "Key insight is required"),
  application: z.string().optional(),
  source: z.string().optional(),
  related_project_id: z.string().optional(),
});

type LearningFormValues = z.infer<typeof learningSchema>;

interface LearningInsight {
  id: string;
  title: string;
  category: string | null;
  key_insight: string;
  application: string | null;
  source: string | null;
  applied: boolean;
  related_project_id: string | null;
  related_domain_id: string | null;
  created_at: string;
}

interface LearningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight: LearningInsight | null;
  onSubmit: (values: LearningFormValues) => Promise<void>;
  isLoading: boolean;
}

const categories = [
  "AI",
  "Business",
  "Health",
  "Tech",
  "Automation",
  "Productivity",
  "Leadership",
  "Finance",
];

export function LearningDialog({
  open,
  onOpenChange,
  insight,
  onSubmit,
  isLoading,
}: LearningDialogProps) {
  const form = useForm<LearningFormValues>({
    resolver: zodResolver(learningSchema),
    defaultValues: {
      title: "",
      category: "",
      key_insight: "",
      application: "",
      source: "",
      related_project_id: "",
    },
  });

  // Fetch user's projects for linking
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-linking"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name");

      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (insight) {
      form.reset({
        title: insight.title,
        category: insight.category || "",
        key_insight: insight.key_insight,
        application: insight.application || "",
        source: insight.source || "",
        related_project_id: insight.related_project_id || "",
      });
    } else {
      form.reset({
        title: "",
        category: "",
        key_insight: "",
        application: "",
        source: "",
        related_project_id: "",
      });
    }
  }, [insight, form, open]);

  const handleSubmit = async (values: LearningFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {insight ? "Edit Insight" : "Add New Insight"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="What's the main takeaway?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="key_insight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Insight *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="The core learning or principle..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="application"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How to Apply</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How will you use this insight?"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input placeholder="Book, podcast, article..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="related_project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Project</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {isLoading ? "Saving..." : insight ? "Update" : "Add Insight"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
