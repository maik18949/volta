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
      extraordinary_costs: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["extraordinary_cost_category"]
          cost_month: string
          description_text: string | null
          id: string
          is_deductible: boolean
          property_id: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["extraordinary_cost_category"]
          cost_month?: string
          description_text?: string | null
          id?: string
          is_deductible?: boolean
          property_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["extraordinary_cost_category"]
          cost_month?: string
          description_text?: string | null
          id?: string
          is_deductible?: boolean
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraordinary_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_calculations: {
        Row: {
          agent_fee: number
          amortization_rate: number
          appraisal_costs: number
          building_value: number
          cold_rent_monthly: number
          created_at: string
          depreciation_rate: number
          hoa_fee_maintenance_reserve_monthly: number
          hoa_fee_recoverable_monthly: number
          hoa_fee_total_monthly: number
          id: string
          interest_rate: number
          is_promoted: boolean
          land_registry_costs: number
          land_transfer_tax: number
          loan_amount: number
          loan_start_date: string
          marginal_tax_rate: number
          monthly_mortgage: number
          name: string
          notary_costs: number
          other_costs_monthly: number
          other_income_monthly: number
          parking_rent_monthly: number
          promoted_at: string | null
          promoted_property_id: string | null
          property_insurance_annual: number
          property_management_annual: number
          purchase_price_parking: number
          purchase_price_unit: number
          renovation_afa_eligible: number
          renovation_modernization_costs: number
          sort_order: number
          updated_at: string
          user_id: string
          vacancy_rate_assumption: number
        }
        Insert: {
          agent_fee?: number
          amortization_rate?: number
          appraisal_costs?: number
          building_value?: number
          cold_rent_monthly?: number
          created_at?: string
          depreciation_rate?: number
          hoa_fee_maintenance_reserve_monthly?: number
          hoa_fee_recoverable_monthly?: number
          hoa_fee_total_monthly?: number
          id?: string
          interest_rate?: number
          is_promoted?: boolean
          land_registry_costs?: number
          land_transfer_tax?: number
          loan_amount?: number
          loan_start_date?: string
          marginal_tax_rate?: number
          monthly_mortgage?: number
          name?: string
          notary_costs?: number
          other_costs_monthly?: number
          other_income_monthly?: number
          parking_rent_monthly?: number
          promoted_at?: string | null
          promoted_property_id?: string | null
          property_insurance_annual?: number
          property_management_annual?: number
          purchase_price_parking?: number
          purchase_price_unit?: number
          renovation_afa_eligible?: number
          renovation_modernization_costs?: number
          sort_order?: number
          updated_at?: string
          user_id: string
          vacancy_rate_assumption?: number
        }
        Update: {
          agent_fee?: number
          amortization_rate?: number
          appraisal_costs?: number
          building_value?: number
          cold_rent_monthly?: number
          created_at?: string
          depreciation_rate?: number
          hoa_fee_maintenance_reserve_monthly?: number
          hoa_fee_recoverable_monthly?: number
          hoa_fee_total_monthly?: number
          id?: string
          interest_rate?: number
          is_promoted?: boolean
          land_registry_costs?: number
          land_transfer_tax?: number
          loan_amount?: number
          loan_start_date?: string
          marginal_tax_rate?: number
          monthly_mortgage?: number
          name?: string
          notary_costs?: number
          other_costs_monthly?: number
          other_income_monthly?: number
          parking_rent_monthly?: number
          promoted_at?: string | null
          promoted_property_id?: string | null
          property_insurance_annual?: number
          property_management_annual?: number
          purchase_price_parking?: number
          purchase_price_unit?: number
          renovation_afa_eligible?: number
          renovation_modernization_costs?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
          vacancy_rate_assumption?: number
        }
        Relationships: [
          {
            foreignKeyName: "investment_calculations_promoted_property_id_fkey"
            columns: ["promoted_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          acquisition_type: Database["public"]["Enums"]["acquisition_type"]
          address: string
          agent_fee: number
          amortization_rate: number
          appraisal_costs: number
          basement_size_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          broker_commission_agreement: number
          building_value: number
          city: string
          cold_rent_monthly: number
          condition: Database["public"]["Enums"]["property_condition"] | null
          created_at: string
          current_market_value: number | null
          depreciation_rate: number
          economic_transfer_date: string
          energy_efficiency_class:
            | Database["public"]["Enums"]["energy_class"]
            | null
          equity_contributed: number
          fixed_interest_period_years: number
          floor_level: number | null
          has_balcony: boolean
          has_basement: boolean
          has_fitted_kitchen: boolean
          has_garden: boolean
          has_terrace: boolean
          heating_type: Database["public"]["Enums"]["heating_type"] | null
          hoa_fee_maintenance_reserve_monthly: number
          hoa_fee_parking_maintenance_reserve_monthly: number
          hoa_fee_parking_recoverable_monthly: number
          hoa_fee_parking_total_monthly: number
          hoa_fee_recoverable_monthly: number
          hoa_fee_total_monthly: number
          id: string
          interest_rate: number
          is_hoa_parking_split: boolean
          is_hoa_unit_split: boolean
          land_area_sqm: number | null
          land_registry_costs: number
          land_transfer_tax: number
          land_value: number
          last_renovation_year: number | null
          living_area_sqm: number
          loan_amount: number
          loan_start_date: string
          marginal_tax_rate: number
          market_rent_per_sqm: number | null
          monthly_mortgage: number
          name: string
          notary_costs: number
          notes: string
          other_costs_monthly: number
          other_income_monthly: number
          parking_count: number
          parking_rent_monthly: number
          parking_type: Database["public"]["Enums"]["parking_type"]
          postal_code: string
          property_insurance_annual: number
          property_management_annual: number
          property_tax_annual: number
          property_tax_parking_annual: number
          property_type: Database["public"]["Enums"]["property_type"]
          purchase_date: string
          purchase_price_parking: number
          purchase_price_unit: number
          renovation_afa_eligible: number
          renovation_modernization_costs: number
          rooms: number | null
          sort_order: number
          state: string
          updated_at: string
          usable_area_sqm: number | null
          user_id: string
          vacancy_rate_assumption: number
          warmmiete_monthly: number | null
          year_built: number | null
        }
        Insert: {
          acquisition_type?: Database["public"]["Enums"]["acquisition_type"]
          address?: string
          agent_fee?: number
          amortization_rate?: number
          appraisal_costs?: number
          basement_size_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          broker_commission_agreement?: number
          building_value?: number
          city?: string
          cold_rent_monthly?: number
          condition?: Database["public"]["Enums"]["property_condition"] | null
          created_at?: string
          current_market_value?: number | null
          depreciation_rate?: number
          economic_transfer_date?: string
          energy_efficiency_class?:
            | Database["public"]["Enums"]["energy_class"]
            | null
          equity_contributed?: number
          fixed_interest_period_years?: number
          floor_level?: number | null
          has_balcony?: boolean
          has_basement?: boolean
          has_fitted_kitchen?: boolean
          has_garden?: boolean
          has_terrace?: boolean
          heating_type?: Database["public"]["Enums"]["heating_type"] | null
          hoa_fee_maintenance_reserve_monthly?: number
          hoa_fee_parking_maintenance_reserve_monthly?: number
          hoa_fee_parking_recoverable_monthly?: number
          hoa_fee_parking_total_monthly?: number
          hoa_fee_recoverable_monthly?: number
          hoa_fee_total_monthly?: number
          id?: string
          interest_rate?: number
          is_hoa_parking_split?: boolean
          is_hoa_unit_split?: boolean
          land_area_sqm?: number | null
          land_registry_costs?: number
          land_transfer_tax?: number
          land_value?: number
          last_renovation_year?: number | null
          living_area_sqm?: number
          loan_amount?: number
          loan_start_date?: string
          marginal_tax_rate?: number
          market_rent_per_sqm?: number | null
          monthly_mortgage?: number
          name?: string
          notary_costs?: number
          notes?: string
          other_costs_monthly?: number
          other_income_monthly?: number
          parking_count?: number
          parking_rent_monthly?: number
          parking_type?: Database["public"]["Enums"]["parking_type"]
          postal_code?: string
          property_insurance_annual?: number
          property_management_annual?: number
          property_tax_annual?: number
          property_tax_parking_annual?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_date?: string
          purchase_price_parking?: number
          purchase_price_unit?: number
          renovation_afa_eligible?: number
          renovation_modernization_costs?: number
          rooms?: number | null
          sort_order?: number
          state?: string
          updated_at?: string
          usable_area_sqm?: number | null
          user_id: string
          vacancy_rate_assumption?: number
          warmmiete_monthly?: number | null
          year_built?: number | null
        }
        Update: {
          acquisition_type?: Database["public"]["Enums"]["acquisition_type"]
          address?: string
          agent_fee?: number
          amortization_rate?: number
          appraisal_costs?: number
          basement_size_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          broker_commission_agreement?: number
          building_value?: number
          city?: string
          cold_rent_monthly?: number
          condition?: Database["public"]["Enums"]["property_condition"] | null
          created_at?: string
          current_market_value?: number | null
          depreciation_rate?: number
          economic_transfer_date?: string
          energy_efficiency_class?:
            | Database["public"]["Enums"]["energy_class"]
            | null
          equity_contributed?: number
          fixed_interest_period_years?: number
          floor_level?: number | null
          has_balcony?: boolean
          has_basement?: boolean
          has_fitted_kitchen?: boolean
          has_garden?: boolean
          has_terrace?: boolean
          heating_type?: Database["public"]["Enums"]["heating_type"] | null
          hoa_fee_maintenance_reserve_monthly?: number
          hoa_fee_parking_maintenance_reserve_monthly?: number
          hoa_fee_parking_recoverable_monthly?: number
          hoa_fee_parking_total_monthly?: number
          hoa_fee_recoverable_monthly?: number
          hoa_fee_total_monthly?: number
          id?: string
          interest_rate?: number
          is_hoa_parking_split?: boolean
          is_hoa_unit_split?: boolean
          land_area_sqm?: number | null
          land_registry_costs?: number
          land_transfer_tax?: number
          land_value?: number
          last_renovation_year?: number | null
          living_area_sqm?: number
          loan_amount?: number
          loan_start_date?: string
          marginal_tax_rate?: number
          market_rent_per_sqm?: number | null
          monthly_mortgage?: number
          name?: string
          notary_costs?: number
          notes?: string
          other_costs_monthly?: number
          other_income_monthly?: number
          parking_count?: number
          parking_rent_monthly?: number
          parking_type?: Database["public"]["Enums"]["parking_type"]
          postal_code?: string
          property_insurance_annual?: number
          property_management_annual?: number
          property_tax_annual?: number
          property_tax_parking_annual?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_date?: string
          purchase_price_parking?: number
          purchase_price_unit?: number
          renovation_afa_eligible?: number
          renovation_modernization_costs?: number
          rooms?: number | null
          sort_order?: number
          state?: string
          updated_at?: string
          usable_area_sqm?: number | null
          user_id?: string
          vacancy_rate_assumption?: number
          warmmiete_monthly?: number | null
          year_built?: number | null
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          created_at: string
          file_path: string
          id: string
          is_cover_photo: boolean
          property_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          is_cover_photo?: boolean
          property_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          is_cover_photo?: boolean
          property_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      status_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          income_actual_monthly: number | null
          notes: string
          property_id: string
          status: Database["public"]["Enums"]["property_status"]
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          income_actual_monthly?: number | null
          notes?: string
          property_id: string
          status?: Database["public"]["Enums"]["property_status"]
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          income_actual_monthly?: number | null
          notes?: string
          property_id?: string
          status?: Database["public"]["Enums"]["property_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      acquisition_type: "kauf" | "erbschaft" | "schenkung"
      energy_class:
        | "a_plus_plus"
        | "a"
        | "b"
        | "c"
        | "d"
        | "e"
        | "f"
        | "g"
        | "h"
      extraordinary_cost_category:
        | "sonderumlage"
        | "reparatur"
        | "gutachter"
        | "rechtskosten"
        | "sonstiges"
      heating_type:
        | "fernwarme"
        | "gas"
        | "ol"
        | "warmepumpe"
        | "pellet"
        | "elektro"
        | "sonstiges"
      parking_type:
        | "nicht_vorhanden"
        | "tiefgarage"
        | "aussenstellplatz"
        | "garage"
      property_condition:
        | "neubau"
        | "erstbezug"
        | "gepflegt"
        | "renovierungsbedurftig"
        | "sanierungsbedurftig"
      property_status: "vermietet" | "leerstand" | "mietgarantie"
      property_type:
        | "apartment"
        | "einfamilienhaus"
        | "mehrfamilienhaus"
        | "gewerbe"
        | "grundstuck"
        | "sonstiges"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      acquisition_type: ["kauf", "erbschaft", "schenkung"],
      energy_class: ["a_plus_plus", "a", "b", "c", "d", "e", "f", "g", "h"],
      extraordinary_cost_category: [
        "sonderumlage",
        "reparatur",
        "gutachter",
        "rechtskosten",
        "sonstiges",
      ],
      heating_type: [
        "fernwarme",
        "gas",
        "ol",
        "warmepumpe",
        "pellet",
        "elektro",
        "sonstiges",
      ],
      parking_type: [
        "nicht_vorhanden",
        "tiefgarage",
        "aussenstellplatz",
        "garage",
      ],
      property_condition: [
        "neubau",
        "erstbezug",
        "gepflegt",
        "renovierungsbedurftig",
        "sanierungsbedurftig",
      ],
      property_status: ["vermietet", "leerstand", "mietgarantie"],
      property_type: [
        "apartment",
        "einfamilienhaus",
        "mehrfamilienhaus",
        "gewerbe",
        "grundstuck",
        "sonstiges",
      ],
    },
  },
} as const
