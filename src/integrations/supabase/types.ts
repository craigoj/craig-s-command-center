export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          color_category: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_date: string | null
          id: string
          quality_rating: number | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_category: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          id?: string
          quality_rating?: number | null
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          id?: string
          quality_rating?: number | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consistency_logs: {
        Row: {
          created_at: string | null
          emotion_label: string | null
          id: string
          identity_proof_moment: string | null
          identity_statement: string | null
          lesson_learned: string | null
          log_date: string
          mood_evening: string | null
          morning_reflection: string | null
          non_negotiable_1: string | null
          non_negotiable_2: string | null
          non_negotiable_3: string | null
          non_negotiable_completed: boolean[] | null
          phone_free_30min: boolean | null
          tomorrow_adjustment: string | null
          updated_at: string | null
          user_id: string
          visualization_done: boolean | null
        }
        Insert: {
          created_at?: string | null
          emotion_label?: string | null
          id?: string
          identity_proof_moment?: string | null
          identity_statement?: string | null
          lesson_learned?: string | null
          log_date: string
          mood_evening?: string | null
          morning_reflection?: string | null
          non_negotiable_1?: string | null
          non_negotiable_2?: string | null
          non_negotiable_3?: string | null
          non_negotiable_completed?: boolean[] | null
          phone_free_30min?: boolean | null
          tomorrow_adjustment?: string | null
          updated_at?: string | null
          user_id: string
          visualization_done?: boolean | null
        }
        Update: {
          created_at?: string | null
          emotion_label?: string | null
          id?: string
          identity_proof_moment?: string | null
          identity_statement?: string | null
          lesson_learned?: string | null
          log_date?: string
          mood_evening?: string | null
          morning_reflection?: string | null
          non_negotiable_1?: string | null
          non_negotiable_2?: string | null
          non_negotiable_3?: string | null
          non_negotiable_completed?: boolean[] | null
          phone_free_30min?: boolean | null
          tomorrow_adjustment?: string | null
          updated_at?: string | null
          user_id?: string
          visualization_done?: boolean | null
        }
        Relationships: []
      }
      daily_actions: {
        Row: {
          confident_posture: boolean | null
          created_at: string | null
          declutter_item: boolean | null
          id: string
          kept_promise: boolean | null
          log_date: string
          movement_30min: boolean | null
          reframed_thought: boolean | null
          thoughtful_text: boolean | null
          uncomfortable_action: boolean | null
          updated_at: string | null
          user_id: string
          water_64oz: boolean | null
        }
        Insert: {
          confident_posture?: boolean | null
          created_at?: string | null
          declutter_item?: boolean | null
          id?: string
          kept_promise?: boolean | null
          log_date: string
          movement_30min?: boolean | null
          reframed_thought?: boolean | null
          thoughtful_text?: boolean | null
          uncomfortable_action?: boolean | null
          updated_at?: string | null
          user_id: string
          water_64oz?: boolean | null
        }
        Update: {
          confident_posture?: boolean | null
          created_at?: string | null
          declutter_item?: boolean | null
          id?: string
          kept_promise?: boolean | null
          log_date?: string
          movement_30min?: boolean | null
          reframed_thought?: boolean | null
          thoughtful_text?: boolean | null
          uncomfortable_action?: boolean | null
          updated_at?: string | null
          user_id?: string
          water_64oz?: boolean | null
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          created_at: string
          date_score: string
          discomfort_faced: string | null
          hard_thing: string | null
          id: string
          life_resume_worthy: boolean
          small_win: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_score: string
          discomfort_faced?: string | null
          hard_thing?: string | null
          id?: string
          life_resume_worthy?: boolean
          small_win?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_score?: string
          discomfort_faced?: string | null
          hard_thing?: string | null
          id?: string
          life_resume_worthy?: boolean
          small_win?: string | null
          user_id?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      epic_experiences: {
        Row: {
          category: string
          completed: boolean
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          planned_date: string | null
          title: string
          updated_at: string
          user_id: string
          yearly_plan_id: string
        }
        Insert: {
          category: string
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          planned_date?: string | null
          title: string
          updated_at?: string
          user_id: string
          yearly_plan_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          planned_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          yearly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epic_experiences_yearly_plan_id_fkey"
            columns: ["yearly_plan_id"]
            isOneToOne: false
            referencedRelation: "yearly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      harada_pillars: {
        Row: {
          created_at: string | null
          health_score: number | null
          id: string
          notes: string | null
          pillar_name: string
          updated_at: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          notes?: string | null
          pillar_name: string
          updated_at?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          notes?: string | null
          pillar_name?: string
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      intake_items: {
        Row: {
          created_at: string | null
          id: string
          parsed_type: string | null
          raw_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          parsed_type?: string | null
          raw_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          parsed_type?: string | null
          raw_text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string | null
          type: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          type: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          type?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      life_resume: {
        Row: {
          category: string
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
          yearly_plan_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
          yearly_plan_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
          yearly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_resume_yearly_plan_id_fkey"
            columns: ["yearly_plan_id"]
            isOneToOne: false
            referencedRelation: "yearly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      midweek_checkins: {
        Row: {
          checkin_date: string
          correction_plan: string | null
          created_at: string | null
          id: string
          pillar_attention: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          correction_plan?: string | null
          created_at?: string | null
          id?: string
          pillar_attention?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          correction_plan?: string | null
          created_at?: string | null
          id?: string
          pillar_attention?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      misogi: {
        Row: {
          category: string
          completion_percentage: number
          created_at: string
          daily_action_required: boolean
          description: string | null
          difficulty_level: number | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          yearly_plan_id: string
        }
        Insert: {
          category: string
          completion_percentage?: number
          created_at?: string
          daily_action_required?: boolean
          description?: string | null
          difficulty_level?: number | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          yearly_plan_id: string
        }
        Update: {
          category?: string
          completion_percentage?: number
          created_at?: string
          daily_action_required?: boolean
          description?: string | null
          difficulty_level?: number | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          yearly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "misogi_yearly_plan_id_fkey"
            columns: ["yearly_plan_id"]
            isOneToOne: false
            referencedRelation: "yearly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_constraints: {
        Row: {
          active: boolean
          constraint_type: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          yearly_plan_id: string
        }
        Insert: {
          active?: boolean
          constraint_type: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          yearly_plan_id: string
        }
        Update: {
          active?: boolean
          constraint_type?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          yearly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_constraints_yearly_plan_id_fkey"
            columns: ["yearly_plan_id"]
            isOneToOne: false
            referencedRelation: "yearly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          domain_id: string | null
          id: string
          name: string
          priority: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          domain_id?: string | null
          id?: string
          name: string
          priority?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          domain_id?: string | null
          id?: string
          name?: string
          priority?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      task_knowledge_links: {
        Row: {
          created_at: string | null
          id: string
          knowledge_item_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          knowledge_item_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          knowledge_item_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_knowledge_links_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_knowledge_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          created_at: string | null
          id: string
          is_complete: boolean | null
          order_index: number | null
          task_id: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_complete?: boolean | null
          order_index?: number | null
          task_id?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_complete?: boolean | null
          order_index?: number | null
          task_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_top_priority: boolean | null
          name: string
          priority: number | null
          progress: number | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_top_priority?: boolean | null
          name: string
          priority?: number | null
          progress?: number | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_top_priority?: boolean | null
          name?: string
          priority?: number | null
          progress?: number | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_resets: {
        Row: {
          created_at: string | null
          environment_reset_done: boolean | null
          id: string
          miss_reasons: string | null
          misses: string[] | null
          pillar_needs_attention: string | null
          updated_at: string | null
          user_id: string
          week_priorities: string[] | null
          week_start_date: string
          wins: string[] | null
        }
        Insert: {
          created_at?: string | null
          environment_reset_done?: boolean | null
          id?: string
          miss_reasons?: string | null
          misses?: string[] | null
          pillar_needs_attention?: string | null
          updated_at?: string | null
          user_id: string
          week_priorities?: string[] | null
          week_start_date: string
          wins?: string[] | null
        }
        Update: {
          created_at?: string | null
          environment_reset_done?: boolean | null
          id?: string
          miss_reasons?: string | null
          misses?: string[] | null
          pillar_needs_attention?: string | null
          updated_at?: string | null
          user_id?: string
          week_priorities?: string[] | null
          week_start_date?: string
          wins?: string[] | null
        }
        Relationships: []
      }
      yearly_plans: {
        Row: {
          created_at: string
          id: string
          theme: string
          theme_created_at: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          theme: string
          theme_created_at?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          theme?: string
          theme_created_at?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      yearly_weekly_reflections: {
        Row: {
          action_choices: string | null
          comfort_choices: string | null
          created_at: string
          earned_respect: string | null
          id: string
          proud_of_week: boolean
          theme_alignment_score: number | null
          updated_at: string
          user_id: string
          week_start_date: string
          yearly_plan_id: string | null
        }
        Insert: {
          action_choices?: string | null
          comfort_choices?: string | null
          created_at?: string
          earned_respect?: string | null
          id?: string
          proud_of_week?: boolean
          theme_alignment_score?: number | null
          updated_at?: string
          user_id: string
          week_start_date: string
          yearly_plan_id?: string | null
        }
        Update: {
          action_choices?: string | null
          comfort_choices?: string | null
          created_at?: string
          earned_respect?: string | null
          id?: string
          proud_of_week?: boolean
          theme_alignment_score?: number | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
          yearly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yearly_weekly_reflections_yearly_plan_id_fkey"
            columns: ["yearly_plan_id"]
            isOneToOne: false
            referencedRelation: "yearly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
