import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IntakeItemCardProps {
  item: {
    id: string;
    raw_text: string;
    created_at: string;
  };
  classification: any;
  onProcessed: () => void;
}

export const IntakeItemCard = ({ item, classification, onProcessed }: IntakeItemCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(item.raw_text);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    await processItem('accept');
  };

  const handleModify = async () => {
    if (!editedText.trim()) {
      toast({
        title: "Error",
        description: "Text cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validate input length
    if (editedText.length > 5000) {
      toast({
        title: "Error",
        description: "Text is too long (max 5000 characters)",
        variant: "destructive",
      });
      return;
    }

    await processItem('modify', { raw_text: editedText.trim() });
  };

  const handleDiscard = async () => {
    await processItem('discard');
  };

  const processItem = async (action: string, modifications?: any) => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-intake', {
        body: {
          intakeItemId: item.id,
          action,
          modifications
        }
      });

      if (error) throw error;

      toast({
        title: action === 'discard' ? 'Item discarded' : 'Item processed',
        description: action === 'discard' 
          ? 'Removed from intake queue' 
          : `Created ${data.classification?.type || 'item'}`,
      });

      onProcessed();
    } catch (error) {
      console.error('Error processing item:', error);
      toast({
        title: "Error",
        description: "Failed to process item",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-primary/10 text-primary';
      case 'note': return 'bg-blue-500/10 text-blue-500';
      case 'link': return 'bg-green-500/10 text-green-500';
      case 'idea': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[100px]"
                maxLength={5000}
                disabled={isProcessing}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{item.raw_text}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isProcessing}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>

        {classification && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(classification.type)}>
                {classification.type}
              </Badge>
              {classification.suggested_domain && (
                <Badge variant="outline">{classification.suggested_domain}</Badge>
              )}
              {classification.suggested_project && (
                <Badge variant="outline">{classification.suggested_project}</Badge>
              )}
            </div>
            
            {classification.task_name && (
              <div>
                <span className="text-xs text-muted-foreground">Task: </span>
                <span className="text-sm font-medium">{classification.task_name}</span>
              </div>
            )}
            
            {classification.description && (
              <p className="text-xs text-muted-foreground">{classification.description}</p>
            )}

            {classification.summary && (
              <p className="text-xs text-muted-foreground">{classification.summary}</p>
            )}

            {classification.priority && (
              <div className="text-xs">
                <span className="text-muted-foreground">Priority: </span>
                <span className="font-medium">
                  {['Critical', 'High', 'Medium', 'Low', 'Backlog'][classification.priority - 1]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={isEditing ? handleModify : handleAccept}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {isEditing ? 'Accept Modified' : 'Accept'}
        </Button>
        <Button
          onClick={handleDiscard}
          disabled={isProcessing}
          variant="destructive"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
};