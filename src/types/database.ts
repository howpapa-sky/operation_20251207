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
