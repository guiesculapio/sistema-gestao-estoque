import { useCallback, useEffect, useState } from "react";
import {
  fetchCategories,
  createCategory as supabaseCreateCategory,
} from "../lib/supabaseClient";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCategories();
      setCategories(rows);
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

  const createCategory = useCallback(async (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return { success: false, error: "Informe um nome para a categoria" };
    }

    const { category, error: createError } =
      await supabaseCreateCategory(trimmed);

    if (createError || !category) {
      return {
        success: false,
        error: createError || "Não foi possível criar a categoria",
      };
    }

    setCategories((prev) =>
      [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
    );
    return { success: true, category };
  }, []);

  return { categories, loading, error, createCategory, refetch: load };
}
