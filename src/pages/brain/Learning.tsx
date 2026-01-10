import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LearningCard } from "@/components/brain/LearningCard";
import { LearningDialog } from "@/components/brain/LearningDialog";
import { LinkProjectDialog } from "@/components/brain/LinkProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, Lightbulb, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/useConfetti";

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
  project?: { id: string; name: string } | null;
}

const categories = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "business", label: "Business" },
  { value: "health", label: "Health" },
  { value: "tech", label: "Tech" },
  { value: "automation", label: "Automation" },
  { value: "productivity", label: "Productivity" },
  { value: "leadership", label: "Leadership" },
  { value: "finance", label: "Finance" },
];

const categoryColors: Record<string, string> = {
  ai: "bg-blue-500",
  business: "bg-green-500",
  health: "bg-red-500",
  tech: "bg-purple-500",
  automation: "bg-orange-500",
  productivity: "bg-cyan-500",
  leadership: "bg-yellow-500",
  finance: "bg-emerald-500",
};

type SortOption = "newest" | "oldest" | "category";

export default function Learning() {
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showUnappliedOnly, setShowUnappliedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<LearningInsight | null>(null);
  const [linkingInsight, setLinkingInsight] = useState<LearningInsight | null>(null);

  // Fetch insights
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["learning-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("learning_insights")
        .select(`
          *,
          project:projects!related_project_id(id, name)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data as LearningInsight[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const total = insights.length;
    const applied = insights.filter((i) => i.applied).length;
    const unapplied = total - applied;
    const byCategory = insights.reduce((acc, i) => {
      const cat = i.category?.toLowerCase() || "uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, applied, unapplied, byCategory };
  }, [insights]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: {
      title: string;
      category?: string;
      key_insight: string;
      application?: string;
      source?: string;
      related_project_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("learning_insights")
        .insert({
          user_id: user.id,
          title: values.title,
          category: values.category || null,
          key_insight: values.key_insight,
          application: values.application || null,
          source: values.source || null,
          related_project_id: values.related_project_id || null,
          applied: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to capture_log
      await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: `Added insight: ${values.title}`,
        classified_as: "learning",
        destination_table: "learning_insights",
        destination_id: data.id,
        confidence_score: 1.0,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-insights"] });
      toast.success("Insight added!");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add insight: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        title: string;
        category?: string;
        key_insight: string;
        application?: string;
        source?: string;
        related_project_id?: string;
      };
    }) => {
      const { error } = await supabase
        .from("learning_insights")
        .update({
          title: values.title,
          category: values.category || null,
          key_insight: values.key_insight,
          application: values.application || null,
          source: values.source || null,
          related_project_id: values.related_project_id || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-insights"] });
      toast.success("Insight updated!");
      setDialogOpen(false);
      setEditingInsight(null);
    },
    onError: (error) => {
      toast.error("Failed to update insight: " + error.message);
    },
  });

  // Toggle applied mutation
  const toggleAppliedMutation = useMutation({
    mutationFn: async ({ id, applied }: { id: string; applied: boolean }) => {
      const { error } = await supabase
        .from("learning_insights")
        .update({ applied })
        .eq("id", id);

      if (error) throw error;
      return applied;
    },
    onSuccess: (applied) => {
      queryClient.invalidateQueries({ queryKey: ["learning-insights"] });
      if (applied) {
        fireConfetti();
        toast.success("💡 Insight applied!");
      } else {
        toast.info("Marked as unapplied");
      }
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Link project mutation
  const linkProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("learning_insights")
        .update({ related_project_id: projectId })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-insights"] });
      toast.success("Linked to project!");
      setLinkingInsight(null);
    },
    onError: (error) => {
      toast.error("Failed to link: " + error.message);
    },
  });

  // Filter and sort
  const filteredInsights = insights
    .filter((insight) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = insight.title.toLowerCase().includes(query);
        const matchesInsight = insight.key_insight.toLowerCase().includes(query);
        const matchesApplication = insight.application?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesInsight && !matchesApplication) return false;
      }

      // Category
      if (selectedCategory !== "all") {
        if (insight.category?.toLowerCase() !== selectedCategory) return false;
      }

      // Applied filter
      if (showUnappliedOnly && insight.applied) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        default:
          return 0;
      }
    });

  const handleEdit = (insight: LearningInsight) => {
    setEditingInsight(insight);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: {
    title: string;
    category?: string;
    key_insight: string;
    application?: string;
    source?: string;
    related_project_id?: string;
  }) => {
    if (editingInsight) {
      await updateMutation.mutateAsync({ id: editingInsight.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setShowUnappliedOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || showUnappliedOnly;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-48 pointer-events-none" />

        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Learning</h1>
                  <p className="text-sm text-muted-foreground">
                    {stats.total} insights captured
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setEditingInsight(null);
                  setDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Insight</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.applied}</p>
                  <p className="text-xs text-muted-foreground">Applied</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unapplied}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">By Category</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.byCategory)
                    .slice(0, 4)
                    .map(([cat, count]) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        <span
                          className={`w-2 h-2 rounded-full mr-1 ${
                            categoryColors[cat] || "bg-muted"
                          }`}
                        />
                        {cat}: {count}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.value !== "all" && (
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    categoryColors[cat.value] || ""
                  }`}
                />
              )}
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Applied toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="unapplied"
              checked={showUnappliedOnly}
              onCheckedChange={setShowUnappliedOnly}
            />
            <Label htmlFor="unapplied" className="text-sm">
              Show only unapplied insights
            </Label>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : filteredInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsights.map((insight) => (
              <LearningCard
                key={insight.id}
                insight={insight}
                onToggleApplied={(i) =>
                  toggleAppliedMutation.mutate({ id: i.id, applied: !i.applied })
                }
                onLinkProject={(i) => setLinkingInsight(i)}
                onClick={handleEdit}
              />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No insights yet"
            description="Capture your learnings to build a knowledge base"
            actionLabel="Add Insight"
            onAction={() => {
              setEditingInsight(null);
              setDialogOpen(true);
            }}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No insights match your filters"
            description="Try adjusting your search or filters"
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        )}
      </div>

      {/* Dialogs */}
      <LearningDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingInsight(null);
        }}
        insight={editingInsight}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <LinkProjectDialog
        open={!!linkingInsight}
        onOpenChange={(open) => !open && setLinkingInsight(null)}
        onLink={async (projectId) => {
          if (linkingInsight) {
            await linkProjectMutation.mutateAsync({
              id: linkingInsight.id,
              projectId,
            });
          }
        }}
        isLoading={linkProjectMutation.isPending}
      />
    </div>
  );
}
