import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IntakeItemCard } from "@/components/IntakeItemCard";
import { Inbox, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const IntakeQueue = () => {
  const [items, setItems] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('intake_items')
        .select('*')
        .is('parsed_type', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);

      // Classify all items
      if (data && data.length > 0) {
        await classifyAllItems(data);
      }
    } catch (error) {
      console.error('Error loading intake items:', error);
      toast({
        title: "Error",
        description: "Failed to load intake items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const classifyAllItems = async (itemsToClassify: any[]) => {
    setIsClassifying(true);
    const newClassifications: Record<string, any> = {};

    for (const item of itemsToClassify) {
      try {
        const { data, error } = await supabase.functions.invoke('classify-input', {
          body: { input: item.raw_text }
        });

        if (!error && data) {
          newClassifications[item.id] = data;
        }
      } catch (error) {
        console.error('Error classifying item:', error);
      }
    }

    setClassifications(newClassifications);
    setIsClassifying(false);
  };

  const handleAddNew = async () => {
    // Validate input
    const trimmedText = newItemText.trim();
    
    if (!trimmedText) {
      toast({
        title: "Error",
        description: "Text cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (trimmedText.length > 5000) {
      toast({
        title: "Error",
        description: "Text is too long (max 5000 characters)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to add items",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('intake_items')
        .insert({
          raw_text: trimmedText,
          user_id: user.id
        });

      if (error) throw error;

      setNewItemText("");
      setIsAddingNew(false);
      await loadItems();

      toast({
        title: "Item added",
        description: "Added to intake queue",
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  if (!isExpanded && items.length === 0) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Intake Queue</h2>
              <p className="text-sm text-muted-foreground">
                {items.length} unprocessed item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddingNew(!isAddingNew)}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            {items.length > 0 && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                variant="ghost"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {isAddingNew && (
          <div className="space-y-3 p-4 rounded-lg border bg-card/50">
            <Textarea
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Paste notes, ideas, links, or anything you want to process later..."
              className="min-h-[100px]"
              maxLength={5000}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddNew} disabled={!newItemText.trim()}>
                Add to Queue
              </Button>
              <Button onClick={() => setIsAddingNew(false)} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No items in queue</p>
                <p className="text-xs mt-1">Add items manually or they'll appear here from Brain Bar</p>
              </div>
            ) : (
              <>
                {isClassifying && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing items with AI...
                  </div>
                )}
                <div className="space-y-3">
                  {items.map((item) => (
                    <IntakeItemCard
                      key={item.id}
                      item={item}
                      classification={classifications[item.id]}
                      onProcessed={loadItems}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};