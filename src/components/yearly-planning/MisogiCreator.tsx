import { useState, forwardRef, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Dumbbell, Brain, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  category: z.enum(["physical", "mental_emotional", "creative"], {
    required_error: "Please select a category",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  difficultyLevel: z.number().min(1).max(10),
  dailyActionRequired: z.boolean(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type FormData = z.infer<typeof formSchema>;

const categories = [
  { value: "physical", label: "Physical", icon: Dumbbell, description: "Body, fitness, endurance" },
  { value: "mental_emotional", label: "Mental/Emotional", icon: Brain, description: "Mind, habits, relationships" },
  { value: "creative", label: "Creative", icon: Lightbulb, description: "Art, business, impact" },
];

const exampleMisogis = [
  "Run 30 miles without stopping",
  "90 consecutive days with no numbing behaviors",
  "Ship profitable SaaS with paying customers",
  "Complete Ironman triathlon",
  "Write and publish a book in 100 days",
];

interface MisogiCreatorProps {
  yearlyPlanId: string | null;
  onComplete: () => void;
  onDataChange: (hasData: boolean) => void;
}

export interface MisogiCreatorRef {
  submit: () => Promise<boolean>;
  hasValidData: () => boolean;
}

const MisogiCreator = forwardRef<MisogiCreatorRef, MisogiCreatorProps>(
  ({ yearlyPlanId, onComplete, onDataChange }, ref) => {
    const [saving, setSaving] = useState(false);
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const form = useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        title: "",
        description: "",
        category: undefined,
        startDate: new Date(nextYear, 0, 1), // Jan 1 of next year
        endDate: new Date(nextYear, 11, 31), // Dec 31 of next year
        difficultyLevel: 7,
        dailyActionRequired: false,
      },
    });

    const watchedTitle = form.watch("title");
    const watchedCategory = form.watch("category");

    // Update parent when form has valid data
    const updateDataState = () => {
      const hasTitle = watchedTitle.length >= 10;
      const hasCategory = !!watchedCategory;
      onDataChange(hasTitle && hasCategory);
    };

    // Watch for changes
    form.watch(() => updateDataState());

    const onSubmit = async (data: FormData) => {
      if (!yearlyPlanId) {
        toast.error("Please complete previous steps first");
        return false;
      }

      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from("misogi").insert({
          user_id: user.id,
          yearly_plan_id: yearlyPlanId,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          category: data.category,
          start_date: format(data.startDate, "yyyy-MM-dd"),
          end_date: format(data.endDate, "yyyy-MM-dd"),
          difficulty_level: data.difficultyLevel,
          daily_action_required: data.dailyActionRequired,
          status: "planned",
          completion_percentage: 0,
        });

        if (error) throw error;
        
        toast.success("Misogi created! Let's make it happen.");
        onComplete();
        return true;
      } catch (error) {
        console.error("Error saving misogi:", error);
        toast.error("Failed to save Misogi. Please try again.");
        return false;
      } finally {
        setSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        const isValid = await form.trigger();
        if (!isValid) return false;
        return onSubmit(form.getValues());
      },
      hasValidData: () => {
        const values = form.getValues();
        return values.title.length >= 10 && !!values.category;
      },
    }));

    const difficultyLevel = form.watch("difficultyLevel");
    const getDifficultyLabel = (level: number) => {
      if (level <= 3) return "Challenging";
      if (level <= 5) return "Very Hard";
      if (level <= 7) return "Extremely Hard";
      if (level <= 9) return "Near Impossible";
      return "Legendary";
    };

    return (
      <div className="space-y-6">
        {/* Inspiration Section */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  What makes a great Misogi?
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Seems impossible but isn't (stretches you 10x)</li>
                  <li>• Deeply meaningful to YOU</li>
                  <li>• Specific and measurable</li>
                  <li>• Forces daily discipline</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form className="space-y-5">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Challenge Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ship SaaS Product with Paying Customers in 90 Days"
                      {...field}
                      className="text-base"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {field.value.length}/100 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why This Challenge?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What makes this meaningful to you? Why now?"
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select challenge category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border z-50">
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{cat.label}</span>
                              <span className="text-muted-foreground text-xs">
                                — {cat.description}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal bg-background",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal bg-background",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("startDate")}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Difficulty Slider */}
            <FormField
              control={form.control}
              name="difficultyLevel"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Difficulty Level *</FormLabel>
                    <span className="text-sm font-medium text-primary">
                      {field.value}/10 — {getDifficultyLabel(field.value)}
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    A true Misogi should be at least 7/10 difficulty
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Daily Action Required */}
            <FormField
              control={form.control}
              name="dailyActionRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Requires daily action
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Check this if your Misogi requires something done every single day
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Example Misogis */}
        <div className="pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Need inspiration? Example Misogis:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {exampleMisogis.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => form.setValue("title", example)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {saving && (
          <p className="text-center text-muted-foreground text-sm animate-pulse">
            Creating your Misogi...
          </p>
        )}
      </div>
    );
  }
);

MisogiCreator.displayName = "MisogiCreator";

export default MisogiCreator;
