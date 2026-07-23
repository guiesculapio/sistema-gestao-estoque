import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUserPreferences } from "./useUserPreferences";

// ═══════════════════════════════════════════════════════════════════════════
// useProfitGoal
// ═══════════════════════════════════════════════════════════════════════════
// Lê a meta de lucro definida em user_preferences (profit_goal + período) e
// cruza com o lucro real do período somando sales.gross_profit (coluna GERADA
// pelo banco) entre profit_goal_start e profit_goal_end.
//
// Expõe: { goal, lucroAtual, percentual, restante, start, end, loading, hasGoal,
//          updatePreferences, refetch }
export function useProfitGoal() {
  const {
    preferences,
    loading: loadingPrefs,
    updatePreferences,
    refetch: refetchPrefs,
  } = useUserPreferences();

  const goal = Number(preferences?.profit_goal) || 0;
  const start = preferences?.profit_goal_start || null;
  const end = preferences?.profit_goal_end || null;

  const hasGoal = goal > 0 && Boolean(start) && Boolean(end);

  const [lucroAtual, setLucroAtual] = useState(0);
  const [loadingProfit, setLoadingProfit] = useState(false);

  const load = useCallback(async () => {
    // Só busca lucro se houver período definido.
    if (!start || !end) {
      setLucroAtual(0);
      return;
    }

    setLoadingProfit(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("gross_profit")
        .gte("sold_at", start)
        .lte("sold_at", end + "T23:59:59");

      if (error) throw error;

      const total = (data || []).reduce(
        (acc, row) => acc + (Number(row.gross_profit) || 0),
        0
      );
      setLucroAtual(total);
    } catch (err) {
      console.error("❌ Erro ao buscar lucro do período:", err.message);
      setLucroAtual(0);
    } finally {
      setLoadingProfit(false);
    }
  }, [start, end]);

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

  const percentual = goal > 0 ? Math.min((lucroAtual / goal) * 100, 100) : 0;
  const restante = Math.max(goal - lucroAtual, 0);

  // Recarrega preferências (que dispara o efeito de lucro) e o lucro do período.
  const refetch = useCallback(async () => {
    await refetchPrefs();
    await load();
  }, [refetchPrefs, load]);

  return {
    goal,
    lucroAtual,
    percentual,
    restante,
    start,
    end,
    loading: loadingPrefs || loadingProfit,
    hasGoal,
    updatePreferences,
    refetch,
  };
}
