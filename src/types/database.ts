// src/types/database.ts - TYPES SUPABASE ESSENTIAL
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          slug: string;
          active: boolean;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          slug: string;
          active?: boolean;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          slug?: string;
          active?: boolean;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          full_name: string | null;
          role: string;
          active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tracking_data: {
        Row: {
          id: string;
          company_id: string;
          asana_task_id: string;
          raw_data: Json;
          processed_data: Json;
          status: string;
          maritime_status: string | null;
          reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          asana_task_id: string;
          raw_data: Json;
          processed_data: Json;
          status: string;
          maritime_status?: string | null;
          reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          asana_task_id?: string;
          raw_data?: Json;
          processed_data?: Json;
          status?: string;
          maritime_status?: string | null;
          reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action_name: string;
          resource_name: string;
          resource_id: string | null;
          action_details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action_name: string;
          resource_name: string;
          resource_id?: string | null;
          action_details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action_name?: string;
          resource_name?: string;
          resource_id?: string | null;
          action_details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      log_user_action: {
        Args: {
          action_name: string;
          resource_name: string;
          resource_id?: string;
          action_details?: Json;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}