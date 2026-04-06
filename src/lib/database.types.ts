export type ResponseType = "understood" | "confused" | "lost";

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          created_at?: string;
          is_active?: boolean;
        };
      };
      responses: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          type: ResponseType;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          type: ResponseType;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          type?: ResponseType;
          created_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          text: string;
          cluster_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          text: string;
          cluster_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          text?: string;
          cluster_id?: number | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      response_type: ResponseType;
    };
  };
}
