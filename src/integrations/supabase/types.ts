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
      app_downloads: {
        Row: {
          created_at: string | null
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean | null
          release_notes: string | null
          release_notes_tamil: string | null
          updated_at: string | null
          version: string
          version_code: number
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          release_notes?: string | null
          release_notes_tamil?: string | null
          updated_at?: string | null
          version: string
          version_code: number
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          release_notes?: string | null
          release_notes_tamil?: string | null
          updated_at?: string | null
          version?: string
          version_code?: number
        }
        Relationships: []
      }
      appraisal_reasons: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          reason_code: string
          reason_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code: string
          reason_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code?: string
          reason_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_advice_history: {
        Row: {
          bank_confirmation_date: string | null
          bank_reference_number: string | null
          created_at: string
          file_content: string | null
          filename: string
          generated_by: string | null
          generation_date: string
          id: string
          payment_count: number
          payment_ids: Json
          payment_mode: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_proof_file_name: string | null
          reconciliation_proof_file_path: string | null
          reconciliation_status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename?: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count?: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_advice_history_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_code?: string
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
      departments_master: {
        Row: {
          created_at: string
          department_code: string
          department_name: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_code: string
          department_name: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_code?: string
          department_name?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
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
          pan_number: string | null
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
          pan_number?: string | null
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
          pan_number?: string | null
          password_hash?: string | null
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      insurance_companies: {
        Row: {
          company_code: string | null
          company_name: string
          contact_number: string | null
          created_at: string
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          company_code?: string | null
          company_name: string
          contact_number?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          company_code?: string | null
          company_name?: string
          contact_number?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      leave_permission_applications: {
        Row: {
          applicant_id: string
          application_type: Database["public"]["Enums"]["application_type"]
          approved_at: string | null
          approved_by: string | null
          approver_id: string
          created_at: string
          id: string
          is_half_day: boolean | null
          leave_days: number | null
          leave_end_date: string | null
          leave_reason: string | null
          leave_start_date: string | null
          notes: string | null
          permission_date: string | null
          permission_duration_minutes: number | null
          permission_end_time: string | null
          permission_reason: string | null
          permission_start_time: string | null
          reason_details: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_type: Database["public"]["Enums"]["application_type"]
          approved_at?: string | null
          approved_by?: string | null
          approver_id: string
          created_at?: string
          id?: string
          is_half_day?: boolean | null
          leave_days?: number | null
          leave_end_date?: string | null
          leave_reason?: string | null
          leave_start_date?: string | null
          notes?: string | null
          permission_date?: string | null
          permission_duration_minutes?: number | null
          permission_end_time?: string | null
          permission_reason?: string | null
          permission_start_time?: string | null
          reason_details: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_type?: Database["public"]["Enums"]["application_type"]
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string
          created_at?: string
          id?: string
          is_half_day?: boolean | null
          leave_days?: number | null
          leave_end_date?: string | null
          leave_reason?: string | null
          leave_start_date?: string | null
          notes?: string | null
          permission_date?: string | null
          permission_duration_minutes?: number | null
          permission_end_time?: string | null
          permission_reason?: string | null
          permission_start_time?: string | null
          reason_details?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_permission_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_permission_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_permission_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_permission_applications_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_reasons_master: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          reason_code: string
          reason_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code: string
          reason_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code?: string
          reason_name?: string
          updated_at?: string
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
      navigation_analytics: {
        Row: {
          clicked_at: string
          created_at: string
          id: string
          navigation_id: string
          navigation_name: string
          staff_id: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          clicked_at?: string
          created_at?: string
          id?: string
          navigation_id: string
          navigation_name: string
          staff_id?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          clicked_at?: string
          created_at?: string
          id?: string
          navigation_id?: string
          navigation_name?: string
          staff_id?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_analytics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          staff_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          staff_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          staff_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          is_verified: boolean | null
          mobile_number: string
          otp_code: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_verified?: boolean | null
          mobile_number: string
          otp_code: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          mobile_number?: string
          otp_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_releases: {
        Row: {
          bank_advice_generated: boolean
          bank_advice_generated_at: string | null
          bank_advice_generated_by: string | null
          bank_advice_reference: string | null
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          payment_id: string
          release_number: number
          release_percentage: number
          release_status: string
          released_at: string | null
          released_by: string | null
          tds_amount: number
          tds_percentage: number
          updated_at: string
        }
        Insert: {
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_id: string
          release_number?: number
          release_percentage: number
          release_status?: string
          released_at?: string | null
          released_by?: string | null
          tds_amount?: number
          tds_percentage?: number
          updated_at?: string
        }
        Update: {
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_id?: string
          release_number?: number
          release_percentage?: number
          release_status?: string
          released_at?: string | null
          released_by?: string | null
          tds_amount?: number
          tds_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_releases_bank_advice_generated_by_fkey"
            columns: ["bank_advice_generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_releases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_releases_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      payment_visits: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_visits_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_visits_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
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
          cheque_bank_name: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          doctor_id: string
          gross_amount: number | null
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
          net_amount: number | null
          paid_amount: number | null
          payment_mode: string | null
          payment_notes: string | null
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          release_count: number | null
          release_status: string | null
          remaining_amount: number | null
          status: Database["public"]["Enums"]["payment_status"]
          suspect_reason: string | null
          tds_amount: number | null
          tds_percentage: number | null
          total_amount: number
          total_released_gross: number | null
          total_released_net: number | null
          total_released_tds: number | null
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
          cheque_bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          doctor_id: string
          gross_amount?: number | null
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
          net_amount?: number | null
          paid_amount?: number | null
          payment_mode?: string | null
          payment_notes?: string | null
          period_end: string
          period_start: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          release_count?: number | null
          release_status?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          suspect_reason?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          total_amount: number
          total_released_gross?: number | null
          total_released_net?: number | null
          total_released_tds?: number | null
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
          cheque_bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          doctor_id?: string
          gross_amount?: number | null
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
          net_amount?: number | null
          paid_amount?: number | null
          payment_mode?: string | null
          payment_notes?: string | null
          period_end?: string
          period_start?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          release_count?: number | null
          release_status?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          suspect_reason?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          total_amount?: number
          total_released_gross?: number | null
          total_released_net?: number | null
          total_released_tds?: number | null
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
      permission_reasons_master: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          reason_code: string
          reason_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code: string
          reason_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code?: string
          reason_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_payment_bank_advice_history: {
        Row: {
          bank_confirmation_date: string | null
          bank_reference_number: string | null
          created_at: string
          file_content: string | null
          filename: string
          generated_by: string | null
          generation_date: string
          id: string
          payment_count: number
          payment_ids: Json
          payment_mode: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_proof_file_name: string | null
          reconciliation_proof_file_path: string | null
          reconciliation_status: string | null
          total_gross_amount: number
          total_net_amount: number
          total_tds_amount: number
          updated_at: string
        }
        Insert: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          updated_at?: string
        }
        Update: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename?: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count?: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_payment_bank_advice_history_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_payment_types: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          type_code: string
          type_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          type_code: string
          type_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          type_code?: string
          type_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_payments: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_advice_generated: boolean
          bank_advice_generated_at: string | null
          bank_advice_generated_by: string | null
          bank_advice_reference: string | null
          bank_name: string | null
          branch_name: string | null
          cheque_bank_name: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          gross_amount: number
          gst_number: string | null
          id: string
          ifsc_code: string | null
          mobile_number: string
          name: string
          net_amount: number | null
          payment_mode: string | null
          payment_notes: string | null
          payment_type_id: string | null
          supporting_document_name: string | null
          supporting_document_path: string | null
          supporting_document_type: string | null
          tds_amount: number | null
          tds_percentage: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          bank_name?: string | null
          branch_name?: string | null
          cheque_bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          mobile_number: string
          name: string
          net_amount?: number | null
          payment_mode?: string | null
          payment_notes?: string | null
          payment_type_id?: string | null
          supporting_document_name?: string | null
          supporting_document_path?: string | null
          supporting_document_type?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          bank_name?: string | null
          branch_name?: string | null
          cheque_bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          mobile_number?: string
          name?: string
          net_amount?: number | null
          payment_mode?: string | null
          payment_notes?: string | null
          payment_type_id?: string | null
          supporting_document_name?: string | null
          supporting_document_path?: string | null
          supporting_document_type?: string | null
          tds_amount?: number | null
          tds_percentage?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_payments_payment_type_id_fkey"
            columns: ["payment_type_id"]
            isOneToOne: false
            referencedRelation: "quick_payment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_master: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          role_code: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          role_code: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          role_code?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          account_holder_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          ifsc_code: string | null
          is_active: boolean
          last_login: string | null
          password_hash: string
          payment_notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          staff_category_id: string | null
          staff_code: string
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          payment_notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          staff_category_id?: string | null
          staff_code: string
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          payment_notes?: string | null
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
      staff_payment_bank_advice_history: {
        Row: {
          bank_confirmation_date: string | null
          bank_reference_number: string | null
          created_at: string
          file_content: string | null
          filename: string
          generated_by: string | null
          generation_date: string
          id: string
          payment_count: number
          payment_ids: Json
          payment_mode: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_notes: string | null
          reconciliation_proof_file_name: string | null
          reconciliation_proof_file_path: string | null
          reconciliation_status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          bank_confirmation_date?: string | null
          bank_reference_number?: string | null
          created_at?: string
          file_content?: string | null
          filename?: string
          generated_by?: string | null
          generation_date?: string
          id?: string
          payment_count?: number
          payment_ids?: Json
          payment_mode?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_notes?: string | null
          reconciliation_proof_file_name?: string | null
          reconciliation_proof_file_path?: string | null
          reconciliation_status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payment_bank_advice_history_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          amount: number
          bank_advice_generated: boolean
          bank_advice_generated_at: string | null
          bank_advice_generated_by: string | null
          bank_advice_reference: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          created_by: string | null
          id: string
          ifsc_code: string | null
          payment_date: string
          payment_notes: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          amount: number
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ifsc_code?: string | null
          payment_date?: string
          payment_notes?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          amount?: number
          bank_advice_generated?: boolean
          bank_advice_generated_at?: string | null
          bank_advice_generated_by?: string | null
          bank_advice_reference?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ifsc_code?: string | null
          payment_date?: string
          payment_notes?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
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
      tds_certificates: {
        Row: {
          certificate_data: Json | null
          certificate_number: string
          created_at: string | null
          doctor_id: string
          financial_year: string
          generated_at: string | null
          generated_by: string | null
          id: string
          payment_ids: Json
          period_end: string
          period_start: string
          quarter: string
          total_gross_amount: number
          total_net_amount: number
          total_tds_amount: number
          updated_at: string | null
        }
        Insert: {
          certificate_data?: Json | null
          certificate_number: string
          created_at?: string | null
          doctor_id: string
          financial_year: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          payment_ids?: Json
          period_end: string
          period_start: string
          quarter: string
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          updated_at?: string | null
        }
        Update: {
          certificate_data?: Json | null
          certificate_number?: string
          created_at?: string | null
          doctor_id?: string
          financial_year?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          payment_ids?: Json
          period_end?: string
          period_start?: string
          quarter?: string
          total_gross_amount?: number
          total_net_amount?: number
          total_tds_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tds_certificates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_history: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          permission_type: string
          staff_id: string
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          permission_type: string
          staff_id: string
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          permission_type?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_approval_permissions: {
        Row: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          can_approve: boolean
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          can_approve?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          approval_type?: Database["public"]["Enums"]["approval_type"]
          can_approve?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_approval_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_approval_permissions_staff_id_fkey"
            columns: ["staff_id"]
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
      user_screen_access: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          screen_module: Database["public"]["Enums"]["screen_module"]
          staff_id: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          screen_module: Database["public"]["Enums"]["screen_module"]
          staff_id: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          screen_module?: Database["public"]["Enums"]["screen_module"]
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_screen_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_screen_access_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          branch_name: string | null
          contact_person_name: string
          created_at: string
          description: string | null
          display_order: number
          email: string | null
          gst_number: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean
          mobile_number: string
          updated_at: string
          vendor_code: string
          vendor_name: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          branch_name?: string | null
          contact_person_name: string
          created_at?: string
          description?: string | null
          display_order?: number
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          mobile_number: string
          updated_at?: string
          vendor_code: string
          vendor_name: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          branch_name?: string | null
          contact_person_name?: string
          created_at?: string
          description?: string | null
          display_order?: number
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean
          mobile_number?: string
          updated_at?: string
          vendor_code?: string
          vendor_name?: string
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
      visit_reasons: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          reason_code: string
          reason_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code: string
          reason_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          reason_code?: string
          reason_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          insurance_company_id: string | null
          is_processed: boolean
          notes: string | null
          patient_count: number
          patient_id: string | null
          patient_name: string
          payment_type: string
          processed_at: string | null
          processed_in_payment_id: string | null
          updated_at: string
          visit_code: string | null
          visit_date: string
          visit_payment: number | null
          visit_reason: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          insurance_company_id?: string | null
          is_processed?: boolean
          notes?: string | null
          patient_count?: number
          patient_id?: string | null
          patient_name?: string
          payment_type?: string
          processed_at?: string | null
          processed_in_payment_id?: string | null
          updated_at?: string
          visit_code?: string | null
          visit_date?: string
          visit_payment?: number | null
          visit_reason?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          insurance_company_id?: string | null
          is_processed?: boolean
          notes?: string | null
          patient_count?: number
          patient_id?: string | null
          patient_name?: string
          payment_type?: string
          processed_at?: string | null
          processed_in_payment_id?: string | null
          updated_at?: string
          visit_code?: string | null
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
            foreignKeyName: "visits_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
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
          hospital_bank_account_holder_name: string | null
          hospital_bank_account_number: string | null
          hospital_institution_address: string | null
          hospital_institution_code: string | null
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
          hospital_bank_account_holder_name?: string | null
          hospital_bank_account_number?: string | null
          hospital_institution_address?: string | null
          hospital_institution_code?: string | null
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
          hospital_bank_account_holder_name?: string | null
          hospital_bank_account_number?: string | null
          hospital_institution_address?: string | null
          hospital_institution_code?: string | null
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
      cleanup_expired_otps: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_user_sessions: { Args: never; Returns: number }
      erase_all_transactions: { Args: never; Returns: Json }
      get_admin_users: {
        Args: { _requesting_user_id: string }
        Returns: {
          email: string
          full_name: string
          screen_access_count: number
          user_id: string
        }[]
      }
      get_available_managers: {
        Args: never
        Returns: {
          full_name: string
          id: string
          staff_code: string
        }[]
      }
      get_comprehensive_tds_summary: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          beneficiary_code: string
          beneficiary_name: string
          beneficiary_type: string
          payment_type: string
          total_gross_amount: number
          total_net_amount: number
          total_payments: number
          total_tds_amount: number
        }[]
      }
      get_doctor_auth_email: { Args: { _doctor_code: string }; Returns: string }
      get_doctor_tds_summary: {
        Args: { _doctor_id?: string; _end_date: string; _start_date: string }
        Returns: {
          doctor_code: string
          doctor_id: string
          doctor_name: string
          total_gross_amount: number
          total_net_amount: number
          total_payments: number
          total_tds_amount: number
        }[]
      }
      get_financial_year_start: {
        Args: { visit_date: string }
        Returns: string
      }
      get_manageable_staff: {
        Args: { _requesting_user_id: string }
        Returns: {
          approval_permission_count: number
          department: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["staff_role"]
          screen_access_count: number
          staff_code: string
        }[]
      }
      get_payment_approval_counts: {
        Args: never
        Returns: {
          pending_cash_count: number
          pending_insurance_count: number
        }[]
      }
      get_payment_approval_totals: {
        Args: never
        Returns: {
          approved_cash: number
          approved_insurance: number
          pending_cash: number
          pending_insurance: number
        }[]
      }
      get_payment_visits: {
        Args: { _payment_id: string; _user_id: string }
        Returns: {
          company_code: string
          company_name: string
          insurance_company_id: string
          patient_count: number
          patient_name: string
          payment_type: string
          visit_date: string
          visit_payment: number
        }[]
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
      get_staff_auth_email: { Args: { _username: string }; Returns: string }
      get_staff_list_for_management: {
        Args: never
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
      get_user_complete_profile: { Args: { _user_id: string }; Returns: Json }
      get_user_payments: {
        Args: { _user_id: string; _user_role: string; _user_type: string }
        Returns: {
          admin_approved_at: string
          admin_approved_by: string
          bank_advice_generated: boolean
          bank_advice_generated_at: string
          bank_advice_generated_by: string
          cash_approval_status: string
          cash_approved_at: string
          cash_approved_by: string
          cash_rejection_reason: string
          doctor_code: string
          doctor_id: string
          doctor_name: string
          id: string
          insurance_approval_status: string
          insurance_approved_at: string
          insurance_approved_by: string
          insurance_rejection_reason: string
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
      get_user_permissions: { Args: { _staff_id: string }; Returns: Json }
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
          insurance_company_code: string
          insurance_company_id: string
          insurance_company_name: string
          is_processed: boolean
          notes: string
          patient_count: number
          patient_id: string
          patient_name: string
          payment_type: string
          processed_at: string
          processed_in_payment_id: string
          visit_code: string
          visit_date: string
          visit_payment: number
          visit_reason: string
        }[]
      }
      grant_approval_permission: {
        Args: {
          _approval_type: Database["public"]["Enums"]["approval_type"]
          _can_approve: boolean
          _granted_by_user_id: string
          _notes?: string
          _staff_id: string
        }
        Returns: Json
      }
      grant_screen_access: {
        Args: {
          _can_edit: boolean
          _can_view: boolean
          _granted_by_user_id: string
          _notes?: string
          _screen_module: Database["public"]["Enums"]["screen_module"]
          _staff_id: string
        }
        Returns: Json
      }
      has_approval_permission: {
        Args: {
          _approval_type: Database["public"]["Enums"]["approval_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_designation: {
        Args: {
          _designation: Database["public"]["Enums"]["app_designation"]
          _user_id: string
        }
        Returns: boolean
      }
      has_screen_access: {
        Args: {
          _require_edit?: boolean
          _screen: Database["public"]["Enums"]["screen_module"]
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
      simple_hash: { Args: { password: string }; Returns: string }
      validate_leave_application: {
        Args: {
          _applicant_id: string
          _leave_end_date: string
          _leave_start_date: string
        }
        Returns: Json
      }
      validate_permission_application: {
        Args: {
          _applicant_id: string
          _duration_minutes: number
          _permission_date: string
        }
        Returns: Json
      }
      verify_user_login: {
        Args: { _password: string; _username: string }
        Returns: Json
      }
    }
    Enums: {
      app_designation:
        | "super_admin"
        | "admin"
        | "manager"
        | "supervisor"
        | "doctor"
        | "staff"
      application_status: "pending" | "approved" | "rejected"
      application_type: "leave" | "permission"
      appraisal_rating:
        | "excellent"
        | "good"
        | "satisfactory"
        | "needs_improvement"
        | "poor"
      approval_type:
        | "cash_payment_manager"
        | "cash_payment_admin"
        | "insurance_payment_manager"
        | "insurance_payment_admin"
        | "payment_rejection"
        | "bank_advice_generation"
        | "staff_appraisal_approval"
        | "complaint_resolution"
        | "master_data_changes"
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
      screen_module:
        | "dashboard"
        | "visit_management"
        | "payment_management"
        | "cash_payments"
        | "insurance_payments"
        | "doctor_management"
        | "staff_management"
        | "task_management"
        | "report_generation"
        | "bank_advice_reports"
        | "tds_reports"
        | "user_login_reports"
        | "staff_appraisal"
        | "complaint_management"
        | "master_data"
        | "settings"
        | "team_chat"
        | "website_settings"
        | "user_guide"
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
      app_designation: [
        "super_admin",
        "admin",
        "manager",
        "supervisor",
        "doctor",
        "staff",
      ],
      application_status: ["pending", "approved", "rejected"],
      application_type: ["leave", "permission"],
      appraisal_rating: [
        "excellent",
        "good",
        "satisfactory",
        "needs_improvement",
        "poor",
      ],
      approval_type: [
        "cash_payment_manager",
        "cash_payment_admin",
        "insurance_payment_manager",
        "insurance_payment_admin",
        "payment_rejection",
        "bank_advice_generation",
        "staff_appraisal_approval",
        "complaint_resolution",
        "master_data_changes",
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
      screen_module: [
        "dashboard",
        "visit_management",
        "payment_management",
        "cash_payments",
        "insurance_payments",
        "doctor_management",
        "staff_management",
        "task_management",
        "report_generation",
        "bank_advice_reports",
        "tds_reports",
        "user_login_reports",
        "staff_appraisal",
        "complaint_management",
        "master_data",
        "settings",
        "team_chat",
        "website_settings",
        "user_guide",
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
