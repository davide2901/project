export type JobPreference = "lavoro" | "stage" | "entrambi";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_preference: JobPreference;
    };
    CompositeTypes: Record<string, never>;
  };
};
