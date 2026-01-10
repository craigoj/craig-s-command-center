import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CaptureLogTable } from "@/components/brain/CaptureLogTable";
import { CaptureLogCards } from "@/components/brain/CaptureLogCards";
import { FixCaptureDialog } from "@/components/brain/FixCaptureDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  FileText,
  Download,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Edit3,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { subDays } from "date-fns";

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

const categories = [
  { value: "all", label: "All Categories" },
  { value: "task", label: "Task" },
  { value: "project", label: "Project" },
  { value: "person", label: "Person" },
  { value: "learning", label: "Learning" },
  { value: "health", label: "Health" },
  { value: "content", label: "Content" },
  { value: "question", label: "Question" },
];

const dateRanges = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "filed", label: "Filed" },
  { value: "needs_review", label: "Needs Review" },
  { value: "corrected", label: "Corrected" },
];

const confidenceOptions = [
  { value: "all", label: "All Confidence" },
  { value: "low", label: "Low (< 70%)" },
  { value: "medium", label: "Medium (70-90%)" },
  { value: "high", label: "High (> 90%)" },
];

type SortOption = "newest" | "oldest" | "confidence_low" | "confidence_high" | "category";

export default function Log() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [fixingCapture, setFixingCapture] = useState<CaptureLog | null>(null);

  // Fetch captures
  const { data: captures = [], isLoading } = useQuery({
    queryKey: ["capture-log", dateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("capture_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dateRange !== "all") {
        const daysAgo = subDays(new Date(), parseInt(dateRange));
        query = query.gte("created_at", daysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaptureLog[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const total = captures.length;
    const avgConfidence = captures.length > 0
      ? captures.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / captures.length
      : 0;
    const corrected = captures.filter((c) => c.corrected).length;
    const needsReview = captures.filter((c) => c.needs_review).length;
    const filed = total - needsReview - corrected;

    const byCategory = captures.reduce((acc, c) => {
      acc[c.classified_as] = (acc[c.classified_as] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, avgConfidence, corrected, needsReview, filed, byCategory };
  }, [captures]);

  // Filter and sort
  const filteredCaptures = useMemo(() => {
    return captures
      .filter((capture) => {
        // Search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!capture.raw_input.toLowerCase().includes(query)) return false;
        }

        // Category
        if (categoryFilter !== "all" && capture.classified_as !== categoryFilter) {
          return false;
        }

        // Status
        if (statusFilter !== "all") {
          if (statusFilter === "filed" && (capture.needs_review || capture.corrected)) return false;
          if (statusFilter === "needs_review" && !capture.needs_review) return false;
          if (statusFilter === "corrected" && !capture.corrected) return false;
        }

        // Confidence
        if (confidenceFilter !== "all") {
          const score = capture.confidence_score || 0;
          if (confidenceFilter === "low" && score >= 0.7) return false;
          if (confidenceFilter === "medium" && (score < 0.7 || score > 0.9)) return false;
          if (confidenceFilter === "high" && score <= 0.9) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case "confidence_low":
            return (a.confidence_score || 0) - (b.confidence_score || 0);
          case "confidence_high":
            return (b.confidence_score || 0) - (a.confidence_score || 0);
          case "category":
            return a.classified_as.localeCompare(b.classified_as);
          default:
            return 0;
        }
      });
  }, [captures, searchQuery, categoryFilter, statusFilter, confidenceFilter, sortBy]);

  // Fix mutation
  const fixMutation = useMutation({
    mutationFn: async ({
      captureId,
      values,
    }: {
      captureId: string;
      values: {
        new_category: string;
        correction_note: string;
        task_name?: string;
        project_name?: string;
        contact_name?: string;
        contact_context?: string;
        insight_title?: string;
        insight_content?: string;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create record in appropriate table based on new category
      let destinationTable: string | null = null;
      let destinationId: string | null = null;

      if (values.new_category === "task" && values.task_name) {
        const { data } = await supabase
          .from("tasks")
          .insert({ user_id: user.id, name: values.task_name })
          .select()
          .single();
        destinationTable = "tasks";
        destinationId = data?.id;
      } else if (values.new_category === "project" && values.project_name) {
        const { data } = await supabase
          .from("projects")
          .insert({ user_id: user.id, name: values.project_name })
          .select()
          .single();
        destinationTable = "projects";
        destinationId = data?.id;
      } else if (values.new_category === "person" && values.contact_name) {
        const { data } = await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
            name: values.contact_name,
            context: values.contact_context || null,
          })
          .select()
          .single();
        destinationTable = "contacts";
        destinationId = data?.id;
      } else if (values.new_category === "learning" && values.insight_title) {
        const { data } = await supabase
          .from("learning_insights")
          .insert({
            user_id: user.id,
            title: values.insight_title,
            key_insight: values.insight_content || "",
          })
          .select()
          .single();
        destinationTable = "learning_insights";
        destinationId = data?.id;
      }

      // Update capture_log
      const { error } = await supabase
        .from("capture_log")
        .update({
          classified_as: values.new_category,
          corrected: true,
          correction_note: values.correction_note,
          needs_review: false,
          destination_table: destinationTable,
          destination_id: destinationId,
        })
        .eq("id", captureId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capture-log"] });
      toast.success("Classification corrected!");
      setFixingCapture(null);
    },
    onError: (error) => {
      toast.error("Failed to fix: " + error.message);
    },
  });

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Timestamp",
      "Raw Input",
      "Category",
      "Confidence",
      "Status",
      "Destination",
      "Correction Note",
    ];
    const rows = filteredCaptures.map((c) => [
      c.created_at,
      `"${c.raw_input.replace(/"/g, '""')}"`,
      c.classified_as,
      ((c.confidence_score || 0) * 100).toFixed(0) + "%",
      c.corrected ? "Corrected" : c.needs_review ? "Needs Review" : "Filed",
      c.destination_table || "",
      c.correction_note ? `"${c.correction_note.replace(/"/g, '""')}"` : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capture-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV!");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setConfidenceFilter("all");
  };

  const hasActiveFilters =
    searchQuery || categoryFilter !== "all" || statusFilter !== "all" || confidenceFilter !== "all";

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
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Capture Log</h1>
                  <p className="text-sm text-muted-foreground">
                    {stats.total} captures
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {(stats.avgConfidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.filed}</p>
                  <p className="text-xs text-muted-foreground">Filed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.needsReview}</p>
                  <p className="text-xs text-muted-foreground">Needs Review</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Edit3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.corrected}</p>
                  <p className="text-xs text-muted-foreground">Corrected</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="capitalize">
                {cat}: {count}
              </Badge>
            ))}
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
              placeholder="Search captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date Range */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="confidence_low">Confidence (low)</SelectItem>
              <SelectItem value="confidence_high">Confidence (high)</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Confidence" />
            </SelectTrigger>
            <SelectContent>
              {confidenceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filteredCaptures.length > 0 ? (
          isMobile ? (
            <CaptureLogCards captures={filteredCaptures} onFix={(c) => setFixingCapture(c)} />
          ) : (
            <CaptureLogTable captures={filteredCaptures} onFix={(c) => setFixingCapture(c)} />
          )
        ) : captures.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No captures yet"
            description="Start capturing thoughts with the Brain Bar to see your log"
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No captures match your filters"
            description="Try adjusting your search or filters"
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        )}
      </div>

      {/* Fix Dialog */}
      <FixCaptureDialog
        open={!!fixingCapture}
        onOpenChange={(open) => !open && setFixingCapture(null)}
        capture={fixingCapture}
        onSubmit={async (values) => {
          if (fixingCapture) {
            await fixMutation.mutateAsync({
              captureId: fixingCapture.id,
              values,
            });
          }
        }}
        isLoading={fixMutation.isPending}
      />
    </div>
  );
}
