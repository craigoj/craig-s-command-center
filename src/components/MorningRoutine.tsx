import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Sun, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const morningRoutineSchema = z.object({
  morning_reflection: z.string().max(500, 'Reflection must be less than 500 characters').optional(),
  identity_statement: z.string().default('I am a consistent man'),
  emotion_label: z.string().optional(),
  visualization_done: z.boolean().default(false),
  phone_free_30min: z.boolean().default(false),
  non_negotiable_1: z.string().max(200, 'Must be less than 200 characters').optional(),
  non_negotiable_2: z.string().max(200, 'Must be less than 200 characters').optional(),
  non_negotiable_3: z.string().max(200, 'Must be less than 200 characters').optional(),
});

type MorningRoutineForm = z.infer<typeof morningRoutineSchema>;

const EMOTION_OPTIONS = [
  { value: 'calm', label: '😌 Calm', emoji: '😌' },
  { value: 'energized', label: '⚡ Energized', emoji: '⚡' },
  { value: 'anxious', label: '😰 Anxious', emoji: '😰' },
  { value: 'focused', label: '🎯 Focused', emoji: '🎯' },
  { value: 'tired', label: '😴 Tired', emoji: '😴' },
  { value: 'motivated', label: '🔥 Motivated', emoji: '🔥' },
  { value: 'overwhelmed', label: '😵 Overwhelmed', emoji: '😵' },
  { value: 'peaceful', label: '🕊️ Peaceful', emoji: '🕊️' },
  { value: 'uncertain', label: '🤔 Uncertain', emoji: '🤔' },
  { value: 'confident', label: '💪 Confident', emoji: '💪' },
];

export function MorningRoutine() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<MorningRoutineForm>({
    resolver: zodResolver(morningRoutineSchema),
    defaultValues: {
      identity_statement: 'I am a consistent man',
      visualization_done: false,
      phone_free_30min: false,
    },
  });

  // Load existing log for today
  useEffect(() => {
    loadTodayLog();
  }, []);

  const loadTodayLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('consistency_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLogId(data.id);
        form.reset({
          morning_reflection: data.morning_reflection || '',
          identity_statement: data.identity_statement || 'I am a consistent man',
          emotion_label: data.emotion_label || '',
          visualization_done: data.visualization_done || false,
          phone_free_30min: data.phone_free_30min || false,
          non_negotiable_1: data.non_negotiable_1 || '',
          non_negotiable_2: data.non_negotiable_2 || '',
          non_negotiable_3: data.non_negotiable_3 || '',
        });
        
        // Check if morning routine is completed
        const completed = !!(
          data.morning_reflection &&
          data.emotion_label &&
          data.non_negotiable_1 &&
          data.non_negotiable_2 &&
          data.non_negotiable_3
        );
        setIsCompleted(completed);
      }
    } catch (error) {
      console.error('Error loading today log:', error);
    }
  };

  // Auto-save on form changes
  useEffect(() => {
    const subscription = form.watch(async (values) => {
      await autoSave(values as MorningRoutineForm);
    });
    return () => subscription.unsubscribe();
  }, [logId]);

  const autoSave = async (values: MorningRoutineForm) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const saveData = {
        user_id: user.id,
        log_date: today,
        ...values,
      };

      if (logId) {
        // Update existing log
        const { error } = await supabase
          .from('consistency_logs')
          .update(saveData)
          .eq('id', logId);

        if (error) throw error;
      } else {
        // Create new log
        const { data, error } = await supabase
          .from('consistency_logs')
          .insert(saveData)
          .select()
          .single();

        if (error) throw error;
        if (data) setLogId(data.id);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const onComplete = async () => {
    const values = form.getValues();
    
    // Validate that all required fields are filled
    if (!values.morning_reflection || !values.emotion_label || 
        !values.non_negotiable_1 || !values.non_negotiable_2 || !values.non_negotiable_3) {
      toast.error('Please complete all fields before finishing');
      return;
    }

    await autoSave(values);
    setIsCompleted(true);
    toast.success('Morning routine completed! Have a great day! 🌅');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Morning Routine</CardTitle>
          </div>
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
        <CardDescription>
          Set your intention and direction for the day (10-20 minutes)
        </CardDescription>
        {isCompleted && (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Morning routine completed for today!
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form className="space-y-6">
            {/* Morning Reflection */}
            <FormField
              control={form.control}
              name="morning_reflection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    What does Craig want today?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Take 10 minutes to reflect on your intentions..."
                      className="min-h-[120px] resize-none"
                      disabled={isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Identity Statement */}
            <FormField
              control={form.control}
              name="identity_statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Identity Statement
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="I am a consistent man"
                      className="text-lg font-medium"
                      disabled={isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Current Emotion */}
            <FormField
              control={form.control}
              name="emotion_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Label Your Current Emotion
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isCompleted}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How are you feeling right now?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMOTION_OPTIONS.map((emotion) => (
                        <SelectItem key={emotion.value} value={emotion.value}>
                          {emotion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Non-Negotiable 3 */}
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <h3 className="text-base font-semibold">Non-Negotiable 3</h3>
              <p className="text-sm text-muted-foreground">
                What are the three most important things you must accomplish today?
              </p>
              
              <FormField
                control={form.control}
                name="non_negotiable_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1.</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="First priority..."
                        disabled={isCompleted}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="non_negotiable_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2.</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Second priority..."
                        disabled={isCompleted}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="non_negotiable_3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>3.</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Third priority..."
                        disabled={isCompleted}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="visualization_done"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isCompleted}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>1-minute future-self visualization</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_free_30min"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isCompleted}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>No phone for first 30 minutes</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {!isCompleted && (
              <Button
                type="button"
                onClick={onComplete}
                className="w-full"
                size="lg"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Complete Morning Routine
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
