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
      customers: {
        Row: {
          address: string | null
          archived_at: string | null
          area: string | null
          assigned_to: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          emirate: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
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
          email?: string | null
          emirate?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
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
          email?: string | null
          emirate?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
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
          enquiry_type: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at: string | null
          id: string
          lost_reason: string | null
          message: string | null
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
          enquiry_type?: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
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
          enquiry_type?: Database["public"]["Enums"]["enquiry_type"]
          follow_up_at?: string | null
          id?: string
          lost_reason?: string | null
          message?: string | null
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
          completion_status: string
          created_at: string
          created_by: string | null
          customer_comments: string | null
          customer_rating: number | null
          handover_date: string | null
          id: string
          internal_notes: string | null
          project_id: string
          public_token: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          completion_status?: string
          created_at?: string
          created_by?: string | null
          customer_comments?: string | null
          customer_rating?: number | null
          handover_date?: string | null
          id?: string
          internal_notes?: string | null
          project_id: string
          public_token?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          completion_status?: string
          created_at?: string
          created_by?: string | null
          customer_comments?: string | null
          customer_rating?: number | null
          handover_date?: string | null
          id?: string
          internal_notes?: string | null
          project_id?: string
          public_token?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_due: number
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
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
          received_date: string
          reference_number: string | null
          updated_at: string
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
          received_date: string
          reference_number?: string | null
          updated_at?: string
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
          received_date?: string
          reference_number?: string | null
          updated_at?: string
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
          file_type: string
          id: string
          project_id: string
          stage_id: string | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_type?: string
          id?: string
          project_id: string
          stage_id?: string | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_type?: string
          id?: string
          project_id?: string
          stage_id?: string | null
          storage_path?: string
          updated_at?: string
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
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
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
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          started_at: string | null
          status: Database["public"]["Enums"]["stage_status"]
          template_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
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
          archived_at: string | null
          assigned_salesperson: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_stage_id: string | null
          customer_id: string
          expected_completion_date: string | null
          handover_date: string | null
          id: string
          notes: string | null
          progress: number
          project_number: string
          project_value: number
          quotation_id: string | null
          site_address: string | null
          site_visit_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_salesperson?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stage_id?: string | null
          customer_id: string
          expected_completion_date?: string | null
          handover_date?: string | null
          id?: string
          notes?: string | null
          progress?: number
          project_number: string
          project_value?: number
          quotation_id?: string | null
          site_address?: string | null
          site_visit_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_salesperson?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_stage_id?: string | null
          customer_id?: string
          expected_completion_date?: string | null
          handover_date?: string | null
          id?: string
          notes?: string | null
          progress?: number
          project_number?: string
          project_value?: number
          quotation_id?: string | null
          site_address?: string | null
          site_visit_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
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
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
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
          id: string
          line_total: number
          product_code_snapshot: string | null
          product_id: string | null
          product_name_snapshot: string | null
          quantity: number
          quotation_id: string
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          dimensions_details?: string | null
          discount_amount?: number
          id?: string
          line_total?: number
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          quotation_id: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          dimensions_details?: string | null
          discount_amount?: number
          id?: string
          line_total?: number
          product_code_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          quotation_id?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
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
        ]
      }
      quotations: {
        Row: {
          approved_at: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          discount_amount: number
          enquiry_id: string | null
          id: string
          notes: string | null
          quotation_number: string
          revised_from_id: string | null
          sent_at: string | null
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
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          discount_amount?: number
          enquiry_id?: string | null
          id?: string
          notes?: string | null
          quotation_number: string
          revised_from_id?: string | null
          sent_at?: string | null
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
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          discount_amount?: number
          enquiry_id?: string | null
          id?: string
          notes?: string | null
          quotation_number?: string
          revised_from_id?: string | null
          sent_at?: string | null
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
            foreignKeyName: "quotations_revised_from_id_fkey"
            columns: ["revised_from_id"]
            isOneToOne: false
            referencedRelation: "quotations"
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
      site_visit_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          site_visit_id: string
          storage_path: string
          taken_at: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          site_visit_id: string
          storage_path: string
          taken_at?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          site_visit_id?: string
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
          archived_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          enquiry_id: string | null
          follow_up_required: boolean
          id: string
          location_url: string | null
          measurements: Json
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          scheduled_at: string
          site_address: string
          status: Database["public"]["Enums"]["site_visit_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          enquiry_id?: string | null
          follow_up_required?: boolean
          id?: string
          location_url?: string | null
          measurements?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          scheduled_at: string
          site_address: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          enquiry_id?: string | null
          follow_up_required?: boolean
          id?: string
          location_url?: string | null
          measurements?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          scheduled_at?: string
          site_address?: string
          status?: Database["public"]["Enums"]["site_visit_status"]
          updated_at?: string
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
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          enquiry_id: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          site_visit_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          enquiry_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          site_visit_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          enquiry_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "sales" | "site_team" | "accounts"
      enquiry_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "site_visit_required"
        | "quotation"
        | "approved"
        | "lost"
      enquiry_type: "catalogue" | "general" | "manual"
      lead_priority: "low" | "normal" | "high" | "urgent"
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
      project_status:
        | "planned"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      quotation_status:
        | "draft"
        | "sent"
        | "revised"
        | "approved"
        | "rejected"
        | "expired"
      site_visit_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rescheduled"
      stage_status: "not_started" | "in_progress" | "blocked" | "completed"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status:
        | "open"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled"
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
      lead_priority: ["low", "normal", "high", "urgent"],
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
      project_status: [
        "planned",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      quotation_status: [
        "draft",
        "sent",
        "revised",
        "approved",
        "rejected",
        "expired",
      ],
      site_visit_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      stage_status: ["not_started", "in_progress", "blocked", "completed"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "blocked", "completed", "cancelled"],
    },
  },
} as const
