import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dumbbell, Brain, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Category = 'physical' | 'mental_emotional' | 'creative_impact';

interface CategoryData {
  id: Category;
  label: string;
  icon: typeof Dumbbell;
  color: string;
  placeholder: string;
  examples: string[];
}

const categories: CategoryData[] = [
  {
    id: 'physical',
    label: 'Physical',
    icon: Dumbbell,
    color: 'text-green-500',
    placeholder: 'Enter your physical accomplishments, one per line...',
    examples: ['Ran first marathon', '100-day workout streak', 'Learned to surf', 'Lost 30 pounds', 'Completed Ironman'],
  },
  {
    id: 'mental_emotional',
    label: 'Mental/Emotional',
    icon: Brain,
    color: 'text-purple-500',
    placeholder: 'Enter your mental & emotional accomplishments...',
    examples: ['Started therapy', 'Set healthy boundaries', 'Daily meditation for 6 months', 'Overcame public speaking fear', 'Journaled for a year'],
  },
  {
    id: 'creative_impact',
    label: 'Creative/Impact',
    icon: Lightbulb,
    color: 'text-orange-500',
    placeholder: 'Enter your creative & impact accomplishments...',
    examples: ['Shipped my first app', 'Mentored 3 junior devs', 'Published technical blog', 'Started a podcast', 'Gave a conference talk'],
  },
];

export interface LifeResumeBuilderRef {
  saveAll: () => Promise<void>;
}

interface LifeResumeBuilderProps {
  onDataChange?: (hasData: boolean) => void;
  onSaving?: (isSaving: boolean) => void;
}

export const LifeResumeBuilder = forwardRef<LifeResumeBuilderRef, LifeResumeBuilderProps>(
  ({ onDataChange, onSaving }, ref) => {
    const [activeTab, setActiveTab] = useState<Category>('physical');
    const [content, setContent] = useState<Record<Category, string>>({
      physical: '',
      mental_emotional: '',
      creative_impact: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [yearlyPlanId, setYearlyPlanId] = useState<string | null>(null);
    const [savedCategories, setSavedCategories] = useState<Record<Category, boolean>>({
      physical: false,
      mental_emotional: false,
      creative_impact: false,
    });

    const currentYear = new Date().getFullYear();
    const contentRef = useRef(content);
    const yearlyPlanIdRef = useRef(yearlyPlanId);

    // Keep refs in sync
    useEffect(() => {
      contentRef.current = content;
    }, [content]);

    useEffect(() => {
      yearlyPlanIdRef.current = yearlyPlanId;
    }, [yearlyPlanId]);

    // Check if any category has meaningful content
    const hasAnyContent = Object.values(content).some(c => c.trim().length >= 10);

    useEffect(() => {
      onDataChange?.(hasAnyContent);
    }, [hasAnyContent, onDataChange]);

    useEffect(() => {
      onSaving?.(isSaving);
    }, [isSaving, onSaving]);

    // Load existing data
    useEffect(() => {
      const loadData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Get or create yearly plan
          const { data: yearlyPlan } = await supabase
            .from('yearly_plans')
            .select('id')
            .eq('user_id', user.id)
            .eq('year', currentYear)
            .maybeSingle();

          if (yearlyPlan) {
            setYearlyPlanId(yearlyPlan.id);

            // Load existing life resume entries
            const { data: lifeResumeEntries } = await supabase
              .from('life_resume')
              .select('category, items')
              .eq('yearly_plan_id', yearlyPlan.id);

            if (lifeResumeEntries) {
              const loadedContent: Record<Category, string> = {
                physical: '',
                mental_emotional: '',
                creative_impact: '',
              };
              const saved: Record<Category, boolean> = {
                physical: false,
                mental_emotional: false,
                creative_impact: false,
              };

              lifeResumeEntries.forEach(entry => {
                const cat = entry.category as Category;
                const items = entry.items as string[];
                if (items && items.length > 0) {
                  loadedContent[cat] = items.map(item => `• ${item}`).join('\n');
                  saved[cat] = true;
                }
              });

              setContent(loadedContent);
              setSavedCategories(saved);
            }
          }
        } catch (error) {
          console.error('Error loading life resume:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }, [currentYear]);

    // Parse text content into array of items
    const parseItems = (text: string): string[] => {
      return text
        .split('\n')
        .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
        .filter(line => line.length > 0);
    };

    // Save all categories
    const saveAll = useCallback(async () => {
      setIsSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let planId = yearlyPlanIdRef.current;

        // Create yearly plan if it doesn't exist
        if (!planId) {
          const { data: newPlan, error: planError } = await supabase
            .from('yearly_plans')
            .insert({
              user_id: user.id,
              year: currentYear,
              theme: 'Evidence Over Emotion', // Default theme, will be updated in step 2
            })
            .select('id')
            .single();

          if (planError) throw planError;
          planId = newPlan.id;
          setYearlyPlanId(planId);
        }

        // Save all categories with content
        for (const category of categories) {
          const text = contentRef.current[category.id];
          if (!text.trim()) continue;

          const items = parseItems(text);

          const { error } = await supabase
            .from('life_resume')
            .upsert(
              {
                user_id: user.id,
                yearly_plan_id: planId,
                category: category.id,
                items,
              },
              {
                onConflict: 'user_id,yearly_plan_id,category',
              }
            );

          if (error) throw error;
        }

        setSavedCategories({
          physical: contentRef.current.physical.trim().length > 0,
          mental_emotional: contentRef.current.mental_emotional.trim().length > 0,
          creative_impact: contentRef.current.creative_impact.trim().length > 0,
        });
      } finally {
        setIsSaving(false);
      }
    }, [currentYear]);

    // Expose save function via ref
    useImperativeHandle(ref, () => ({
      saveAll,
    }));

    // Auto-save when switching tabs
    const handleTabChange = (newTab: string) => {
      setActiveTab(newTab as Category);
    };

    const handleContentChange = (category: Category, value: string) => {
      setContent(prev => ({ ...prev, [category]: value }));
      setSavedCategories(prev => ({ ...prev, [category]: false }));
    };

    const currentContent = content[activeTab];
    const charCount = currentContent.length;
    const itemCount = parseItems(currentContent).length;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3 w-full">
            {categories.map(cat => {
              const Icon = cat.icon;
              const hasContent = content[cat.id].trim().length > 0;
              const isSaved = savedCategories[cat.id];
              
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="gap-1.5 text-xs sm:text-sm relative"
                >
                  <Icon className={cn("w-4 h-4", cat.color)} />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.split('/')[0]}</span>
                  {hasContent && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                      isSaved ? "bg-green-500" : "bg-orange-500"
                    )} />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-3">
              {/* Helper text */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Examples:</span>{' '}
                  {cat.examples.slice(0, 3).join(', ')}
                </p>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <Label htmlFor={`${cat.id}-content`} className="sr-only">
                  {cat.label} Accomplishments
                </Label>
                <Textarea
                  id={`${cat.id}-content`}
                  value={content[cat.id]}
                  onChange={(e) => handleContentChange(cat.id, e.target.value)}
                  placeholder={cat.placeholder}
                  className="min-h-[180px] resize-none text-base leading-relaxed"
                  maxLength={2000}
                />
                
                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {itemCount > 0 ? (
                      <>
                        {itemCount} accomplishment{itemCount !== 1 ? 's' : ''}
                        {savedCategories[cat.id] && (
                          <span className="text-green-500 ml-2">✓ Saved</span>
                        )}
                      </>
                    ) : (
                      'Start typing your accomplishments...'
                    )}
                  </span>
                  <span className={charCount > 1800 ? 'text-orange-500' : ''}>
                    {charCount} / 2000
                  </span>
                </div>
              </div>

              {/* Quick add suggestions */}
              {content[cat.id].trim().length === 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Quick start - click to add:</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleContentChange(cat.id, `• ${example}`)}
                        className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        + {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Overall progress */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categories with content:</span>
            <span className="font-medium">
              {Object.values(content).filter(c => c.trim().length > 0).length} / 3
            </span>
          </div>
          {!hasAnyContent && (
            <p className="text-xs text-orange-500 mt-2">
              Add at least one accomplishment to continue
            </p>
          )}
        </div>

        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>
    );
  }
);

LifeResumeBuilder.displayName = 'LifeResumeBuilder';
