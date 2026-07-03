export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin" | "developer";
export type ReservationStatus = "confirmed" | "cancelled" | "completed";
export type InquirySenderType = "user" | "admin";

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
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: UserRole;
          tenant_id?: string | null;
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
          tenant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          sort_order?: number;
          tenant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          sort_order?: number;
          tenant_id?: string | null;
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
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          category_id?: number | null;
          name: string;
          max_capacity?: number;
          tenant_id?: string | null;
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
          tenant_id?: string | null;
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
          tenant_id: string | null;
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
          tenant_id?: string | null;
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
          tenant_id?: string | null;
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
      facility_prices: {
        Row: {
          id: number;
          facility_id: number;
          price_per_unit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          facility_id: number;
          price_per_unit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          facility_id?: number;
          price_per_unit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_prices_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_prices: {
        Row: {
          id: number;
          reservation_id: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          reservation_id: number;
          subtotal?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          reservation_id?: number;
          subtotal?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_prices_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          id: number;
          name: string;
          total_quantity: number;
          rental_price: number | null;
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          total_quantity?: number;
          tenant_id?: string | null;
          rental_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          total_quantity?: number;
          tenant_id?: string | null;
          rental_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservation_items: {
        Row: {
          id: number;
          reservation_id: number;
          item_id: number;
          quantity: number;
          rental_price: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          reservation_id: number;
          item_id: number;
          quantity?: number;
          rental_price?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          reservation_id?: number;
          item_id?: number;
          quantity?: number;
          rental_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_items_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          id: number;
          user_id: string;
          subject: string;
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          subject: string;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          subject?: string;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiry_messages: {
        Row: {
          id: number;
          inquiry_id: number;
          sender_id: string;
          sender_type: InquirySenderType;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          inquiry_id: number;
          sender_id: string;
          sender_type: InquirySenderType;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          inquiry_id?: number;
          sender_id?: string;
          sender_type?: InquirySenderType;
          message?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiry_messages_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inquiry_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subdomain: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string;
          is_active?: boolean;
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
export type FacilityPrice = Database["public"]["Tables"]["facility_prices"]["Row"];
export type ReservationPrice = Database["public"]["Tables"]["reservation_prices"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ReservationItem = Database["public"]["Tables"]["reservation_items"]["Row"];
export type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
export type InquiryMessage = Database["public"]["Tables"]["inquiry_messages"]["Row"];
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

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

export type InquiryWithProfile = Inquiry & {
  profiles: Pick<Profile, "display_name" | "email"> | null;
};

export type InquiryMessageWithSender = InquiryMessage & {
  profiles: Pick<Profile, "display_name"> | null;
};
