import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContactCard } from "@/components/brain/ContactCard";
import { ContactDialog } from "@/components/brain/ContactDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  context: string | null;
  follow_up: string | null;
  tags: string[] | null;
  notes: string | null;
  last_touched: string | null;
}

const availableTags = [
  "work",
  "personal",
  "family",
  "friend",
  "mentor",
  "client",
  "networking",
];

type SortOption = "last_touched_desc" | "last_touched_asc" | "name_asc" | "name_desc";

export default function People() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hasFollowUpOnly, setHasFollowUpOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("last_touched_desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as Contact[];
    },
  });

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      context?: string;
      follow_up?: string;
      tags?: string[];
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          name: values.name,
          context: values.context || null,
          follow_up: values.follow_up || null,
          tags: values.tags || [],
          notes: values.notes || null,
          last_touched: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Log to capture_log
      await supabase.from("capture_log").insert({
        user_id: user.id,
        raw_input: `Added contact: ${values.name}`,
        classified_as: "person",
        destination_table: "contacts",
        destination_id: data.id,
        confidence_score: 1.0,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added!");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add contact: " + error.message);
    },
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        name: string;
        context?: string;
        follow_up?: string;
        tags?: string[];
        notes?: string;
      };
    }) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: values.name,
          context: values.context || null,
          follow_up: values.follow_up || null,
          tags: values.tags || [],
          notes: values.notes || null,
          last_touched: new Date().toISOString().split("T")[0],
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated!");
      setDialogOpen(false);
      setEditingContact(null);
    },
    onError: (error) => {
      toast.error("Failed to update contact: " + error.message);
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
      setDeletingContact(null);
    },
    onError: (error) => {
      toast.error("Failed to delete contact: " + error.message);
    },
  });

  // Mark as contacted mutation
  const markContactedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          follow_up: null,
          last_touched: new Date().toISOString().split("T")[0],
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("✅ Follow-up completed");
    },
    onError: (error) => {
      toast.error("Failed to update contact: " + error.message);
    },
  });

  // Filter and sort contacts
  const filteredContacts = contacts
    .filter((contact) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = contact.name.toLowerCase().includes(query);
        const matchesContext = contact.context?.toLowerCase().includes(query);
        if (!matchesName && !matchesContext) return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const contactTags = contact.tags || [];
        const hasMatchingTag = selectedTags.some((tag) =>
          contactTags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // Follow-up filter
      if (hasFollowUpOnly && !contact.follow_up) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "last_touched_desc":
          return (
            new Date(b.last_touched || 0).getTime() -
            new Date(a.last_touched || 0).getTime()
          );
        case "last_touched_asc":
          return (
            new Date(a.last_touched || 0).getTime() -
            new Date(b.last_touched || 0).getTime()
          );
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: {
    name: string;
    context?: string;
    follow_up?: string;
    tags?: string[];
    notes?: string;
  }) => {
    if (editingContact) {
      await updateMutation.mutateAsync({ id: editingContact.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setHasFollowUpOnly(false);
  };

  const hasActiveFilters =
    searchQuery || selectedTags.length > 0 || hasFollowUpOnly;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-48 pointer-events-none" />

        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">People</h1>
                  <p className="text-sm text-muted-foreground">
                    {contacts.length} contacts
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setEditingContact(null);
                  setDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Contact</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_touched_desc">Last touched (newest)</SelectItem>
              <SelectItem value="last_touched_asc">Last touched (oldest)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by tag:</span>
          {availableTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => toggleTagFilter(tag)}
            >
              {tag}
              {selectedTags.includes(tag) && <X className="h-3 w-3 ml-1" />}
            </Badge>
          ))}
        </div>

        {/* Follow-up toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="follow-up"
              checked={hasFollowUpOnly}
              onCheckedChange={setHasFollowUpOnly}
            />
            <Label htmlFor="follow-up" className="text-sm">
              Show only contacts with follow-ups
            </Label>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : filteredContacts.length > 0 ? (
          <ErrorBoundary>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredContacts.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <ContactCard
                      contact={contact}
                      onEdit={handleEdit}
                      onDelete={(c) => setDeletingContact(c)}
                      onMarkContacted={(c) => markContactedMutation.mutate(c.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </ErrorBoundary>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first contact to start building your network"
            actionLabel="Add Contact"
            onAction={() => {
              setEditingContact(null);
              setDialogOpen(true);
            }}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No contacts match your filters"
            description="Try adjusting your search or filters"
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        )}
      </div>

      {/* Contact Dialog */}
      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingContact(null);
        }}
        contact={editingContact}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingContact?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingContact && deleteMutation.mutate(deletingContact.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
