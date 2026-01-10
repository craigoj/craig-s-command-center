import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link2, ExternalLink } from "lucide-react";

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

interface LearningCardProps {
  insight: LearningInsight;
  onToggleApplied: (insight: LearningInsight) => void;
  onLinkProject: (insight: LearningInsight) => void;
  onClick: (insight: LearningInsight) => void;
}

const categoryColors: Record<string, string> = {
  ai: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  business: "bg-green-500/20 text-green-400 border-green-500/30",
  health: "bg-red-500/20 text-red-400 border-red-500/30",
  tech: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  automation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  productivity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  leadership: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  finance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function LearningCard({
  insight,
  onToggleApplied,
  onLinkProject,
  onClick,
}: LearningCardProps) {
  const getCategoryClass = (category: string) => {
    return categoryColors[category.toLowerCase()] || "bg-muted text-muted-foreground";
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30 cursor-pointer"
      onClick={() => onClick(insight)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2">{insight.title}</h3>
          </div>
          {insight.category && (
            <Badge
              variant="outline"
              className={`shrink-0 text-xs capitalize ${getCategoryClass(insight.category)}`}
            >
              {insight.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key Insight - Quote Style */}
        <div className="relative pl-4 border-l-2 border-primary/30">
          <p className="text-sm text-foreground/90 italic line-clamp-3">
            "{insight.key_insight}"
          </p>
        </div>

        {/* Application */}
        {insight.application && (
          <div className="text-sm">
            <span className="text-muted-foreground">Application: </span>
            <span className="text-foreground/80">{insight.application}</span>
          </div>
        )}

        {/* Source */}
        {insight.source && (
          <p className="text-xs text-muted-foreground truncate">
            Source: {insight.source}
          </p>
        )}

        {/* Linked Project */}
        {insight.project && (
          <div className="flex items-center gap-1.5 text-xs">
            <Link2 className="h-3 w-3 text-primary" />
            <span className="text-primary hover:underline">
              {insight.project.name}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              id={`applied-${insight.id}`}
              checked={insight.applied}
              onCheckedChange={() => onToggleApplied(insight)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label
              htmlFor={`applied-${insight.id}`}
              className={`text-xs cursor-pointer ${
                insight.applied ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {insight.applied ? "Applied ✓" : "Mark as applied"}
            </label>
          </div>

          <div className="flex items-center gap-2">
            {!insight.related_project_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkProject(insight);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Link
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(insight.created_at), "MMM d")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
