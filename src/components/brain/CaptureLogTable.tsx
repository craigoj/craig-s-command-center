import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ExternalLink,
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

interface CaptureLogTableProps {
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
      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
        <Edit3 className="h-3 w-3 mr-1" />
        Corrected
      </Badge>
    );
  }
  if (capture.needs_review) {
    return (
      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
      <CheckCircle className="h-3 w-3 mr-1" />
      Filed
    </Badge>
  );
}

export function CaptureLogTable({ captures, onFix }: CaptureLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]">Timestamp</TableHead>
            <TableHead>Raw Input</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[100px]">Confidence</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
                asChild
              >
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer">
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(capture.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <span className="truncate max-w-[300px]">
                            {capture.raw_input}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${categoryInfo.color}`}
                        >
                          {categoryInfo.icon}
                          <span className="ml-1">{capture.classified_as}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>{getStatusBadge(capture)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFix(capture);
                          }}
                        >
                          Fix
                        </Button>
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={6}>
                        <div className="py-3 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Full Input
                            </p>
                            <p className="text-sm bg-background p-3 rounded-lg border">
                              {capture.raw_input}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Destination Table
                              </p>
                              <p className="text-sm">
                                {capture.destination_table || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Destination ID
                              </p>
                              {capture.destination_id ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Record
                                </Button>
                              ) : (
                                <p className="text-sm">—</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Needs Review
                              </p>
                              <p className="text-sm">
                                {capture.needs_review ? "Yes" : "No"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Corrected
                              </p>
                              <p className="text-sm">
                                {capture.corrected ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                          {capture.correction_note && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Correction Note
                              </p>
                              <p className="text-sm bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                {capture.correction_note}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
