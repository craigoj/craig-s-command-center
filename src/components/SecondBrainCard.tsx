import { useQuery } from "@tanstack/react-query";
import { Brain, Users, Lightbulb, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export function SecondBrainCard() {
  // Open loops: contacts with follow_up + projects waiting/blocked
  const { data: openLoopsCount = 0 } = useQuery({
    queryKey: ["second-brain-open-loops"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const [contactsRes, projectsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("follow_up", "is", null),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["waiting", "blocked"]),
      ]);

      return (contactsRes.count || 0) + (projectsRes.count || 0);
    },
    refetchInterval: 60000,
  });

  // Recent captures (last 7 days)
  const { data: recentCapturesCount = 0 } = useQuery({
    queryKey: ["second-brain-recent-captures"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const { count, error } = await supabase
        .from("capture_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Needs review count
  const { data: needsReviewCount = 0 } = useQuery({
    queryKey: ["second-brain-needs-review"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("intake_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("needs_review", true);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const hasActivity = openLoopsCount > 0 || recentCapturesCount > 0 || needsReviewCount > 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          Second Brain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasActivity ? (
          <>
            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              {openLoopsCount > 0 && (
                <Badge variant="outline" className="gap-1.5 py-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  {openLoopsCount} Open Loop{openLoopsCount !== 1 ? "s" : ""}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1.5 py-1">
                {recentCapturesCount} Capture{recentCapturesCount !== 1 ? "s" : ""} this week
              </Badge>
              {needsReviewCount > 0 && (
                <Badge variant="destructive" className="gap-1.5 py-1">
                  {needsReviewCount} Need{needsReviewCount !== 1 ? "s" : ""} Review
                </Badge>
              )}
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 h-8">
                <Link to="/brain/people">
                  <Users className="h-3.5 w-3.5" />
                  People
                  <ArrowRight className="h-3 w-3 opacity-50" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="gap-1.5 h-8">
                <Link to="/brain/learning">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Learning
                  <ArrowRight className="h-3 w-3 opacity-50" />
                </Link>
              </Button>
              {needsReviewCount > 0 && (
                <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Link to="/review-captures">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Review Captures
                  </Link>
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Start capturing to build your second brain
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/brain/people">
                  <Users className="h-3.5 w-3.5" />
                  Add People
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/brain/learning">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Add Insights
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
