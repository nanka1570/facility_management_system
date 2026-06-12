export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin" | "developer";
export type ReservationStatus = "confirmed" | "cancelled" | "completed";

// supabase gen types と同形の手書き型定義（DB設計書 v1.0 準拠）
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      facilities: {
        Row: {
          id: number;
          category_id: number | null;
          name: string;
          max_capacity: number;
          equipment: string | null;
          time_unit: number;
          allow_extension: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          category_id?: number | null;
          name: string;
          max_capacity?: number;
          equipment?: string | null;
          time_unit?: number;
          allow_extension?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          category_id?: number | null;
          name?: string;
          max_capacity?: number;
          equipment?: string | null;
          time_unit?: number;
          allow_extension?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facilities_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: number;
          user_id: string;
          facility_id: number;
          start_time: string;
          end_time: string;
          num_people: number;
          purpose: string | null;
          status: ReservationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          facility_id: number;
          start_time: string;
          end_time: string;
          num_people?: number;
          purpose?: string | null;
          status?: ReservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          facility_id?: number;
          start_time?: string;
          end_time?: string;
          num_people?: number;
          purpose?: string | null;
          status?: ReservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      module_settings: {
        Row: {
          id: number;
          module_id: string;
          is_enabled: boolean;
          config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          module_id: string;
          is_enabled?: boolean;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          module_id?: string;
          is_enabled?: boolean;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Facility = Database["public"]["Tables"]["facilities"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type ModuleSetting = Database["public"]["Tables"]["module_settings"]["Row"];

// 結合取得用（select("*, facilities(name)") 等に対応）
export type FacilityWithCategory = Facility & {
  categories: Pick<Category, "name"> | null;
};

export type ReservationWithFacility = Reservation & {
  facilities: Pick<Facility, "name"> | null;
};

export type ReservationWithDetails = Reservation & {
  facilities: Pick<Facility, "name"> | null;
  profiles: Pick<Profile, "display_name"> | null;
};
