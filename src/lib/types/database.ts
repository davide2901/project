import type { ApplicationPackage } from "@/lib/ai/schema";

export type JobPreference = "lavoro" | "stage" | "entrambi";

/** Workflow utente. draft/archived = legacy (mappati in UI). */
export type ApplicationStatus =
  | "ready"
  | "sent"
  | "waiting"
  | "interview"
  | "closed"
  | "draft"
  | "archived";

export type ApplicationPositionType = ApplicationPackage["position_type"];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FigmaConnectionStatus = {
  connected: boolean;
  figma_handle: string | null;
  figma_email: string | null;
  connected_at: string | null;
};

export type FigmaExportJobStatus = "pending" | "consumed" | "expired";

export type FigmaExportJob = {
  id: string;
  user_id: string;
  application_id: string | null;
  file_key: string | null;
  node_name: string;
  payload: Json;
  sync_code: string;
  status: FigmaExportJobStatus;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  figma_cv_url: string | null;
  figma_portfolio_url: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "full_name"
    | "figma_cv_url"
    | "figma_portfolio_url"
    | "skills"
    | "cv_fallback_text"
    | "job_preference"
    | "companies_of_interest"
  >
>;

export type Application = {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  position_type: ApplicationPositionType;
  offer_source: string | null;
  offer_fingerprint: string;
  package: ApplicationPackage;
  status: ApplicationStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationListItem = Pick<
  Application,
  | "id"
  | "company_name"
  | "role_title"
  | "position_type"
  | "status"
  | "created_at"
>;

export type DiscoveredOfferStatus = "new" | "watching" | "dismissed" | "applied";

export type SalarySource = "annuncio" | "stima";

export type DiscoveredOffer = {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  position_type: ApplicationPositionType;
  location: string | null;
  source_url: string | null;
  snippet: string;
  match_reason: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_source: SalarySource | null;
  status: DiscoveredOfferStatus;
  created_at: string;
  updated_at: string;
};

export type CompanyIntelConfidence = "alta" | "media" | "bassa";

export type CompanyIntelRow = {
  id: string;
  company_key: string;
  company_name: string;
  role_key: string;
  role_title: string | null;
  payload: import("@/lib/ai/company-intel-schema").CompanyIntelPayload;
  confidence: CompanyIntelConfidence;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          figma_cv_url?: string | null;
          figma_portfolio_url?: string | null;
          skills?: string[];
          cv_fallback_text?: string | null;
          job_preference?: JobPreference;
          companies_of_interest?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          figma_cv_url?: string | null;
          figma_portfolio_url?: string | null;
          skills?: string[];
          cv_fallback_text?: string | null;
          job_preference?: JobPreference;
          companies_of_interest?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: Application;
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_title: string;
          position_type?: ApplicationPositionType;
          offer_source?: string | null;
          offer_fingerprint?: string;
          package: ApplicationPackage;
          status?: ApplicationStatus;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          position_type?: ApplicationPositionType;
          offer_source?: string | null;
          offer_fingerprint?: string;
          package?: ApplicationPackage;
          status?: ApplicationStatus;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      discovered_offers: {
        Row: DiscoveredOffer;
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_title: string;
          position_type?: ApplicationPositionType;
          location?: string | null;
          source_url?: string | null;
          snippet?: string;
          match_reason?: string;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_source?: SalarySource | null;
          status?: DiscoveredOfferStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          position_type?: ApplicationPositionType;
          location?: string | null;
          source_url?: string | null;
          snippet?: string;
          match_reason?: string;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_source?: SalarySource | null;
          status?: DiscoveredOfferStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discovered_offers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      company_intel: {
        Row: CompanyIntelRow;
        Insert: {
          id?: string;
          company_key: string;
          company_name: string;
          role_key?: string;
          role_title?: string | null;
          payload?: CompanyIntelRow["payload"];
          confidence?: CompanyIntelConfidence;
          fetched_at?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_key?: string;
          company_name?: string;
          role_key?: string;
          role_title?: string | null;
          payload?: CompanyIntelRow["payload"];
          confidence?: CompanyIntelConfidence;
          fetched_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      figma_connections: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          figma_user_id: string | null;
          figma_email: string | null;
          figma_handle: string | null;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          figma_user_id?: string | null;
          figma_email?: string | null;
          figma_handle?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          figma_user_id?: string | null;
          figma_email?: string | null;
          figma_handle?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      figma_export_jobs: {
        Row: FigmaExportJob;
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          file_key?: string | null;
          node_name?: string;
          payload: Json;
          sync_code: string;
          status?: FigmaExportJobStatus;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string | null;
          file_key?: string | null;
          node_name?: string;
          payload?: Json;
          sync_code?: string;
          status?: FigmaExportJobStatus;
          expires_at?: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_preference: JobPreference;
    };
    CompositeTypes: Record<string, never>;
  };
};
