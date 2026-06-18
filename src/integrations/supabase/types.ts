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
      ad_campaigns: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          amount_cents: number
          canceled_at: string | null
          created_at: string
          currency: string
          ends_at: string
          id: string
          is_manual: boolean
          metadata: Json
          owner_id: string
          paid_at: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          priority: number
          product_id: string
          seller_id: string
          starts_at: string
          status: Database["public"]["Enums"]["ad_campaign_status"]
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          amount_cents: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          ends_at: string
          id?: string
          is_manual?: boolean
          metadata?: Json
          owner_id: string
          paid_at?: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          product_id: string
          seller_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          ends_at?: string
          id?: string
          is_manual?: boolean
          metadata?: Json
          owner_id?: string
          paid_at?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          product_id?: string
          seller_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_metrics: {
        Row: {
          campaign_id: string
          clicks: number
          conversions: number
          created_at: string
          date: string
          id: string
          impressions: number
          revenue_cents: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          conversions?: number
          created_at?: string
          date: string
          id?: string
          impressions?: number
          revenue_cents?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          revenue_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_pricing: {
        Row: {
          created_at: string
          currency: string
          id: string
          placement: Database["public"]["Enums"]["ad_placement"]
          price_per_day_cents: number
          price_per_hour_cents: number
          price_per_week_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          placement: Database["public"]["Enums"]["ad_placement"]
          price_per_day_cents: number
          price_per_hour_cents: number
          price_per_week_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          placement?: Database["public"]["Enums"]["ad_placement"]
          price_per_day_cents?: number
          price_per_hour_cents?: number
          price_per_week_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          district: string | null
          id: string
          is_default: boolean
          label: string | null
          number: string | null
          phone: string | null
          recipient: string
          state: string
          street: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          number?: string | null
          phone?: string | null
          recipient: string
          state: string
          street: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          number?: string | null
          phone?: string | null
          recipient?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      conversations: {
        Row: {
          buyer_id: string
          buyer_unread: number
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          product_id: string | null
          seller_id: string
          seller_unread: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          seller_id: string
          seller_unread?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          seller_id?: string
          seller_unread?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          {
            foreignKeyName: "coupons_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      melhor_envio_config: {
        Row: {
          access_token: string | null
          callback_url: string | null
          client_id: string | null
          client_secret: string | null
          environment: string
          id: boolean
          last_sync_at: string | null
          oauth_scopes: string | null
          oauth_state: string | null
          oauth_state_expires_at: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          updated_by: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          callback_url?: string | null
          client_id?: string | null
          client_secret?: string | null
          environment?: string
          id?: boolean
          last_sync_at?: string | null
          oauth_scopes?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          callback_url?: string | null
          client_id?: string | null
          client_secret?: string | null
          environment?: string
          id?: boolean
          last_sync_at?: string | null
          oauth_scopes?: string | null
          oauth_state?: string | null
          oauth_state_expires_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          package_weight_grams: number | null
          payment_method: string | null
          payment_status: string
          platform_fee_cents: number
          seller_id: string | null
          seller_notes: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_company: string | null
          shipping_delivery_days: number | null
          shipping_label_url: string | null
          shipping_method: string | null
          shipping_service_id: string | null
          shipping_service_name: string | null
          shipping_to_zip: string | null
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
          package_weight_grams?: number | null
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents?: number
          seller_id?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_company?: string | null
          shipping_delivery_days?: number | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_service_id?: string | null
          shipping_service_name?: string | null
          shipping_to_zip?: string | null
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
          package_weight_grams?: number | null
          payment_method?: string | null
          payment_status?: string
          platform_fee_cents?: number
          seller_id?: string | null
          seller_notes?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_company?: string | null
          shipping_delivery_days?: number | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_service_id?: string | null
          shipping_service_name?: string | null
          shipping_to_zip?: string | null
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
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_percent: number
          id: boolean
          logo_url: string | null
          platform_name: string
          seo_description: string | null
          seo_title: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          commission_percent?: number
          id?: boolean
          logo_url?: string | null
          platform_name?: string
          seo_description?: string | null
          seo_title?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          id?: boolean
          logo_url?: string | null
          platform_name?: string
          seo_description?: string | null
          seo_title?: string | null
          support_email?: string | null
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
          {
            foreignKeyName: "product_variants_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          flash_sale_enabled: boolean
          flash_sale_end: string | null
          flash_sale_price: number | null
          flash_sale_start: string | null
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
          flash_sale_enabled?: boolean
          flash_sale_end?: string | null
          flash_sale_price?: number | null
          flash_sale_start?: string | null
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
          flash_sale_enabled?: boolean
          flash_sale_end?: string | null
          flash_sale_price?: number | null
          flash_sale_start?: string | null
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
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          type: Database["public"]["Enums"]["promotion_type"]
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
          type?: Database["public"]["Enums"]["promotion_type"]
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
          type?: Database["public"]["Enums"]["promotion_type"]
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
          {
            foreignKeyName: "promotions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          banner_url: string | null
          category: string | null
          created_at: string
          description: string | null
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          origin_address: string | null
          origin_city: string | null
          origin_complement: string | null
          origin_district: string | null
          origin_number: string | null
          origin_state: string | null
          origin_zip: string | null
          owner_id: string
          phone: string | null
          pix_key: string | null
          rating: number | null
          return_policy: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          shipping_policy: string | null
          slug: string
          status: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_onboarding_status: string
          stripe_payouts_enabled: boolean
          terms: string | null
          updated_at: string
          vacation_mode: boolean
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          origin_address?: string | null
          origin_city?: string | null
          origin_complement?: string | null
          origin_district?: string | null
          origin_number?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          owner_id: string
          phone?: string | null
          pix_key?: string | null
          rating?: number | null
          return_policy?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          slug: string
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarding_status?: string
          stripe_payouts_enabled?: boolean
          terms?: string | null
          updated_at?: string
          vacation_mode?: boolean
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          origin_address?: string | null
          origin_city?: string | null
          origin_complement?: string | null
          origin_district?: string | null
          origin_number?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          owner_id?: string
          phone?: string | null
          pix_key?: string | null
          rating?: number | null
          return_policy?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          slug?: string
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarding_status?: string
          stripe_payouts_enabled?: boolean
          terms?: string | null
          updated_at?: string
          vacation_mode?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      shipping_diagnostics: {
        Row: {
          id: boolean
          last_env: string | null
          last_error_at: string | null
          last_error_body: string | null
          last_error_endpoint: string | null
          last_error_status: number | null
          last_request_context: Json | null
          last_request_headers: Json | null
          last_request_method: string | null
          last_request_payload: Json | null
          last_response_body: string | null
          last_success_at: string | null
          reauth_reason: string | null
          reauth_required: boolean
          reauth_url: string | null
          requested_scopes: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          last_env?: string | null
          last_error_at?: string | null
          last_error_body?: string | null
          last_error_endpoint?: string | null
          last_error_status?: number | null
          last_request_context?: Json | null
          last_request_headers?: Json | null
          last_request_method?: string | null
          last_request_payload?: Json | null
          last_response_body?: string | null
          last_success_at?: string | null
          reauth_reason?: string | null
          reauth_required?: boolean
          reauth_url?: string | null
          requested_scopes?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          last_env?: string | null
          last_error_at?: string | null
          last_error_body?: string | null
          last_error_endpoint?: string | null
          last_error_status?: number | null
          last_request_context?: Json | null
          last_request_headers?: Json | null
          last_request_method?: string | null
          last_request_payload?: Json | null
          last_response_body?: string | null
          last_success_at?: string | null
          reauth_reason?: string | null
          reauth_required?: boolean
          reauth_url?: string | null
          requested_scopes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_quotes_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
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
            foreignKeyName: "stock_movements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
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
      support_agents: {
        Row: {
          active: boolean
          created_at: string
          department: Database["public"]["Enums"]["support_department"]
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["support_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["support_department"]
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["support_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["support_department"]
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["support_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          agent_unread: number
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          department: Database["public"]["Enums"]["support_department"]
          id: string
          last_message_at: string
          last_message_preview: string | null
          opened_by: string
          seller_id: string | null
          seller_unread: number
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          agent_unread?: number
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          department?: Database["public"]["Enums"]["support_department"]
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          opened_by: string
          seller_id?: string | null
          seller_unread?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          agent_unread?: number
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          department?: Database["public"]["Enums"]["support_department"]
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          opened_by?: string
          seller_id?: string | null
          seller_unread?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers_public"
            referencedColumns: ["id"]
          },
        ]
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
      sellers_public: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          rating: number | null
          return_policy: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          shipping_policy: string | null
          slug: string | null
          status: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_status: string | null
          stripe_payouts_enabled: boolean | null
          terms: string | null
          updated_at: string | null
          vacation_mode: boolean | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          rating?: number | null
          return_policy?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          slug?: string | null
          status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_status?: string | null
          stripe_payouts_enabled?: boolean | null
          terms?: string | null
          updated_at?: string | null
          vacation_mode?: boolean | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          rating?: number | null
          return_policy?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_policy?: string | null
          slug?: string | null
          status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_status?: string | null
          stripe_payouts_enabled?: boolean | null
          terms?: string | null
          updated_at?: string | null
          vacation_mode?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_seller: {
        Args: never
        Returns: {
          banner_url: string | null
          category: string | null
          created_at: string
          description: string | null
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          origin_address: string | null
          origin_city: string | null
          origin_complement: string | null
          origin_district: string | null
          origin_number: string | null
          origin_state: string | null
          origin_zip: string | null
          owner_id: string
          phone: string | null
          pix_key: string | null
          rating: number | null
          return_policy: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          shipping_policy: string | null
          slug: string
          status: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_onboarding_status: string
          stripe_payouts_enabled: boolean
          terms: string | null
          updated_at: string
          vacation_mode: boolean
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sellers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_seller_for_owner: {
        Args: { _seller_id: string }
        Returns: {
          banner_url: string | null
          category: string | null
          created_at: string
          description: string | null
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          origin_address: string | null
          origin_city: string | null
          origin_complement: string | null
          origin_district: string | null
          origin_number: string | null
          origin_state: string | null
          origin_zip: string | null
          owner_id: string
          phone: string | null
          pix_key: string | null
          rating: number | null
          return_policy: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          shipping_policy: string | null
          slug: string
          status: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_onboarding_status: string
          stripe_payouts_enabled: boolean
          terms: string | null
          updated_at: string
          vacation_mode: boolean
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sellers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_metric: {
        Args: {
          _campaign_id: string
          _clicks?: number
          _date: string
          _impressions?: number
        }
        Returns: undefined
      }
      is_conversation_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_support_agent: { Args: { _uid: string }; Returns: boolean }
      support_agent_role: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["support_role"]
      }
      support_can_view_ticket: {
        Args: {
          _ticket_dept: Database["public"]["Enums"]["support_department"]
          _uid: string
        }
        Returns: boolean
      }
      user_is_order_buyer: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_order_item: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ad_campaign_status:
        | "pending_payment"
        | "scheduled"
        | "active"
        | "ended"
        | "canceled"
        | "refunded"
        | "rejected"
      ad_placement:
        | "card"
        | "carousel"
        | "banner_principal"
        | "destaque_home"
        | "patrocinado"
        | "vitrine_topo"
        | "categoria"
        | "busca"
        | "premium"
      app_role: "admin" | "seller" | "user" | "customer"
      notification_type:
        | "new_order"
        | "payment_paid"
        | "payment_failed"
        | "order_shipped"
        | "order_delivered"
        | "new_review"
        | "low_stock"
        | "payout_paid"
        | "generic"
      product_condition: "new" | "refurbished" | "used"
      promotion_type: "flash" | "exclusive"
      support_department:
        | "financial"
        | "commercial"
        | "logistics"
        | "technical"
        | "general"
      support_role: "agent" | "supervisor" | "manager"
      ticket_category:
        | "financial"
        | "products"
        | "orders"
        | "shipping"
        | "technical"
        | "other"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_seller"
        | "resolved"
        | "closed"
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
      ad_campaign_status: [
        "pending_payment",
        "scheduled",
        "active",
        "ended",
        "canceled",
        "refunded",
        "rejected",
      ],
      ad_placement: [
        "card",
        "carousel",
        "banner_principal",
        "destaque_home",
        "patrocinado",
        "vitrine_topo",
        "categoria",
        "busca",
        "premium",
      ],
      app_role: ["admin", "seller", "user", "customer"],
      notification_type: [
        "new_order",
        "payment_paid",
        "payment_failed",
        "order_shipped",
        "order_delivered",
        "new_review",
        "low_stock",
        "payout_paid",
        "generic",
      ],
      product_condition: ["new", "refurbished", "used"],
      promotion_type: ["flash", "exclusive"],
      support_department: [
        "financial",
        "commercial",
        "logistics",
        "technical",
        "general",
      ],
      support_role: ["agent", "supervisor", "manager"],
      ticket_category: [
        "financial",
        "products",
        "orders",
        "shipping",
        "technical",
        "other",
      ],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_seller",
        "resolved",
        "closed",
      ],
    },
  },
} as const
