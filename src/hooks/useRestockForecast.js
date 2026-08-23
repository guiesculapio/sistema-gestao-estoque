import { useCallback, useEffect, useState } from "react";
import { fetchSalesSince } from "../lib/supabaseClient";
import { calculateRestockForecast } from "../lib/restockForecast";
import { useInventory } from "../context/InventoryContext";

const FORECAST_WINDOW_DAYS = 28;

// Groups public.sales rows (one row per unit sold, per product) into the
// per-day { date, quantity } shape calculateRestockForecast expects,
// keyed by product_id.
function groupSalesByProduct(salesRows) {
  const byProduct = new Map();

  for (const row of salesRows) {
    const productId = row.product_id;
    const date = row.sold_at;
    const quantity = Number(row.qty_sold) || 0;

    if (!byProduct.has(productId)) byProduct.set(productId, []);
    byProduct.get(productId).push({ date, quantity });
  }

  return byProduct;
}

// Restock forecast for every product of the logged-in user, computed from
// the last 28 days of sales in public.sales. Follows the same error
// exposure pattern as InventoryContext: { loadError } is set on failure and
// the caught error is never swallowed silently (it's logged and surfaced).
export function useRestockForecast() {
  const { products } = useInventory();

  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - FORECAST_WINDOW_DAYS);

      const salesRows = await fetchSalesSince(since.toISOString());
      const salesByProduct = groupSalesByProduct(salesRows);

      const results = products.map((product) => {
        const forecast = calculateRestockForecast({
          currentStock: product.qtd,
          salesHistory: salesByProduct.get(product.id) || [],
          minStock: product.min_stock,
        });

        return {
          productId: product.id,
          nome: product.nome,
          currentStock: product.qtd,
          ...forecast,
        };
      });

      setForecasts(results);
    } catch (err) {
      console.error("[useRestockForecast] Error loading forecast:", err);
      setLoadError("Falha ao calcular previsão de reposição. Verifique sua conexão.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [products]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        // load() already recorded loadError; nothing further to do here.
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { forecasts, loading, loadError, refetch: load };
}
