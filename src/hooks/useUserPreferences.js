import { useCallback, useEffect, useState } from "react";
import {
  getUserPreferences,
  updateUserPreferences as supabaseUpdateUserPreferences,
} from "../lib/supabaseClient";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../lib/stock";

// Hook fino para as preferências do usuário logado.
// Segue o mesmo formato de useCategories: { preferences, loading, error,
// updatePreferences, refetch }. Quando ainda não existir linha em
// user_preferences para o usuário, preferences vira um objeto com o default
// global para que consumidores possam usar low_stock_threshold sem checar null.
export function useUserPreferences() {
  const [preferences, setPreferences] = useState({
    low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getUserPreferences();
      setPreferences(
        row ?? { low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD }
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const updatePreferences = useCallback(async (threshold) => {
    const { preferences: saved, error: updateError } =
      await supabaseUpdateUserPreferences(threshold);

    if (updateError || !saved) {
      return {
        success: false,
        error: updateError || "Não foi possível atualizar as preferências",
      };
    }

    setPreferences(saved);
    return { success: true, preferences: saved };
  }, []);

  return { preferences, loading, error, updatePreferences, refetch: load };
}
