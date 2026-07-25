export type JobPreference = "lavoro" | "stage" | "entrambi";

export type PositionType = "lavoro" | "stage" | "non_chiaro";

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
  position_type: PositionType;
  offer_source: string | null;
  offer_fingerprint: string;
  ats_keywords: string[];
  matched_skills: string[];
  omitted_offer_requirements: string[];
  company_research: Record<string, unknown> | null;
  optimized_cv_text: string | null;
  cover_letter: string | null;
  email_subject: string | null;
  email_body: string | null;
  honesty_notes: string[];
  status: string;
  deleted_at: string | null;
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
          position_type?: PositionType;
          offer_source?: string | null;
          offer_fingerprint: string;
          ats_keywords?: string[];
          matched_skills?: string[];
          omitted_offer_requirements?: string[];
          company_research?: Json | null;
          optimized_cv_text?: string | null;
          cover_letter?: string | null;
          email_subject?: string | null;
          email_body?: string | null;
          honesty_notes?: string[];
          status?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_title?: string;
          position_type?: PositionType;
          offer_source?: string | null;
          offer_fingerprint?: string;
          ats_keywords?: string[];
          matched_skills?: string[];
          omitted_offer_requirements?: string[];
          company_research?: Json | null;
          optimized_cv_text?: string | null;
          cover_letter?: string | null;
          email_subject?: string | null;
          email_body?: string | null;
          honesty_notes?: string[];
          status?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_preference: JobPreference;
    };
    CompositeTypes: Record<string, never>;
  };
};
