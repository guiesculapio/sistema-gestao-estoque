import { useState, useEffect, useCallback } from "react";
import { fetchProducts, createInventoryMovement } from "../lib/supabaseClient";

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useSupabaseProducts
// ═══════════════════════════════════════════════════════════════════════════════
// Hook personalizado para buscar e gerenciar produtos do Supabase

export function useSupabaseProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar produtos ao montar o componente
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
      setLoading(false);
    };

    loadProducts();
  }, []);

  // Função para registrar uma venda
  const recordSale = useCallback(
    async (productId, quantity, saleId = null, reason = "venda") => {
      try {
        const result = await createInventoryMovement({
          product_id: productId,
          type: "OUT",
          quantity,
          reason,
          sale_id: saleId,
        });

        if (result) {
          // Atualizar estado local
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId
                ? { ...p, current_stock: Math.max(0, p.current_stock - quantity) }
                : p
            )
          );
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    []
  );

  // Função para registrar uma reposição
  const recordRestocking = useCallback(
    async (productId, quantity, reason = "reposição") => {
      try {
        const result = await createInventoryMovement({
          product_id: productId,
          type: "IN",
          quantity,
          reason,
        });

        if (result) {
          // Atualizar estado local
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId
                ? { ...p, current_stock: p.current_stock + quantity }
                : p
            )
          );
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    []
  );

  return {
    products,
    loading,
    error,
    recordSale,
    recordRestocking,
  };
}
