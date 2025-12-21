import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Sparkles, Target, Trophy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LifeResumeBuilder, LifeResumeBuilderRef } from '@/components/yearly-planning/LifeResumeBuilder';
import ThemeSelector, { ThemeSelectorRef } from '@/components/yearly-planning/ThemeSelector';
import MisogiCreator, { MisogiCreatorRef } from '@/components/yearly-planning/MisogiCreator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
const steps = [
  {
    id: 1,
    title: 'Life Resume',
    subtitle: 'Your Identity Foundation',
    description: 'Document your proudest accomplishments across Physical, Mental/Emotional, and Creative domains.',
    icon: Trophy,
    encouragement: 'This is who you are. Let your past victories guide your future.',
  },
  {
    id: 2,
    title: 'Annual Theme',
    subtitle: 'Your Decision Filter',
    description: 'Choose one guiding theme that will shape every decision you make this year.',
    icon: Target,
    encouragement: 'One theme beats twelve goals. Focus creates momentum.',
  },
  {
    id: 3,
    title: 'Misogi Challenge',
    subtitle: 'Your Impossible Goal',
    description: "Define ONE audacious challenge that will test your limits and redefine what's possible.",
    icon: Sparkles,
    encouragement: 'The impossible becomes possible through daily action.',
  },
];

export default function YearlyPlanningOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepData, setStepData] = useState({
    step1HasData: false,
    step2HasData: false,
    step3HasData: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [yearlyPlanId, setYearlyPlanId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);

  // Refs for step components
  const lifeResumeRef = useRef<LifeResumeBuilderRef>(null);
  const themeSelectorRef = useRef<ThemeSelectorRef>(null);
  const misogiCreatorRef = useRef<MisogiCreatorRef>(null);

  // Load existing yearly plan data
  useEffect(() => {
    const loadYearlyPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentYear = new Date().getFullYear();
      const { data } = await supabase
        .from('yearly_plans')
        .select('id, theme')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (data) {
        setYearlyPlanId(data.id);
        setCurrentTheme(data.theme);
        if (data.theme) {
          setStepData(prev => ({ ...prev, step2HasData: true }));
        }
      }
    };

    loadYearlyPlan();
  }, []);

  const currentStepData = steps.find(s => s.id === currentStep)!;
  const progress = (currentStep / steps.length) * 100;
  const isLastStep = currentStep === steps.length;
  const isFirstStep = currentStep === 1;

  // Check if current step can proceed
  const canProceed = useCallback(() => {
    if (currentStep === 1) return stepData.step1HasData;
    if (currentStep === 2) return stepData.step2HasData;
    if (currentStep === 3) return stepData.step3HasData;
    return true;
  }, [currentStep, stepData]);

  const handleNext = async () => {
    // Save data before proceeding
    if (currentStep === 1 && lifeResumeRef.current) {
      setIsSaving(true);
      try {
        await lifeResumeRef.current.saveAll();
        // Update yearlyPlanId after creating the plan
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentYear = new Date().getFullYear();
          const { data } = await supabase
            .from('yearly_plans')
            .select('id')
            .eq('user_id', user.id)
            .eq('year', currentYear)
            .maybeSingle();
          if (data) {
            setYearlyPlanId(data.id);
          }
        }
        toast.success('Life Resume saved!');
      } catch (error) {
        toast.error('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    // Step 2 auto-saves, just validate
    if (currentStep === 2 && !stepData.step2HasData) {
      toast.error('Please select a theme to continue');
      return;
    }

    // Step 3: Submit Misogi form
    if (currentStep === 3 && misogiCreatorRef.current) {
      setIsSaving(true);
      try {
        const success = await misogiCreatorRef.current.submit();
        if (!success) {
          setIsSaving(false);
          return;
        }
        // Navigate happens inside MisogiCreator onComplete
        setIsSaving(false);
        return;
      } catch (error) {
        toast.error('Failed to save Misogi. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (isLastStep) {
      navigate('/yearly-planning');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      navigate('/yearly-planning');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    // Only allow going to completed steps or current step
    if (completedSteps.includes(stepId) || stepId === currentStep || stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Progress Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <button 
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Step Indicators */}
      <div className="max-w-2xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const canClick = isCompleted || step.id <= currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => canClick && handleStepClick(step.id)}
                  disabled={!canClick}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isCompleted && !isCurrent && "bg-primary/20 text-primary hover:bg-primary/30",
                    !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
                    canClick && !isCurrent && "cursor-pointer"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-1",
                    completedSteps.includes(step.id) ? "bg-primary/40" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-4 md:py-8">
        <div className="w-full max-w-lg animate-fade-in" key={currentStep}>
          {/* Icon */}
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-primary mb-2">{currentStepData.subtitle}</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              {currentStepData.title}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Step Content Card */}
          <Card className="mb-4 shadow-lg border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {currentStep === 1 && 'Build Your Life Resume'}
                {currentStep === 2 && 'Choose Your Theme'}
                {currentStep === 3 && 'Design Your Misogi'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Add accomplishments that prove who you are.'}
                {currentStep === 2 && 'Select the theme that will guide your year.'}
                {currentStep === 3 && 'Define the one challenge that will transform you.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Life Resume Builder */}
              {currentStep === 1 && (
                <LifeResumeBuilder 
                  ref={lifeResumeRef}
                  onDataChange={(hasData) => setStepData(prev => ({ ...prev, step1HasData: hasData }))}
                  onSaving={setIsSaving}
                />
              )}

              {/* Step 2: Theme Selector */}
              {currentStep === 2 && (
                <ThemeSelector
                  ref={themeSelectorRef}
                  yearlyPlanId={yearlyPlanId}
                  initialTheme={currentTheme || undefined}
                  onThemeSelect={(theme) => {
                    setCurrentTheme(theme);
                    setStepData(prev => ({ ...prev, step2HasData: true }));
                  }}
                />
              )}

              {/* Step 3: Misogi Creator */}
              {currentStep === 3 && (
                <MisogiCreator
                  ref={misogiCreatorRef}
                  yearlyPlanId={yearlyPlanId}
                  onComplete={() => navigate('/yearly-planning')}
                  onDataChange={(hasData) => setStepData(prev => ({ ...prev, step3HasData: hasData }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Encouragement Quote */}
          <div className="text-center mb-4">
            <p className="text-sm italic text-muted-foreground">
              "{currentStepData.encouragement}"
            </p>
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirstStep || isSaving}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              size="lg"
              disabled={!canProceed() || isSaving}
              className="gap-2 min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isLastStep ? 'Complete Setup' : 'Continue'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
