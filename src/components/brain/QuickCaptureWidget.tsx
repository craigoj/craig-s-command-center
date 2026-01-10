import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Lightbulb, StickyNote, Plus, Send, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CaptureType = "contact" | "insight" | "note";

const captureTypes = [
  { 
    type: "contact" as CaptureType, 
    label: "Person", 
    icon: Users, 
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  { 
    type: "insight" as CaptureType, 
    label: "Insight", 
    icon: Lightbulb, 
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  { 
    type: "note" as CaptureType, 
    label: "Note", 
    icon: StickyNote, 
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
];

const insightCategories = ["ai", "business", "health", "tech", "automation", "other"];
const contactTags = ["work", "personal", "family", "mentor", "client", "networking"];

/**
 * QuickCaptureWidget - Expandable widget for quickly adding contacts, insights, or notes.
 * 
 * Provides a streamlined interface for capturing information without leaving the dashboard.
 * Automatically logs all captures for audit trail and invalidates relevant queries.
 */
export function QuickCaptureWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [captureType, setCaptureType] = useState<CaptureType>("note");
  const [formData, setFormData] = useState({
    // Contact fields
    name: "",
    context: "",
    tags: [] as string[],
    // Insight fields
    title: "",
    keyInsight: "",
    category: "other",
    source: "",
    // Note fields
    content: "",
  });

  const queryClient = useQueryClient();

  const resetForm = () => {
    setFormData({
      name: "",
      context: "",
      tags: [],
      title: "",
      keyInsight: "",
      category: "other",
      source: "",
      content: "",
    });
    setIsExpanded(false);
  };

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: formData.name,
        context: formData.context || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
      });

      if (error) throw error;

      // Log to capture_log
      await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: `Contact: ${formData.name}`,
        classified_as: "person",
        confidence_score: 1,
        destination_table: "contacts",
      });
    },
    onSuccess: () => {
      toast.success("Contact added!");
      queryClient.invalidateQueries({ queryKey: ["brain-dashboard-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["brain-counts"] });
      resetForm();
    },
    onError: () => toast.error("Failed to add contact"),
  });

  const createInsightMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("learning_insights").insert({
        user_id: user.id,
        title: formData.title,
        key_insight: formData.keyInsight,
        category: formData.category,
        source: formData.source || null,
      });

      if (error) throw error;

      // Log to capture_log
      await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: `Insight: ${formData.title}`,
        classified_as: "learning",
        confidence_score: 1,
        destination_table: "learning_insights",
      });
    },
    onSuccess: () => {
      toast.success("Insight captured!");
      queryClient.invalidateQueries({ queryKey: ["brain-dashboard-insights"] });
      queryClient.invalidateQueries({ queryKey: ["brain-counts"] });
      resetForm();
    },
    onError: () => toast.error("Failed to add insight"),
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log note to capture_log for later processing
      const { error } = await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: formData.content,
        classified_as: "note",
        confidence_score: 1,
        needs_review: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note captured for review!");
      queryClient.invalidateQueries({ queryKey: ["brain-dashboard-captures"] });
      queryClient.invalidateQueries({ queryKey: ["brain-counts"] });
      resetForm();
    },
    onError: () => toast.error("Failed to capture note"),
  });

  const handleSubmit = () => {
    if (captureType === "contact") {
      if (!formData.name.trim()) {
        toast.error("Name is required");
        return;
      }
      createContactMutation.mutate();
    } else if (captureType === "insight") {
      if (!formData.title.trim() || !formData.keyInsight.trim()) {
        toast.error("Title and insight are required");
        return;
      }
      createInsightMutation.mutate();
    } else {
      if (!formData.content.trim()) {
        toast.error("Note content is required");
        return;
      }
      createNoteMutation.mutate();
    }
  };

  const isLoading = createContactMutation.isPending || createInsightMutation.isPending || createNoteMutation.isPending;

  const selectedType = captureTypes.find(t => t.type === captureType)!;

  if (!isExpanded) {
    return (
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
            <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Quick Capture</span>
            <div className="flex gap-1.5 ml-2">
              {captureTypes.map(t => (
                <t.icon key={t.type} className={cn("h-4 w-4", t.color)} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all", selectedType.borderColor)}>
      <CardContent className="pt-4 space-y-4">
        {/* Type Selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {captureTypes.map(t => (
              <Button
                key={t.type}
                variant={captureType === t.type ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5",
                  captureType === t.type && t.bgColor,
                  captureType === t.type && t.color,
                  captureType === t.type && "border-transparent"
                )}
                onClick={() => setCaptureType(t.type)}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </Button>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={resetForm}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contact Form */}
        {captureType === "contact" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                placeholder="John Smith"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Context</Label>
              <Input
                placeholder="Met at conference, works at..."
                value={formData.context}
                onChange={e => setFormData(prev => ({ ...prev, context: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {contactTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }));
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Insight Form */}
        {captureType === "insight" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input
                placeholder="Key learning or concept"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Insight *</Label>
              <Textarea
                placeholder="The main takeaway or lesson..."
                value={formData.keyInsight}
                onChange={e => setFormData(prev => ({ ...prev, keyInsight: e.target.value }))}
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {insightCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Input
                  placeholder="Book, podcast..."
                  value={formData.source}
                  onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Note Form */}
        {captureType === "note" && (
          <div>
            <Label className="text-xs text-muted-foreground">Quick Note *</Label>
            <Textarea
              placeholder="Capture anything - it will be categorized for review..."
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="mt-1 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Notes are saved for review and categorization
            </p>
          </div>
        )}

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {isLoading ? "Saving..." : `Capture ${selectedType.label}`}
        </Button>
      </CardContent>
    </Card>
  );
}
