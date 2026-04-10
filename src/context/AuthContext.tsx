"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null; role?: UserRole }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    isLoading: true,
  });

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return data ?? null;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      profile,
      role: (profile?.role as UserRole) ?? null,
    }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          role: (profile?.role as UserRole) ?? "customer",
          isLoading: false,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            role: (profile?.role as UserRole) ?? "customer",
            isLoading: false,
          });
        } else {
          setState({ user: null, session: null, profile: null, role: null, isLoading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Fetch profile to get role for immediate redirect
    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      return { error: null, role: (profile?.role as UserRole) ?? "customer" };
    }

    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole = "customer"
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Optimistically clear local auth state so UI updates immediately.
    setState({ user: null, session: null, profile: null, role: null, isLoading: false });

    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (!error) return { error: null };

    // Fallback in case global scope fails due network/session edge-cases.
    const { error: localError } = await supabase.auth.signOut({ scope: "local" });
    return { error: localError?.message ?? error.message };
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!state.user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", state.user.id);
    if (!error) await refreshProfile();
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
