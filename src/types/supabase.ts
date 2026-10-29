// Generated from the database schema by supabase/local/gen-types.sh — do not edit by hand.
// App code uses the row types in ./database.ts, which are derived from these.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brain_dump_entries: {
        Row: {
          converted_task_id: string | null
          created_at: string
          id: string
          kind: string
          note: string
          status: string
          synced_at: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          converted_task_id?: string | null
          created_at: string
          id: string
          kind: string
          note?: string
          status: string
          synced_at?: string
          title: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          converted_task_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string
          status?: string
          synced_at?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brain_dump_entries_converted_task_fkey"
            columns: ["user_id", "converted_task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      daily_highlights: {
        Row: {
          date_key: string
          id: string
          selected_at: string
          synced_at: string
          task_id: string | null
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          date_key: string
          id: string
          selected_at: string
          synced_at?: string
          task_id?: string | null
          title_snapshot?: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          date_key?: string
          id?: string
          selected_at?: string
          synced_at?: string
          task_id?: string | null
          title_snapshot?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_highlights_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      kaizen_logs: {
        Row: {
          created_at: string
          date_key: string
          id: string
          notes: string
          reflection_improve: string
          reflection_learned: string
          reflection_went_well: string
          synced_at: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at: string
          date_key: string
          id: string
          notes?: string
          reflection_improve?: string
          reflection_learned?: string
          reflection_went_well?: string
          synced_at?: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          date_key?: string
          id?: string
          notes?: string
          reflection_improve?: string
          reflection_learned?: string
          reflection_went_well?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      micro_commitment_completions: {
        Row: {
          commitment_id: string
          completed_at: string
          date_key: string
          id: string
          synced_at: string
          user_id: string
          version: number
        }
        Insert: {
          commitment_id: string
          completed_at: string
          date_key: string
          id: string
          synced_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          commitment_id?: string
          completed_at?: string
          date_key?: string
          id?: string
          synced_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "micro_commitment_completions_user_id_commitment_id_fkey"
            columns: ["user_id", "commitment_id"]
            referencedRelation: "micro_commitments"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      micro_commitments: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string
          frequency: string
          id: string
          paused_periods: Json
          selected_weekdays: number[]
          start_date: string
          status: string
          synced_at: string
          target_minutes: number | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at: string
          description?: string
          frequency: string
          id: string
          paused_periods?: Json
          selected_weekdays?: number[]
          start_date: string
          status: string
          synced_at?: string
          target_minutes?: number | null
          title: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string
          frequency?: string
          id?: string
          paused_periods?: Json
          selected_weekdays?: number[]
          start_date?: string
          status?: string
          synced_at?: string
          target_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string
          id: string
          preparation_date: string | null
          project_id: string
          sort_order: number
          status: string
          synced_at: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at: string
          description?: string
          id: string
          preparation_date?: string | null
          project_id: string
          sort_order?: number
          status: string
          synced_at?: string
          target_date?: string | null
          title: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          preparation_date?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          synced_at?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_user_id_project_id_fkey"
            columns: ["user_id", "project_id"]
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          category: string
          colour: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          notes: string
          preparation_date: string | null
          priority: string | null
          start_date: string | null
          status: string
          synced_at: string
          target_date: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          category?: string
          colour?: string
          created_at: string
          description?: string
          icon?: string
          id: string
          name: string
          notes?: string
          preparation_date?: string | null
          priority?: string | null
          start_date?: string | null
          status: string
          synced_at?: string
          target_date?: string | null
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          category?: string
          colour?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          notes?: string
          preparation_date?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string
          synced_at?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      recurrence_templates: {
        Row: {
          created_at: string
          description: string
          end_date: string | null
          estimated_minutes: number | null
          frequency: string
          generated_through: string | null
          id: string
          interval: number
          interval_unit: string
          priority: string | null
          project_id: string | null
          selected_weekdays: number[]
          sprint: string | null
          start_date: string
          status: string
          synced_at: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at: string
          description?: string
          end_date?: string | null
          estimated_minutes?: number | null
          frequency: string
          generated_through?: string | null
          id: string
          interval?: number
          interval_unit?: string
          priority?: string | null
          project_id?: string | null
          selected_weekdays?: number[]
          sprint?: string | null
          start_date: string
          status: string
          synced_at?: string
          title: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string | null
          estimated_minutes?: number | null
          frequency?: string
          generated_through?: string | null
          id?: string
          interval?: number
          interval_unit?: string
          priority?: string | null
          project_id?: string | null
          selected_weekdays?: number[]
          sprint?: string | null
          start_date?: string
          status?: string
          synced_at?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_templates_user_id_project_id_fkey"
            columns: ["user_id", "project_id"]
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      sprint_session_tasks: {
        Row: {
          allocated_minutes: number | null
          completed_in_session: boolean
          id: string
          position: number
          session_id: string
          synced_at: string
          task_id: string
          user_id: string
          version: number
        }
        Insert: {
          allocated_minutes?: number | null
          completed_in_session?: boolean
          id: string
          position?: number
          session_id: string
          synced_at?: string
          task_id: string
          user_id?: string
          version?: number
        }
        Update: {
          allocated_minutes?: number | null
          completed_in_session?: boolean
          id?: string
          position?: number
          session_id?: string
          synced_at?: string
          task_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sprint_session_tasks_user_id_session_id_fkey"
            columns: ["user_id", "session_id"]
            referencedRelation: "sprint_sessions"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "sprint_session_tasks_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      sprint_sessions: {
        Row: {
          accumulated_elapsed_seconds: number
          created_at: string
          ended_at: string | null
          energy_level: string | null
          id: string
          last_resumed_at: string | null
          planned_minutes: number
          sprint: string
          started_at: string | null
          status: string
          synced_at: string
          user_id: string
          version: number
        }
        Insert: {
          accumulated_elapsed_seconds?: number
          created_at: string
          ended_at?: string | null
          energy_level?: string | null
          id: string
          last_resumed_at?: string | null
          planned_minutes: number
          sprint: string
          started_at?: string | null
          status: string
          synced_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          accumulated_elapsed_seconds?: number
          created_at?: string
          ended_at?: string | null
          energy_level?: string | null
          id?: string
          last_resumed_at?: string | null
          planned_minutes?: number
          sprint?: string
          started_at?: string | null
          status?: string
          synced_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      student_lessons: {
        Row: {
          created_at: string
          focus: string
          id: string
          lesson_date: string
          student_id: string
          synced_at: string
          updated_at: string
          user_id: string
          version: number
          went_well: string
          work_on: string
        }
        Insert: {
          created_at: string
          focus?: string
          id: string
          lesson_date: string
          student_id: string
          synced_at?: string
          updated_at: string
          user_id?: string
          version?: number
          went_well?: string
          work_on?: string
        }
        Update: {
          created_at?: string
          focus?: string
          id?: string
          lesson_date?: string
          student_id?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
          version?: number
          went_well?: string
          work_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lessons_user_id_student_id_fkey"
            columns: ["user_id", "student_id"]
            referencedRelation: "students"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      student_stages: {
        Row: {
          created_at: string
          id: string
          note: string
          reached_on: string
          stage: string
          student_id: string
          synced_at: string
          track: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at: string
          id: string
          note?: string
          reached_on: string
          stage: string
          student_id: string
          synced_at?: string
          track: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reached_on?: string
          stage?: string
          student_id?: string
          synced_at?: string
          track?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_stages_user_id_student_id_fkey"
            columns: ["user_id", "student_id"]
            referencedRelation: "students"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      students: {
        Row: {
          backhand: string | null
          ball: string
          created_at: string
          goals: string
          hand: string | null
          id: string
          name: string
          notes: string
          player_group: string
          started_on: string | null
          status: string
          synced_at: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          backhand?: string | null
          ball?: string
          created_at: string
          goals?: string
          hand?: string | null
          id: string
          name: string
          notes?: string
          player_group?: string
          started_on?: string | null
          status?: string
          synced_at?: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          backhand?: string | null
          ball?: string
          created_at?: string
          goals?: string
          hand?: string | null
          id?: string
          name?: string
          notes?: string
          player_group?: string
          started_on?: string | null
          status?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      sync_tombstones: {
        Row: {
          deleted_at: string
          id: string
          table_name: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id: string
          table_name: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          captured_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          estimated_minutes: number | null
          id: string
          milestone_id: string | null
          occurrence_date: string | null
          priority: string | null
          project_id: string | null
          project_sort_order: number
          recurrence_template_id: string | null
          sort_order: number
          source_capture_id: string | null
          sprint: string | null
          status: string
          synced_at: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          actual_minutes?: number | null
          captured_at?: string | null
          completed_at?: string | null
          created_at: string
          description?: string
          due_date?: string | null
          estimated_minutes?: number | null
          id: string
          milestone_id?: string | null
          occurrence_date?: string | null
          priority?: string | null
          project_id?: string | null
          project_sort_order?: number
          recurrence_template_id?: string | null
          sort_order?: number
          source_capture_id?: string | null
          sprint?: string | null
          status: string
          synced_at?: string
          title: string
          updated_at: string
          user_id?: string
          version?: number
        }
        Update: {
          actual_minutes?: number | null
          captured_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          milestone_id?: string | null
          occurrence_date?: string | null
          priority?: string | null
          project_id?: string | null
          project_sort_order?: number
          recurrence_template_id?: string | null
          sort_order?: number
          source_capture_id?: string | null
          sprint?: string | null
          status?: string
          synced_at?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_project_id_fkey"
            columns: ["user_id", "project_id"]
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_user_id_project_id_milestone_id_fkey"
            columns: ["user_id", "project_id", "milestone_id"]
            referencedRelation: "project_milestones"
            referencedColumns: ["user_id", "project_id", "id"]
          },
          {
            foreignKeyName: "tasks_user_id_recurrence_template_id_fkey"
            columns: ["user_id", "recurrence_template_id"]
            referencedRelation: "recurrence_templates"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_user_id_source_capture_id_fkey"
            columns: ["user_id", "source_capture_id"]
            referencedRelation: "brain_dump_entries"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      weekly_priorities: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          sort_order: number
          synced_at: string
          task_id: string | null
          title: string
          user_id: string
          version: number
          weekly_review_id: string
        }
        Insert: {
          created_at: string
          id: string
          project_id?: string | null
          sort_order: number
          synced_at?: string
          task_id?: string | null
          title: string
          user_id?: string
          version?: number
          weekly_review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          sort_order?: number
          synced_at?: string
          task_id?: string | null
          title?: string
          user_id?: string
          version?: number
          weekly_review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_priorities_user_id_project_id_fkey"
            columns: ["user_id", "project_id"]
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "weekly_priorities_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "weekly_priorities_user_id_weekly_review_id_fkey"
            columns: ["user_id", "weekly_review_id"]
            referencedRelation: "weekly_reviews"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          challenges: string
          completed_at: string | null
          created_at: string
          id: string
          improvements: string
          lessons_learned: string
          next_week_focus: string
          status: string
          synced_at: string
          updated_at: string
          user_id: string
          version: number
          week_end_date: string
          week_start_date: string
          went_well: string
        }
        Insert: {
          challenges?: string
          completed_at?: string | null
          created_at: string
          id: string
          improvements?: string
          lessons_learned?: string
          next_week_focus?: string
          status: string
          synced_at?: string
          updated_at: string
          user_id?: string
          version?: number
          week_end_date: string
          week_start_date: string
          went_well?: string
        }
        Update: {
          challenges?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          improvements?: string
          lessons_learned?: string
          next_week_focus?: string
          status?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
          version?: number
          week_end_date?: string
          week_start_date?: string
          went_well?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_changes: {
        Args: { changes: Json } | { changes: Json; p_user: string }
        Returns: Json
      }
      import_rows: {
        Args:
          | { p_user: string; target: string; rows: Json }
          | { target: string; rows: Json }
        Returns: Json
      }
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

