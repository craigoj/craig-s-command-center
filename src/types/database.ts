import { Tables } from '@/integrations/supabase/types';

// Type aliases for better readability
export type Domain = Tables<'domains'>;
export type Project = Tables<'projects'>;
export type Task = Tables<'tasks'>;
export type TaskStep = Tables<'task_steps'>;
export type KnowledgeItem = Tables<'knowledge_items'>;
export type IntakeItem = Tables<'intake_items'>;
export type TaskKnowledgeLink = Tables<'task_knowledge_links'>;
export type Profile = Tables<'profiles'>;
export type ConsistencyLog = Tables<'consistency_logs'>;
export type DailyAction = Tables<'daily_actions'>;
export type WeeklyReset = Tables<'weekly_resets'>;
export type HaradaPillar = Tables<'harada_pillars'>;
export type MidweekCheckin = Tables<'midweek_checkins'>;

// Extended types with relations
export interface TaskWithRelations extends Task {
  project?: Project & {
    domain?: Domain;
  };
  task_steps?: TaskStep[];
}

export interface ProjectWithRelations extends Project {
  domain?: Domain;
  tasks?: Task[];
}

export interface KnowledgeItemWithProject extends KnowledgeItem {
  project?: Project;
}

// AI-related types
export interface DailyBriefing {
  topThree: Array<{
    task: string;
    project: string;
    domain: string;
    why: string;
  }>;
  changes: {
    newTasks: number;
    upcomingDeadlines: number;
    progressMade: number;
  };
  focusBlock: {
    suggestion: string;
    duration: string;
    tasks: string[];
  };
  healthReminder?: string;
  optimization: string;
}

export interface MomentumScore {
  score: number;
  percentile: number;
  label: string;
  emoji: string;
  stats: {
    completedTasks: number;
    completedSteps: number;
    openTasks: number;
    stagnantTasks: number;
  };
}

export interface ClassificationResult {
  type: 'task' | 'note' | 'link' | 'idea';
  suggestedProject?: string;
  priority?: number;
  explanation: string;
}
