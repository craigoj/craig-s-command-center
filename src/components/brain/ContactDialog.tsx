import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  context: z.string().optional(),
  follow_up: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface Contact {
  id: string;
  name: string;
  context: string | null;
  follow_up: string | null;
  tags: string[] | null;
  notes: string | null;
  last_touched: string | null;
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  isLoading: boolean;
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

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isLoading,
}: ContactDialogProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      context: "",
      follow_up: "",
      tags: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        context: contact.context || "",
        follow_up: contact.follow_up || "",
        tags: contact.tags || [],
        notes: contact.notes || "",
      });
    } else {
      form.reset({
        name: "",
        context: "",
        follow_up: "",
        tags: [],
        notes: "",
      });
    }
  }, [contact, form, open]);

  const handleSubmit = async (values: ContactFormValues) => {
    await onSubmit(values);
  };

  const toggleTag = (tag: string) => {
    const currentTags = form.getValues("tags");
    if (currentTags.includes(tag)) {
      form.setValue(
        "tags",
        currentTags.filter((t) => t !== tag)
      );
    } else {
      form.setValue("tags", [...currentTags, tag]);
    }
  };

  const selectedTags = form.watch("tags");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="How do you know them?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                        {selectedTags.includes(tag) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Needed</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Send proposal by Friday"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : contact ? "Update" : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
