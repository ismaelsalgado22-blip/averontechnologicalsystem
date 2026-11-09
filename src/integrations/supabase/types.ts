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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          detail: string | null
          entity: string
          entity_id: string | null
          id: string
          owner_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          detail?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          owner_id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          detail?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          owner_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          address: string | null
          client_id: string
          created_at: string
          duration_minutes: number
          equipment_id: string | null
          id: string
          notes: string | null
          owner_id: string
          repaired_problem: string | null
          reported_problem: string | null
          scheduled_at: string
          status: string
          technician_name: string | null
          title: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          repaired_problem?: string | null
          reported_problem?: string | null
          scheduled_at?: string
          status?: string
          technician_name?: string | null
          title: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          repaired_problem?: string | null
          reported_problem?: string | null
          scheduled_at?: string
          status?: string
          technician_name?: string | null
          title?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string
          description: string
          id: string
          kind: string
          owner_id: string
          product_id: string | null
          quantity: number
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          description: string
          id?: string
          kind?: string
          owner_id?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          owner_id?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deadline: string | null
          discount: number
          equipment_id: string | null
          id: string
          issue_date: string
          items_total: number
          labor_total: number
          notes: string | null
          number: string | null
          owner_id: string
          payment_conditions: string | null
          problem_description: string | null
          status: Database["public"]["Enums"]["budget_status"]
          total: number
          travel_fee: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          discount?: number
          equipment_id?: string | null
          id?: string
          issue_date?: string
          items_total?: number
          labor_total?: number
          notes?: string | null
          number?: string | null
          owner_id?: string
          payment_conditions?: string | null
          problem_description?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          total?: number
          travel_fee?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          discount?: number
          equipment_id?: string | null
          id?: string
          issue_date?: string
          items_total?: number
          labor_total?: number
          notes?: string | null
          number?: string | null
          owner_id?: string
          payment_conditions?: string | null
          problem_description?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          total?: number
          travel_fee?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          complement: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          district: string | null
          document: string | null
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          notes: string | null
          number: string | null
          owner_id: string
          phone: string | null
          state: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name: string
          notes?: string | null
          number?: string | null
          owner_id?: string
          phone?: string | null
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name?: string
          notes?: string | null
          number?: string | null
          owner_id?: string
          phone?: string | null
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          bank_details: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          default_notes: string | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payment_conditions: string | null
          phone: string | null
          state: string | null
          tagline: string
          updated_at: string
          warranty_terms: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          default_notes?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_conditions?: string | null
          phone?: string | null
          state?: string | null
          tagline?: string
          updated_at?: string
          warranty_terms?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          default_notes?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_conditions?: string | null
          phone?: string | null
          state?: string | null
          tagline?: string
          updated_at?: string
          warranty_terms?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      doc_counters: {
        Row: {
          last_value: number
          owner_id: string
          prefix: string
          year: number
        }
        Insert: {
          last_value?: number
          owner_id: string
          prefix: string
          year: number
        }
        Update: {
          last_value?: number
          owner_id?: string
          prefix?: string
          year?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string
          created_at: string
          equipment_id: string | null
          id: string
          kind: string
          owner_id: string
          reference_id: string | null
          title: string
          url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          kind: string
          owner_id?: string
          reference_id?: string | null
          title: string
          url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          kind?: string
          owner_id?: string
          reference_id?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_tag: string | null
          brand: string | null
          capacity: string | null
          client_id: string
          compressor: string | null
          condition: string | null
          created_at: string
          id: string
          install_date: string | null
          install_location: string | null
          model: string | null
          notes: string | null
          owner_id: string
          photos: string[]
          refrigerant: string | null
          refrigerant_amount: string | null
          serial_number: string | null
          type: string
          updated_at: string
          voltage: string | null
        }
        Insert: {
          asset_tag?: string | null
          brand?: string | null
          capacity?: string | null
          client_id: string
          compressor?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          install_date?: string | null
          install_location?: string | null
          model?: string | null
          notes?: string | null
          owner_id?: string
          photos?: string[]
          refrigerant?: string | null
          refrigerant_amount?: string | null
          serial_number?: string | null
          type: string
          updated_at?: string
          voltage?: string | null
        }
        Update: {
          asset_tag?: string | null
          brand?: string | null
          capacity?: string | null
          client_id?: string
          compressor?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          install_date?: string | null
          install_location?: string | null
          model?: string | null
          notes?: string | null
          owner_id?: string
          photos?: string[]
          refrigerant?: string | null
          refrigerant_amount?: string | null
          serial_number?: string | null
          type?: string
          updated_at?: string
          voltage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_appointments: {
        Row: {
          address: string | null
          cep: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          owner_id: string
          repaired_problem: string | null
          reported_problem: string | null
          scheduled_at: string
          status: string
          technician_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id?: string
          repaired_problem?: string | null
          reported_problem?: string | null
          scheduled_at?: string
          status?: string
          technician_name?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id?: string
          repaired_problem?: string | null
          reported_problem?: string | null
          scheduled_at?: string
          status?: string
          technician_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          owner_id: string
          product_id: string
          quantity: number
          reason: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          owner_id?: string
          product_id: string
          quantity: number
          reason?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          owner_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          entity_id: string | null
          event: string
          id: string
          module: string
          owner_id: string
          priority: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          dedupe_key: string
          entity_id?: string | null
          event: string
          id?: string
          module: string
          owner_id?: string
          priority?: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          entity_id?: string | null
          event?: string
          id?: string
          module?: string
          owner_id?: string
          priority?: string
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          budget_id: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          installments: number
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          owner_id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          amount?: number
          budget_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installments?: number
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installments?: number
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string | null
          cost: number
          created_at: string
          id: string
          min_stock: number
          name: string
          owner_id: string
          price: number
          stock: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          owner_id?: string
          price?: number
          stock?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          owner_id?: string
          price?: number
          stock?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_technician: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_technician?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_technician?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          estimated_time: string | null
          id: string
          labor_price: number
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          id?: string
          labor_price?: number
          name: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          id?: string
          labor_price?: number
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active_until: string | null
          created_at: string
          email: string | null
          full_name: string | null
          notes: string | null
          price: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_until?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          notes?: string | null
          price?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_until?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          notes?: string | null
          price?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_reports: {
        Row: {
          client_id: string
          compressor: string | null
          condenser: string | null
          controller: string | null
          created_at: string
          created_by: string | null
          current_reading: string | null
          defrost_system: string | null
          diagnosis: string | null
          drain: string | null
          electrical_system: string | null
          equipment_id: string | null
          evaporator: string | null
          fans: string | null
          general_condition: string | null
          id: string
          inspection_date: string
          insulation: string | null
          location: string | null
          number: string | null
          owner_id: string
          photos: string[]
          piping: string | null
          pressures: string | null
          probable_cause: string | null
          recommendation: string | null
          recommended_service: string | null
          refrigerant_leak: string | null
          refrigerant_state: string | null
          sensors: string | null
          technician_name: string | null
          temperatures: string | null
          thermostat: string | null
          updated_at: string
          voltage: string | null
          work_order_id: string | null
        }
        Insert: {
          client_id: string
          compressor?: string | null
          condenser?: string | null
          controller?: string | null
          created_at?: string
          created_by?: string | null
          current_reading?: string | null
          defrost_system?: string | null
          diagnosis?: string | null
          drain?: string | null
          electrical_system?: string | null
          equipment_id?: string | null
          evaporator?: string | null
          fans?: string | null
          general_condition?: string | null
          id?: string
          inspection_date?: string
          insulation?: string | null
          location?: string | null
          number?: string | null
          owner_id?: string
          photos?: string[]
          piping?: string | null
          pressures?: string | null
          probable_cause?: string | null
          recommendation?: string | null
          recommended_service?: string | null
          refrigerant_leak?: string | null
          refrigerant_state?: string | null
          sensors?: string | null
          technician_name?: string | null
          temperatures?: string | null
          thermostat?: string | null
          updated_at?: string
          voltage?: string | null
          work_order_id?: string | null
        }
        Update: {
          client_id?: string
          compressor?: string | null
          condenser?: string | null
          controller?: string | null
          created_at?: string
          created_by?: string | null
          current_reading?: string | null
          defrost_system?: string | null
          diagnosis?: string | null
          drain?: string | null
          electrical_system?: string | null
          equipment_id?: string | null
          evaporator?: string | null
          fans?: string | null
          general_condition?: string | null
          id?: string
          inspection_date?: string
          insulation?: string | null
          location?: string | null
          number?: string | null
          owner_id?: string
          photos?: string[]
          piping?: string | null
          pressures?: string | null
          probable_cause?: string | null
          recommendation?: string | null
          recommended_service?: string | null
          refrigerant_leak?: string | null
          refrigerant_state?: string | null
          sensors?: string | null
          technician_name?: string | null
          temperatures?: string | null
          thermostat?: string | null
          updated_at?: string
          voltage?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_reports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_reports_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
      warranties: {
        Row: {
          client_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          days: number
          end_date: string | null
          equipment_id: string | null
          exclusions: string | null
          id: string
          notes: string | null
          number: string | null
          owner_id: string
          parts_used: string | null
          service_date: string
          service_performed: string | null
          start_date: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          client_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          days?: number
          end_date?: string | null
          equipment_id?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          owner_id?: string
          parts_used?: string | null
          service_date?: string
          service_performed?: string | null
          start_date?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          client_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          days?: number
          end_date?: string | null
          equipment_id?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          owner_id?: string
          parts_used?: string | null
          service_date?: string
          service_performed?: string | null
          start_date?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: string
          owner_id: string
          product_id: string | null
          quantity: number
          total: number
          unit_price: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          kind?: string
          owner_id?: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          owner_id?: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          budget_id: string | null
          client_id: string
          compressor_current: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          equipment_id: string | null
          executed_service: string | null
          id: string
          notes: string | null
          number: string | null
          other_tests: string | null
          owner_id: string
          photos_after: string[]
          photos_before: string[]
          photos_during: string[]
          pressures: string | null
          refrigerant: string | null
          refrigerant_amount: string | null
          reported_problem: string | null
          service_date: string
          service_time: string | null
          service_type: string | null
          signature: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["wo_status"]
          technician_id: string | null
          technician_name: string | null
          temperatures: string | null
          tests: string | null
          total: number
          updated_at: string
        }
        Insert: {
          budget_id?: string | null
          client_id: string
          compressor_current?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          equipment_id?: string | null
          executed_service?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          other_tests?: string | null
          owner_id?: string
          photos_after?: string[]
          photos_before?: string[]
          photos_during?: string[]
          pressures?: string | null
          refrigerant?: string | null
          refrigerant_amount?: string | null
          reported_problem?: string | null
          service_date?: string
          service_time?: string | null
          service_type?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          technician_id?: string | null
          technician_name?: string | null
          temperatures?: string | null
          tests?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string | null
          client_id?: string
          compressor_current?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          equipment_id?: string | null
          executed_service?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          other_tests?: string | null
          owner_id?: string
          photos_after?: string[]
          photos_before?: string[]
          photos_during?: string[]
          pressures?: string | null
          refrigerant?: string | null
          refrigerant_amount?: string | null
          reported_problem?: string | null
          service_date?: string
          service_time?: string | null
          service_type?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          technician_id?: string | null
          technician_name?: string | null
          temperatures?: string | null
          tests?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory: {
        Args: {
          kind: string
          product: string
          quantity: number
          reason?: string
        }
        Returns: undefined
      }
      convert_budget: { Args: { budget: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_doc_number: { Args: { p_prefix: string }; Returns: string }
      refresh_due_notifications: { Args: never; Returns: undefined }
      save_budget: { Args: { items: Json; payload: Json }; Returns: string }
      save_work_order: {
        Args: { items: Json; order_id: string; payload: Json }
        Returns: string
      }
      subscription_is_active: { Args: never; Returns: boolean }
      validate_warranty: {
        Args: { certificate_number: string }
        Returns: {
          conditions: string
          days: number
          end_date: string
          exclusions: string
          number: string
          service_date: string
          service_performed: string
          start_date: string
        }[]
      }
    }
    Enums: {
      app_role: "administrador" | "tecnico" | "administrativo"
      budget_status:
        | "rascunho"
        | "enviado"
        | "aguardando_aprovacao"
        | "aprovado"
        | "recusado"
        | "expirado"
        | "cancelado"
      client_kind: "pf" | "pj"
      payment_method:
        | "pix"
        | "dinheiro"
        | "cartao"
        | "transferencia"
        | "boleto"
        | "parcelado"
      payment_status: "pendente" | "pago" | "vencido" | "cancelado"
      wo_status:
        | "aberta"
        | "agendada"
        | "em_execucao"
        | "aguardando_peca"
        | "aguardando_aprovacao"
        | "concluida"
        | "cancelada"
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
  public: {
    Enums: {
      app_role: ["administrador", "tecnico", "administrativo"],
      budget_status: [
        "rascunho",
        "enviado",
        "aguardando_aprovacao",
        "aprovado",
        "recusado",
        "expirado",
        "cancelado",
      ],
      client_kind: ["pf", "pj"],
      payment_method: [
        "pix",
        "dinheiro",
        "cartao",
        "transferencia",
        "boleto",
        "parcelado",
      ],
      payment_status: ["pendente", "pago", "vencido", "cancelado"],
      wo_status: [
        "aberta",
        "agendada",
        "em_execucao",
        "aguardando_peca",
        "aguardando_aprovacao",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
