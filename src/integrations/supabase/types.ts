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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      complaints: {
        Row: {
          action_notes: string | null
          admin_response: string | null
          category: string
          complaint_against: string | null
          complaint_description: string
          complaint_title: string
          created_at: string
          id: string
          priority: string
          raised_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          taken_care_at: string | null
          taken_care_by: string | null
          updated_at: string
        }
        Insert: {
          action_notes?: string | null
          admin_response?: string | null
          category?: string
          complaint_against?: string | null
          complaint_description: string
          complaint_title: string
          created_at?: string
          id?: string
          priority?: string
          raised_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          taken_care_at?: string | null
          taken_care_by?: string | null
          updated_at?: string
        }
        Update: {
          action_notes?: string | null
          admin_response?: string | null
          category?: string
          complaint_against?: string | null
          complaint_description?: string
          complaint_title?: string
          created_at?: string
          id?: string
          priority?: string
          raised_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          taken_care_at?: string | null
          taken_care_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_complaint_against_fkey"
            columns: ["complaint_against"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_taken_care_by_fkey"
            columns: ["taken_care_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          account_holder_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          doctor_code: string
          full_name: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean
          password_hash: string | null
          specialization: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          doctor_code: string
          full_name?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          password_hash?: string | null
          specialization: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          doctor_code?: string
          full_name?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          password_hash?: string | null
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          sender_id: string
          sender_name: string
          sender_role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          sender_id: string
          sender_name: string
          sender_role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          sender_id?: string
          sender_name?: string
          sender_role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_id: string
          transaction_date: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_id: string
          transaction_date?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_id?: string
          transaction_date?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          bank_advice_generated: boolean
          bank_advice_generated_at: string | null
          bank_advice_generated_by: string | null
          cash_approval_status: string | null
          cash_approved_at: string | null
          cash_approved_by: string | null
          cash_rejection_reason: string | null
          created_at: string
          doctor_id: string
          id: string
          insurance_approval_status: string | null
          insurance_approved_at: string | null
          insurance_approved_by: string | null
          insurance_rejection_reason: string | null
          is_fully_paid: boolean | null
          is_suspect: boolean
          manager_approved_at: string | null
          manager_approved_by: string | null
          marked_suspect_at: string | null
          marked_suspect_by: string | null
          paid_amount: number | null
          payment_notes: string | null
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remaining_amount: number | null
          status: Database["public"]["Enums"]["payment_status"]
          suspect_reason: string | null
          total_amount: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          cash_approval_status?: string | null
          cash_approved_at?: string | null
          cash_approved_by?: string | null
          cash_rejection_reason?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          insurance_approval_status?: string | null
          insurance_approved_at?: string | null
          insurance_approved_by?: string | null
          insurance_rejection_reason?: string | null
          is_fully_paid?: boolean | null
          is_suspect?: boolean
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          marked_suspect_at?: string | null
          marked_suspect_by?: string | null
          paid_amount?: number | null
          payment_notes?: string | null
          period_end: string
          period_start: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          suspect_reason?: string | null
          total_amount: number
          total_visits: number
          updated_at?: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          cash_approval_status?: string | null
          cash_approved_at?: string | null
          cash_approved_by?: string | null
          cash_rejection_reason?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          insurance_approval_status?: string | null
          insurance_approved_at?: string | null
          insurance_approved_by?: string | null
          insurance_rejection_reason?: string | null
          is_fully_paid?: boolean | null
          is_suspect?: boolean
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          marked_suspect_at?: string | null
          marked_suspect_by?: string | null
          paid_amount?: number | null
          payment_notes?: string | null
          period_end?: string
          period_start?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          suspect_reason?: string | null
          total_amount?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_admin_approved_by_fkey"
            columns: ["admin_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_marked_suspect_by_fkey"
            columns: ["marked_suspect_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          staff_category_id: string | null
          staff_code: string
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          staff_category_id?: string | null
          staff_code: string
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          staff_category_id?: string | null
          staff_code?: string
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_staff_category_id_fkey"
            columns: ["staff_category_id"]
            isOneToOne: false
            referencedRelation: "staff_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_appraisals: {
        Row: {
          action_plan: string | null
          appraisal_date: string
          appraisal_period_end: string
          appraisal_period_start: string
          appraised_by: string | null
          areas_for_improvement: string | null
          communication_rating: number
          created_at: string
          id: string
          manager_comments: string | null
          next_review_date: string | null
          overall_rating: Database["public"]["Enums"]["appraisal_rating"]
          professionalism_rating: number
          punctuality_rating: number
          staff_id: string
          strengths: string | null
          teamwork_rating: number
          updated_at: string
          work_quality_rating: number
        }
        Insert: {
          action_plan?: string | null
          appraisal_date?: string
          appraisal_period_end: string
          appraisal_period_start: string
          appraised_by?: string | null
          areas_for_improvement?: string | null
          communication_rating: number
          created_at?: string
          id?: string
          manager_comments?: string | null
          next_review_date?: string | null
          overall_rating: Database["public"]["Enums"]["appraisal_rating"]
          professionalism_rating: number
          punctuality_rating: number
          staff_id: string
          strengths?: string | null
          teamwork_rating: number
          updated_at?: string
          work_quality_rating: number
        }
        Update: {
          action_plan?: string | null
          appraisal_date?: string
          appraisal_period_end?: string
          appraisal_period_start?: string
          appraised_by?: string | null
          areas_for_improvement?: string | null
          communication_rating?: number
          created_at?: string
          id?: string
          manager_comments?: string | null
          next_review_date?: string | null
          overall_rating?: Database["public"]["Enums"]["appraisal_rating"]
          professionalism_rating?: number
          punctuality_rating?: number
          staff_id?: string
          strengths?: string | null
          teamwork_rating?: number
          updated_at?: string
          work_quality_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_appraisals_appraised_by_fkey"
            columns: ["appraised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_appraisals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_categories: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      staff_daily_activities: {
        Row: {
          activity_date: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          id: string
          patients_handled: number | null
          recorded_by: string | null
          shift_end_time: string | null
          shift_start_time: string | null
          special_notes: string | null
          staff_id: string
          supervisor_notes: string | null
          tasks_completed: Json | null
          updated_at: string
        }
        Insert: {
          activity_date?: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          id?: string
          patients_handled?: number | null
          recorded_by?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          special_notes?: string | null
          staff_id: string
          supervisor_notes?: string | null
          tasks_completed?: Json | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          id?: string
          patients_handled?: number | null
          recorded_by?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          special_notes?: string | null
          staff_id?: string
          supervisor_notes?: string | null
          tasks_completed?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_daily_activities_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_daily_activities_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_warnings: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string
          follow_up_date: string | null
          follow_up_required: boolean
          id: string
          incident_date: string
          incident_time: string | null
          issued_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["warning_severity"]
          staff_id: string
          staff_response: string | null
          updated_at: string
          warning_type: Database["public"]["Enums"]["warning_type"]
          witness_name: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description: string
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          incident_date: string
          incident_time?: string | null
          issued_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["warning_severity"]
          staff_id: string
          staff_response?: string | null
          updated_at?: string
          warning_type: Database["public"]["Enums"]["warning_type"]
          witness_name?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          incident_date?: string
          incident_time?: string | null
          issued_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["warning_severity"]
          staff_id?: string
          staff_response?: string | null
          updated_at?: string
          warning_type?: Database["public"]["Enums"]["warning_type"]
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_warnings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          status: Database["public"]["Enums"]["task_status"]
          task_description: string | null
          task_title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_description?: string | null
          task_title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_description?: string | null
          task_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_designations: {
        Row: {
          created_at: string
          designation: Database["public"]["Enums"]["app_designation"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          designation: Database["public"]["Enums"]["app_designation"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          designation?: Database["public"]["Enums"]["app_designation"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_guide_settings: {
        Row: {
          announcement_text: string | null
          announcement_type: string | null
          created_at: string | null
          custom_notes: Json | null
          faq_items: Json | null
          help_desk_contact: string | null
          help_desk_email: string | null
          help_desk_hours: string | null
          id: string
          is_active: boolean | null
          show_announcement: boolean | null
          tutorial_video_urls: Json | null
          updated_at: string | null
          welcome_message_admin: string | null
          welcome_message_doctor: string | null
          welcome_message_manager: string | null
          welcome_message_staff: string | null
        }
        Insert: {
          announcement_text?: string | null
          announcement_type?: string | null
          created_at?: string | null
          custom_notes?: Json | null
          faq_items?: Json | null
          help_desk_contact?: string | null
          help_desk_email?: string | null
          help_desk_hours?: string | null
          id?: string
          is_active?: boolean | null
          show_announcement?: boolean | null
          tutorial_video_urls?: Json | null
          updated_at?: string | null
          welcome_message_admin?: string | null
          welcome_message_doctor?: string | null
          welcome_message_manager?: string | null
          welcome_message_staff?: string | null
        }
        Update: {
          announcement_text?: string | null
          announcement_type?: string | null
          created_at?: string | null
          custom_notes?: Json | null
          faq_items?: Json | null
          help_desk_contact?: string | null
          help_desk_email?: string | null
          help_desk_hours?: string | null
          id?: string
          is_active?: boolean | null
          show_announcement?: boolean | null
          tutorial_video_urls?: Json | null
          updated_at?: string | null
          welcome_message_admin?: string | null
          welcome_message_doctor?: string | null
          welcome_message_manager?: string | null
          welcome_message_staff?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          full_name: string | null
          id: string
          idle_timeout_seconds: number | null
          is_active: boolean
          last_activity_at: string | null
          original_id: string | null
          refresh_token: string | null
          role: string | null
          session_token: string
          timeout_warnings_count: number | null
          updated_at: string
          user_id: string
          user_type: string
          username: string | null
          warning_shown_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          full_name?: string | null
          id?: string
          idle_timeout_seconds?: number | null
          is_active?: boolean
          last_activity_at?: string | null
          original_id?: string | null
          refresh_token?: string | null
          role?: string | null
          session_token: string
          timeout_warnings_count?: number | null
          updated_at?: string
          user_id: string
          user_type: string
          username?: string | null
          warning_shown_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          idle_timeout_seconds?: number | null
          is_active?: boolean
          last_activity_at?: string | null
          original_id?: string | null
          refresh_token?: string | null
          role?: string | null
          session_token?: string
          timeout_warnings_count?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string
          username?: string | null
          warning_shown_at?: string | null
        }
        Relationships: []
      }
      version_history: {
        Row: {
          branch: string
          changelog: string | null
          created_at: string
          created_by: string | null
          environment: string
          git_commit: string
          id: string
          is_active: boolean
          release_date: string
          updated_at: string
          version: string
        }
        Insert: {
          branch?: string
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          git_commit: string
          id?: string
          is_active?: boolean
          release_date?: string
          updated_at?: string
          version: string
        }
        Update: {
          branch?: string
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          git_commit?: string
          id?: string
          is_active?: boolean
          release_date?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_processed: boolean
          notes: string | null
          patient_count: number
          patient_id: string | null
          patient_name: string
          payment_type: string
          processed_at: string | null
          processed_in_payment_id: string | null
          updated_at: string
          visit_date: string
          visit_payment: number | null
          visit_reason: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_processed?: boolean
          notes?: string | null
          patient_count?: number
          patient_id?: string | null
          patient_name?: string
          payment_type?: string
          processed_at?: string | null
          processed_in_payment_id?: string | null
          updated_at?: string
          visit_date?: string
          visit_payment?: number | null
          visit_reason?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_processed?: boolean
          notes?: string | null
          patient_count?: number
          patient_id?: string | null
          patient_name?: string
          payment_type?: string
          processed_at?: string | null
          processed_in_payment_id?: string | null
          updated_at?: string
          visit_date?: string
          visit_payment?: number | null
          visit_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_processed_in_payment_id_fkey"
            columns: ["processed_in_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      website_settings: {
        Row: {
          about_paragraph_1: string | null
          about_paragraph_2: string | null
          banner_url: string | null
          book_appointment_text: string | null
          copyright_text: string | null
          created_at: string | null
          emergency_button_text: string | null
          emergency_care_description: string | null
          emergency_contact: string | null
          expert_doctors: number | null
          health_checkups_description: string | null
          hero_headline: string | null
          hero_tagline: string | null
          hospital_name: string | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          operating_hours: string | null
          patient_rating: number | null
          patients_served: string | null
          phone: string | null
          specialist_care_description: string | null
          updated_at: string | null
          why_choose_us: Json | null
          years_of_service: number | null
        }
        Insert: {
          about_paragraph_1?: string | null
          about_paragraph_2?: string | null
          banner_url?: string | null
          book_appointment_text?: string | null
          copyright_text?: string | null
          created_at?: string | null
          emergency_button_text?: string | null
          emergency_care_description?: string | null
          emergency_contact?: string | null
          expert_doctors?: number | null
          health_checkups_description?: string | null
          hero_headline?: string | null
          hero_tagline?: string | null
          hospital_name?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          patient_rating?: number | null
          patients_served?: string | null
          phone?: string | null
          specialist_care_description?: string | null
          updated_at?: string | null
          why_choose_us?: Json | null
          years_of_service?: number | null
        }
        Update: {
          about_paragraph_1?: string | null
          about_paragraph_2?: string | null
          banner_url?: string | null
          book_appointment_text?: string | null
          copyright_text?: string | null
          created_at?: string | null
          emergency_button_text?: string | null
          emergency_care_description?: string | null
          emergency_contact?: string | null
          expert_doctors?: number | null
          health_checkups_description?: string | null
          hero_headline?: string | null
          hero_tagline?: string | null
          hospital_name?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          operating_hours?: string | null
          patient_rating?: number | null
          patients_served?: string | null
          phone?: string | null
          specialist_care_description?: string | null
          updated_at?: string | null
          why_choose_us?: Json | null
          years_of_service?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_user_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_staff_appraisal_summary: {
        Args: { _staff_id: string }
        Returns: {
          average_score: number
          latest_rating: Database["public"]["Enums"]["appraisal_rating"]
          total_appraisals: number
        }[]
      }
      get_staff_attendance_percentage: {
        Args: { _end_date: string; _staff_id: string; _start_date: string }
        Returns: number
      }
      get_staff_auth_email: {
        Args: { _username: string }
        Returns: string
      }
      get_staff_list_for_management: {
        Args: Record<PropertyKey, never>
        Returns: {
          department: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["staff_role"]
          staff_code: string
        }[]
      }
      get_staff_task_counts: {
        Args: { _staff_id: string }
        Returns: {
          completed_count: number
          in_progress_count: number
          pending_count: number
        }[]
      }
      get_staff_tasks: {
        Args: { _staff_id: string }
        Returns: {
          assigned_by_full_name: string
          assigned_by_staff_code: string
          assigned_to_full_name: string
          assigned_to_role: string
          assigned_to_staff_code: string
          completed_at: string
          created_at: string
          due_date: string
          id: string
          notes: string
          priority: string
          status: string
          task_description: string
          task_title: string
        }[]
      }
      get_staff_warning_count: {
        Args: {
          _severity?: Database["public"]["Enums"]["warning_severity"]
          _staff_id: string
        }
        Returns: number
      }
      get_user_payments: {
        Args: { _user_id: string; _user_role: string; _user_type: string }
        Returns: {
          admin_approved_at: string
          admin_approved_by: string
          bank_advice_generated: boolean
          bank_advice_generated_at: string
          bank_advice_generated_by: string
          doctor_code: string
          doctor_id: string
          doctor_name: string
          id: string
          is_fully_paid: boolean
          manager_approved_at: string
          manager_approved_by: string
          paid_amount: number
          payment_notes: string
          period_end: string
          period_start: string
          rejected_at: string
          rejected_by: string
          rejection_reason: string
          remaining_amount: number
          status: string
          total_amount: number
          total_visits: number
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_visits: {
        Args: { _user_id: string; _user_role: string; _user_type: string }
        Returns: {
          doctor_code: string
          doctor_id: string
          doctor_name: string
          id: string
          is_processed: boolean
          notes: string
          patient_count: number
          patient_id: string
          patient_name: string
          payment_type: string
          processed_at: string
          processed_in_payment_id: string
          visit_date: string
          visit_payment: number
          visit_reason: string
        }[]
      }
      has_designation: {
        Args: {
          _designation: Database["public"]["Enums"]["app_designation"]
          _user_id: string
        }
        Returns: boolean
      }
      link_profile_to_user: {
        Args: {
          _auth_user_id: string
          _original_id: string
          _user_type: string
        }
        Returns: undefined
      }
      simple_hash: {
        Args: { password: string }
        Returns: string
      }
      verify_user_login: {
        Args: { _password: string; _username: string }
        Returns: Json
      }
    }
    Enums: {
      app_designation: "admin" | "manager" | "supervisor" | "doctor" | "staff"
      appraisal_rating:
        | "excellent"
        | "good"
        | "satisfactory"
        | "needs_improvement"
        | "poor"
      attendance_status: "present" | "late" | "absent" | "half_day" | "leave"
      complaint_status:
        | "open"
        | "in_review"
        | "resolved"
        | "closed"
        | "taken"
        | "in_progress"
        | "solved"
      payment_status:
        | "pending"
        | "manager_approved"
        | "admin_approved"
        | "rejected"
      staff_role:
        | "admin"
        | "manager"
        | "nurse"
        | "doctor"
        | "technician"
        | "receptionist"
        | "pharmacist"
        | "cleaner"
        | "security"
      task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "overdue"
      user_role: "doctor" | "manager" | "admin" | "staff"
      warning_severity:
        | "verbal_warning"
        | "written_warning"
        | "final_warning"
        | "suspension"
      warning_type:
        | "late_coming"
        | "unauthorized_absence"
        | "leaving_early"
        | "excessive_absenteeism"
        | "insubordination"
        | "improper_mobile_use"
        | "unprofessional_language"
        | "gossip_rumors"
        | "arguments_colleagues"
        | "breach_confidentiality"
        | "medication_errors"
        | "hygiene_violations"
        | "improper_documentation"
        | "patient_neglect"
        | "dress_code_violations"
        | "misuse_hospital_property"
        | "safety_protocol_failure"
        | "sleeping_on_duty"
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
    Enums: {
      app_designation: ["admin", "manager", "supervisor", "doctor", "staff"],
      appraisal_rating: [
        "excellent",
        "good",
        "satisfactory",
        "needs_improvement",
        "poor",
      ],
      attendance_status: ["present", "late", "absent", "half_day", "leave"],
      complaint_status: [
        "open",
        "in_review",
        "resolved",
        "closed",
        "taken",
        "in_progress",
        "solved",
      ],
      payment_status: [
        "pending",
        "manager_approved",
        "admin_approved",
        "rejected",
      ],
      staff_role: [
        "admin",
        "manager",
        "nurse",
        "doctor",
        "technician",
        "receptionist",
        "pharmacist",
        "cleaner",
        "security",
      ],
      task_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "overdue",
      ],
      user_role: ["doctor", "manager", "admin", "staff"],
      warning_severity: [
        "verbal_warning",
        "written_warning",
        "final_warning",
        "suspension",
      ],
      warning_type: [
        "late_coming",
        "unauthorized_absence",
        "leaving_early",
        "excessive_absenteeism",
        "insubordination",
        "improper_mobile_use",
        "unprofessional_language",
        "gossip_rumors",
        "arguments_colleagues",
        "breach_confidentiality",
        "medication_errors",
        "hygiene_violations",
        "improper_documentation",
        "patient_neglect",
        "dress_code_violations",
        "misuse_hospital_property",
        "safety_protocol_failure",
        "sleeping_on_duty",
      ],
    },
  },
} as const
