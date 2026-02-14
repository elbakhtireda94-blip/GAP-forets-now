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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          dpanef_id: string | null
          dranef_id: string | null
          expires_at: string | null
          id: string
          label: string
          max_uses: number
          scope: string
          uses: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          dpanef_id?: string | null
          dranef_id?: string | null
          expires_at?: string | null
          id?: string
          label: string
          max_uses?: number
          scope: string
          uses?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          dpanef_id?: string | null
          dranef_id?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          max_uses?: number
          scope?: string
          uses?: number
        }
        Relationships: []
      }
      adp_agents: {
        Row: {
          cine: string | null
          commune_ids: string[] | null
          corps: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          dpanef_id: string
          dranef_id: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          matricule: string
          phone: string | null
          photo_url: string | null
          recruitment_date: string | null
          scale: string | null
          sex: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          cine?: string | null
          commune_ids?: string[] | null
          corps?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dpanef_id: string
          dranef_id: string
          email?: string | null
          full_name: string
          grade?: string | null
          id?: string
          matricule: string
          phone?: string | null
          photo_url?: string | null
          recruitment_date?: string | null
          scale?: string | null
          sex?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          cine?: string | null
          commune_ids?: string[] | null
          corps?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dpanef_id?: string
          dranef_id?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          matricule?: string
          phone?: string | null
          photo_url?: string | null
          recruitment_date?: string | null
          scale?: string | null
          sex?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cahier_journal_entries: {
        Row: {
          adp_user_id: string
          attachments: Json | null
          besoin_appui_hierarchique: boolean | null
          category: Database["public"]["Enums"]["journal_category"] | null
          commune_id: string | null
          contraintes_rencontrees: string | null
          created_at: string
          decisions_prises: string | null
          description: string
          dpanef_id: string
          dranef_id: string
          entry_date: string
          id: string
          justification_appui: string | null
          latitude: number | null
          location_text: string | null
          longitude: number | null
          organisations_concernees: string[] | null
          participants_count: number | null
          pdfcp_id: string | null
          perimetre_label: string | null
          priorite: string | null
          prochaines_etapes: string | null
          resultats_obtenus: string | null
          site_label: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          statut_validation: string | null
          temps_passe_min: number | null
          title: string
          updated_at: string
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          adp_user_id: string
          attachments?: Json | null
          besoin_appui_hierarchique?: boolean | null
          category?: Database["public"]["Enums"]["journal_category"] | null
          commune_id?: string | null
          contraintes_rencontrees?: string | null
          created_at?: string
          decisions_prises?: string | null
          description: string
          dpanef_id: string
          dranef_id: string
          entry_date?: string
          id?: string
          justification_appui?: string | null
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          organisations_concernees?: string[] | null
          participants_count?: number | null
          pdfcp_id?: string | null
          perimetre_label?: string | null
          priorite?: string | null
          prochaines_etapes?: string | null
          resultats_obtenus?: string | null
          site_label?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          statut_validation?: string | null
          temps_passe_min?: number | null
          title: string
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          adp_user_id?: string
          attachments?: Json | null
          besoin_appui_hierarchique?: boolean | null
          category?: Database["public"]["Enums"]["journal_category"] | null
          commune_id?: string | null
          contraintes_rencontrees?: string | null
          created_at?: string
          decisions_prises?: string | null
          description?: string
          dpanef_id?: string
          dranef_id?: string
          entry_date?: string
          id?: string
          justification_appui?: string | null
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          organisations_concernees?: string[] | null
          participants_count?: number | null
          pdfcp_id?: string | null
          perimetre_label?: string | null
          priorite?: string | null
          prochaines_etapes?: string | null
          resultats_obtenus?: string | null
          site_label?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          statut_validation?: string | null
          temps_passe_min?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      communes: {
        Row: {
          area_km2: number | null
          code: string | null
          created_at: string
          dpanef_id: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          name_ar: string | null
          population: number | null
          updated_at: string
        }
        Insert: {
          area_km2?: number | null
          code?: string | null
          created_at?: string
          dpanef_id: string
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ar?: string | null
          population?: number | null
          updated_at?: string
        }
        Update: {
          area_km2?: number | null
          code?: string | null
          created_at?: string
          dpanef_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ar?: string | null
          population?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communes_dpanef_id_fkey"
            columns: ["dpanef_id"]
            isOneToOne: false
            referencedRelation: "dpanef"
            referencedColumns: ["id"]
          },
        ]
      }
      conflicts: {
        Row: {
          adp_user_id: string
          attachments: Json | null
          commune_id: string | null
          conflict_status: Database["public"]["Enums"]["conflict_status"] | null
          conflict_type: Database["public"]["Enums"]["conflict_type"]
          created_at: string
          created_by: string | null
          description: string | null
          dpanef_id: string
          dranef_id: string
          id: string
          latitude: number | null
          location_text: string | null
          longitude: number | null
          nature: string
          parties_involved: string[] | null
          pdfcp_id: string | null
          reported_date: string
          resolution_date: string | null
          severity: Database["public"]["Enums"]["conflict_severity"] | null
          status: Database["public"]["Enums"]["validation_status"] | null
          superficie_levee_ha: number | null
          superficie_opposee_ha: number | null
          title: string
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          adp_user_id: string
          attachments?: Json | null
          commune_id?: string | null
          conflict_status?:
            | Database["public"]["Enums"]["conflict_status"]
            | null
          conflict_type: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id: string
          dranef_id: string
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          nature: string
          parties_involved?: string[] | null
          pdfcp_id?: string | null
          reported_date?: string
          resolution_date?: string | null
          severity?: Database["public"]["Enums"]["conflict_severity"] | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          superficie_levee_ha?: number | null
          superficie_opposee_ha?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          adp_user_id?: string
          attachments?: Json | null
          commune_id?: string | null
          conflict_status?:
            | Database["public"]["Enums"]["conflict_status"]
            | null
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id?: string
          dranef_id?: string
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          nature?: string
          parties_involved?: string[] | null
          pdfcp_id?: string | null
          reported_date?: string
          resolution_date?: string | null
          severity?: Database["public"]["Enums"]["conflict_severity"] | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          superficie_levee_ha?: number | null
          superficie_opposee_ha?: number | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conflicts_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      dpanef: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          dranef_id: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          dranef_id: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          dranef_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpanef_dranef_id_fkey"
            columns: ["dranef_id"]
            isOneToOne: false
            referencedRelation: "dranef"
            referencedColumns: ["id"]
          },
        ]
      }
      dranef: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          region_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          region_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dranef_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      field_activities: {
        Row: {
          activity_date: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          adp_user_id: string
          attachments: Json | null
          beneficiaries_count: number | null
          commune_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dpanef_id: string
          dranef_id: string
          id: string
          latitude: number | null
          location_text: string | null
          longitude: number | null
          object: string | null
          occasion: string | null
          participants_count: number | null
          pdfcp_id: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          title: string
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          activity_date?: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          adp_user_id: string
          attachments?: Json | null
          beneficiaries_count?: number | null
          commune_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id: string
          dranef_id: string
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          object?: string | null
          occasion?: string | null
          participants_count?: number | null
          pdfcp_id?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          adp_user_id?: string
          attachments?: Json | null
          beneficiaries_count?: number | null
          commune_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id?: string
          dranef_id?: string
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          object?: string | null
          occasion?: string | null
          participants_count?: number | null
          pdfcp_id?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_activities_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_name: string | null
          cancelled_by_role: string | null
          composante: string | null
          created_at: string
          id: string
          is_read: boolean
          localisation: string | null
          message: string
          notification_type: string
          pdfcp_id: string | null
          recipient_user_id: string
          severity: string
          title: string
          year: number | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_name?: string | null
          cancelled_by_role?: string | null
          composante?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          localisation?: string | null
          message: string
          notification_type: string
          pdfcp_id?: string | null
          recipient_user_id: string
          severity?: string
          title: string
          year?: number | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_name?: string | null
          cancelled_by_role?: string | null
          composante?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          localisation?: string | null
          message?: string
          notification_type?: string
          pdfcp_id?: string | null
          recipient_user_id?: string
          severity?: string
          title?: string
          year?: number | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          activity_domains: string[] | null
          adp_user_id: string | null
          commune_id: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          creation_date: string | null
          dpanef_id: string
          dranef_id: string
          id: string
          members_count: number | null
          name: string
          organization_status:
            | Database["public"]["Enums"]["organization_status"]
            | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          president_name: string | null
          registration_number: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          activity_domains?: string[] | null
          adp_user_id?: string | null
          commune_id?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          creation_date?: string | null
          dpanef_id: string
          dranef_id: string
          id?: string
          members_count?: number | null
          name: string
          organization_status?:
            | Database["public"]["Enums"]["organization_status"]
            | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          president_name?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          activity_domains?: string[] | null
          adp_user_id?: string | null
          commune_id?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          creation_date?: string | null
          dpanef_id?: string
          dranef_id?: string
          id?: string
          members_count?: number | null
          name?: string
          organization_status?:
            | Database["public"]["Enums"]["organization_status"]
            | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          president_name?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      pdfcp_actions: {
        Row: {
          action_key: string
          action_label: string | null
          commune_id: string | null
          coordinates: Json | null
          created_at: string
          created_by: string | null
          date_realisation: string | null
          etat: string | null
          financier: number | null
          geometry_type: string | null
          id: string
          justification_ecart: string | null
          locked: boolean | null
          notes: string | null
          pdfcp_id: string
          perimetre_id: string | null
          physique: number | null
          preuves: Json | null
          site_id: string | null
          source_cp_line_id: string | null
          source_plan_line_id: string | null
          status: Database["public"]["Enums"]["validation_status"] | null
          statut_execution: string | null
          unite: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          action_key: string
          action_label?: string | null
          commune_id?: string | null
          coordinates?: Json | null
          created_at?: string
          created_by?: string | null
          date_realisation?: string | null
          etat?: string | null
          financier?: number | null
          geometry_type?: string | null
          id?: string
          justification_ecart?: string | null
          locked?: boolean | null
          notes?: string | null
          pdfcp_id: string
          perimetre_id?: string | null
          physique?: number | null
          preuves?: Json | null
          site_id?: string | null
          source_cp_line_id?: string | null
          source_plan_line_id?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          statut_execution?: string | null
          unite: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          action_key?: string
          action_label?: string | null
          commune_id?: string | null
          coordinates?: Json | null
          created_at?: string
          created_by?: string | null
          date_realisation?: string | null
          etat?: string | null
          financier?: number | null
          geometry_type?: string | null
          id?: string
          justification_ecart?: string | null
          locked?: boolean | null
          notes?: string | null
          pdfcp_id?: string
          perimetre_id?: string | null
          physique?: number | null
          preuves?: Json | null
          site_id?: string | null
          source_cp_line_id?: string | null
          source_plan_line_id?: string | null
          status?: Database["public"]["Enums"]["validation_status"] | null
          statut_execution?: string | null
          unite?: string
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdfcp_actions_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdfcp_actions_source_cp_line_id_fkey"
            columns: ["source_cp_line_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdfcp_actions_source_plan_line_id_fkey"
            columns: ["source_plan_line_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfcp_actions_geo: {
        Row: {
          action_type: string
          centroid_lat: number
          centroid_lng: number
          coords_text_lambert: string
          created_at: string
          created_by: string | null
          date_realisation: string | null
          description: string | null
          geom_type: string
          geometry: Json | null
          id: string
          lambert_zone: string
          longueur_realisee_km: number | null
          observations: string | null
          pdfcp_id: string
          planned_action_id: string
          preuves: Json | null
          statut: string | null
          surface_realisee_ha: number | null
          titre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_type: string
          centroid_lat: number
          centroid_lng: number
          coords_text_lambert: string
          created_at?: string
          created_by?: string | null
          date_realisation?: string | null
          description?: string | null
          geom_type: string
          geometry?: Json | null
          id?: string
          lambert_zone: string
          longueur_realisee_km?: number | null
          observations?: string | null
          pdfcp_id: string
          planned_action_id: string
          preuves?: Json | null
          statut?: string | null
          surface_realisee_ha?: number | null
          titre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_type?: string
          centroid_lat?: number
          centroid_lng?: number
          coords_text_lambert?: string
          created_at?: string
          created_by?: string | null
          date_realisation?: string | null
          description?: string | null
          geom_type?: string
          geometry?: Json | null
          id?: string
          lambert_zone?: string
          longueur_realisee_km?: number | null
          observations?: string | null
          pdfcp_id?: string
          planned_action_id?: string
          preuves?: Json | null
          statut?: string | null
          surface_realisee_ha?: number | null
          titre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdfcp_actions_geo_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdfcp_actions_geo_planned_action_id_fkey"
            columns: ["planned_action_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfcp_attachments: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          pdfcp_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          pdfcp_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          pdfcp_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdfcp_attachments_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfcp_programs: {
        Row: {
          annulation_date: string | null
          annulation_motif: string | null
          annulation_par: string | null
          code: string
          commune_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dpanef_id: string
          dranef_id: string
          end_year: number
          id: string
          locked: boolean | null
          start_year: number
          status: Database["public"]["Enums"]["validation_status"] | null
          title: string
          total_budget_dh: number | null
          unlock_at: string | null
          unlock_by: string | null
          unlock_motif: string | null
          updated_at: string
          updated_by: string | null
          validated_adp_at: string | null
          validated_adp_by: string | null
          validated_dpanef_at: string | null
          validated_dpanef_by: string | null
          validation_note: string | null
          validation_status: string | null
          visa_dranef_at: string | null
          visa_dranef_by: string | null
        }
        Insert: {
          annulation_date?: string | null
          annulation_motif?: string | null
          annulation_par?: string | null
          code: string
          commune_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id: string
          dranef_id: string
          end_year: number
          id?: string
          locked?: boolean | null
          start_year: number
          status?: Database["public"]["Enums"]["validation_status"] | null
          title: string
          total_budget_dh?: number | null
          unlock_at?: string | null
          unlock_by?: string | null
          unlock_motif?: string | null
          updated_at?: string
          updated_by?: string | null
          validated_adp_at?: string | null
          validated_adp_by?: string | null
          validated_dpanef_at?: string | null
          validated_dpanef_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
          visa_dranef_at?: string | null
          visa_dranef_by?: string | null
        }
        Update: {
          annulation_date?: string | null
          annulation_motif?: string | null
          annulation_par?: string | null
          code?: string
          commune_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dpanef_id?: string
          dranef_id?: string
          end_year?: number
          id?: string
          locked?: boolean | null
          start_year?: number
          status?: Database["public"]["Enums"]["validation_status"] | null
          title?: string
          total_budget_dh?: number | null
          unlock_at?: string | null
          unlock_by?: string | null
          unlock_motif?: string | null
          updated_at?: string
          updated_by?: string | null
          validated_adp_at?: string | null
          validated_adp_by?: string | null
          validated_dpanef_at?: string | null
          validated_dpanef_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
          visa_dranef_at?: string | null
          visa_dranef_by?: string | null
        }
        Relationships: []
      }
      pdfcp_validation_history: {
        Row: {
          action: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          pdfcp_id: string
          performed_by: string | null
          performed_by_name: string | null
          performed_by_role: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          pdfcp_id: string
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          pdfcp_id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdfcp_validation_history_pdfcp_id_fkey"
            columns: ["pdfcp_id"]
            isOneToOne: false
            referencedRelation: "pdfcp_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commune_ids: string[] | null
          created_at: string
          dpanef_id: string | null
          dranef_id: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          commune_ids?: string[] | null
          created_at?: string
          dpanef_id?: string | null
          dranef_id?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          commune_ids?: string[] | null
          created_at?: string
          dpanef_id?: string | null
          dranef_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          area_km2: number | null
          code: string | null
          created_at: string
          id: string
          name: string
          name_ar: string | null
          population: number | null
          updated_at: string
        }
        Insert: {
          area_km2?: number | null
          code?: string | null
          created_at?: string
          id: string
          name: string
          name_ar?: string | null
          population?: number | null
          updated_at?: string
        }
        Update: {
          area_km2?: number | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          population?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          client_id: string | null
          error_message: string | null
          id: string
          offline_id: string | null
          operation: string
          payload: Json
          queued_at: string
          record_id: string | null
          retry_count: number | null
          sync_status: string | null
          synced_at: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          error_message?: string | null
          id?: string
          offline_id?: string | null
          operation: string
          payload: Json
          queued_at?: string
          record_id?: string | null
          retry_count?: number | null
          sync_status?: string | null
          synced_at?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          error_message?: string | null
          id?: string
          offline_id?: string | null
          operation?: string
          payload?: Json
          queued_at?: string
          record_id?: string | null
          retry_count?: number | null
          sync_status?: string | null
          synced_at?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
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
      can_validate_in_scope: {
        Args: { _dpanef_id: string; _dranef_id: string; _user_id: string }
        Returns: boolean
      }
      get_scope_priority: { Args: { _user_id: string }; Returns: number }
      get_user_commune_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_profile: {
        Args: { _user_id: string }
        Returns: {
          commune_ids: string[]
          dpanef_id: string
          dranef_id: string
          email: string
          full_name: string
          id: string
          role_label: string
          scope_level: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_scope: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "sensibilisation"
        | "formation"
        | "reunion"
        | "visite_terrain"
        | "distribution"
        | "suivi_projet"
        | "mediation"
      app_role: "ADMIN" | "NATIONAL" | "REGIONAL" | "PROVINCIAL" | "LOCAL"
      conflict_severity: "faible" | "moyenne" | "elevee" | "critique"
      conflict_status: "ouvert" | "en_cours" | "resolu" | "escalade"
      conflict_type: "conflit" | "opposition"
      journal_category:
        | "reunion"
        | "animation"
        | "mediation"
        | "diagnostic"
        | "suivi_chantier"
        | "sensibilisation"
        | "autre"
        | "animation_territoriale"
        | "suivi_pdfcp"
        | "organisation_usagers"
        | "partenariats"
        | "activite_admin"
      organization_status: "active" | "inactive" | "en_creation" | "dissoute"
      organization_type: "ODF" | "cooperative" | "association" | "AGS"
      validation_status: "draft" | "submitted" | "validated" | "archived"
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
      activity_type: [
        "sensibilisation",
        "formation",
        "reunion",
        "visite_terrain",
        "distribution",
        "suivi_projet",
        "mediation",
      ],
      app_role: ["ADMIN", "NATIONAL", "REGIONAL", "PROVINCIAL", "LOCAL"],
      conflict_severity: ["faible", "moyenne", "elevee", "critique"],
      conflict_status: ["ouvert", "en_cours", "resolu", "escalade"],
      conflict_type: ["conflit", "opposition"],
      journal_category: [
        "reunion",
        "animation",
        "mediation",
        "diagnostic",
        "suivi_chantier",
        "sensibilisation",
        "autre",
        "animation_territoriale",
        "suivi_pdfcp",
        "organisation_usagers",
        "partenariats",
        "activite_admin",
      ],
      organization_status: ["active", "inactive", "en_creation", "dissoute"],
      organization_type: ["ODF", "cooperative", "association", "AGS"],
      validation_status: ["draft", "submitted", "validated", "archived"],
    },
  },
} as const
