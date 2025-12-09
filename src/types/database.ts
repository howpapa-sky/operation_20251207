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
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: string;
          status: string;
          priority: string;
          start_date: string;
          target_date: string;
          completed_date: string | null;
          assignee: string | null;
          notes: string | null;
          data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type: string;
          status?: string;
          priority?: string;
          start_date: string;
          target_date: string;
          completed_date?: string | null;
          assignee?: string | null;
          notes?: string | null;
          data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          type?: string;
          status?: string;
          priority?: string;
          start_date?: string;
          target_date?: string;
          completed_date?: string | null;
          assignee?: string | null;
          notes?: string | null;
          data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evaluation_criteria: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          category: string;
          max_score: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          category: string;
          max_score?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          max_score?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string;
          category: string;
          sku: string;
          cost_price: number;
          selling_price: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand: string;
          category: string;
          sku: string;
          cost_price?: number;
          selling_price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string;
          category?: string;
          sku?: string;
          cost_price?: number;
          selling_price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sales_records: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          channel: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          cost_price: number;
          total_revenue: number;
          total_cost: number;
          profit: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          channel: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          unit_price?: number;
          cost_price?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          channel?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          cost_price?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      api_credentials: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          is_active: boolean;
          last_sync_at: string | null;
          sync_status: string;
          sync_error: string | null;
          cafe24_mall_id: string | null;
          cafe24_client_id: string | null;
          cafe24_client_secret: string | null;
          cafe24_access_token: string | null;
          cafe24_refresh_token: string | null;
          cafe24_token_expires_at: string | null;
          naver_client_id: string | null;
          naver_client_secret: string | null;
          naver_access_token: string | null;
          naver_refresh_token: string | null;
          naver_token_expires_at: string | null;
          coupang_vendor_id: string | null;
          coupang_access_key: string | null;
          coupang_secret_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          sync_status?: string;
          sync_error?: string | null;
          cafe24_mall_id?: string | null;
          cafe24_client_id?: string | null;
          cafe24_client_secret?: string | null;
          cafe24_access_token?: string | null;
          cafe24_refresh_token?: string | null;
          cafe24_token_expires_at?: string | null;
          naver_client_id?: string | null;
          naver_client_secret?: string | null;
          naver_access_token?: string | null;
          naver_refresh_token?: string | null;
          naver_token_expires_at?: string | null;
          coupang_vendor_id?: string | null;
          coupang_access_key?: string | null;
          coupang_secret_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          sync_status?: string;
          sync_error?: string | null;
          cafe24_mall_id?: string | null;
          cafe24_client_id?: string | null;
          cafe24_client_secret?: string | null;
          cafe24_access_token?: string | null;
          cafe24_refresh_token?: string | null;
          cafe24_token_expires_at?: string | null;
          naver_client_id?: string | null;
          naver_client_secret?: string | null;
          naver_access_token?: string | null;
          naver_refresh_token?: string | null;
          naver_token_expires_at?: string | null;
          coupang_vendor_id?: string | null;
          coupang_access_key?: string | null;
          coupang_secret_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_sync_logs: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          sync_type: string;
          status: string;
          records_fetched: number;
          records_created: number;
          records_updated: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          sync_type: string;
          status: string;
          records_fetched?: number;
          records_created?: number;
          records_updated?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: string;
          sync_type?: string;
          status?: string;
          records_fetched?: number;
          records_created?: number;
          records_updated?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      project_type_settings: {
        Row: {
          id: string;
          user_id: string;
          project_type: string;
          is_visible: boolean;
          display_order: number;
          custom_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_type: string;
          is_visible?: boolean;
          display_order?: number;
          custom_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_type?: string;
          is_visible?: boolean;
          display_order?: number;
          custom_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_settings: {
        Row: {
          id: string;
          user_id: string;
          dday_email_enabled: boolean;
          dday_days_before: number[];
          dday_overdue_enabled: boolean;
          status_change_enabled: boolean;
          weekly_summary_enabled: boolean;
          notification_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dday_email_enabled?: boolean;
          dday_days_before?: number[];
          dday_overdue_enabled?: boolean;
          status_change_enabled?: boolean;
          weekly_summary_enabled?: boolean;
          notification_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dday_email_enabled?: boolean;
          dday_days_before?: number[];
          dday_overdue_enabled?: boolean;
          status_change_enabled?: boolean;
          weekly_summary_enabled?: boolean;
          notification_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_default_criteria: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
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
