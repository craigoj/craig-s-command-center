import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Contact {
  id: string;
  name: string;
  context: string | null;
  follow_up: string | null;
  tags: string[] | null;
  notes: string | null;
  last_touched: string | null;
}

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onMarkContacted: (contact: Contact) => void;
}

const tagColors: Record<string, string> = {
  work: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  personal: "bg-green-500/20 text-green-400 border-green-500/30",
  family: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  friend: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  mentor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  client: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  networking: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export function ContactCard({ contact, onEdit, onDelete, onMarkContacted }: ContactCardProps) {
  const getTagClass = (tag: string) => {
    return tagColors[tag.toLowerCase()] || "bg-muted text-muted-foreground";
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg truncate">{contact.name}</h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(contact)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(contact)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {contact.context && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contact.context}
          </p>
        )}

        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs ${getTagClass(tag)}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {contact.follow_up && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive">Follow-up needed:</p>
              <p className="text-sm text-foreground truncate">{contact.follow_up}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs h-7 px-2"
              onClick={() => onMarkContacted(contact)}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Done
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Last touched:{" "}
            {contact.last_touched
              ? format(new Date(contact.last_touched), "MMM d, yyyy")
              : "Never"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
