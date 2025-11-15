import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { LinkIcon, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeItem {
  id: string;
  type: string;
  content: string;
  url?: string;
  score: number;
  isLinked: boolean;
}

interface ContextLinkerProps {
  taskId: string;
  onLinked?: () => void;
}

export const ContextLinker = ({ taskId, onLinked }: ContextLinkerProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const searchKnowledge = async () => {
    setIsSearching(true);
    setShowResults(true);
    setSummary("");

    try {
      const { data, error } = await supabase.functions.invoke('search-knowledge', {
        body: { taskId }
      });

      if (error) throw error;

      setKnowledgeItems(data.knowledgeItems || []);

      // Auto-select already linked items
      const alreadyLinked = new Set<string>(
        data.knowledgeItems
          .filter((item: KnowledgeItem) => item.isLinked)
          .map((item: KnowledgeItem) => item.id)
      );
      setSelectedIds(alreadyLinked);

      toast({
        title: "Search complete",
        description: `Found ${data.knowledgeItems?.length || 0} relevant items`,
      });
    } catch (error) {
      console.error('Error searching knowledge:', error);
      toast({
        title: "Error",
        description: "Failed to search knowledge items",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const linkSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      // Get currently linked items
      const { data: currentLinks } = await supabase
        .from('task_knowledge_links')
        .select('knowledge_item_id')
        .eq('task_id', taskId);

      const currentlyLinked = new Set(
        currentLinks?.map(l => l.knowledge_item_id) || []
      );

      // Items to link (in selectedIds but not in currentlyLinked)
      const toLink = Array.from(selectedIds).filter(id => !currentlyLinked.has(id));
      
      // Items to unlink (in currentlyLinked but not in selectedIds)
      const toUnlink = Array.from(currentlyLinked).filter(id => !selectedIds.has(id));

      // Link new items
      if (toLink.length > 0) {
        const linksToInsert = toLink.map(knowledgeItemId => ({
          task_id: taskId,
          knowledge_item_id: knowledgeItemId
        }));

        const { error: linkError } = await supabase
          .from('task_knowledge_links')
          .insert(linksToInsert);

        if (linkError) throw linkError;
      }

      // Unlink removed items
      if (toUnlink.length > 0) {
        const { error: unlinkError } = await supabase
          .from('task_knowledge_links')
          .delete()
          .eq('task_id', taskId)
          .in('knowledge_item_id', toUnlink);

        if (unlinkError) throw unlinkError;
      }

      toast({
        title: "Links updated",
        description: `${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''} linked`,
      });

      onLinked?.();
      await searchKnowledge(); // Refresh to show updated state
    } catch (error) {
      console.error('Error linking knowledge:', error);
      toast({
        title: "Error",
        description: "Failed to update links",
        variant: "destructive",
      });
    }
  };

  const generateSummary = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Select items to generate a summary",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);

    try {
      const { data, error } = await supabase.functions.invoke('summarize-knowledge', {
        body: {
          taskId,
          knowledgeItemIds: Array.from(selectedIds)
        }
      });

      if (error) throw error;

      setSummary(data.summary);

      toast({
        title: "Summary generated",
        description: "AI has analyzed the selected knowledge",
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'note': return 'bg-blue-500/10 text-blue-500';
      case 'link': return 'bg-green-500/10 text-green-500';
      case 'transcript': return 'bg-purple-500/10 text-purple-500';
      case 'idea': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={searchKnowledge}
          disabled={isSearching}
          variant="outline"
          size="sm"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <LinkIcon className="h-4 w-4 mr-2" />
          )}
          Find Related Knowledge
        </Button>
      </div>

      {showResults && (
        <div className="space-y-4">
          {knowledgeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No related knowledge items found
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {knowledgeItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedIds.has(item.id) ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelection(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          {item.isLinked && (
                            <Badge variant="outline" className="text-primary">
                              Linked
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Relevance: {item.score}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-3">{item.content}</p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {item.url}
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={linkSelected}
                  disabled={selectedIds.size === 0}
                  size="sm"
                >
                  Link {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}
                </Button>
                <Button
                  onClick={generateSummary}
                  disabled={selectedIds.size === 0 || isSummarizing}
                  size="sm"
                  variant="outline"
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Summary
                </Button>
              </div>

              {summary && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">AI Summary</h4>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{summary}</p>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};