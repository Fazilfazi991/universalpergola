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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          archived_at: string | null
          asset_code: string
          brand: string | null
          category: string
          created_at: string
          currency: string
          estimated_cost: number | null
          id: string
          image_mime_type: string | null
          image_path: string | null
          image_size: number | null
          location: string | null
          model: string | null
          name: string
          notes: string | null
          planned_purchase_date: string | null
          purchase_cost: number | null
          purchase_date: string | null
          recorded_by: string
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          supplier: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          asset_code: string
          brand?: string | null
          category: string
          created_at?: string
          currency?: string
          estimated_cost?: number | null
          id?: string
          image_mime_type?: string | null
          image_path?: string | null
          image_size?: number | null
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          planned_purchase_date?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          recorded_by: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          asset_code?: string
          brand?: string | null
          category?: string
          created_at?: string
          currency?: string
          estimated_cost?: number | null
          id?: string
          image_mime_type?: string | null
          image_path?: string | null
          image_size?: number | null
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          planned_purchase_date?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          recorded_by?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          archived_at: string | null
          area: string | null
          assigned_to: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          email_normalized: string | null
          emirate: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          phone_normalized: string | null
          source: string | null
          updated_at: string
          whatsapp_normalized: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          email_normalized?: string | null
          emirate?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
          whatsapp_normalized?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          email_normalized?: string | null
          emirate?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
          whatsapp_normalized?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          enquiry_number: number
          enquiry_type: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at: string | null
          id: string
          internal_notes: string | null
          lost_reason: string | null
          message: string | null
          next_action: string | null
          priority: Database["public"]["Enums"]["lead_priority"]
          product_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          enquiry_number?: number
          enquiry_type?: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at?: string | null
          id?: string
          internal_notes?: string | null
          lost_reason?: string | null
          message?: string | null
          next_action?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          product_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          enquiry_number?: number
          enquiry_type?: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at?: string | null
          id?: string
          internal_notes?: string | null
          lost_reason?: string | null
          message?: string | null
          next_action?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          product_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          enquiry_id: string
          id: string
          next_action_at: string | null
          note: string | null
          occurred_at: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          enquiry_id: string
          id?: string
          next_action_at?: string | null
          note?: string | null
          occurred_at?: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          enquiry_id?: string
          id?: string
          next_action_at?: string | null
          note?: string | null
          occurred_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_activities_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          completion_status: string
          created_at: string
          created_by: string | null
          customer_comments: string | null
          customer_rating: number | null
          handover_date: string | null
          id: string
          internal_notes: string | null
          permission_to_publish_testimonial: boolean
          project_id: string
          public_token: string
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          staff_entered_at: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          submitted_at: string | null
          token_expires_at: string | null
          token_revoked_at: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          completion_status?: string
          created_at?: string
          created_by?: string | null
          customer_comments?: string | null
          customer_rating?: number | null
          handover_date?: string | null
          id?: string
          internal_notes?: string | null
          permission_to_publish_testimonial?: boolean
          project_id: string
          public_token?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          staff_entered_at?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          submitted_at?: string | null
          token_expires_at?: string | null
          token_revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          completion_status?: string
          created_at?: string
          created_by?: string | null
          customer_comments?: string | null
          customer_rating?: number | null
          handover_date?: string | null
          id?: string
          internal_notes?: string | null
          permission_to_publish_testimonial?: boolean
          project_id?: string
          public_token?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          staff_entered_at?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          submitted_at?: string | null
          token_expires_at?: string | null
          token_revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_expenses: {
        Row: {
          amount: number
          archived_at: string | null
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          project_id: string | null
          recorded_by: string
          reference: string | null
          scope: Database["public"]["Enums"]["internal_expense_scope"]
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          recorded_by: string
          reference?: string | null
          scope: Database["public"]["Enums"]["internal_expense_scope"]
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          recorded_by?: string
          reference?: string | null
          scope?: Database["public"]["Enums"]["internal_expense_scope"]
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          discount_amount: number
          id: string
          invoice_id: string
          item_name: string
          line_subtotal: number
          line_total: number
          quantity: number
          quotation_item_id: string | null
          sort_order: number
          taxable: boolean
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          discount_amount?: number
          id?: string
          invoice_id: string
          item_name: string
          line_subtotal?: number
          line_total?: number
          quantity?: number
          quotation_item_id?: string | null
          sort_order?: number
          taxable?: boolean
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          discount_amount?: number
          id?: string
          invoice_id?: string
          item_name?: string
          line_subtotal?: number
          line_total?: number
          quantity?: number
          quotation_item_id?: string | null
          sort_order?: number
          taxable?: boolean
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_quotation_item_id_fkey"
            columns: ["quotation_item_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          archived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_reference: string
          client_reference_date: string
          client_reference_location_token: string
          client_reference_sequence: number
          created_at: string
          created_by: string | null
          currency: string
          customer_company_snapshot: string | null
          customer_email_snapshot: string | null
          customer_id: string
          customer_name_snapshot: string
          customer_phone_snapshot: string | null
          discount_amount: number
          discount_type: string
          discount_value: number
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          issued_at: string | null
          issued_by: string | null
          notes: string | null
          pdf_generated_at: string | null
          project_id: string
          quotation_id: string | null
          quotation_number_snapshot: string | null
          quotation_revision_snapshot: number | null
          site_address_snapshot: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          terms: string | null
          total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_reference: string
          client_reference_date: string
          client_reference_location_token: string
          client_reference_sequence: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company_snapshot?: string | null
          customer_email_snapshot?: string | null
          customer_id: string
          customer_name_snapshot: string
          customer_phone_snapshot?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          pdf_generated_at?: string | null
          project_id: string
          quotation_id?: string | null
          quotation_number_snapshot?: string | null
          quotation_revision_snapshot?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_reference?: string
          client_reference_date?: string
          client_reference_location_token?: string
          client_reference_sequence?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company_snapshot?: string | null
          customer_email_snapshot?: string | null
          customer_id?: string
          customer_name_snapshot?: string
          customer_phone_snapshot?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          pdf_generated_at?: string | null
          project_id?: string
          quotation_id?: string | null
          quotation_number_snapshot?: string | null
          quotation_revision_snapshot?: number | null
          site_address_snapshot?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_wages: {
        Row: {
          amount: number
          archived_at: string | null
          created_at: string
          currency: string
          hours: number | null
          id: string
          notes: string | null
          project_id: string | null
          recorded_by: string
          status: Database["public"]["Enums"]["wage_status"]
          updated_at: string
          work_date: string
          work_description: string
          worker_name: string
        }
        Insert: {
          amount: number
          archived_at?: string | null
          created_at?: string
          currency?: string
          hours?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          recorded_by: string
          status?: Database["public"]["Enums"]["wage_status"]
          updated_at?: string
          work_date?: string
          work_description: string
          worker_name: string
        }
        Update: {
          amount?: number
          archived_at?: string | null
          created_at?: string
          currency?: string
          hours?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          recorded_by?: string
          status?: Database["public"]["Enums"]["wage_status"]
          updated_at?: string
          work_date?: string
          work_description?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_wages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_wages_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          notification_type: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          notification_type: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          title?: string
          updated_at?: string
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
      payment_milestones: {
        Row: {
          amount_due: number
          archived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_type: Database["public"]["Enums"]["payment_milestone_type"]
          name: string
          notes: string | null
          percentage: number | null
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_due: number
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_type?: Database["public"]["Enums"]["payment_milestone_type"]
          name: string
          notes?: string | null
          percentage?: number | null
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_type?: Database["public"]["Enums"]["payment_milestone_type"]
          name?: string
          notes?: string | null
          percentage?: number | null
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestones_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          payment_id: string
          storage_path: string
          updated_at: string
          upload_status: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          payment_id: string
          storage_path: string
          updated_at?: string
          upload_status?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          payment_id?: string
          storage_path?: string
          updated_at?: string
          upload_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_received: number
          archived_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          milestone_id: string | null
          notes: string | null
          payment_method: string | null
          project_id: string
          proof_storage_path: string | null
          receipt_number: string
          received_date: string
          reference_number: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_received: number
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          milestone_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id: string
          proof_storage_path?: string | null
          receipt_number: string
          received_date: string
          reference_number?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_received?: number
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          milestone_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string
          proof_storage_path?: string | null
          receipt_number?: string
          received_date?: string
          reference_number?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_alt_text: string | null
          image_storage_path: string | null
          is_active: boolean
          long_description: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_alt_text?: string | null
          image_storage_path?: string | null
          is_active?: boolean
          long_description?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_alt_text?: string | null
          image_storage_path?: string | null
          is_active?: boolean
          long_description?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string
          colour_information: string | null
          created_at: string
          created_by: string | null
          currency: string
          dimensions_information: string | null
          full_description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          material: string | null
          name: string
          price: number | null
          pricing_mode: Database["public"]["Enums"]["pricing_mode"]
          product_code: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number
          specifications: Json
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          colour_information?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          dimensions_information?: string | null
          full_description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          material?: string | null
          name: string
          price?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          product_code?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          specifications?: Json
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          colour_information?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          dimensions_information?: string | null
          full_description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          material?: string | null
          name?: string
          price?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          product_code?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          specifications?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assignment_role: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_role?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_role?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          project_id: string
          stage_id: string | null
          storage_path: string
          updated_at: string
          upload_status: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          project_id: string
          stage_id?: string | null
          storage_path: string
          updated_at?: string
          upload_status?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          stage_id?: string | null
          storage_path?: string
          updated_at?: string
          upload_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_templates: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          default_weight: number
          description: string | null
          id: string
          is_active: boolean
          is_terminal: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_weight?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_weight?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_terminal: boolean
          name: string
          notes: string | null
          progress: number
          project_id: string
          sort_order: number
          stage_key: string
          started_at: string | null
          status: Database["public"]["Enums"]["stage_status"]
          target_date: string | null
          template_id: string | null
          updated_at: string
          updated_by: string | null
          weight: number
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean
          name: string
          notes?: string | null
          progress?: number
          project_id: string
          sort_order?: number
          stage_key: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          target_date?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weight?: number
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean
          name?: string
          notes?: string | null
          progress?: number
          project_id?: string
          sort_order?: number
          stage_key?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          target_date?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_stage_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          progress: number | null
          project_id: string
          stage_id: string | null
          update_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          progress?: number | null
          project_id: string
          stage_id?: string | null
          update_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          progress?: number | null
          project_id?: string
          stage_id?: string | null
          update_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_completion_date: string | null
          archived_at: string | null
          assigned_salesperson: string | null
          client_reference: string | null
          client_reference_date: string | null
          client_reference_location_token: string | null
          client_reference_sequence: number | null
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_stage_id: string | null
          customer_id: string
          enquiry_id: string | null
          expected_completion_date: string | null
          handover_confirmed_at: string | null
          handover_confirmed_by: string | null
          handover_contact: string | null
          handover_date: string | null
          handover_notes: string | null
          handover_status: Database["public"]["Enums"]["handover_status"]
          id: string
          installation_date: string | null
          notes: string | null
          payment_plan_activated_at: string | null
          payment_plan_activated_by: string | null
          payment_plan_cancellation_reason: string | null
          payment_plan_cancelled_at: string | null
          payment_plan_cancelled_by: string | null
          payment_plan_status: Database["public"]["Enums"]["payment_plan_status"]
          priority: Database["public"]["Enums"]["project_priority"]
          progress: number
          project_number: string
          project_owner_id: string | null
          project_value: number
          quotation_id: string | null
          reopened_at: string | null
          reopened_by: string | null
          site_address: string | null
          site_visit_id: string | null
          source_quotation_number: string | null
          source_quotation_revision: number | null
          start_date: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          archived_at?: string | null
          assigned_salesperson?: string | null
          client_reference?: string | null
          client_reference_date?: string | null
          client_reference_location_token?: string | null
          client_reference_sequence?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stage_id?: string | null
          customer_id: string
          enquiry_id?: string | null
          expected_completion_date?: string | null
          handover_confirmed_at?: string | null
          handover_confirmed_by?: string | null
          handover_contact?: string | null
          handover_date?: string | null
          handover_notes?: string | null
          handover_status?: Database["public"]["Enums"]["handover_status"]
          id?: string
          installation_date?: string | null
          notes?: string | null
          payment_plan_activated_at?: string | null
          payment_plan_activated_by?: string | null
          payment_plan_cancellation_reason?: string | null
          payment_plan_cancelled_at?: string | null
          payment_plan_cancelled_by?: string | null
          payment_plan_status?: Database["public"]["Enums"]["payment_plan_status"]
          priority?: Database["public"]["Enums"]["project_priority"]
          progress?: number
          project_number: string
          project_owner_id?: string | null
          project_value?: number
          quotation_id?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          site_address?: string | null
          site_visit_id?: string | null
          source_quotation_number?: string | null
          source_quotation_revision?: number | null
          start_date?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          archived_at?: string | null
          assigned_salesperson?: string | null
          client_reference?: string | null
          client_reference_date?: string | null
          client_reference_location_token?: string | null
          client_reference_sequence?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stage_id?: string | null
          customer_id?: string
          enquiry_id?: string | null
          expected_completion_date?: string | null
          handover_confirmed_at?: string | null
          handover_confirmed_by?: string | null
          handover_contact?: string | null
          handover_date?: string | null
          handover_notes?: string | null
          handover_status?: Database["public"]["Enums"]["handover_status"]
          id?: string
          installation_date?: string | null
          notes?: string | null
          payment_plan_activated_at?: string | null
          payment_plan_activated_by?: string | null
          payment_plan_cancellation_reason?: string | null
          payment_plan_cancelled_at?: string | null
          payment_plan_cancelled_by?: string | null
          payment_plan_status?: Database["public"]["Enums"]["payment_plan_status"]
          priority?: Database["public"]["Enums"]["project_priority"]
          progress?: number
          project_number?: string
          project_owner_id?: string | null
          project_value?: number
          quotation_id?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          site_address?: string | null
          site_visit_id?: string | null
          source_quotation_number?: string | null
          source_quotation_revision?: number | null
          start_date?: string | null
          started_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_salesperson_fkey"
            columns: ["assigned_salesperson"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_handover_confirmed_by_fkey"
            columns: ["handover_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_payment_plan_activated_by_fkey"
            columns: ["payment_plan_activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_payment_plan_cancelled_by_fkey"
            columns: ["payment_plan_cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_owner_id_fkey"
            columns: ["project_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bills: {
        Row: {
          asset_id: string | null
          bill_date: string | null
          bill_number: string | null
          created_at: string
          expense_id: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          vendor: string | null
        }
        Insert: {
          asset_id?: string | null
          bill_date?: string | null
          bill_number?: string | null
          created_at?: string
          expense_id?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          vendor?: string | null
        }
        Update: {
          asset_id?: string | null
          bill_date?: string | null
          bill_number?: string | null
          created_at?: string
          expense_id?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "internal_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          dimensions_details: string | null
          discount_amount: number
          height: number | null
          id: string
          item_name: string
          length: number | null
          line_total: number
          product_code_snapshot: string | null
          product_id: string | null
          product_name_snapshot: string | null
          quantity: number
          quotation_id: string
          sort_order: number
          source_measurement_id: string | null
          taxable: boolean
          unit: string
          unit_price: number
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          dimensions_details?: string | null
          discount_amount?: number
          height?: number | null
          id?: string
          item_name: string
          length?: number | null
          line_total?: number
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          quotation_id: string
          sort_order?: number
          source_measurement_id?: string | null
          taxable?: boolean
          unit?: string
          unit_price?: number
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          dimensions_details?: string | null
          discount_amount?: number
          height?: number | null
          id?: string
          item_name?: string
          length?: number | null
          line_total?: number
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          quotation_id?: string
          sort_order?: number
          source_measurement_id?: string | null
          taxable?: boolean
          unit?: string
          unit_price?: number
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_source_measurement_id_fkey"
            columns: ["source_measurement_id"]
            isOneToOne: false
            referencedRelation: "site_visit_measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          cancelled_at: string | null
          client_reference: string | null
          client_reference_date: string | null
          client_reference_location_token: string | null
          client_reference_sequence: number | null
          created_at: string
          created_by: string | null
          currency: string
          customer_company_snapshot: string | null
          customer_email_snapshot: string | null
          customer_id: string
          customer_name_snapshot: string
          customer_notes: string | null
          customer_phone_snapshot: string | null
          decision_note: string | null
          discount_amount: number
          discount_type: string
          discount_value: number
          enquiry_id: string | null
          id: string
          internal_notes: string | null
          introduction: string | null
          is_current: boolean
          issue_date: string
          notes: string | null
          owner_id: string | null
          pdf_generated_at: string | null
          quotation_number: string
          ready_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          revised_from_id: string | null
          revision_group_id: string | null
          revision_number: number
          sent_at: string | null
          sent_by: string | null
          site_address_snapshot: string | null
          site_visit_id: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          terms: string | null
          total: number
          updated_at: string
          validity_date: string | null
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancelled_at?: string | null
          client_reference?: string | null
          client_reference_date?: string | null
          client_reference_location_token?: string | null
          client_reference_sequence?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company_snapshot?: string | null
          customer_email_snapshot?: string | null
          customer_id: string
          customer_name_snapshot: string
          customer_notes?: string | null
          customer_phone_snapshot?: string | null
          decision_note?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          enquiry_id?: string | null
          id?: string
          internal_notes?: string | null
          introduction?: string | null
          is_current?: boolean
          issue_date?: string
          notes?: string | null
          owner_id?: string | null
          pdf_generated_at?: string | null
          quotation_number: string
          ready_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          revised_from_id?: string | null
          revision_group_id?: string | null
          revision_number?: number
          sent_at?: string | null
          sent_by?: string | null
          site_address_snapshot?: string | null
          site_visit_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
          validity_date?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancelled_at?: string | null
          client_reference?: string | null
          client_reference_date?: string | null
          client_reference_location_token?: string | null
          client_reference_sequence?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_company_snapshot?: string | null
          customer_email_snapshot?: string | null
          customer_id?: string
          customer_name_snapshot?: string
          customer_notes?: string | null
          customer_phone_snapshot?: string | null
          decision_note?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          enquiry_id?: string | null
          id?: string
          internal_notes?: string | null
          introduction?: string | null
          is_current?: boolean
          issue_date?: string
          notes?: string | null
          owner_id?: string | null
          pdf_generated_at?: string | null
          quotation_number?: string
          ready_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          revised_from_id?: string | null
          revision_group_id?: string | null
          revision_number?: number
          sent_at?: string | null
          sent_by?: string | null
          site_address_snapshot?: string | null
          site_visit_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          terms?: string | null
          total?: number
          updated_at?: string
          validity_date?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_revised_from_id_fkey"
            columns: ["revised_from_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_revision_group_id_fkey"
            columns: ["revision_group_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visit_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
          site_visit_id: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          site_visit_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          site_visit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visit_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visit_activities_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visit_measurements: {
        Row: {
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          label: string
          length: number | null
          notes: string | null
          quantity: number
          site_visit_id: string
          sort_order: number
          unit: string
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          label: string
          length?: number | null
          notes?: string | null
          quantity?: number
          site_visit_id: string
          sort_order?: number
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          label?: string
          length?: number | null
          notes?: string | null
          quantity?: number
          site_visit_id?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visit_measurements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visit_measurements_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visit_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          photo_type: string | null
          site_visit_id: string
          sort_order: number
          storage_path: string
          taken_at: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          photo_type?: string | null
          site_visit_id: string
          sort_order?: number
          storage_path: string
          taken_at?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          photo_type?: string | null
          site_visit_id?: string
          sort_order?: number
          storage_path?: string
          taken_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visit_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visit_photos_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          actual_started_at: string | null
          archived_at: string | null
          area: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          emirate: string | null
          enquiry_id: string | null
          follow_up_required: boolean
          id: string
          location_url: string | null
          measurement_summary: string | null
          measurements: Json
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          scheduled_at: string
          site_address: string
          status: Database["public"]["Enums"]["site_visit_status"]
          updated_at: string
          visit_number: number
        }
        Insert: {
          actual_started_at?: string | null
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          emirate?: string | null
          enquiry_id?: string | null
          follow_up_required?: boolean
          id?: string
          location_url?: string | null
          measurement_summary?: string | null
          measurements?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          scheduled_at: string
          site_address: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
          visit_number?: number
        }
        Update: {
          actual_started_at?: string | null
          archived_at?: string | null
          area?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          emirate?: string | null
          enquiry_id?: string | null
          follow_up_required?: boolean
          id?: string
          location_url?: string | null
          measurement_summary?: string | null
          measurements?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          scheduled_at?: string
          site_address?: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          completion_checklist_key: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          enquiry_id: string | null
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          project_stage_id: string | null
          site_visit_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_checklist_key?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          enquiry_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          project_stage_id?: string | null
          site_visit_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_checklist_key?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          enquiry_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          project_stage_id?: string | null
          site_visit_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_payment_plan: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      cancel_payment_milestone: {
        Args: { p_milestone_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_payment_plan: {
        Args: { p_project_id: string; p_reason: string }
        Returns: undefined
      }
      complete_project: {
        Args: { p_completion_note?: string; p_project_id: string }
        Returns: undefined
      }
      configure_project_stage_template: {
        Args: {
          p_default_weight: number
          p_description: string
          p_is_active: boolean
          p_name: string
          p_sort_order: number
          p_template_id: string
        }
        Returns: undefined
      }
      convert_approved_quotation_to_project: {
        Args: { p_quotation_id: string }
        Returns: string
      }
      create_invoice_from_project: {
        Args: { p_project_id: string }
        Returns: string
      }
      create_quotation_revision: {
        Args: { p_quotation_id: string }
        Returns: string
      }
      create_staff_enquiry: {
        Args: {
          p_address: string
          p_area: string
          p_assigned_to: string
          p_company_name: string
          p_customer_id: string
          p_customer_name: string
          p_customer_type: Database["public"]["Enums"]["customer_type"]
          p_email: string
          p_emirate: string
          p_follow_up_at: string
          p_internal_notes: string
          p_message: string
          p_next_action: string
          p_phone: string
          p_priority: Database["public"]["Enums"]["lead_priority"]
          p_product_id: string
          p_source: string
          p_subject: string
          p_whatsapp_number: string
        }
        Returns: {
          customer_id: string
          enquiry_id: string
          enquiry_number: number
        }[]
      }
      finalize_payment_proof: {
        Args: { p_proof_id: string }
        Returns: undefined
      }
      finalize_project_file: { Args: { p_file_id: string }; Returns: undefined }
      generate_project_client_reference: {
        Args: {
          p_location_token?: string
          p_project_id: string
          p_reference_date?: string
        }
        Returns: string
      }
      get_customer_finance_summary: {
        Args: { p_customer_id: string }
        Returns: {
          outstanding: number
          overdue: number
          project_count: number
          project_value: number
          received: number
        }[]
      }
      get_finance_dashboard_summary: {
        Args: never
        Returns: {
          active_plans: number
          due_soon: number
          outstanding: number
          overdue: number
          overdue_projects: number
          project_value: number
          received: number
          received_this_month: number
          received_today: number
        }[]
      }
      get_finance_milestone_queue: {
        Args: never
        Returns: {
          amount_due: number
          currency: string
          customer_id: string
          customer_name: string
          due_date: string
          milestone_id: string
          milestone_name: string
          outstanding: number
          project_id: string
          project_number: string
          received: number
          status: string
        }[]
      }
      get_finance_project_summaries: {
        Args: never
        Returns: {
          currency: string
          customer_id: string
          customer_name: string
          next_due_date: string
          outstanding: number
          overdue: number
          paid_percent: number
          plan_status: string
          planned: number
          project_id: string
          project_number: string
          project_value: number
          received: number
        }[]
      }
      get_payment_milestone_summaries: {
        Args: { p_project_id: string }
        Returns: {
          amount_due: number
          cancellation_reason: string
          cancelled_at: string
          description: string
          due_date: string
          milestone_id: string
          milestone_type: string
          name: string
          notes: string
          outstanding: number
          percentage: number
          received: number
          sort_order: number
          status: string
        }[]
      }
      get_project_cost_summary: {
        Args: { p_project_id: string }
        Returns: {
          approved_value: number
          currency: string
          customer_outstanding: number
          customer_received: number
          labour_cost: number
          material_expense: number
          other_project_expenses: number
          total_internal_cost: number
        }[]
      }
      get_project_finance_summary: {
        Args: { p_project_id: string }
        Returns: {
          currency: string
          next_due_amount: number
          next_due_date: string
          outstanding: number
          overdue: number
          paid_percent: number
          plan_status: string
          planned: number
          project_value: number
          received: number
        }[]
      }
      get_public_feedback_context: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          feedback_state: string
          project_reference: string
        }[]
      }
      record_invoice_pdf_generation: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      record_payment: {
        Args: {
          p_amount: number
          p_method: string
          p_milestone_id: string
          p_notes: string
          p_project_id: string
          p_received_date: string
          p_reference: string
        }
        Returns: string
      }
      release_payment_proof: {
        Args: { p_proof_id: string }
        Returns: undefined
      }
      reopen_project: {
        Args: { p_note: string; p_project_id: string }
        Returns: undefined
      }
      request_project_feedback: {
        Args: { p_expires_at?: string; p_project_id: string }
        Returns: string
      }
      revoke_project_feedback_link: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      save_invoice_draft: {
        Args: { p_invoice_id: string; p_payload: Json }
        Returns: string
      }
      save_payment_milestone: {
        Args: {
          p_description: string
          p_due_date: string
          p_fixed_amount: number
          p_milestone_id: string
          p_name: string
          p_notes: string
          p_percentage: number
          p_project_id: string
          p_sort_order: number
          p_type: string
        }
        Returns: string
      }
      save_quotation_draft: {
        Args: { p_payload: Json; p_quotation_id: string }
        Returns: string
      }
      save_staff_feedback: {
        Args: {
          p_comment: string
          p_internal_notes?: string
          p_permission?: boolean
          p_project_id: string
          p_rating: number
          p_source: string
        }
        Returns: string
      }
      set_project_assignment: {
        Args: {
          p_assignment_role: string
          p_enabled?: boolean
          p_project_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      submit_public_enquiry: {
        Args: {
          p_email?: string
          p_emirate?: string
          p_honeypot?: string
          p_message: string
          p_name: string
          p_phone: string
          p_product_id?: string
          p_whatsapp_number?: string
        }
        Returns: {
          enquiry_id: string
          enquiry_number: number
        }[]
      }
      submit_public_feedback: {
        Args: {
          p_comment?: string
          p_honeypot?: string
          p_permission?: boolean
          p_rating: number
          p_token: string
        }
        Returns: string
      }
      transition_invoice: {
        Args: { p_action: string; p_invoice_id: string; p_reason?: string }
        Returns: Database["public"]["Enums"]["invoice_status"]
      }
      transition_project_stage: {
        Args: { p_action: string; p_note?: string; p_stage_id: string }
        Returns: undefined
      }
      update_completion_checklist: {
        Args: {
          p_completed: boolean
          p_key: string
          p_note?: string
          p_project_id: string
        }
        Returns: undefined
      }
      update_feedback_review: {
        Args: {
          p_feedback_id: string
          p_internal_notes?: string
          p_status: string
        }
        Returns: undefined
      }
      update_project_details: {
        Args: {
          p_installation_date: string
          p_notes: string
          p_priority: string
          p_project_id: string
          p_start_date: string
          p_status: string
          p_summary: string
          p_target_date: string
        }
        Returns: undefined
      }
      update_project_handover: {
        Args: {
          p_contact: string
          p_handover_date: string
          p_notes: string
          p_project_id: string
          p_status: string
        }
        Returns: undefined
      }
      update_project_stage_details: {
        Args: {
          p_assigned_to: string
          p_notes: string
          p_progress: number
          p_stage_id: string
          p_target_date: string
        }
        Returns: undefined
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "sales" | "site_team" | "accounts"
      asset_status:
        | "planned"
        | "active"
        | "maintenance"
        | "retired"
        | "archived"
      customer_type: "individual" | "company"
      enquiry_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "site_visit_required"
        | "quotation"
        | "approved"
        | "lost"
      enquiry_type: "catalogue" | "general" | "manual"
      feedback_status:
        | "not_requested"
        | "requested"
        | "received"
        | "reviewed"
        | "archived"
      handover_status: "pending" | "ready" | "completed" | "issues_outstanding"
      internal_expense_scope: "project" | "workshop"
      invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "cancelled"
      lead_priority: "low" | "normal" | "high" | "urgent"
      payment_milestone_type: "percentage" | "fixed"
      payment_plan_status: "draft" | "active" | "completed" | "cancelled"
      payment_status:
        | "pending"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      pricing_mode:
        | "hidden"
        | "starting_price"
        | "fixed_price"
        | "price_on_request"
      profile_status: "active" | "inactive"
      project_priority: "low" | "normal" | "high" | "urgent"
      project_status:
        | "planned"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      quotation_status:
        | "draft"
        | "ready"
        | "sent"
        | "revised"
        | "approved"
        | "rejected"
        | "expired"
        | "cancelled"
      site_visit_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rescheduled"
        | "no_show"
      stage_status:
        | "not_started"
        | "in_progress"
        | "blocked"
        | "skipped"
        | "completed"
      task_kind:
        | "general"
        | "enquiry_follow_up"
        | "site_visit_follow_up"
        | "project_task"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status:
        | "open"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled"
      wage_status: "pending" | "paid" | "partially_paid"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "sales", "site_team", "accounts"],
      asset_status: ["planned", "active", "maintenance", "retired", "archived"],
      customer_type: ["individual", "company"],
      enquiry_status: [
        "new",
        "contacted",
        "follow_up",
        "site_visit_required",
        "quotation",
        "approved",
        "lost",
      ],
      enquiry_type: ["catalogue", "general", "manual"],
      feedback_status: [
        "not_requested",
        "requested",
        "received",
        "reviewed",
        "archived",
      ],
      handover_status: ["pending", "ready", "completed", "issues_outstanding"],
      internal_expense_scope: ["project", "workshop"],
      invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      lead_priority: ["low", "normal", "high", "urgent"],
      payment_milestone_type: ["percentage", "fixed"],
      payment_plan_status: ["draft", "active", "completed", "cancelled"],
      payment_status: [
        "pending",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      pricing_mode: [
        "hidden",
        "starting_price",
        "fixed_price",
        "price_on_request",
      ],
      profile_status: ["active", "inactive"],
      project_priority: ["low", "normal", "high", "urgent"],
      project_status: [
        "planned",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      quotation_status: [
        "draft",
        "ready",
        "sent",
        "revised",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ],
      site_visit_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
      ],
      stage_status: [
        "not_started",
        "in_progress",
        "blocked",
        "skipped",
        "completed",
      ],
      task_kind: [
        "general",
        "enquiry_follow_up",
        "site_visit_follow_up",
        "project_task",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "blocked", "completed", "cancelled"],
      wage_status: ["pending", "paid", "partially_paid"],
    },
  },
} as const
