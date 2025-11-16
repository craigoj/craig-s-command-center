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
import { supabase } from "@/integrations/supabase/client";
import { Command, LogOut, Moon } from "lucide-react";
import { TaskWithRelations } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Index = () => {
  const [topTasks, setTopTasks] = useState<TaskWithRelations[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [eveningWrapUpOpen, setEveningWrapUpOpen] = useState(false);

  useEffect(() => {
    loadTopTasks();
  }, []);

  const loadTopTasks = async () => {
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
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDrillDownOpen(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-64 pointer-events-none" />
        
        <header className="relative border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Command className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  CTRL:Craig
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Brain Bar */}
        <section>
          <BrainBar onTaskCreated={loadTopTasks} />
        </section>

        {/* Morning Routine & Weekly Reset */}
        <section className="grid md:grid-cols-2 gap-6">
          <MorningRoutineCard />
          <WeeklyResetCard />
        </section>

        {/* AI Morning Suggestions */}
        <section>
          <MorningSuggestions />
        </section>

        {/* Midweek Check-in & Consistency Score */}
        <section className="grid md:grid-cols-2 gap-6">
          <MidweekCheckinCard />
          <ConsistencyScore />
        </section>

        {/* Daily Briefing */}
        <section>
          <DailyBriefing />
        </section>

        {/* Daily Actions */}
        <section>
          <DailyActionsCard />
        </section>

        {/* Evening Wrap-Up */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Evening Reflection
              </CardTitle>
              <CardDescription>
                Complete your day with reflection and lessons learned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setEveningWrapUpOpen(true)}
                className="w-full"
              >
                Open Evening Wrap-Up
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Momentum & Aging Alerts */}
        <section className="grid md:grid-cols-2 gap-6">
          <MomentumScore />
          <TaskAgingAlert />
        </section>

        {/* Intake Queue */}
        <section>
          <IntakeQueue />
        </section>

        {/* Top 3 Tasks */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Today's Top 3</h2>
            <span className="text-sm text-muted-foreground">Highest leverage tasks</span>
          </div>
          
          <div className="space-y-4">
            {topTasks.length > 0 ? (
              topTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No tasks yet</p>
                <p className="text-sm">Use the Brain Bar above to add your first task</p>
              </div>
            )}
          </div>
        </section>

        {/* Domain Progress */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Domain Progress</h2>
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