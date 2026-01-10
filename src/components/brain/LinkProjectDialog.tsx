import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LinkProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (projectId: string) => Promise<void>;
  isLoading: boolean;
}

export function LinkProjectDialog({
  open,
  onOpenChange,
  onLink,
  isLoading,
}: LinkProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-linking"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name");

      return data || [];
    },
    enabled: open,
  });

  const handleLink = async () => {
    if (selectedProjectId) {
      await onLink(selectedProjectId);
      setSelectedProjectId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active projects found. Create a project first to link insights.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedProjectId || isLoading}
          >
            {isLoading ? "Linking..." : "Link Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
