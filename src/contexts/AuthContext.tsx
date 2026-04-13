import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Profile } from '../lib/supabase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000/api';
const AUTH_TOKEN_KEY = 'healthsetu_auth_token';
const AUTH_USER_KEY = 'healthsetu_auth_user';
const AUTH_PROFILE_KEY = 'healthsetu_auth_profile';
const AUTH_ERROR_KEY = 'healthsetu_auth_error';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
  profile: Profile;
}

interface RegisterResponse {
  message: string;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeProfile(profile: Profile): Profile {
  const now = new Date().toISOString();
  return {
    ...profile,
    created_at: profile.created_at || now,
    updated_at: profile.updated_at || now,
  };
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = safeParse<AuthUser>(localStorage.getItem(AUTH_USER_KEY));
      const storedProfile = safeParse<Profile>(localStorage.getItem(AUTH_PROFILE_KEY));

      if (!token || !storedUser || !storedProfile) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        setUser(storedUser);
        setProfile(normalizeProfile(storedProfile));
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = (payload as { message?: string }).message || 'Session expired. Please login again.';
          if (response.status === 403) {
            localStorage.setItem(AUTH_ERROR_KEY, message);
          } else {
            localStorage.removeItem(AUTH_ERROR_KEY);
          }
          throw new Error(message);
        }

        localStorage.removeItem(AUTH_ERROR_KEY);

        const data = payload as { user: AuthUser; profile: Profile };

        if (mounted) {
          const nextProfile = normalizeProfile(data.profile);
          setUser(data.user);
          setProfile(nextProfile);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(nextProfile));
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_PROFILE_KEY);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  async function sendAuthRequest(url: string, body: Record<string, unknown>) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<AuthResponse> & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || 'Authentication failed.');
      }

      if (!payload.token || !payload.user || !payload.profile) {
        throw new Error('Invalid response from authentication server.');
      }

      const normalizedProfile = normalizeProfile(payload.profile as Profile);
      setUser(payload.user as AuthUser);
      setProfile(normalizedProfile);
      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
      localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalizedProfile));
      localStorage.removeItem(AUTH_ERROR_KEY);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  const signUp = async (email: string, password: string, profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...profileData,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<RegisterResponse> & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || 'Registration failed.');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    return sendAuthRequest(`${API_BASE_URL}/auth/login`, { email, password });
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_PROFILE_KEY);
    localStorage.removeItem(AUTH_ERROR_KEY);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
