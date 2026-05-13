import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  createInventoryMovement,
  fetchProductMovements,
  fetchOutboundHistory,
} from "../lib/supabaseClient";

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useInventory
// ═══════════════════════════════════════════════════════════════════════════════
// Hook customizado para gerenciar estoque com Supabase
// Gerencia: produtos, movimentações, loading, errors

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMovements, setLastMovements] = useState([]);
  const [outboundHistory, setOutboundHistory] = useState([]);
  const abortControllerRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Carregar produtos ao montar
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      // Criar abort controller para cancelar se componente desmontar
      abortControllerRef.current = new AbortController();

      try {
        const [productsData, historyData] = await Promise.all([
          fetchProducts(),
          fetchOutboundHistory(),
        ]);
        if (!abortControllerRef.current?.signal.aborted) {
          setProducts(productsData);
          setOutboundHistory(historyData);
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          setError(
            err.message || "Erro ao carregar produtos do banco de dados"
          );
          console.error("❌ Erro ao carregar produtos:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Adicionar novo produto
  // ─────────────────────────────────────────────────────────────────────────────
  const addProduct = useCallback(async (productData) => {
    try {
      setError(null);

      // Validações básicas
      if (!productData.name || productData.name.trim() === "") {
        throw new Error("Nome do produto é obrigatório");
      }
      if (productData.price <= 0) {
        throw new Error("Preço deve ser maior que zero");
      }
      if (productData.current_stock < 0) {
        throw new Error("Estoque não pode ser negativo");
      }

      // Criar produto
      const newProduct = await createProduct({
        name: productData.name.trim(),
        description: productData.description || null,
        sku: productData.sku || null,
        barcode: productData.barcode || null,
        category: productData.category || "Sem categoria",
        price: parseFloat(productData.price),
        cost_price: productData.cost_price
          ? parseFloat(productData.cost_price)
          : null,
        current_stock: parseInt(productData.current_stock, 10) || 0,
        min_stock: parseInt(productData.min_stock, 10) || 5,
        status: "em_estoque",
      });

      if (newProduct) {
        // Adicionar ao estado local
        setProducts((prev) => [newProduct, ...prev]);
        return { success: true, product: newProduct };
      }

      throw new Error("Falha ao criar produto");
    } catch (err) {
      const errorMessage = err.message || "Erro ao adicionar produto";
      setError(errorMessage);
      console.error("❌ Erro ao adicionar produto:", err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Registrar Saída (Venda) com tratamento de erro de estoque
  // ─────────────────────────────────────────────────────────────────────────────
  const recordOutbound = useCallback(
    async (productId, quantity, reason = "venda", saleId = null) => {
      try {
        setError(null);

        // Validações
        const product = products.find((p) => p.id === productId);
        if (!product) {
          throw new Error(`Produto com ID ${productId} não encontrado`);
        }

        if (quantity <= 0) {
          throw new Error("Quantidade deve ser maior que zero");
        }

        // Verificação local antes de enviar (UX melhorada)
        if (product.current_stock < quantity) {
          throw new Error(
            `Estoque insuficiente para ${product.name}. Disponível: ${product.current_stock}, Solicitado: ${quantity}`
          );
        }

        // Registrar movimentação no banco
        const movement = await createInventoryMovement({
          product_id: productId,
          type: "OUT",
          quantity,
          reason,
          sale_id: saleId,
        });

        if (!movement) {
          throw new Error(
            "Falha ao registrar movimentação (verifique o estoque)"
          );
        }

        // Atualizar estado local com sucesso
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, current_stock: Math.max(0, p.current_stock - quantity) }
              : p
          )
        );

        setLastMovements((prev) => [movement, ...prev.slice(0, 9)]);

        // Adicionar ao histórico de saídas (preço resolvido no consumidor
        // a partir do product_id × lista de produtos em memória)
        setOutboundHistory((prev) => [
          ...prev,
          {
            id: movement.id,
            created_at: movement.created_at,
            quantity: movement.quantity,
            product_id: movement.product_id,
          },
        ]);

        return { success: true, movement };
      } catch (err) {
        // ✅ TRATAMENTO ESPECIAL DE ERRO DE ESTOQUE
        const errorMessage = err.message;

        // Detectar se é erro de constraint CHECK do banco
        if (
          errorMessage.includes("Estoque insuficiente") ||
          errorMessage.includes("insuficiente") ||
          err.code === "23514" // Código PostgreSQL para CHECK constraint
        ) {
          const customError = `⚠️ Estoque insuficiente! ${errorMessage}`;
          setError(customError);
          return {
            success: false,
            error: customError,
            type: "INSUFFICIENT_STOCK",
          };
        }

        setError(errorMessage);
        console.error("❌ Erro ao registrar saída:", err);
        return { success: false, error: errorMessage };
      }
    },
    [products]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Registrar Entrada (Reposição)
  // ─────────────────────────────────────────────────────────────────────────────
  const recordInbound = useCallback(
    async (productId, quantity, reason = "reposição") => {
      try {
        setError(null);

        // Validações
        const product = products.find((p) => p.id === productId);
        if (!product) {
          throw new Error(`Produto com ID ${productId} não encontrado`);
        }

        if (quantity <= 0) {
          throw new Error("Quantidade deve ser maior que zero");
        }

        // Registrar movimentação
        const movement = await createInventoryMovement({
          product_id: productId,
          type: "IN",
          quantity,
          reason,
        });

        if (!movement) {
          throw new Error("Falha ao registrar movimentação");
        }

        // Atualizar estado local
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, current_stock: p.current_stock + quantity }
              : p
          )
        );

        setLastMovements((prev) => [movement, ...prev.slice(0, 9)]);

        return { success: true, movement };
      } catch (err) {
        const errorMessage = err.message || "Erro ao registrar reposição";
        setError(errorMessage);
        console.error("❌ Erro ao registrar entrada:", err);
        return { success: false, error: errorMessage };
      }
    },
    [products]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Atualizar produto
  // ─────────────────────────────────────────────────────────────────────────────
  const updateProductData = useCallback(async (productId, updates) => {
    try {
      setError(null);

      const updated = await updateProduct(productId, updates);

      if (updated) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? updated : p))
        );
        return { success: true, product: updated };
      }

      throw new Error("Falha ao atualizar produto");
    } catch (err) {
      const errorMessage = err.message || "Erro ao atualizar produto";
      setError(errorMessage);
      console.error("❌ Erro ao atualizar produto:", err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Obter movimentações de um produto
  // ─────────────────────────────────────────────────────────────────────────────
  const getProductMovements = useCallback(async (productId) => {
    try {
      const movements = await fetchProductMovements(productId);
      return movements;
    } catch (err) {
      console.error("❌ Erro ao buscar movimentações:", err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNÇÃO: Limpar erro
  // ─────────────────────────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTRICAS ÚTEIS
  // ─────────────────────────────────────────────────────────────────────────────
  const stats = {
    totalProducts: products.length,
    lowStockCount: products.filter(
      (p) => p.current_stock > 0 && p.current_stock <= p.min_stock
    ).length,
    outOfStockCount: products.filter((p) => p.current_stock === 0).length,
    totalValue: products.reduce((acc, p) => acc + p.current_stock * p.price, 0),
    totalCost: products.reduce(
      (acc, p) => acc + p.current_stock * (p.cost_price || 0),
      0
    ),
  };

  return {
    // Estado
    products,
    loading,
    error,
    lastMovements,
    outboundHistory,

    // Funções
    addProduct,
    recordOutbound, // Registrar venda/saída
    recordInbound, // Registrar reposição/entrada
    updateProductData,
    getProductMovements,
    clearError,

    // Métricas
    stats,
  };
}
