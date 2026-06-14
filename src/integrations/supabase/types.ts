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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_purchase_cents: number
          seller_id: string
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_purchase_cents?: number
          seller_id: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_purchase_cents?: number
          seller_id?: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          gross_cents: number
          id: string
          order_id: string
          platform_fee_cents: number
          product_id: string | null
          qty: number
          seller_id: string | null
          seller_net_cents: number
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          title: string
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          gross_cents?: number
          id?: string
          order_id: string
          platform_fee_cents?: number
          product_id?: string | null
          qty: number
          seller_id?: string | null
          seller_net_cents?: number
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          title: string
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          gross_cents?: number
          id?: string
          order_id?: string
          platform_fee_cents?: number
          product_id?: string | null
          qty?: number
          seller_id?: string | null
          seller_net_cents?: number
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          title?: string
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          carrier: string | null
          created_at: string
          delivered_at: string | null
          fulfillment_status: string
          gross_cents: number
          id: string
          payment_method: string | null
          payment_status: string
          platform_fee_cents: number
          seller_id: string | null
          seller_notes: string | null
          shipped_at: string | null
          shipping_address: Json | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: string
          gross_cents?: number
          id?: string
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents?: number
          seller_id?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: string
          gross_cents?: number
          id?: string
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents?: number
          seller_id?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          created_at: string
          currency: string
          id: string
          seller_id: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          seller_id: string
          status?: string
          stripe_account_id: string
          stripe_payout_id: string
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          seller_id?: string
          status?: string
          stripe_account_id?: string
          stripe_payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_percent: number
          id: boolean
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          position: number
          product_id: string
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          product_id: string
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          option1_name: string | null
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          position: number
          price: number | null
          product_id: string
          seller_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          position?: number
          price?: number | null
          product_id: string
          seller_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          position?: number
          price?: number | null
          product_id?: string
          seller_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          carrier: string | null
          category_id: string | null
          category_slug: string
          color: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          created_at: string
          description: string | null
          free_shipping: boolean | null
          has_variants: boolean
          height_cm: number | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          length_cm: number | null
          material: string | null
          min_stock: number
          model: string | null
          origin_zip: string | null
          original_price: number | null
          own_delivery: boolean
          price: number
          rating: number | null
          reviews_count: number | null
          sales_count: number
          seller_id: string | null
          sku: string | null
          stock: number | null
          title: string
          updated_at: string
          views: number
          warranty: string | null
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          carrier?: string | null
          category_id?: string | null
          category_slug: string
          color?: string | null
          condition?: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          description?: string | null
          free_shipping?: boolean | null
          has_variants?: boolean
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          length_cm?: number | null
          material?: string | null
          min_stock?: number
          model?: string | null
          origin_zip?: string | null
          original_price?: number | null
          own_delivery?: boolean
          price: number
          rating?: number | null
          reviews_count?: number | null
          sales_count?: number
          seller_id?: string | null
          sku?: string | null
          stock?: number | null
          title: string
          updated_at?: string
          views?: number
          warranty?: string | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          carrier?: string | null
          category_id?: string | null
          category_slug?: string
          color?: string | null
          condition?: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          description?: string | null
          free_shipping?: boolean | null
          has_variants?: boolean
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          length_cm?: number | null
          material?: string | null
          min_stock?: number
          model?: string | null
          origin_zip?: string | null
          original_price?: number | null
          own_delivery?: boolean
          price?: number
          rating?: number | null
          reviews_count?: number | null
          sales_count?: number
          seller_id?: string | null
          sku?: string | null
          stock?: number | null
          title?: string
          updated_at?: string
          views?: number
          warranty?: string | null
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          discount_percent: number
          ends_at: string
          id: string
          name: string
          product_id: string
          seller_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_percent: number
          ends_at: string
          id?: string
          name: string
          product_id: string
          seller_id: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          ends_at?: string
          id?: string
          name?: string
          product_id?: string
          seller_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          seller_id: string
          seller_replied_at: string | null
          seller_reply: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          seller_id: string
          seller_replied_at?: string | null
          seller_reply?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          seller_id?: string
          seller_replied_at?: string | null
          seller_reply?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          rating: number | null
          slug: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_onboarding_status: string
          stripe_payouts_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          rating?: number | null
          slug: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarding_status?: string
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          rating?: number | null
          slug?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarding_status?: string
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          product_id: string
          quantity: number
          reason: string | null
          seller_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          product_id: string
          quantity: number
          reason?: string | null
          seller_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          seller_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_id: string
          payload: Json
          processed_at: string
          type: string
        }
        Insert: {
          event_id: string
          payload: Json
          processed_at?: string
          type: string
        }
        Update: {
          event_id?: string
          payload?: Json
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "user"
      product_condition: "new" | "refurbished" | "used"
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
      app_role: ["admin", "seller", "user"],
      product_condition: ["new", "refurbished", "used"],
    },
  },
} as const
