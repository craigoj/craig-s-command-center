import { useState, useEffect } from "react";
import { BrainBar } from "@/components/BrainBar";
import { TaskCard } from "@/components/TaskCard";
import { DomainProgressRing } from "@/components/DomainProgressRing";
import { TaskDrillDown } from "@/components/TaskDrillDown";
import { DailyBriefing } from "@/components/DailyBriefing";
import { MomentumScore } from "@/components/MomentumScore";
import { TaskAgingAlert } from "@/components/TaskAgingAlert";
import { IntakeQueue } from "@/components/IntakeQueue";
import { MorningRoutineCard } from "@/components/MorningRoutineCard";
import { DailyActionsCard } from "@/components/DailyActionsCard";
import { EveningWrapUp } from "@/components/EveningWrapUp";
import { WeeklyResetCard } from "@/components/WeeklyResetCard";
import { MidweekCheckinCard } from "@/components/MidweekCheckinCard";
import { ConsistencyScore } from "@/components/ConsistencyScore";
import { MorningSuggestions } from "@/components/MorningSuggestions";
import { TimeBasedGreeting } from "@/components/TimeBasedGreeting";
import { EmptyState } from "@/components/EmptyState";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { SkeletonTaskCard } from "@/components/SkeletonCard";
import { supabase } from "@/integrations/supabase/client";
import { Command, LogOut, Moon, Target } from "lucide-react";
import { TaskWithRelations } from "@/types/database";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHaptic } from "@/hooks/useHaptic";

const Index = () => {
  const [topTasks, setTopTasks] = useState<TaskWithRelations[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [eveningWrapUpOpen, setEveningWrapUpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timeOfDay = useTimeOfDay();
  const haptic = useHaptic();

  // Pull to refresh
  const handleRefresh = async () => {
    await loadTopTasks();
    haptic.success();
    toast.success("Refreshed!");
  };

  const { containerRef, pullDistance, isRefreshing, isTriggered } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    loadTopTasks();
  }, []);

  const loadTopTasks = async () => {
    try {
      setIsLoading(true);
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(
            name,
            domain:domains(name, color, icon)
          )
        `)
        .is('archived_at', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(3);

      setTopTasks((data || []) as TaskWithRelations[]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    haptic.light();
    setSelectedTaskId(taskId);
    setIsDrillDownOpen(true);
  };

  const handleLogout = async () => {
    haptic.medium();
    const { error } = await supabase.auth.signOut();
    if (error) {
      haptic.error();
      toast.error('Failed to sign out');
    } else {
      haptic.success();
      toast.success('Signed out successfully');
    }
  };

  return (
    <div ref={containerRef} className="bg-background overflow-auto h-screen">
      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isTriggered={isTriggered}
      />

      {/* Header with gradient glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-64 pointer-events-none" />
        
        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Command className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
                    CTRL:Craig
                  </h1>
                  <TimeBasedGreeting />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                onTouchStart={() => haptic.selection()}
                className="gap-2 self-end md:self-auto"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-2 md:px-4 py-6 md:py-12 space-y-6 md:space-y-12 pb-24 md:pb-12">
        {/* Brain Bar - Sticky on mobile */}
        <section className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm py-4 md:relative md:top-0 md:bg-transparent md:backdrop-blur-none md:py-0">
          <BrainBar onTaskCreated={loadTopTasks} />
        </section>

        {/* Morning Focus - Show 5am-11am */}
        {(timeOfDay === 'morning') && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
            <MorningRoutineCard />
            <MorningSuggestions />
          </section>
        )}

        {/* Weekly Planning - Always visible but highlighted on weekends */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <WeeklyResetCard />
          <MidweekCheckinCard />
        </section>

        {/* Daytime Focus - Show 11am-5pm */}
        {(timeOfDay === 'daytime' || timeOfDay === 'morning') && (
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <DailyBriefing />
          </section>
        )}

        {/* Consistency & Daily Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <ConsistencyScore />
          <DailyActionsCard />
        </section>

        {/* Evening Wrap-Up - Show 5pm-10pm */}
        {(timeOfDay === 'evening' || timeOfDay === 'night') && (
          <section className="flex justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button 
              onClick={() => {
                haptic.medium();
                setEveningWrapUpOpen(true);
              }}
              onTouchStart={() => haptic.selection()}
              size="lg"
              className="gap-2 min-h-12 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Moon className="h-5 w-5" />
              <span className="text-base">Complete Evening Wrap-Up</span>
            </Button>
          </section>
        )}

        {/* Momentum & Aging Alerts - Progressive disclosure: collapse if no alerts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <MomentumScore />
          <TaskAgingAlert />
        </section>

        {/* Intake Queue */}
        <section className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <IntakeQueue />
        </section>

        {/* Top 3 Tasks */}
        <section className="space-y-4 md:space-y-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold">
              {timeOfDay === 'morning' && "Today's Top 3"}
              {timeOfDay === 'daytime' && "Active Tasks"}
              {timeOfDay === 'evening' && "Finish Strong"}
              {timeOfDay === 'night' && "Tomorrow's Preview"}
            </h2>
            <span className="text-xs md:text-sm text-muted-foreground">Highest leverage tasks</span>
          </div>
          
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonTaskCard key={i} />
              ))}
            </div>
          ) : topTasks.length > 0 ? (
            <div className="grid gap-3 md:gap-4">
              {topTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  onTouchStart={() => haptic.selection()}
                >
                  <TaskCard 
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No tasks yet"
              description="Use the Brain Bar above to capture your first task or thought. AI will help organize it for you."
              className="animate-fade-in"
            />
          )}
        </section>

        {/* Domain Progress */}
        <section className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <DomainProgressRing />
        </section>
      </main>

      {/* Task Drill Down Modal */}
      <TaskDrillDown
        taskId={selectedTaskId}
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        onTaskUpdated={loadTopTasks}
      />

      {/* Evening Wrap-Up Modal */}
      <EveningWrapUp open={eveningWrapUpOpen} onOpenChange={setEveningWrapUpOpen} />
    </div>
  );
};

export default Index;