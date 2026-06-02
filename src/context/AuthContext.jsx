import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (cancelled) return;
        setSession(newSession ?? null);
      }
    );

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, session: data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}
