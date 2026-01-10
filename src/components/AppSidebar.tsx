import { Home, Sun, Calendar, RefreshCw, Target, AlertCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Morning", url: "/morning", icon: Sun },
  { title: "Review Captures", url: "/review-captures", icon: AlertCircle, showBadge: true },
  { title: "Midweek Check-in", url: "/midweek-checkin", icon: Calendar },
  { title: "Weekly Reset", url: "/weekly-reset", icon: RefreshCw },
  { title: "Yearly Planning", url: "/yearly-planning", icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  // Query for items needing review
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
      </SidebarContent>
    </Sidebar>
  );
}
