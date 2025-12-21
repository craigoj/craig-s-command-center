import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Trophy, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  Flame
} from 'lucide-react';

export default function YearlyPlanningDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Placeholder - will check if user has completed onboarding
  const hasCompletedOnboarding = false;

  if (!hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Flame className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Welcome to {currentYear}
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Let's build your yearly plan. It takes about 10 minutes to set your foundation for an extraordinary year.
          </p>

          <Button 
            size="lg" 
            onClick={() => navigate('/yearly-planning/onboarding')}
            className="gap-2"
          >
            Start Your Plan
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            You'll create your Life Resume, choose a theme, and design your Misogi challenge.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard for users who have completed onboarding
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{currentYear} Plan</h1>
          <p className="text-muted-foreground">Evidence over emotion. Track what you actually did.</p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Theme</p>
                  <p className="font-semibold text-sm">Evidence Over Emotion</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Misogi</p>
                  <p className="font-semibold text-sm">42% Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Score</p>
                  <p className="font-semibold text-sm">85% Aligned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth Time</p>
                  <p className="font-semibold text-sm">62% of Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Life Resume */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Life Resume</CardTitle>
                  <CardDescription>Your identity foundation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                12 accomplishments across 3 categories proving who you are.
              </p>
              <Button variant="outline" className="w-full">View & Edit</Button>
            </CardContent>
          </Card>

          {/* Misogi Progress */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle>Misogi Challenge</CardTitle>
                  <CardDescription>Your impossible goal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                "Complete an Ironman triathlon by September"
              </p>
              <Button variant="outline" className="w-full">Update Progress</Button>
            </CardContent>
          </Card>

          {/* Daily Scorecard */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <CardTitle>Daily Scorecard</CardTitle>
                  <CardDescription>5-minute daily truth</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track your hard things, discomfort, and wins.
              </p>
              <Button variant="outline" className="w-full">Log Today</Button>
            </CardContent>
          </Card>

          {/* Calendar Audit */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Calendar Audit</CardTitle>
                  <CardDescription>Where your time goes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Growth, Maintenance, or Escape? Know the truth.
              </p>
              <Button variant="outline" className="w-full">Review Time</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
