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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      asset_maintenance_logs: {
        Row: {
          action_type: string
          asset_id: string
          cost: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          log_date: string
          performed_by: string | null
          resulting_condition: Database["public"]["Enums"]["asset_condition"]
        }
        Insert: {
          action_type?: string
          asset_id: string
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          log_date?: string
          performed_by?: string | null
          resulting_condition?: Database["public"]["Enums"]["asset_condition"]
        }
        Update: {
          action_type?: string
          asset_id?: string
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          log_date?: string
          performed_by?: string | null
          resulting_condition?: Database["public"]["Enums"]["asset_condition"]
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_id: string
          assigned_to: string | null
          camp_id: string
          category: string
          condition: Database["public"]["Enums"]["asset_condition"]
          created_at: string
          id: string
          last_maintenance_date: string | null
          last_updated: string | null
          name: string
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          room_id: string | null
          updated_at: string
          vendor: string | null
          warranty_details: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_id: string
          assigned_to?: string | null
          camp_id: string
          category: string
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          last_updated?: string | null
          name: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          room_id?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_details?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_id?: string
          assigned_to?: string | null
          camp_id?: string
          category?: string
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          last_updated?: string | null
          name?: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          room_id?: string | null
          updated_at?: string
          vendor?: string | null
          warranty_details?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_responses: {
        Row: {
          audit_id: string
          category: string
          created_at: string
          id: string
          is_compliant: boolean | null
          max_score: number | null
          photo_url: string | null
          question: string
          rating: number | null
          remarks: string | null
          response_type: string
          response_value: string | null
          score: number | null
          template_item_id: string | null
        }
        Insert: {
          audit_id: string
          category: string
          created_at?: string
          id?: string
          is_compliant?: boolean | null
          max_score?: number | null
          photo_url?: string | null
          question: string
          rating?: number | null
          remarks?: string | null
          response_type?: string
          response_value?: string | null
          score?: number | null
          template_item_id?: string | null
        }
        Update: {
          audit_id?: string
          category?: string
          created_at?: string
          id?: string
          is_compliant?: boolean | null
          max_score?: number | null
          photo_url?: string | null
          question?: string
          rating?: number | null
          remarks?: string | null
          response_type?: string
          response_value?: string | null
          score?: number | null
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "food_safety_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "audit_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_template_items: {
        Row: {
          allow_remarks: boolean
          category: string
          category_type: string
          created_at: string
          id: string
          is_critical: boolean
          ncr_enabled: boolean
          photo_required: boolean
          question: string
          response_type: string
          severity_applicable: boolean
          sort_order: number
          template_id: string
          weight: number
        }
        Insert: {
          allow_remarks?: boolean
          category: string
          category_type?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          ncr_enabled?: boolean
          photo_required?: boolean
          question: string
          response_type?: string
          severity_applicable?: boolean
          sort_order?: number
          template_id: string
          weight?: number
        }
        Update: {
          allow_remarks?: boolean
          category?: string
          category_type?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          ncr_enabled?: boolean
          photo_required?: boolean
          question?: string
          response_type?: string
          severity_applicable?: boolean
          sort_order?: number
          template_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          audit_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          block_code: string | null
          block_type: string
          camp_id: string
          created_at: string
          floors: number
          id: string
          name: string
          status: string
          supervisor_name: string | null
          updated_at: string
        }
        Insert: {
          block_code?: string | null
          block_type?: string
          camp_id: string
          created_at?: string
          floors?: number
          id?: string
          name: string
          status?: string
          supervisor_name?: string | null
          updated_at?: string
        }
        Update: {
          block_code?: string | null
          block_type?: string
          camp_id?: string
          created_at?: string
          floors?: number
          id?: string
          name?: string
          status?: string
          supervisor_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_food_cancellation_settings: {
        Row: {
          approval_levels: number
          camp_id: string
          created_at: string
          cutoff_strict: boolean
          cutoff_time: string
          id: string
          night_shift_auto_breakfast: boolean
          ramadan_end: string | null
          ramadan_mode: boolean
          ramadan_start: string | null
          updated_at: string
        }
        Insert: {
          approval_levels?: number
          camp_id: string
          created_at?: string
          cutoff_strict?: boolean
          cutoff_time?: string
          id?: string
          night_shift_auto_breakfast?: boolean
          ramadan_end?: string | null
          ramadan_mode?: boolean
          ramadan_start?: string | null
          updated_at?: string
        }
        Update: {
          approval_levels?: number
          camp_id?: string
          created_at?: string
          cutoff_strict?: boolean
          cutoff_time?: string
          id?: string
          night_shift_auto_breakfast?: boolean
          ramadan_end?: string | null
          ramadan_mode?: boolean
          ramadan_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      camp_room_rates: {
        Row: {
          camp_id: string
          created_at: string
          daily_rate: number
          id: string
          room_category: string
          updated_at: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          daily_rate?: number
          id?: string
          room_category: string
          updated_at?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          daily_rate?: number
          id?: string
          room_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_room_rates_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_supplier_costs: {
        Row: {
          amount: number
          camp_id: string
          cost_type: string
          created_at: string
          id: string
          month: string
          notes: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          camp_id: string
          cost_type?: string
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          camp_id?: string
          cost_type?: string
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_supplier_costs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_utilities: {
        Row: {
          amount: number
          camp_id: string
          created_at: string
          id: string
          month: string
          notes: string | null
          updated_at: string
          utility_type: string
        }
        Insert: {
          amount?: number
          camp_id: string
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
          utility_type?: string
        }
        Update: {
          amount?: number
          camp_id?: string
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_utilities_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          amenities: string[] | null
          camp_code: string | null
          camp_type: string
          contact_number: string | null
          created_at: string
          id: string
          is_rented: boolean
          location: string
          managed_by: string | null
          monthly_rent: number
          name: string
          notes: string | null
          opening_date: string | null
          project_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          camp_code?: string | null
          camp_type?: string
          contact_number?: string | null
          created_at?: string
          id?: string
          is_rented?: boolean
          location: string
          managed_by?: string | null
          monthly_rent?: number
          name: string
          notes?: string | null
          opening_date?: string | null
          project_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          camp_code?: string | null
          camp_type?: string
          contact_number?: string | null
          created_at?: string
          id?: string
          is_rented?: boolean
          location?: string
          managed_by?: string | null
          monthly_rent?: number
          name?: string
          notes?: string | null
          opening_date?: string | null
          project_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      catering_consumption_logs: {
        Row: {
          camp_id: string
          consumed_qty: number
          consumption_date: string
          created_at: string
          id: string
          ingredient_id: string
          meal_type: string
          request_id: string | null
          unit_cost_at_time: number
        }
        Insert: {
          camp_id: string
          consumed_qty?: number
          consumption_date?: string
          created_at?: string
          id?: string
          ingredient_id: string
          meal_type: string
          request_id?: string | null
          unit_cost_at_time?: number
        }
        Update: {
          camp_id?: string
          consumed_qty?: number
          consumption_date?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          meal_type?: string
          request_id?: string | null
          unit_cost_at_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "catering_consumption_logs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_consumption_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_consumption_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cook_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_grn: {
        Row: {
          camp_id: string
          created_at: string
          created_by: string | null
          grn_date: string
          grn_number: string
          id: string
          notes: string | null
          total_cost: number
          vendor_name: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number: string
          id?: string
          notes?: string | null
          total_cost?: number
          vendor_name?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number?: string
          id?: string
          notes?: string | null
          total_cost?: number
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catering_grn_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_grn_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          grn_id: string
          id: string
          ingredient_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          grn_id: string
          id?: string
          ingredient_id: string
          quantity: number
          total_cost?: number | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          grn_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "catering_grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "catering_grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_grn_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_invoices: {
        Row: {
          camp_id: string
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          parsed_data: Json | null
          parsing_status: string
          total_amount: number
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          parsed_data?: Json | null
          parsing_status?: string
          total_amount?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          parsed_data?: Json | null
          parsing_status?: string
          total_amount?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catering_invoices_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_issue_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          issue_id: string
          issued_qty: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          issue_id: string
          issued_qty: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          issue_id?: string
          issued_qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "catering_issue_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_issue_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "catering_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_issues: {
        Row: {
          camp_id: string
          cook_name: string | null
          created_at: string
          id: string
          issue_date: string
          issued_by: string | null
          meal_type: string
          request_id: string | null
          total_cost: number
        }
        Insert: {
          camp_id: string
          cook_name?: string | null
          created_at?: string
          id?: string
          issue_date?: string
          issued_by?: string | null
          meal_type: string
          request_id?: string | null
          total_cost?: number
        }
        Update: {
          camp_id?: string
          cook_name?: string | null
          created_at?: string
          id?: string
          issue_date?: string
          issued_by?: string | null
          meal_type?: string
          request_id?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "catering_issues_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_issues_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "grocery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_stock: {
        Row: {
          balance: number | null
          camp_id: string
          expiry_date: string | null
          id: string
          ingredient_id: string
          min_level: number
          opening_stock: number
          stock_in: number
          stock_out: number
          updated_at: string
        }
        Insert: {
          balance?: number | null
          camp_id: string
          expiry_date?: string | null
          id?: string
          ingredient_id: string
          min_level?: number
          opening_stock?: number
          stock_in?: number
          stock_out?: number
          updated_at?: string
        }
        Update: {
          balance?: number | null
          camp_id?: string
          expiry_date?: string | null
          id?: string
          ingredient_id?: string
          min_level?: number
          opening_stock?: number
          stock_in?: number
          stock_out?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catering_stock_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_stock_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          camp_id: string
          check_in_date: string
          created_at: string
          employee_id: string
          food_required: boolean
          id: string
          iqama_number: string | null
          passport_number: string | null
          performed_by: string | null
          project: string | null
          room_id: string
        }
        Insert: {
          camp_id: string
          check_in_date?: string
          created_at?: string
          employee_id: string
          food_required?: boolean
          id?: string
          iqama_number?: string | null
          passport_number?: string | null
          performed_by?: string | null
          project?: string | null
          room_id: string
        }
        Update: {
          camp_id?: string
          check_in_date?: string
          created_at?: string
          employee_id?: string
          food_required?: boolean
          id?: string
          iqama_number?: string | null
          passport_number?: string | null
          performed_by?: string | null
          project?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      check_outs: {
        Row: {
          assets_returned: boolean | null
          blacklist_reason: string | null
          camp_id: string
          check_out_date: string
          clearance_notes: string | null
          created_at: string
          damage_remarks: string | null
          employee_id: string
          feedback: string | null
          feedback_rating: number | null
          id: string
          is_blacklisted: boolean | null
          performed_by: string | null
          room_id: string
        }
        Insert: {
          assets_returned?: boolean | null
          blacklist_reason?: string | null
          camp_id: string
          check_out_date?: string
          clearance_notes?: string | null
          created_at?: string
          damage_remarks?: string | null
          employee_id: string
          feedback?: string | null
          feedback_rating?: number | null
          id?: string
          is_blacklisted?: boolean | null
          performed_by?: string | null
          room_id: string
        }
        Update: {
          assets_returned?: boolean | null
          blacklist_reason?: string | null
          camp_id?: string
          check_out_date?: string
          clearance_notes?: string | null
          created_at?: string
          damage_remarks?: string | null
          employee_id?: string
          feedback?: string | null
          feedback_rating?: number | null
          id?: string
          is_blacklisted?: boolean | null
          performed_by?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_outs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_outs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_outs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_reports: {
        Row: {
          assets_returned: boolean | null
          blacklist_reason: string | null
          camp_id: string
          camp_name: string
          check_in_date: string | null
          check_out_date: string
          check_out_id: string
          clearance_notes: string | null
          created_at: string
          daily_rate: number | null
          damage_remarks: string | null
          employee_id: string
          employee_id_code: string
          employee_name: string
          feedback: string | null
          feedback_rating: number | null
          id: string
          is_blacklisted: boolean | null
          report_data: Json | null
          room_category: string | null
          room_number: string
          stay_days: number | null
          total_cost: number | null
        }
        Insert: {
          assets_returned?: boolean | null
          blacklist_reason?: string | null
          camp_id: string
          camp_name: string
          check_in_date?: string | null
          check_out_date?: string
          check_out_id: string
          clearance_notes?: string | null
          created_at?: string
          daily_rate?: number | null
          damage_remarks?: string | null
          employee_id: string
          employee_id_code: string
          employee_name: string
          feedback?: string | null
          feedback_rating?: number | null
          id?: string
          is_blacklisted?: boolean | null
          report_data?: Json | null
          room_category?: string | null
          room_number: string
          stay_days?: number | null
          total_cost?: number | null
        }
        Update: {
          assets_returned?: boolean | null
          blacklist_reason?: string | null
          camp_id?: string
          camp_name?: string
          check_in_date?: string | null
          check_out_date?: string
          check_out_id?: string
          clearance_notes?: string | null
          created_at?: string
          daily_rate?: number | null
          damage_remarks?: string | null
          employee_id?: string
          employee_id_code?: string
          employee_name?: string
          feedback?: string | null
          feedback_rating?: number | null
          id?: string
          is_blacklisted?: boolean | null
          report_data?: Json | null
          room_category?: string | null
          room_number?: string
          stay_days?: number | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_reports_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_reports_check_out_id_fkey"
            columns: ["check_out_id"]
            isOneToOne: false
            referencedRelation: "check_outs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      client_room_rates: {
        Row: {
          client_id: string
          created_at: string
          daily_rate: number
          id: string
          room_category_code: string
        }
        Insert: {
          client_id: string
          created_at?: string
          daily_rate?: number
          id?: string
          room_category_code: string
        }
        Update: {
          client_id?: string
          created_at?: string
          daily_rate?: number
          id?: string
          room_category_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_room_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          breakfast_rate: number
          code: string
          contact_person: string | null
          created_at: string
          dinner_rate: number
          email: string | null
          id: string
          is_active: boolean
          lunch_rate: number
          name: string
          phone: string | null
          ramadan_rate: number
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          breakfast_rate?: number
          code: string
          contact_person?: string | null
          created_at?: string
          dinner_rate?: number
          email?: string | null
          id?: string
          is_active?: boolean
          lunch_rate?: number
          name: string
          phone?: string | null
          ramadan_rate?: number
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          breakfast_rate?: number
          code?: string
          contact_person?: string | null
          created_at?: string
          dinner_rate?: number
          email?: string | null
          id?: string
          is_active?: boolean
          lunch_rate?: number
          name?: string
          phone?: string | null
          ramadan_rate?: number
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      cook_request_items: {
        Row: {
          approved_qty: number | null
          created_at: string
          id: string
          ingredient_id: string
          issued_qty: number | null
          meal_type: string | null
          qty_per_person: number
          request_id: string
          required_qty: number
          unit_cost: number
        }
        Insert: {
          approved_qty?: number | null
          created_at?: string
          id?: string
          ingredient_id: string
          issued_qty?: number | null
          meal_type?: string | null
          qty_per_person?: number
          request_id: string
          required_qty?: number
          unit_cost?: number
        }
        Update: {
          approved_qty?: number | null
          created_at?: string
          id?: string
          ingredient_id?: string
          issued_qty?: number | null
          meal_type?: string | null
          qty_per_person?: number
          request_id?: string
          required_qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "cook_request_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "cook_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cook_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bf_head_count: number | null
          camp_id: string
          created_at: string
          dinner_head_count: number | null
          head_count: number
          id: string
          issued_at: string | null
          issued_by: string | null
          lunch_head_count: number | null
          meal_type: string
          notes: string | null
          rejection_reason: string | null
          request_date: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bf_head_count?: number | null
          camp_id: string
          created_at?: string
          dinner_head_count?: number | null
          head_count?: number
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          lunch_head_count?: number | null
          meal_type: string
          notes?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bf_head_count?: number | null
          camp_id?: string
          created_at?: string
          dinner_head_count?: number | null
          head_count?: number
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          lunch_head_count?: number | null
          meal_type?: string
          notes?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_requests_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_meal_plans: {
        Row: {
          adjustment_notes: string | null
          breakfast_count: number
          camp_id: string
          created_at: string
          created_by: string | null
          dinner_count: number
          id: string
          lunch_count: number
          plan_date: string
          total_occupants: number
          updated_at: string
        }
        Insert: {
          adjustment_notes?: string | null
          breakfast_count?: number
          camp_id: string
          created_at?: string
          created_by?: string | null
          dinner_count?: number
          id?: string
          lunch_count?: number
          plan_date: string
          total_occupants?: number
          updated_at?: string
        }
        Update: {
          adjustment_notes?: string | null
          breakfast_count?: number
          camp_id?: string
          created_at?: string
          created_by?: string | null
          dinner_count?: number
          id?: string
          lunch_count?: number
          plan_date?: string
          total_occupants?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_meal_plans_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          billing_notes: string | null
          code: string
          contact_email: string | null
          cost_center: string | null
          created_at: string
          daily_food_rate: number | null
          daily_room_rate: number | null
          head_name: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          billing_notes?: string | null
          code: string
          contact_email?: string | null
          cost_center?: string | null
          created_at?: string
          daily_food_rate?: number | null
          daily_room_rate?: number | null
          head_name?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          billing_notes?: string | null
          code?: string
          contact_email?: string | null
          cost_center?: string | null
          created_at?: string
          daily_food_rate?: number | null
          daily_room_rate?: number | null
          head_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      designation_room_mapping: {
        Row: {
          created_at: string
          designation: string
          id: string
          room_category_code: string
        }
        Insert: {
          created_at?: string
          designation: string
          id?: string
          room_category_code: string
        }
        Update: {
          created_at?: string
          designation?: string
          id?: string
          room_category_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "designation_room_mapping_room_category_code_fkey"
            columns: ["room_category_code"]
            isOneToOne: false
            referencedRelation: "room_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      employee_shift_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          shift_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          shift_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          shift_type?: string
        }
        Relationships: []
      }
      employee_status_log: {
        Row: {
          changed_by: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          from_status: Database["public"]["Enums"]["presence_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["presence_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          from_status?: Database["public"]["Enums"]["presence_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["presence_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          from_status?: Database["public"]["Enums"]["presence_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["presence_status"]
        }
        Relationships: []
      }
      employees: {
        Row: {
          camp_id: string | null
          client_id: string | null
          company: string | null
          contract_end_date: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          employee_id: string
          employee_type: string
          id: string
          id_document_url: string | null
          iqama_number: string | null
          is_blacklisted: boolean | null
          join_date: string | null
          name: string
          nationality: string | null
          passport_number: string | null
          phone: string | null
          presence_status: Database["public"]["Enums"]["presence_status"]
          project: string | null
          room_id: string | null
          staff_role: string | null
          status: string
          supplier_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          camp_id?: string | null
          client_id?: string | null
          company?: string | null
          contract_end_date?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id: string
          employee_type?: string
          id?: string
          id_document_url?: string | null
          iqama_number?: string | null
          is_blacklisted?: boolean | null
          join_date?: string | null
          name: string
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          presence_status?: Database["public"]["Enums"]["presence_status"]
          project?: string | null
          room_id?: string | null
          staff_role?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          camp_id?: string | null
          client_id?: string | null
          company?: string | null
          contract_end_date?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id?: string
          employee_type?: string
          id?: string
          id_document_url?: string | null
          iqama_number?: string | null
          is_blacklisted?: boolean | null
          join_date?: string | null
          name?: string
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          presence_status?: Database["public"]["Enums"]["presence_status"]
          project?: string | null
          room_id?: string | null
          staff_role?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      food_cancellation_request_meals: {
        Row: {
          id: string
          meal_type: Database["public"]["Enums"]["food_meal_type"]
          request_id: string
        }
        Insert: {
          id?: string
          meal_type: Database["public"]["Enums"]["food_meal_type"]
          request_id: string
        }
        Update: {
          id?: string
          meal_type?: Database["public"]["Enums"]["food_meal_type"]
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_cancellation_request_meals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "food_cancellation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      food_cancellation_requests: {
        Row: {
          approval_levels_required: number
          camp_id: string | null
          created_at: string
          current_level: number
          employee_id: string
          from_date: string
          id: string
          is_late: boolean
          level1_approved_at: string | null
          level1_approver: string | null
          level2_approved_at: string | null
          level2_approver: string | null
          level3_approved_at: string | null
          level3_approver: string | null
          reason: Database["public"]["Enums"]["food_cancel_reason"]
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remarks: string | null
          source: Database["public"]["Enums"]["food_cancel_source"]
          status: Database["public"]["Enums"]["food_cancel_status"]
          submitted_at: string
          submitted_by: string | null
          to_date: string
          updated_at: string
        }
        Insert: {
          approval_levels_required?: number
          camp_id?: string | null
          created_at?: string
          current_level?: number
          employee_id: string
          from_date: string
          id?: string
          is_late?: boolean
          level1_approved_at?: string | null
          level1_approver?: string | null
          level2_approved_at?: string | null
          level2_approver?: string | null
          level3_approved_at?: string | null
          level3_approver?: string | null
          reason: Database["public"]["Enums"]["food_cancel_reason"]
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          source?: Database["public"]["Enums"]["food_cancel_source"]
          status?: Database["public"]["Enums"]["food_cancel_status"]
          submitted_at?: string
          submitted_by?: string | null
          to_date: string
          updated_at?: string
        }
        Update: {
          approval_levels_required?: number
          camp_id?: string | null
          created_at?: string
          current_level?: number
          employee_id?: string
          from_date?: string
          id?: string
          is_late?: boolean
          level1_approved_at?: string | null
          level1_approver?: string | null
          level2_approved_at?: string | null
          level2_approver?: string | null
          level3_approved_at?: string | null
          level3_approver?: string | null
          reason?: Database["public"]["Enums"]["food_cancel_reason"]
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          source?: Database["public"]["Enums"]["food_cancel_source"]
          status?: Database["public"]["Enums"]["food_cancel_status"]
          submitted_at?: string
          submitted_by?: string | null
          to_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_safety_audits: {
        Row: {
          ai_summary: string | null
          audit_date: string
          audit_type: string
          auditor_id: string | null
          auditor_signature: string | null
          camp_id: string
          completed_at: string | null
          compliance_pct: number | null
          contractor_name: string | null
          created_at: string
          id: string
          max_score: number | null
          mess_facility_id: string | null
          notes: string | null
          project_name: string | null
          risk_grade: string | null
          status: string
          supervisor_signature: string | null
          template_id: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          audit_date?: string
          audit_type?: string
          auditor_id?: string | null
          auditor_signature?: string | null
          camp_id: string
          completed_at?: string | null
          compliance_pct?: number | null
          contractor_name?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          mess_facility_id?: string | null
          notes?: string | null
          project_name?: string | null
          risk_grade?: string | null
          status?: string
          supervisor_signature?: string | null
          template_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          audit_date?: string
          audit_type?: string
          auditor_id?: string | null
          auditor_signature?: string | null
          camp_id?: string
          completed_at?: string | null
          compliance_pct?: number | null
          contractor_name?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          mess_facility_id?: string | null
          notes?: string | null
          project_name?: string | null
          risk_grade?: string | null
          status?: string
          supervisor_signature?: string | null
          template_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_safety_audits_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_safety_audits_mess_facility_id_fkey"
            columns: ["mess_facility_id"]
            isOneToOne: false
            referencedRelation: "mess_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_safety_audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      food_wastage: {
        Row: {
          camp_id: string
          created_at: string
          id: string
          ingredient_id: string
          meal_type: string
          reason: string | null
          recorded_by: string | null
          unit_cost: number
          wastage_date: string
          wasted_qty: number
        }
        Insert: {
          camp_id: string
          created_at?: string
          id?: string
          ingredient_id: string
          meal_type: string
          reason?: string | null
          recorded_by?: string | null
          unit_cost?: number
          wastage_date?: string
          wasted_qty?: number
        }
        Update: {
          camp_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          meal_type?: string
          reason?: string | null
          recorded_by?: string | null
          unit_cost?: number
          wastage_date?: string
          wasted_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_wastage_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_wastage_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_request_items: {
        Row: {
          approved_qty: number | null
          calculated_qty: number
          created_at: string
          id: string
          ingredient_id: string
          request_id: string
          requested_qty: number
          unit_cost: number
        }
        Insert: {
          approved_qty?: number | null
          calculated_qty?: number
          created_at?: string
          id?: string
          ingredient_id: string
          request_id: string
          requested_qty?: number
          unit_cost?: number
        }
        Update: {
          approved_qty?: number | null
          calculated_qty?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          request_id?: string
          requested_qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "grocery_request_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "grocery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_requests: {
        Row: {
          approved_by: string | null
          camp_id: string
          created_at: string
          id: string
          meal_type: string
          notes: string | null
          request_date: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          camp_id: string
          created_at?: string
          id?: string
          meal_type: string
          notes?: string | null
          request_date: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          camp_id?: string
          created_at?: string
          id?: string
          meal_type?: string
          notes?: string | null
          request_date?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_requests_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          ingredient_id: string
          invoice_reference: string | null
          notes: string | null
          price: number
          source: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          ingredient_id: string
          invoice_reference?: string | null
          notes?: string | null
          price?: number
          source?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          ingredient_id?: string
          invoice_reference?: string | null
          notes?: string | null
          price?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          reorder_level: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          reorder_level?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          reorder_level?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          balance: number | null
          camp_id: string
          category: string
          created_at: string
          id: string
          item_name: string
          min_alert_level: number
          opening_stock: number
          stock_in: number
          stock_out: number
          updated_at: string
          vendor: string | null
        }
        Insert: {
          balance?: number | null
          camp_id: string
          category: string
          created_at?: string
          id?: string
          item_name: string
          min_alert_level?: number
          opening_stock?: number
          stock_in?: number
          stock_out?: number
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          balance?: number | null
          camp_id?: string
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          min_alert_level?: number
          opening_stock?: number
          stock_in?: number
          stock_out?: number
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      item_assignments: {
        Row: {
          assigned_date: string
          camp_id: string
          category: string
          condition: string
          created_at: string
          employee_id: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          returned_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          camp_id: string
          category?: string
          condition?: string
          created_at?: string
          employee_id: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          returned_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          camp_id?: string
          category?: string
          condition?: string
          created_at?: string
          employee_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          returned_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_assignments_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_assignment_history: {
        Row: {
          action: string
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string | null
          created_at: string
          id: string
          notes: string | null
          ticket_id: string
        }
        Insert: {
          action?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          ticket_id: string
        }
        Update: {
          action?: string
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_assignment_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_to: string | null
          camp_id: string
          category: string
          cost: number | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          reported_by: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          camp_id: string
          category: string
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reported_by?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          camp_id?: string
          category?: string
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reported_by?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_menu_templates: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          is_active: boolean
          meal_type: string
          qty_per_person: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          is_active?: boolean
          meal_type: string
          qty_per_person: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          is_active?: boolean
          meal_type?: string
          qty_per_person?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_menu_templates_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_order_cycles: {
        Row: {
          camp_id: string | null
          created_at: string
          created_by: string | null
          cutoff_datetime: string
          end_date: string
          id: string
          is_active: boolean
          name: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          camp_id?: string | null
          created_at?: string
          created_by?: string | null
          cutoff_datetime: string
          end_date: string
          id?: string
          is_active?: boolean
          name?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          camp_id?: string | null
          created_at?: string
          created_by?: string | null
          cutoff_datetime?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_order_items: {
        Row: {
          created_at: string
          id: string
          meal_date: string
          meal_order_id: string
          meal_type: string
          preference: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_date: string
          meal_order_id: string
          meal_type: string
          preference: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_date?: string
          meal_order_id?: string
          meal_type?: string
          preference?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_order_items_meal_order_id_fkey"
            columns: ["meal_order_id"]
            isOneToOne: false
            referencedRelation: "meal_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_orders: {
        Row: {
          created_at: string
          cycle_id: string
          employee_id: string
          id: string
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          employee_id: string
          id?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          employee_id?: string
          id?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_orders_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "meal_order_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_scans: {
        Row: {
          camp_id: string | null
          created_at: string
          employee_id: string
          id: string
          is_ordered: boolean
          meal_date: string
          meal_type: string
          notes: string | null
          preference: string | null
          scanned_at: string
          scanned_by: string | null
        }
        Insert: {
          camp_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_ordered?: boolean
          meal_date: string
          meal_type: string
          notes?: string | null
          preference?: string | null
          scanned_at?: string
          scanned_by?: string | null
        }
        Update: {
          camp_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_ordered?: boolean
          meal_date?: string
          meal_type?: string
          notes?: string | null
          preference?: string | null
          scanned_at?: string
          scanned_by?: string | null
        }
        Relationships: []
      }
      menu_dish_ingredients: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          ingredient_id: string
          qty_per_person: number
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          ingredient_id: string
          qty_per_person?: number
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          ingredient_id?: string
          qty_per_person?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "menu_dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_dish_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_dishes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          meal_type: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meal_type: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meal_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      mess_facilities: {
        Row: {
          camp_id: string
          capacity: number | null
          contractor_name: string | null
          created_at: string
          facility_type: string
          hygiene_cert_expiry: string | null
          id: string
          license_expiry: string | null
          license_number: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          camp_id: string
          capacity?: number | null
          contractor_name?: string | null
          created_at?: string
          facility_type?: string
          hygiene_cert_expiry?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          camp_id?: string
          capacity?: number | null
          contractor_name?: string | null
          created_at?: string
          facility_type?: string
          hygiene_cert_expiry?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mess_facilities_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_records: {
        Row: {
          assigned_to: string | null
          audit_id: string
          audit_response_id: string | null
          camp_id: string
          category: string
          closed_at: string | null
          closed_by: string | null
          correction_notes: string | null
          created_at: string
          description: string
          id: string
          ncr_number: string
          proof_photo_url: string | null
          severity: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          audit_response_id?: string | null
          camp_id: string
          category: string
          closed_at?: string | null
          closed_by?: string | null
          correction_notes?: string | null
          created_at?: string
          description: string
          id?: string
          ncr_number: string
          proof_photo_url?: string | null
          severity?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          audit_response_id?: string | null
          camp_id?: string
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          correction_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          ncr_number?: string
          proof_photo_url?: string | null
          severity?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncr_records_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "food_safety_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_records_audit_response_id_fkey"
            columns: ["audit_response_id"]
            isOneToOne: false
            referencedRelation: "audit_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_records_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          employee_name: string | null
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          employee_name?: string | null
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          employee_name?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          feature: string
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          feature: string
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          feature?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      pm_equipment: {
        Row: {
          camp_id: string
          category: string | null
          created_at: string
          default_assignee_name: string | null
          frequency: Database["public"]["Enums"]["pm_frequency"]
          frequency_days: number
          id: string
          last_maintenance_date: string | null
          location: string | null
          machine_code: string
          name: string
          next_due_date: string | null
          notes: string | null
          status: Database["public"]["Enums"]["pm_equipment_status"]
          updated_at: string
        }
        Insert: {
          camp_id: string
          category?: string | null
          created_at?: string
          default_assignee_name?: string | null
          frequency?: Database["public"]["Enums"]["pm_frequency"]
          frequency_days?: number
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          machine_code: string
          name: string
          next_due_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["pm_equipment_status"]
          updated_at?: string
        }
        Update: {
          camp_id?: string
          category?: string | null
          created_at?: string
          default_assignee_name?: string | null
          frequency?: Database["public"]["Enums"]["pm_frequency"]
          frequency_days?: number
          id?: string
          last_maintenance_date?: string | null
          location?: string | null
          machine_code?: string
          name?: string
          next_due_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["pm_equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_equipment_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_logs: {
        Row: {
          action_taken: string | null
          camp_id: string
          created_at: string
          equipment_id: string
          id: string
          issues_identified: string | null
          next_due_date: string | null
          performed_by: string | null
          performed_by_name: string | null
          performed_on: string
          remarks: string | null
          scheduled_due_date: string | null
          status: Database["public"]["Enums"]["pm_task_status"]
          task_id: string | null
        }
        Insert: {
          action_taken?: string | null
          camp_id: string
          created_at?: string
          equipment_id: string
          id?: string
          issues_identified?: string | null
          next_due_date?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_on?: string
          remarks?: string | null
          scheduled_due_date?: string | null
          status?: Database["public"]["Enums"]["pm_task_status"]
          task_id?: string | null
        }
        Update: {
          action_taken?: string | null
          camp_id?: string
          created_at?: string
          equipment_id?: string
          id?: string
          issues_identified?: string | null
          next_due_date?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_on?: string
          remarks?: string | null
          scheduled_due_date?: string | null
          status?: Database["public"]["Enums"]["pm_task_status"]
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_logs_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "pm_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_tasks: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          camp_id: string
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          due_date: string
          equipment_id: string
          id: string
          issues_identified: string | null
          remarks: string | null
          scheduled_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["pm_task_status"]
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          camp_id: string
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          due_date: string
          equipment_id: string
          id?: string
          issues_identified?: string | null
          remarks?: string | null
          scheduled_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["pm_task_status"]
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          camp_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          due_date?: string
          equipment_id?: string
          id?: string
          issues_identified?: string | null
          remarks?: string | null
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["pm_task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "pm_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          ordered_qty: number
          po_id: string
          received_qty: number | null
          required_qty: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          ordered_qty?: number
          po_id: string
          received_qty?: number | null
          required_qty?: number
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          ordered_qty?: number
          po_id?: string
          received_qty?: number | null
          required_qty?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          camp_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          po_number: string
          status: string
          total_amount: number
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          po_number: string
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          camp_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted: boolean
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          granted?: boolean
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          granted?: boolean
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      room_allocation_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_name: string | null
          assigned_category_code: string | null
          assigned_room_id: string | null
          created_at: string
          designation: string | null
          employee_id: string
          id: string
          intended_category_code: string | null
          reason: string
          requested_by: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_name?: string | null
          assigned_category_code?: string | null
          assigned_room_id?: string | null
          created_at?: string
          designation?: string | null
          employee_id: string
          id?: string
          intended_category_code?: string | null
          reason: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_name?: string | null
          assigned_category_code?: string | null
          assigned_room_id?: string | null
          created_at?: string
          designation?: string | null
          employee_id?: string
          id?: string
          intended_category_code?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: []
      }
      room_categories: {
        Row: {
          beds: number
          category_key: string | null
          code: string
          created_at: string
          daily_rate: number
          holding_charge: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          beds?: number
          category_key?: string | null
          code: string
          created_at?: string
          daily_rate?: number
          holding_charge?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          beds?: number
          category_key?: string | null
          code?: string
          created_at?: string
          daily_rate?: number
          holding_charge?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_transfers: {
        Row: {
          created_at: string
          employee_id: string
          from_camp_id: string
          from_room_id: string
          id: string
          notes: string | null
          performed_by: string | null
          reason: string
          to_camp_id: string
          to_room_id: string
          transfer_date: string
          transfer_type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          from_camp_id: string
          from_room_id: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          reason: string
          to_camp_id: string
          to_room_id: string
          transfer_date?: string
          transfer_type?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          from_camp_id?: string
          from_room_id?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          reason?: string
          to_camp_id?: string
          to_room_id?: string
          transfer_date?: string
          transfer_type?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          ac: boolean
          attached_bathroom: boolean
          building_id: string
          camp_id: string
          category: Database["public"]["Enums"]["room_category"]
          created_at: string
          current_occupancy: number
          daily_food_rate: number
          daily_rate: number
          floor: number
          id: string
          max_capacity: number
          room_number: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
        }
        Insert: {
          ac?: boolean
          attached_bathroom?: boolean
          building_id: string
          camp_id: string
          category?: Database["public"]["Enums"]["room_category"]
          created_at?: string
          current_occupancy?: number
          daily_food_rate?: number
          daily_rate?: number
          floor?: number
          id?: string
          max_capacity?: number
          room_number: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Update: {
          ac?: boolean
          attached_bathroom?: boolean
          building_id?: string
          camp_id?: string
          category?: Database["public"]["Enums"]["room_category"]
          created_at?: string
          current_occupancy?: number
          daily_food_rate?: number
          daily_rate?: number
          floor?: number
          id?: string
          max_capacity?: number
          room_number?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          created_at: string
          current_camp_id: string | null
          current_room_id: string | null
          employee_id: string
          fulfilled_at: string | null
          fulfilled_transfer_id: string | null
          id: string
          notes: string | null
          reason: string
          request_type: string
          requested_at: string
          requested_by: string | null
          requested_camp_id: string | null
          requested_room_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_camp_id?: string | null
          current_room_id?: string | null
          employee_id: string
          fulfilled_at?: string | null
          fulfilled_transfer_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          request_type?: string
          requested_at?: string
          requested_by?: string | null
          requested_camp_id?: string | null
          requested_room_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_camp_id?: string | null
          current_room_id?: string | null
          employee_id?: string
          fulfilled_at?: string | null
          fulfilled_transfer_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          request_type?: string
          requested_at?: string
          requested_by?: string | null
          requested_camp_id?: string | null
          requested_room_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          camp_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          camp_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          camp_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          badge_number: string | null
          camp_id: string
          check_in_time: string
          check_out_time: string | null
          checked_in_by: string | null
          checked_out_by: string | null
          company: string | null
          created_at: string
          expected_check_out: string | null
          host_employee_id: string | null
          id: string
          id_number: string | null
          id_type: string | null
          items_carried: string | null
          phone: string | null
          photo_url: string | null
          purpose: string
          remarks: string | null
          room_id: string | null
          status: string
          updated_at: string
          vehicle_number: string | null
          visitor_name: string
        }
        Insert: {
          badge_number?: string | null
          camp_id: string
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          company?: string | null
          created_at?: string
          expected_check_out?: string | null
          host_employee_id?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          items_carried?: string | null
          phone?: string | null
          photo_url?: string | null
          purpose: string
          remarks?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          visitor_name: string
        }
        Update: {
          badge_number?: string | null
          camp_id?: string
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          company?: string | null
          created_at?: string
          expected_check_out?: string | null
          host_employee_id?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          items_carried?: string | null
          phone?: string | null
          photo_url?: string | null
          purpose?: string
          remarks?: string | null
          room_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_menu_config: {
        Row: {
          camp_id: string
          created_at: string
          day_of_week: number
          description: string | null
          dish_name: string
          id: string
          is_active: boolean
          meal_type: string
          menu_dish_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          day_of_week: number
          description?: string | null
          dish_name: string
          id?: string
          is_active?: boolean
          meal_type: string
          menu_dish_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          day_of_week?: number
          description?: string | null
          dish_name?: string
          id?: string
          is_active?: boolean
          meal_type?: string
          menu_dish_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_menu_config_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_menu_config_menu_dish_id_fkey"
            columns: ["menu_dish_id"]
            isOneToOne: false
            referencedRelation: "menu_dishes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_food_cancellation: {
        Args: { p_approver: string; p_request_id: string }
        Returns: undefined
      }
      change_presence_status: {
        Args: {
          p_changed_by?: string
          p_employee_id: string
          p_new_status: Database["public"]["Enums"]["presence_status"]
          p_reason?: string
        }
        Returns: string
      }
      get_food_billable_days: {
        Args: { p_employee_id: string; p_from: string; p_to: string }
        Returns: number
      }
      get_kitchen_meal_count: {
        Args: { p_camp_id: string; p_date: string }
        Returns: {
          cancelled: number
          meal_type: string
          net_count: number
          total_active: number
        }[]
      }
      has_permission: {
        Args: {
          _action: string
          _feature: string
          _module: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_meal_cancelled: {
        Args: {
          p_date: string
          p_employee_id: string
          p_meal: Database["public"]["Enums"]["food_meal_type"]
        }
        Returns: boolean
      }
      perform_check_in:
        | {
            Args: {
              p_camp_id: string
              p_employee_id: string
              p_food_required?: boolean
              p_iqama_number?: string
              p_passport_number?: string
              p_performed_by: string
              p_room_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_camp_id: string
              p_check_in_date?: string
              p_employee_id: string
              p_food_required?: boolean
              p_iqama_number?: string
              p_passport_number?: string
              p_performed_by: string
              p_room_id: string
            }
            Returns: string
          }
      perform_check_out:
        | {
            Args: {
              p_assets_returned?: boolean
              p_blacklist_reason?: string
              p_camp_id: string
              p_clearance_notes?: string
              p_damage_remarks?: string
              p_employee_id: string
              p_feedback?: string
              p_feedback_rating?: number
              p_is_blacklisted?: boolean
              p_performed_by: string
              p_room_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_assets_returned?: boolean
              p_blacklist_reason?: string
              p_camp_id: string
              p_check_out_date?: string
              p_clearance_notes?: string
              p_damage_remarks?: string
              p_employee_id: string
              p_feedback?: string
              p_feedback_rating?: number
              p_is_blacklisted?: boolean
              p_performed_by: string
              p_room_id: string
            }
            Returns: string
          }
      perform_room_transfer: {
        Args: {
          p_employee_id: string
          p_from_camp_id: string
          p_from_room_id: string
          p_notes?: string
          p_performed_by?: string
          p_reason: string
          p_to_camp_id: string
          p_to_room_id: string
        }
        Returns: string
      }
      reject_food_cancellation: {
        Args: { p_approver: string; p_reason: string; p_request_id: string }
        Returns: undefined
      }
      seed_meal_orders_window: {
        Args: { p_end?: string; p_start?: string }
        Returns: undefined
      }
      submit_food_cancellation: {
        Args: {
          p_employee_id: string
          p_force?: boolean
          p_from_date: string
          p_meals: Database["public"]["Enums"]["food_meal_type"][]
          p_reason: Database["public"]["Enums"]["food_cancel_reason"]
          p_remarks?: string
          p_source?: Database["public"]["Enums"]["food_cancel_source"]
          p_submitted_by?: string
          p_to_date: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "camp_manager"
        | "hr_admin"
        | "store_keeper"
        | "maintenance_supervisor"
        | "security"
      asset_condition: "good" | "repair" | "damaged"
      food_cancel_reason:
        | "leave"
        | "site_transfer"
        | "official_duty"
        | "off_camp_stay"
        | "absent"
        | "medical"
        | "shift_change"
        | "ramadan"
        | "resignation"
        | "opt_out"
        | "suspension"
        | "client_meals"
        | "other"
      food_cancel_source:
        | "manual"
        | "auto_checkout"
        | "auto_leave"
        | "auto_ramadan"
        | "auto_shift"
        | "bulk"
      food_cancel_status: "pending" | "approved" | "rejected" | "cancelled"
      food_meal_type: "breakfast" | "lunch" | "dinner" | "iftar" | "suhoor"
      pm_equipment_status: "active" | "inactive" | "retired"
      pm_frequency:
        | "daily"
        | "weekly"
        | "fortnightly"
        | "monthly"
        | "bi_monthly"
        | "quarterly"
        | "four_monthly"
        | "half_yearly"
        | "yearly"
        | "custom"
      pm_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "overdue"
        | "skipped"
      presence_status: "active" | "on_site" | "vacation" | "away"
      room_category:
        | "1_occupant"
        | "2_occupants"
        | "4_occupants"
        | "6_occupants"
        | "8_occupants"
        | "executive_single"
        | "executive_twin"
        | "supervisor_twin"
        | "staff_4bed"
        | "skilled_6bed"
        | "general_8bed"
        | "guest_single"
        | "transit_4bed"
      room_status:
        | "vacant"
        | "occupied"
        | "reserved"
        | "under_maintenance"
        | "partially_occupied"
      ticket_priority: "low" | "medium" | "high" | "emergency"
      ticket_status: "open" | "in_progress" | "completed"
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
      app_role: [
        "super_admin",
        "camp_manager",
        "hr_admin",
        "store_keeper",
        "maintenance_supervisor",
        "security",
      ],
      asset_condition: ["good", "repair", "damaged"],
      food_cancel_reason: [
        "leave",
        "site_transfer",
        "official_duty",
        "off_camp_stay",
        "absent",
        "medical",
        "shift_change",
        "ramadan",
        "resignation",
        "opt_out",
        "suspension",
        "client_meals",
        "other",
      ],
      food_cancel_source: [
        "manual",
        "auto_checkout",
        "auto_leave",
        "auto_ramadan",
        "auto_shift",
        "bulk",
      ],
      food_cancel_status: ["pending", "approved", "rejected", "cancelled"],
      food_meal_type: ["breakfast", "lunch", "dinner", "iftar", "suhoor"],
      pm_equipment_status: ["active", "inactive", "retired"],
      pm_frequency: [
        "daily",
        "weekly",
        "fortnightly",
        "monthly",
        "bi_monthly",
        "quarterly",
        "four_monthly",
        "half_yearly",
        "yearly",
        "custom",
      ],
      pm_task_status: [
        "pending",
        "in_progress",
        "completed",
        "overdue",
        "skipped",
      ],
      presence_status: ["active", "on_site", "vacation", "away"],
      room_category: [
        "1_occupant",
        "2_occupants",
        "4_occupants",
        "6_occupants",
        "8_occupants",
        "executive_single",
        "executive_twin",
        "supervisor_twin",
        "staff_4bed",
        "skilled_6bed",
        "general_8bed",
        "guest_single",
        "transit_4bed",
      ],
      room_status: [
        "vacant",
        "occupied",
        "reserved",
        "under_maintenance",
        "partially_occupied",
      ],
      ticket_priority: ["low", "medium", "high", "emergency"],
      ticket_status: ["open", "in_progress", "completed"],
    },
  },
} as const
