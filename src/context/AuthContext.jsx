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
      (event, newSession) => {
        if (cancelled) return;

        // Sessão expirada ou logout — limpa estado e Supabase
        // cuida do redirect via AppGate (session null → <Login />)
        if (event === "SIGNED_OUT" || event === "TOKEN_EXPIRED") {
          setSession(null);
          setLoading(false);
          return;
        }

        // Token renovado silenciosamente — atualiza sessão sem
        // flash de loading
        if (event === "TOKEN_REFRESHED") {
          setSession(newSession);
          return;
        }

        setSession(newSession ?? null);
        setLoading(false);
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

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    setSession(null); // força limpeza imediata sem esperar evento
    return { success: true };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut]
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
