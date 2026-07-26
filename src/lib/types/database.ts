import type { ApplicationPackage } from "@/lib/ai/schema";

export type JobPreference = "lavoro" | "stage" | "entrambi";

export type ApplicationStatus = "draft" | "ready" | "sent" | "archived";

export type ApplicationPositionType = ApplicationPackage["position_type"];

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

export type DiscoveredOfferStatus = "new" | "dismissed" | "applied";

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
  status: DiscoveredOfferStatus;
  created_at: string;
  updated_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_preference: JobPreference;
    };
    CompositeTypes: Record<string, never>;
  };
};
