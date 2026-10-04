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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          doctor_id: string
          id: string
          match_score_pct: number | null
          shift_id: string
          status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          applied_at?: string | null
          doctor_id: string
          id?: string
          match_score_pct?: number | null
          shift_id: string
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          applied_at?: string | null
          doctor_id?: string
          id?: string
          match_score_pct?: number | null
          shift_id?: string
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          id: string
          replacement_doctor_id: string
          shift_id: string
          status: string | null
          verified_at: string | null
          verified_by_profile_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          id?: string
          replacement_doctor_id: string
          shift_id: string
          status?: string | null
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          id?: string
          replacement_doctor_id?: string
          shift_id?: string
          status?: string | null
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_replacement_doctor_id_fkey"
            columns: ["replacement_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_verified_by_profile_id_fkey"
            columns: ["verified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          changes: Json
          id: number
          occurred_at: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          changes?: Json
          id?: number
          occurred_at?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          changes?: Json
          id?: number
          occurred_at?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          available_doctors: number | null
          created_at: string | null
          facility_id: string
          id: string
          name: string
          on_leave_doctors: number | null
          total_doctors: number | null
          vacant_positions: number | null
        }
        Insert: {
          available_doctors?: number | null
          created_at?: string | null
          facility_id: string
          id?: string
          name: string
          on_leave_doctors?: number | null
          total_doctors?: number | null
          vacant_positions?: number | null
        }
        Update: {
          available_doctors?: number | null
          created_at?: string | null
          facility_id?: string
          id?: string
          name?: string
          on_leave_doctors?: number | null
          total_doctors?: number | null
          vacant_positions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          available_days: string[] | null
          basic_info_rejection_reason: string | null
          basic_info_reviewed_at: string | null
          basic_info_status: string
          certifications: Json | null
          created_at: string | null
          department_id: string | null
          doctor_kind: Database["public"]["Enums"]["doctor_kind"]
          employment_type: string | null
          facility_id: string | null
          first_name: string
          id: string
          last_name: string
          license_expiry: string | null
          license_number: string | null
          max_hours_per_week: number | null
          max_travel_distance_miles: number | null
          npi_number: string | null
          preferred_departments: string[] | null
          preferred_locations: string[] | null
          profile_id: string
          rating: number | null
          review_count: number | null
          specialty: string
          sub_specialty: string | null
          uploaded_documents: Json | null
          verification_details: Json | null
          verified: boolean | null
          years_of_experience: string | null
        }
        Insert: {
          available_days?: string[] | null
          basic_info_rejection_reason?: string | null
          basic_info_reviewed_at?: string | null
          basic_info_status?: string
          certifications?: Json | null
          created_at?: string | null
          department_id?: string | null
          doctor_kind?: Database["public"]["Enums"]["doctor_kind"]
          employment_type?: string | null
          facility_id?: string | null
          first_name: string
          id?: string
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          max_hours_per_week?: number | null
          max_travel_distance_miles?: number | null
          npi_number?: string | null
          preferred_departments?: string[] | null
          preferred_locations?: string[] | null
          profile_id: string
          rating?: number | null
          review_count?: number | null
          specialty: string
          sub_specialty?: string | null
          uploaded_documents?: Json | null
          verification_details?: Json | null
          verified?: boolean | null
          years_of_experience?: string | null
        }
        Update: {
          available_days?: string[] | null
          basic_info_rejection_reason?: string | null
          basic_info_reviewed_at?: string | null
          basic_info_status?: string
          certifications?: Json | null
          created_at?: string | null
          department_id?: string | null
          doctor_kind?: Database["public"]["Enums"]["doctor_kind"]
          employment_type?: string | null
          facility_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          max_hours_per_week?: number | null
          max_travel_distance_miles?: number | null
          npi_number?: string | null
          preferred_departments?: string[] | null
          preferred_locations?: string[] | null
          profile_id?: string
          rating?: number | null
          review_count?: number | null
          specialty?: string
          sub_specialty?: string | null
          uploaded_documents?: Json | null
          verification_details?: Json | null
          verified?: boolean | null
          years_of_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          basic_info_rejection_reason: string | null
          basic_info_reviewed_at: string | null
          basic_info_status: string
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          government_license: string | null
          hospital_type: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string
          registration_number: string | null
          state: string | null
          uploaded_documents: Json | null
          verification_status: Json | null
        }
        Insert: {
          address?: string | null
          basic_info_rejection_reason?: string | null
          basic_info_reviewed_at?: string | null
          basic_info_status?: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          government_license?: string | null
          hospital_type?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id: string
          registration_number?: string | null
          state?: string | null
          uploaded_documents?: Json | null
          verification_status?: Json | null
        }
        Update: {
          address?: string | null
          basic_info_rejection_reason?: string | null
          basic_info_reviewed_at?: string | null
          basic_info_status?: string
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          government_license?: string | null
          hospital_type?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string
          registration_number?: string | null
          state?: string | null
          uploaded_documents?: Json | null
          verification_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one?: string
          participant_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_participant_one_fkey"
            columns: ["participant_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_fkey"
            columns: ["participant_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read: boolean | null
          title: string
          topic: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title: string
          topic?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title?: string
          topic?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          approved_at: string | null
          doctor_id: string
          facility_id: string
          gross_pay: number
          has_clinical_notes: boolean | null
          has_timesheet: boolean | null
          hourly_rate: number
          hours: number
          id: string
          net_payout: number
          paid_at: string | null
          platform_fee_pct: number | null
          shift_id: string
          status: Database["public"]["Enums"]["payout_status"] | null
          submitted_at: string | null
        }
        Insert: {
          approved_at?: string | null
          doctor_id: string
          facility_id: string
          gross_pay: number
          has_clinical_notes?: boolean | null
          has_timesheet?: boolean | null
          hourly_rate: number
          hours: number
          id?: string
          net_payout: number
          paid_at?: string | null
          platform_fee_pct?: number | null
          shift_id: string
          status?: Database["public"]["Enums"]["payout_status"] | null
          submitted_at?: string | null
        }
        Update: {
          approved_at?: string | null
          doctor_id?: string
          facility_id?: string
          gross_pay?: number
          has_clinical_notes?: boolean | null
          has_timesheet?: boolean | null
          hourly_rate?: number
          hours?: number
          id?: string
          net_payout?: number
          paid_at?: string | null
          platform_fee_pct?: number | null
          shift_id?: string
          status?: Database["public"]["Enums"]["payout_status"] | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          completed_onboarding: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          notification_preferences: Json
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          verification_status: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          notification_preferences?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notification_preferences?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          categories: Json | null
          comment: string | null
          created_at: string | null
          direction: string
          doctor_id: string
          facility_id: string
          id: string
          overall_score: number
          shift_id: string
        }
        Insert: {
          categories?: Json | null
          comment?: string | null
          created_at?: string | null
          direction: string
          doctor_id: string
          facility_id: string
          id?: string
          overall_score: number
          shift_id: string
        }
        Update: {
          categories?: Json | null
          comment?: string | null
          created_at?: string | null
          direction?: string
          doctor_id?: string
          facility_id?: string
          id?: string
          overall_score?: number
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      replacement_requests: {
        Row: {
          hourly_compensation: number
          id: string
          notes: string | null
          preferred_replacement_type: string
          reason: string
          requested_at: string | null
          requesting_doctor_id: string
          reviewed_at: string | null
          shift_id: string
          status:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
        }
        Insert: {
          hourly_compensation: number
          id?: string
          notes?: string | null
          preferred_replacement_type?: string
          reason: string
          requested_at?: string | null
          requesting_doctor_id: string
          reviewed_at?: string | null
          shift_id: string
          status?:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
        }
        Update: {
          hourly_compensation?: number
          id?: string
          notes?: string | null
          preferred_replacement_type?: string
          reason?: string
          requested_at?: string | null
          requesting_doctor_id?: string
          reviewed_at?: string | null
          shift_id?: string
          status?:
            | Database["public"]["Enums"]["replacement_request_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "replacement_requests_requesting_doctor_id_fkey"
            columns: ["requesting_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replacement_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_shifts: {
        Row: {
          doctor_id: string
          id: string
          saved_at: string | null
          shift_id: string
        }
        Insert: {
          doctor_id: string
          id?: string
          saved_at?: string | null
          shift_id: string
        }
        Update: {
          doctor_id?: string
          id?: string
          saved_at?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_shifts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          application_deadline: string | null
          assigned_doctor_id: string | null
          code_red: boolean | null
          created_at: string | null
          date: string
          department_id: string | null
          department_name: string
          description: string | null
          doctors_needed: number | null
          emergency_contact: string | null
          end_time: string
          experience_level: string | null
          facility_id: string
          facility_name: string
          hourly_rate: number
          id: string
          location: Json | null
          required_qualification: string | null
          shift_type: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"] | null
          sub_specialty: string | null
          supervisor_name: string | null
          title: string
        }
        Insert: {
          application_deadline?: string | null
          assigned_doctor_id?: string | null
          code_red?: boolean | null
          created_at?: string | null
          date: string
          department_id?: string | null
          department_name: string
          description?: string | null
          doctors_needed?: number | null
          emergency_contact?: string | null
          end_time: string
          experience_level?: string | null
          facility_id: string
          facility_name: string
          hourly_rate: number
          id?: string
          location?: Json | null
          required_qualification?: string | null
          shift_type: string
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          sub_specialty?: string | null
          supervisor_name?: string | null
          title: string
        }
        Update: {
          application_deadline?: string | null
          assigned_doctor_id?: string | null
          code_red?: boolean | null
          created_at?: string | null
          date?: string
          department_id?: string | null
          department_name?: string
          description?: string | null
          doctors_needed?: number | null
          emergency_contact?: string | null
          end_time?: string
          experience_level?: string | null
          facility_id?: string
          facility_name?: string
          hourly_rate?: number
          id?: string
          location?: Json | null
          required_qualification?: string | null
          shift_type?: string
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          sub_specialty?: string | null
          supervisor_name?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_notify: { Args: { recipient: string }; Returns: boolean }
      delete_my_account: { Args: never; Returns: string }
      doctor_relates_to_facility: {
        Args: { target_facility_id: string }
        Returns: boolean
      }
      document_reviews_unchanged: {
        Args: { new_docs: Json; old_docs: Json }
        Returns: boolean
      }
      export_my_data: { Args: never; Returns: Json }
      facility_owns_or_relates_to_doctor: {
        Args: { target_doctor_id: string; target_facility_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_trusted_writer: { Args: never; Returns: boolean }
      owns_doctor: { Args: { target_doctor_id: string }; Returns: boolean }
      owns_facility: { Args: { target_facility_id: string }; Returns: boolean }
      owns_shift_facility: {
        Args: { target_shift_id: string }
        Returns: boolean
      }
      profiles_have_messaging_relationship: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      row_diff: { Args: { new_row: Json; old_row: Json }; Returns: Json }
      same_except: {
        Args: { allowed: string[]; new_row: Json; old_row: Json }
        Returns: boolean
      }
      strip_document_reviews: { Args: { docs: Json }; Returns: Json }
      write_audit: {
        Args: {
          p_action: string
          p_changes: Json
          p_table: string
          p_target: string
        }
        Returns: undefined
      }
    }
    Enums: {
      application_status:
        | "applied"
        | "in_review"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "withdrawn"
      doctor_kind: "working" | "locum_tenens"
      payout_status:
        | "pending_approval"
        | "approved"
        | "payment_processed"
        | "disputed"
      replacement_request_status: "pending" | "approved" | "rejected" | "filled"
      shift_status:
        | "open"
        | "active"
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
      user_role: "hospital" | "working_doctor" | "locum_tenens" | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "applied",
        "in_review",
        "shortlisted",
        "accepted",
        "rejected",
        "cancelled",
        "withdrawn",
      ],
      doctor_kind: ["working", "locum_tenens"],
      payout_status: [
        "pending_approval",
        "approved",
        "payment_processed",
        "disputed",
      ],
      replacement_request_status: ["pending", "approved", "rejected", "filled"],
      shift_status: [
        "open",
        "active",
        "pending",
        "confirmed",
        "completed",
        "cancelled",
      ],
      user_role: ["hospital", "working_doctor", "locum_tenens", "super_admin"],
    },
  },
} as const
