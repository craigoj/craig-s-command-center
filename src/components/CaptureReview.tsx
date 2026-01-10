import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/useHaptic";
import { Loader2, CheckCircle2, ListChecks } from "lucide-react";
import { CaptureReviewForm } from "./CaptureReviewForm";

interface IntakeItem {
  id: string;
  raw_text: string;
  classified_category: string | null;
  confidence_score: number | null;
  created_at: string;
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

const categories = [
  { value: "task", label: "Task", emoji: "✅" },
  { value: "project", label: "Project", emoji: "📁" },
  { value: "person", label: "Contact", emoji: "📇" },
  { value: "learning", label: "Learning", emoji: "💡" },
  { value: "health", label: "Health", emoji: "💪" },
  { value: "content", label: "Content", emoji: "🎬" },
  { value: "question", label: "Question", emoji: "❓" },
];

/**
 * CaptureReview - Review queue for AI-classified intake items.
 * 
 * Displays items that need human review (low confidence scores).
 * Allows users to:
 * - Accept AI classification and create records
 * - Change category and re-classify
 * - Skip items for later review
 * - Batch operations for efficiency
 */
export const CaptureReview = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchCategory, setBatchCategory] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const haptic = useHaptic();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["intake-review"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("intake_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("needs_review", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as IntakeItem[];
    },
  });

  // Initialize item categories from AI suggestions
  useEffect(() => {
    const initialCategories: Record<string, string> = {};
    items.forEach((item) => {
      if (item.classified_category && !itemCategories[item.id]) {
        initialCategories[item.id] = item.classified_category;
      }
    });
    if (Object.keys(initialCategories).length > 0) {
      setItemCategories((prev) => ({ ...prev, ...initialCategories }));
    }
  }, [items]);

  const skipMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("intake_items")
        .update({ needs_review: false, auto_processed: false })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-review"] });
      haptic.light();
      toast({
        title: "Skipped",
        description: "Saved in intake queue",
      });
    },
  });

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  };

  const handleBatchSkip = async () => {
    for (const itemId of selectedItems) {
      await skipMutation.mutateAsync(itemId);
    }
    setSelectedItems(new Set());
    setBatchMode(false);
  };

  const handleCategoryChange = (itemId: string, category: string) => {
    setItemCategories((prev) => ({ ...prev, [itemId]: category }));
  };

  const handleSaveSuccess = (itemId: string) => {
    // Remove from local state optimistically
    queryClient.invalidateQueries({ queryKey: ["intake-review"] });
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "bg-muted text-muted-foreground";
    if (confidence >= 0.8) return "bg-green-500 text-white";
    if (confidence >= 0.6) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">All caught up!</h3>
          <p className="text-muted-foreground">No items need review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">
          Items Needing Review ({items.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          {batchMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchMode(false);
                  setSelectedItems(new Set());
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === items.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedItems.size > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBatchSkip}
                  disabled={skipMutation.isPending}
                >
                  Skip Selected ({selectedItems.size})
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchMode(true)}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Batch Mode
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion
          type="multiple"
          value={expandedItems}
          onValueChange={setExpandedItems}
          className="space-y-2"
        >
          {items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border rounded-lg px-4"
            >
              <div className="flex items-center gap-3">
                {batchMode && (
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) =>
                      handleSelectItem(item.id, checked as boolean)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <AccordionTrigger className="flex-1 hover:no-underline py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-left w-full pr-4">
                    <span className="font-medium truncate max-w-[300px]">
                      {item.raw_text}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {categoryEmojis[item.classified_category || "question"]}{" "}
                        {categoryLabels[item.classified_category || "question"]}
                      </Badge>
                      <Badge
                        className={`text-xs ${getConfidenceColor(item.confidence_score)}`}
                      >
                        {item.confidence_score
                          ? `${Math.round(item.confidence_score * 100)}%`
                          : "?"}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="pt-2 pb-4">
                <div className="space-y-4">
                  {/* AI Suggestion */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      AI thinks this is:{" "}
                      <span className="font-medium text-foreground">
                        {categoryEmojis[item.classified_category || "question"]}{" "}
                        {categoryLabels[item.classified_category || "question"]}
                      </span>
                      <span className="ml-2">
                        ({item.confidence_score
                          ? `${Math.round(item.confidence_score * 100)}% confident`
                          : "no confidence score"}
                        )
                      </span>
                    </p>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={itemCategories[item.id] || item.classified_category || ""}
                      onValueChange={(value) => handleCategoryChange(item.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.emoji}</span>
                              <span>{cat.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category-specific form */}
                  {itemCategories[item.id] && (
                    <CaptureReviewForm
                      category={itemCategories[item.id]}
                      rawText={item.raw_text}
                      intakeItemId={item.id}
                      onSaveSuccess={() => handleSaveSuccess(item.id)}
                      onSkip={() => skipMutation.mutate(item.id)}
                    />
                  )}

                  {/* Action buttons if no category selected */}
                  {!itemCategories[item.id] && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => skipMutation.mutate(item.id)}
                        disabled={skipMutation.isPending}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
