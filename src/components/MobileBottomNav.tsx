import { Home, Sun, Calendar, RefreshCw } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Morning", url: "/morning", icon: Sun },
  { title: "Midweek", url: "/midweek-checkin", icon: Calendar },
  { title: "Weekly", url: "/weekly-reset", icon: RefreshCw },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <item.icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
