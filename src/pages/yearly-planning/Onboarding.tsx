import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Sparkles, Target, Trophy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    description: 'Define ONE audacious challenge that will test your limits and redefine what\'s possible.',
    icon: Sparkles,
    encouragement: 'The impossible becomes possible through daily action.',
  },
];

export default function YearlyPlanningOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStepData = steps.find(s => s.id === currentStep)!;
  const progress = (currentStep / steps.length) * 100;
  const isLastStep = currentStep === steps.length;
  const isFirstStep = currentStep === 1;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (isLastStep) {
      // Complete onboarding and go to dashboard
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
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isCompleted && !isCurrent && "bg-primary/20 text-primary",
                    !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-in" key={currentStep}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-primary mb-2">{currentStepData.subtitle}</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              {currentStepData.title}
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Step Content Card */}
          <Card className="mb-6 shadow-lg border-2">
            <CardHeader>
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
              {/* Placeholder content - will be replaced with actual step components */}
              <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-muted rounded-lg bg-muted/30">
                <StepIcon className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Step {currentStep} content will be implemented here
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Encouragement Quote */}
          <div className="text-center mb-8">
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
              disabled={isFirstStep}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              size="lg"
              className="gap-2 min-w-[140px]"
            >
              {isLastStep ? 'Complete Setup' : 'Continue'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
