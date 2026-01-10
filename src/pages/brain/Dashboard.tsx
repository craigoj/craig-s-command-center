import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { 
  Brain, Users, Lightbulb, ListChecks, AlertCircle, 
  TrendingUp, Clock, CheckCircle2, ArrowRight, Sparkles 
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickCaptureWidget } from "@/components/brain/QuickCaptureWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const categoryColors: Record<string, string> = {
  ai: "#3b82f6",
  business: "#22c55e",
  health: "#ef4444",
  tech: "#a855f7",
  automation: "#f97316",
  other: "#6b7280",
};

const tagColors: Record<string, string> = {
  work: "#3b82f6",
  personal: "#22c55e",
  family: "#f97316",
  mentor: "#a855f7",
  client: "#eab308",
  networking: "#06b6d4",
};

/**
 * BrainDashboard - Overview page for the Second Brain feature.
 * 
 * Displays:
 * - Stats cards for contacts, insights, captures, and items needing review
 * - 14-day activity chart showing capture trends
 * - Knowledge breakdown with pie charts
 * - Recent activity feed
 * - Quick capture widget for adding new items
 */
export default function BrainDashboard() {
  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["brain-dashboard-contacts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      return data || [];
    },
  });

  // Fetch learning insights
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["brain-dashboard-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from("learning_insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      return data || [];
    },
  });

  // Fetch capture log
  const { data: captures = [], isLoading: capturesLoading } = useQuery({
    queryKey: ["brain-dashboard-captures"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from("capture_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      return data || [];
    },
  });

  // Fetch intake items needing review
  const { data: needsReviewCount = 0 } = useQuery({
    queryKey: ["brain-dashboard-needs-review"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count } = await supabase
        .from("intake_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("needs_review", true);
      
      return count || 0;
    },
  });

  const isLoading = contactsLoading || insightsLoading || capturesLoading;

  // Computed stats
  const stats = useMemo(() => {
    const contactsWithFollowUp = contacts.filter(c => c.follow_up).length;
    const appliedInsights = insights.filter(i => i.applied).length;
    const correctedCaptures = captures.filter(c => c.corrected).length;
    const avgConfidence = captures.length > 0
      ? captures.reduce((sum, c) => sum + (Number(c.confidence_score) || 0), 0) / captures.length
      : 0;

    return {
      totalContacts: contacts.length,
      contactsWithFollowUp,
      totalInsights: insights.length,
      appliedInsights,
      unappliedInsights: insights.length - appliedInsights,
      totalCaptures: captures.length,
      correctedCaptures,
      avgConfidence: Math.round(avgConfidence * 100),
      needsReview: needsReviewCount,
    };
  }, [contacts, insights, captures, needsReviewCount]);

  // Activity chart data (last 14 days)
  const activityData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date(),
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayContacts = contacts.filter(c => {
        const created = new Date(c.created_at);
        return created >= dayStart && created < dayEnd;
      }).length;

      const dayInsights = insights.filter(i => {
        const created = new Date(i.created_at);
        return created >= dayStart && created < dayEnd;
      }).length;

      const dayCaptures = captures.filter(c => {
        const created = new Date(c.created_at);
        return created >= dayStart && created < dayEnd;
      }).length;

      return {
        date: format(day, "MMM d"),
        contacts: dayContacts,
        insights: dayInsights,
        captures: dayCaptures,
        total: dayContacts + dayInsights + dayCaptures,
      };
    });
  }, [contacts, insights, captures]);

  // Insights by category for pie chart
  const insightsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    insights.forEach(i => {
      const cat = i.category || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: categoryColors[name] || categoryColors.other,
    }));
  }, [insights]);

  // Contacts by tag
  const contactsByTag = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach(c => {
      (c.tags || []).forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: tagColors[name] || "#6b7280" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [contacts]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const all = [
      ...contacts.slice(0, 5).map(c => ({
        type: "contact" as const,
        title: c.name,
        subtitle: c.context || "New contact added",
        date: new Date(c.created_at),
        icon: Users,
      })),
      ...insights.slice(0, 5).map(i => ({
        type: "insight" as const,
        title: i.title,
        subtitle: i.category || "Learning insight",
        date: new Date(i.created_at),
        icon: Lightbulb,
      })),
      ...captures.slice(0, 5).map(c => ({
        type: "capture" as const,
        title: c.raw_input.slice(0, 50) + (c.raw_input.length > 50 ? "..." : ""),
        subtitle: `Classified as ${c.classified_as}`,
        date: new Date(c.created_at),
        icon: ListChecks,
      })),
    ];

    return all.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [contacts, insights, captures]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const isEmpty = stats.totalContacts === 0 && stats.totalInsights === 0 && stats.totalCaptures === 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Second Brain</h1>
            <p className="text-muted-foreground text-sm">
              Your knowledge hub at a glance
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/brain/people">
              <Users className="h-4 w-4 mr-2" />
              People
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/brain/learning">
              <Lightbulb className="h-4 w-4 mr-2" />
              Learning
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/brain/log">
              <ListChecks className="h-4 w-4 mr-2" />
              Log
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Capture Widget */}
      <QuickCaptureWidget />

      {isEmpty ? (
        <Card className="py-16">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Build Your Second Brain</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start capturing people, insights, and ideas. Your second brain grows smarter with every entry.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <Button asChild>
                <Link to="/brain/people">
                  <Users className="h-4 w-4 mr-2" />
                  Add People
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/brain/learning">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Add Insights
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ErrorBoundary>
          {/* Stats Cards */}
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">People</p>
                    <p className="text-2xl font-bold">{stats.totalContacts}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                {stats.contactsWithFollowUp > 0 && (
                  <Badge variant="outline" className="mt-2 text-amber-500 border-amber-500/30">
                    {stats.contactsWithFollowUp} follow-up{stats.contactsWithFollowUp !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Insights</p>
                    <p className="text-2xl font-bold">{stats.totalInsights}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress 
                    value={stats.totalInsights > 0 ? (stats.appliedInsights / stats.totalInsights) * 100 : 0} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    {stats.appliedInsights} applied
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Captures</p>
                    <p className="text-2xl font-bold">{stats.totalCaptures}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ListChecks className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {stats.avgConfidence}% avg confidence
                </div>
              </CardContent>
            </Card>

            <Card className={stats.needsReview > 0 ? "border-destructive/50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Review</p>
                    <p className="text-2xl font-bold">{stats.needsReview}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stats.needsReview > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                    <AlertCircle className={`h-5 w-5 ${stats.needsReview > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  </div>
                </div>
                {stats.needsReview > 0 && (
                  <Button asChild variant="destructive" size="sm" className="mt-2 w-full">
                    <Link to="/review-captures">
                      Review Now
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity (14 days)</CardTitle>
                <CardDescription>Daily captures and additions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Knowledge Breakdown</CardTitle>
                <CardDescription>Insights by category & contacts by tag</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Insights Pie */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 text-center">Insights</p>
                    {insightsByCategory.length > 0 ? (
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={insightsByCategory}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={45}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {insightsByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                        No insights yet
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {insightsByCategory.slice(0, 4).map(cat => (
                        <Badge 
                          key={cat.name} 
                          variant="outline" 
                          className="text-[10px] px-1.5"
                          style={{ borderColor: cat.color, color: cat.color }}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Contacts Tags */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 text-center">Contacts</p>
                    {contactsByTag.length > 0 ? (
                      <div className="space-y-2">
                        {contactsByTag.slice(0, 5).map(tag => (
                          <div key={tag.name} className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-xs flex-1 truncate capitalize">{tag.name}</span>
                            <span className="text-xs text-muted-foreground">{tag.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                        No contacts yet
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`p-1.5 rounded-md ${
                        item.type === "contact" ? "bg-blue-500/10" :
                        item.type === "insight" ? "bg-amber-500/10" : "bg-green-500/10"
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.type === "contact" ? "text-blue-500" :
                          item.type === "insight" ? "text-amber-500" : "text-green-500"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(item.date, "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>
      )}
    </div>
  );
}
