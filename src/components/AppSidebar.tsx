import { Home, Sun, Calendar, RefreshCw, Target, AlertCircle, Brain, Users, Lightbulb, ListChecks, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Morning", url: "/morning", icon: Sun },
  { title: "Review Captures", url: "/review-captures", icon: AlertCircle, showBadge: true },
  { title: "Midweek Check-in", url: "/midweek-checkin", icon: Calendar },
  { title: "Weekly Reset", url: "/weekly-reset", icon: RefreshCw },
  { title: "Yearly Planning", url: "/yearly-planning", icon: Target },
];

const brainItems = [
  { title: "People", url: "/brain/people", icon: Users, badgeKey: "followUps" as const },
  { title: "Learning", url: "/brain/learning", icon: Lightbulb, badgeKey: "unapplied" as const },
  { title: "Capture Log", url: "/brain/log", icon: ListChecks, badgeKey: "needsReview" as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();

  // Query for items needing review (intake_items)
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ["review-count"],
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

  // Query for brain section badges
  const { data: brainCounts = { followUps: 0, unapplied: 0, needsReview: 0 } } = useQuery({
    queryKey: ["brain-counts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { followUps: 0, unapplied: 0, needsReview: 0 };

      const [contactsRes, insightsRes, capturesRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("follow_up", "is", null),
        supabase
          .from("learning_insights")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("applied", false),
        supabase
          .from("capture_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("needs_review", true),
      ]);

      return {
        followUps: contactsRes.count || 0,
        unapplied: insightsRes.count || 0,
        needsReview: capturesRes.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  const isBrainActive = location.pathname.startsWith("/brain");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-card"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== "/" && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent/50"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            <span>{item.title}</span>
                            {item.showBadge && reviewCount > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="ml-2 h-5 min-w-[1.25rem] px-1.5 text-xs"
                              >
                                {reviewCount}
                              </Badge>
                            )}
                          </span>
                        )}
                        {collapsed && item.showBadge && reviewCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[10px]"
                          >
                            {reviewCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Second Brain Section */}
        <Collapsible defaultOpen={!isMobile || isBrainActive} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-muted-foreground cursor-pointer hover:bg-accent/50 rounded-md transition-colors flex items-center justify-between pr-2">
                {!collapsed && (
                  <>
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Second Brain
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </>
                )}
                {collapsed && <Brain className="h-4 w-4 mx-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {brainItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    const badgeCount = brainCounts[item.badgeKey];
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <NavLink 
                            to={item.url} 
                            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent/50"
                            activeClassName="bg-accent text-accent-foreground font-medium"
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!collapsed && (
                              <span className="flex-1 flex items-center justify-between">
                                <span>{item.title}</span>
                                {badgeCount > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="ml-2 h-5 min-w-[1.25rem] px-1.5 text-xs bg-primary/20 text-primary"
                                  >
                                    {badgeCount}
                                  </Badge>
                                )}
                              </span>
                            )}
                            {collapsed && badgeCount > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[10px] bg-primary/20 text-primary"
                              >
                                {badgeCount}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}
