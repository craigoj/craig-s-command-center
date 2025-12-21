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
import OverviewTab from '@/components/yearly-planning/OverviewTab';
import GoalsTab from '@/components/yearly-planning/GoalsTab';
import TrackingTab from '@/components/yearly-planning/TrackingTab';

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
      <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
          <Skeleton className="h-8 md:h-10 w-48 md:w-64" />
          <Skeleton className="h-10 md:h-12 w-full" />
          <div className="grid gap-4">
            <Skeleton className="h-40 md:h-48" />
            <Skeleton className="h-40 md:h-48" />
          </div>
        </div>
      </div>
    );
  }

  // No yearly plan - show welcome screen
  if (!data.yearlyPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4 pb-24 md:pb-4">
        <div className="max-w-md w-full text-center animate-fade-in px-2">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Flame className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 md:mb-3">
            Welcome to {currentYear}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-6 md:mb-8">
            Let's build your yearly plan. It takes about 10 minutes to set your foundation for an extraordinary year.
          </p>

          <Button 
            size="lg" 
            onClick={() => navigate('/yearly-planning/onboarding')}
            className="gap-2 w-full sm:w-auto min-h-[48px]"
          >
            Start Your Plan
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-xs md:text-sm text-muted-foreground mt-4">
            You'll create your Life Resume, choose a theme, and design your Misogi challenge.
          </p>
        </div>
      </div>
    );
  }

  const themeData = themeLabels[data.yearlyPlan.theme] || { title: data.yearlyPlan.theme, emoji: "🎯" };
  const totalLifeResumeItems = data.lifeResume.reduce((sum, lr) => sum + lr.items.length, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8">
        {/* Header */}
        <header className="mb-4 md:mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                {currentYear} Plan
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base truncate">
                {themeData.emoji} {themeData.title}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/yearly-planning/onboarding')}
              className="shrink-0 text-xs sm:text-sm min-h-[36px] px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Edit Setup</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          </div>
        </header>

        {/* Tabs - Horizontally scrollable on mobile */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-hide">
            <TabsList className="inline-flex w-auto min-w-full sm:w-full justify-start sm:justify-start bg-muted/50 p-1 gap-1">
              <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 min-h-[40px] px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="identity" className="gap-1.5 sm:gap-2 min-h-[40px] px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0">
                <User className="w-4 h-4" />
                <span>Identity</span>
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-1.5 sm:gap-2 min-h-[40px] px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0">
                <Goal className="w-4 h-4" />
                <span>Goals</span>
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-1.5 sm:gap-2 min-h-[40px] px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0">
                <ClipboardList className="w-4 h-4" />
                <span>Tracking</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="animate-fade-in">
            <OverviewTab 
              yearlyPlan={data.yearlyPlan}
              misogi={data.misogi}
              onTabChange={handleTabChange}
            />
          </TabsContent>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Theme Display */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Target className="w-4 h-4 md:w-5 md:h-5" />
                  {currentYear} Theme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-3 md:py-4">
                  <span className="text-3xl md:text-4xl mb-2 block">{themeData.emoji}</span>
                  <h2 className="text-xl md:text-2xl font-bold">{themeData.title}</h2>
                </div>
              </CardContent>
            </Card>

            {/* Life Resume */}
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                    Life Resume
                  </CardTitle>
                  <span className="text-xs md:text-sm text-muted-foreground">{totalLifeResumeItems} items</span>
                </div>
                <CardDescription className="text-xs md:text-sm">Proof of who you are</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {data.lifeResume.length === 0 ? (
                  <div className="text-center py-6 md:py-8 text-muted-foreground">
                    <Trophy className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No life resume items yet</p>
                    <Button variant="outline" size="sm" className="mt-3 min-h-[40px]" onClick={() => navigate('/yearly-planning/onboarding')}>
                      Add Accomplishments
                    </Button>
                  </div>
                ) : (
                  data.lifeResume.map((resume) => {
                    const Icon = categoryIcons[resume.category] || Trophy;
                    return (
                      <div key={resume.id} className="border rounded-lg p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <Icon className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm md:text-base">{categoryLabels[resume.category] || resume.category}</h3>
                        </div>
                        <ul className="space-y-1">
                          {resume.items.map((item, i) => (
                            <li key={i} className="text-xs md:text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary shrink-0">•</span>
                              <span className="break-words">{item}</span>
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
          <TabsContent value="goals" className="animate-fade-in">
            <GoalsTab 
              misogi={data.misogi}
              yearlyPlanId={data.yearlyPlan.id}
              onMisogiUpdate={(updatedMisogi) => setData(prev => ({ ...prev, misogi: updatedMisogi }))}
            />
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="animate-fade-in">
            <TrackingTab 
              yearlyPlanId={data.yearlyPlan.id}
              theme={themeData.title}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
