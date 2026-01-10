import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  AlertCircle,
  Edit3,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  User,
  Lightbulb,
  Heart,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";

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

interface CaptureLogCardsProps {
  captures: CaptureLog[];
  onFix: (capture: CaptureLog) => void;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  task: { icon: <ClipboardList className="h-3 w-3" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  project: { icon: <FolderOpen className="h-3 w-3" />, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  person: { icon: <User className="h-3 w-3" />, color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  learning: { icon: <Lightbulb className="h-3 w-3" />, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  health: { icon: <Heart className="h-3 w-3" />, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  content: { icon: <FileText className="h-3 w-3" />, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  question: { icon: <HelpCircle className="h-3 w-3" />, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
};

function getConfidenceColor(score: number): string {
  if (score >= 0.9) return "bg-green-500";
  if (score >= 0.7) return "bg-yellow-500";
  return "bg-red-500";
}

function getStatusBadge(capture: CaptureLog) {
  if (capture.corrected) {
    return (
      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
        <Edit3 className="h-3 w-3 mr-1" />
        Corrected
      </Badge>
    );
  }
  if (capture.needs_review) {
    return (
      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        Review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
      <CheckCircle className="h-3 w-3 mr-1" />
      Filed
    </Badge>
  );
}

export function CaptureLogCards({ captures, onFix }: CaptureLogCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {captures.map((capture) => {
        const isExpanded = expandedId === capture.id;
        const categoryInfo = categoryConfig[capture.classified_as] || {
          icon: <FileText className="h-3 w-3" />,
          color: "bg-muted text-muted-foreground",
        };
        const confidenceScore = capture.confidence_score || 0;

        return (
          <Collapsible
            key={capture.id}
            open={isExpanded}
            onOpenChange={(open) => setExpandedId(open ? capture.id : null)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardContent className="p-4 cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{capture.raw_input}</p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs ${categoryInfo.color}`}
                      >
                        {categoryInfo.icon}
                        <span className="ml-1">{capture.classified_as}</span>
                      </Badge>
                      {getStatusBadge(capture)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={confidenceScore * 100}
                        className="w-12 h-2"
                        indicatorClassName={getConfidenceColor(confidenceScore)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {(confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(capture.created_at), "MMM d, h:mm a")}
                  </p>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 space-y-3 border-t">
                  <div className="pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Full Input</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">{capture.raw_input}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Table: </span>
                      {capture.destination_table || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Needs Review: </span>
                      {capture.needs_review ? "Yes" : "No"}
                    </div>
                  </div>
                  {capture.correction_note && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Correction Note</p>
                      <p className="text-sm bg-blue-500/10 p-2 rounded border border-blue-500/20">
                        {capture.correction_note}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onFix(capture)}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Fix Classification
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
