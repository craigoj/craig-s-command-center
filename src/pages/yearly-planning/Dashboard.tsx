import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Trophy, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  Flame,
  LayoutDashboard,
  User,
  Goal,
  ClipboardList,
  Dumbbell,
  Brain,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface YearlyPlan {
  id: string;
  year: number;
  theme: string;
  theme_created_at: string | null;
}

interface LifeResume {
  id: string;
  category: string;
  items: string[];
}

interface Misogi {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  completion_percentage: number;
  daily_action_required: boolean;
  start_date: string | null;
  end_date: string | null;
  difficulty_level: number | null;
}

interface DashboardData {
  yearlyPlan: YearlyPlan | null;
  lifeResume: LifeResume[];
  misogi: Misogi | null;
}

const themeLabels: Record<string, { title: string; emoji: string }> = {
  finish_what_i_start: { title: "Finish What I Start", emoji: "🏁" },
  evidence_over_emotion: { title: "Evidence Over Emotion", emoji: "📊" },
  action_creates_clarity: { title: "Action Creates Clarity", emoji: "⚡" },
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  physical: Dumbbell,
  mental_emotional: Brain,
  creative_impact: Lightbulb,
  creative: Lightbulb,
};

const categoryLabels: Record<string, string> = {
  physical: "Physical",
  mental_emotional: "Mental/Emotional",
  creative_impact: "Creative/Impact",
  creative: "Creative",
};

export default function YearlyPlanningDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    yearlyPlan: null,
    lifeResume: [],
    misogi: null,
  });

  const currentYear = new Date().getFullYear();
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch yearly plan
        const { data: yearlyPlan } = await supabase
          .from('yearly_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('year', currentYear)
          .maybeSingle();

        if (!yearlyPlan) {
          setLoading(false);
          return;
        }

        // Fetch related data in parallel
        const [lifeResumeRes, misogiRes] = await Promise.all([
          supabase
            .from('life_resume')
            .select('*')
            .eq('yearly_plan_id', yearlyPlan.id),
          supabase
            .from('misogi')
            .select('*')
            .eq('yearly_plan_id', yearlyPlan.id)
            .maybeSingle(),
        ]);

        setData({
          yearlyPlan,
          lifeResume: (lifeResumeRes.data || []).map(lr => ({
            ...lr,
            items: Array.isArray(lr.items) ? lr.items as string[] : [],
          })),
          misogi: misogiRes.data,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  // No yearly plan - show welcome screen
  if (!data.yearlyPlan) {
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

  const themeData = themeLabels[data.yearlyPlan.theme] || { title: data.yearlyPlan.theme, emoji: "🎯" };
  const totalLifeResumeItems = data.lifeResume.reduce((sum, lr) => sum + lr.items.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {currentYear} Plan
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {themeData.emoji} {themeData.title}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/yearly-planning/onboarding')}>
              Edit Setup
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="identity" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Goal className="w-4 h-4" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Theme</p>
                      <p className="font-medium text-sm truncate">{themeData.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Misogi</p>
                      <p className="font-medium text-sm">
                        {data.misogi ? `${data.misogi.completion_percentage}%` : 'Not set'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Life Resume</p>
                      <p className="font-medium text-sm">{totalLifeResumeItems} items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Days Left</p>
                      <p className="font-medium text-sm">
                        {Math.ceil((new Date(currentYear, 11, 31).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Misogi Progress */}
            {data.misogi && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{data.misogi.title}</CardTitle>
                        <CardDescription>{categoryLabels[data.misogi.category] || data.misogi.category}</CardDescription>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-primary">{data.misogi.completion_percentage}%</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={data.misogi.completion_percentage} className="h-3" />
                  {data.misogi.daily_action_required && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚡ Requires daily action
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTabChange('tracking')}>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Daily Scorecard</h3>
                      <p className="text-sm text-muted-foreground">Log today's wins and challenges</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTabChange('tracking')}>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Weekly Reflection</h3>
                      <p className="text-sm text-muted-foreground">Review your theme alignment</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-6 animate-fade-in">
            {/* Theme Display */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {currentYear} Theme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <span className="text-4xl mb-2 block">{themeData.emoji}</span>
                  <h2 className="text-2xl font-bold">{themeData.title}</h2>
                </div>
              </CardContent>
            </Card>

            {/* Life Resume */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Life Resume
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">{totalLifeResumeItems} accomplishments</span>
                </div>
                <CardDescription>Proof of who you are</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.lifeResume.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No life resume items yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/yearly-planning/onboarding')}>
                      Add Accomplishments
                    </Button>
                  </div>
                ) : (
                  data.lifeResume.map((resume) => {
                    const Icon = categoryIcons[resume.category] || Trophy;
                    return (
                      <div key={resume.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">{categoryLabels[resume.category] || resume.category}</h3>
                        </div>
                        <ul className="space-y-1">
                          {resume.items.map((item, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6 animate-fade-in">
            {/* Misogi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Misogi Challenge
                </CardTitle>
                <CardDescription>Your impossible goal for the year</CardDescription>
              </CardHeader>
              <CardContent>
                {data.misogi ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{data.misogi.title}</h3>
                      {data.misogi.description && (
                        <p className="text-muted-foreground text-sm">{data.misogi.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-muted rounded-full text-xs">
                        {categoryLabels[data.misogi.category] || data.misogi.category}
                      </span>
                      {data.misogi.difficulty_level && (
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded-full text-xs">
                          Difficulty: {data.misogi.difficulty_level}/10
                        </span>
                      )}
                      {data.misogi.daily_action_required && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          Daily Action Required
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{data.misogi.completion_percentage}%</span>
                      </div>
                      <Progress value={data.misogi.completion_percentage} className="h-3" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No Misogi challenge set</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/yearly-planning/onboarding')}>
                      Create Misogi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Constraints placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Goal className="w-5 h-5" />
                  Constraints
                </CardTitle>
                <CardDescription>Rules that keep you focused</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Goal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Constraints feature coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6 animate-fade-in">
            {/* Daily Scorecard placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Daily Scorecard
                </CardTitle>
                <CardDescription>Track your daily wins and challenges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Daily scorecard feature coming soon</p>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Reflection placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Weekly Reflection
                </CardTitle>
                <CardDescription>15-minute Sunday review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Weekly reflection feature coming soon</p>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Audit placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Calendar Audit
                </CardTitle>
                <CardDescription>Growth, Maintenance, or Escape?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Calendar audit feature coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
