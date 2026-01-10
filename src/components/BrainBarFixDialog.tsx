import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrainBarFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawInput: string;
  currentCategory: string;
  confidence: number;
  onSave: (newCategory: string, editedInput: string) => void;
}

const categories = [
  { value: "task", label: "Task", emoji: "✅" },
  { value: "project", label: "Project", emoji: "📁" },
  { value: "person", label: "Contact", emoji: "📇" },
  { value: "learning", label: "Learning", emoji: "💡" },
  { value: "health", label: "Health", emoji: "💪" },
  { value: "content", label: "Content", emoji: "🎬" },
  { value: "question", label: "Question", emoji: "❓" },
];

export const BrainBarFixDialog = ({
  open,
  onOpenChange,
  rawInput,
  currentCategory,
  confidence,
  onSave,
}: BrainBarFixDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [editedInput, setEditedInput] = useState(rawInput);

  useEffect(() => {
    setSelectedCategory(currentCategory);
    setEditedInput(rawInput);
  }, [currentCategory, rawInput, open]);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "bg-green-500";
    if (conf >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleSave = () => {
    onSave(selectedCategory, editedInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Fix Classification
            <Badge className={`${getConfidenceColor(confidence)} text-white`}>
              {Math.round(confidence * 100)}% confident
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Input */}
          <div className="space-y-2">
            <Label htmlFor="original">Original Input</Label>
            <Input
              id="original"
              value={editedInput}
              onChange={(e) => setEditedInput(e.target.value)}
              className="bg-muted"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      {cat.value === currentCategory && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Current
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info about what will happen */}
          <p className="text-sm text-muted-foreground">
            This will update the classification and create a new record in the{" "}
            <span className="font-medium">
              {categories.find((c) => c.value === selectedCategory)?.label}
            </span>{" "}
            category.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
