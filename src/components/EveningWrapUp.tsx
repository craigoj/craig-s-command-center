import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const eveningSchema = z.object({
  nonNegotiableCompleted: z.array(z.boolean()).length(3),
  lessonLearned: z.string().min(1, "Please write a lesson learned"),
  moodEvening: z.string().min(1, "Please select your evening mood"),
  tomorrowAdjustment: z.string().optional(),
});

type EveningFormData = z.infer<typeof eveningSchema>;

interface EveningWrapUpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const moodOptions = [
  "Energized 🚀",
  "Accomplished ✅",
  "Peaceful 😌",
  "Grateful 🙏",
  "Tired 😴",
  "Frustrated 😤",
  "Neutral 😐",
  "Overwhelmed 😵",
];

export function EveningWrapUp({ open, onOpenChange }: EveningWrapUpProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nonNegotiables, setNonNegotiables] = useState<string[]>([]);
  const { toast } = useToast();
  
  const form = useForm<EveningFormData>({
    resolver: zodResolver(eveningSchema),
    defaultValues: {
      nonNegotiableCompleted: [false, false, false],
      lessonLearned: "",
      moodEvening: "",
      tomorrowAdjustment: "",
    },
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (open) {
      loadTodayData();
    }
  }, [open]);

  const loadTodayData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('consistency_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNonNegotiables([
          data.non_negotiable_1 || "",
          data.non_negotiable_2 || "",
          data.non_negotiable_3 || "",
        ]);

        form.reset({
          nonNegotiableCompleted: data.non_negotiable_completed || [false, false, false],
          lessonLearned: data.lesson_learned || "",
          moodEvening: data.mood_evening || "",
          tomorrowAdjustment: data.tomorrow_adjustment || "",
        });
      }
    } catch (error) {
      console.error('Error loading evening data:', error);
    }
  };

  const generateLessonDraft = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson-draft', {
        body: { logDate: today }
      });

      if (error) throw error;

      if (data?.lessonDraft) {
        form.setValue('lessonLearned', data.lessonDraft);
        toast({
          title: "Draft Generated",
          description: "AI has created a lesson draft. Feel free to edit it!",
        });
      }
    } catch (error) {
      console.error('Error generating lesson draft:', error);
      toast({
        title: "Error",
        description: "Failed to generate lesson draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: EveningFormData) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('consistency_logs')
        .update({
          non_negotiable_completed: values.nonNegotiableCompleted,
          lesson_learned: values.lessonLearned,
          mood_evening: values.moodEvening,
          tomorrow_adjustment: values.tomorrowAdjustment,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('log_date', today);

      if (error) throw error;

      toast({
        title: "Evening Wrap-Up Saved",
        description: "Your reflection has been recorded. Great work today!",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving evening wrap-up:', error);
      toast({
        title: "Error",
        description: "Failed to save evening wrap-up. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evening Wrap-Up</DialogTitle>
          <DialogDescription>
            Reflect on your day and capture lessons learned
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormLabel>Non-Negotiables Completed</FormLabel>
              {nonNegotiables.map((item, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`nonNegotiableCompleted.${index}` as const}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        {item || `Non-Negotiable ${index + 1}`}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="lessonLearned"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Lesson Learned</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateLessonDraft}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-2">AI Draft</span>
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="What did you learn today? What went well? What could improve?"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moodEvening"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evening Mood</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How are you feeling?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {moodOptions.map((mood) => (
                        <SelectItem key={mood} value={mood}>
                          {mood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tomorrowAdjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tomorrow's Adjustment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What will you do differently tomorrow based on today's lessons?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Reflection
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
