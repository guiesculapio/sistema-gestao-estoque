import { useCallback, useEffect, useState } from "react";
import {
  getUserPreferences,
  updateUserPreferences as supabaseUpdateUserPreferences,
} from "../lib/supabaseClient";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../lib/stock";

// Thin hook for the logged-in user's preferences.
// Follows the same format as useCategories: { preferences, loading, error,
// updatePreferences, refetch }. When there is no row yet in
// user_preferences for the user, preferences becomes an object with the global
// default so consumers can use low_stock_threshold without checking for null.
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

  // Accepts either a number (compat: stock threshold only) or an object
  // with any subset of fields ({ low_stock_threshold, profit_goal,
  // profit_goal_start, profit_goal_end }). Merges the result into the current state
  // so as not to lose fields that weren't part of the update.
  const updatePreferences = useCallback(async (patch) => {
    const payload =
      typeof patch === "object" && patch !== null
        ? patch
        : { low_stock_threshold: patch };

    const { preferences: saved, error: updateError } =
      await supabaseUpdateUserPreferences(payload);

    if (updateError || !saved) {
      return {
        success: false,
        error: updateError || "Não foi possível atualizar as preferências",
      };
    }

    setPreferences((prev) => ({ ...prev, ...saved }));
    return { success: true, preferences: saved };
  }, []);

  return { preferences, loading, error, updatePreferences, refetch: load };
}
