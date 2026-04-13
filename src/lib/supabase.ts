import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

type AuthSession = {
  user: null;
};

type QueryResult<T> = Promise<{
  data: T;
  error: null;
  count: number | null;
}>;

type SupabaseLike = {
  auth: {
    getSession: () => Promise<{ data: { session: AuthSession | null } }>;
    onAuthStateChange: (
      callback: () => void
    ) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
    signInWithPassword: (args: { email: string; password: string }) => Promise<{ error: Error | null }>;
    signUp: (args: { email: string; password: string }) => Promise<{ data: { user: null; session: null }; error: Error | null }>;
    signOut: () => Promise<{ error: null }>;
  };
  from: (table: string) => FallbackQueryBuilder;
};

class FallbackQueryBuilder {
  select(..._args: unknown[]) {
    return this;
  }

  eq(..._args: unknown[]) {
    return this;
  }

  in(..._args: unknown[]) {
    return this;
  }

  or(..._args: unknown[]) {
    return this;
  }

  order(..._args: unknown[]) {
    return this;
  }

  limit(..._args: unknown[]) {
    return this;
  }

  update(..._args: unknown[]) {
    return this;
  }

  insert(..._args: unknown[]) {
    return this;
  }

  maybeSingle(): QueryResult<null> {
    return Promise.resolve({ data: null, error: null, count: null });
  }

  single(): QueryResult<null> {
    return Promise.resolve({ data: null, error: null, count: null });
  }

  then<TResult1 = { data: never[]; error: null; count: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: never[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled, onrejected);
  }
}

const fallbackSupabase = {
  auth: {
    async getSession() {
      return { data: { session: null as AuthSession | null } };
    },
    onAuthStateChange(callback: () => void) {
      return {
        data: {
          subscription: {
            unsubscribe() {
              callback();
            },
          },
        },
      };
    },
    async signInWithPassword() {
      return { error: new Error('Supabase is not configured in this workspace.') };
    },
    async signUp() {
      return { data: { user: null, session: null }, error: new Error('Supabase is not configured in this workspace.') };
    },
    async signOut() {
      return { error: null };
    },
  },
  from() {
    return new FallbackQueryBuilder();
  },
};

export const supabase = hasSupabaseConfig
  ? (createClient(supabaseUrl, supabaseAnonKey) as unknown as SupabaseLike)
  : (fallbackSupabase as SupabaseLike);

export type UserRole = 'villager' | 'asha_worker' | 'doctor' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  village?: string;
  created_at: string;
  updated_at: string;
}
