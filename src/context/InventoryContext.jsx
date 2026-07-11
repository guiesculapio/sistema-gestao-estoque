import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  fetchProducts,
  createProduct as supabaseCreateProduct,
  updateProduct as supabaseUpdateProduct,
  deleteProduct as supabaseDeleteProduct,
  createInventoryMovement,
  createInventoryLog,
  fetchProductHistory as supabaseFetchProductHistory,
} from "../lib/supabaseClient";
import { isLowStock, computeStockStatus } from "../lib/stock";
import { useUserPreferences } from "../hooks/useUserPreferences";

export const InventoryContext = createContext();

// ─────────────────────────────────────────────────────────────
// Tradução entre o formato PT do Context e o schema EN do Supabase.
// Mantém a API externa em PT para não quebrar consumidores.
// ─────────────────────────────────────────────────────────────
function toSupabaseProduct(p) {
  return {
    name: p.nome,
    category_id: p.categoria_id != null ? Number(p.categoria_id) : null,
    barcode: p.barcode || null,
    sku: p.sku || null,
    current_stock: Number.parseInt(p.qtd, 10) || 0,
    cost_price:
      p.precoCusto != null && p.precoCusto !== ""
        ? Number.parseFloat(p.precoCusto)
        : null,
    price: Number.parseFloat(p.precoVenda) || 0,
    // min_stock null = usa threshold global do user_preferences (regra em src/lib/stock.js).
    min_stock:
      p.min_stock != null && p.min_stock !== ""
        ? Number.parseInt(p.min_stock, 10)
        : null,
    status: p.status || "em_estoque",
  };
}

function fromSupabaseProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    nome: row.name,
    categoria_id: row.category_id ?? null,
    categoria: row.categories?.name ?? null,
    qtd: row.current_stock,
    min_stock: row.min_stock ?? null,
    precoCusto: row.cost_price != null ? Number(row.cost_price) : 0,
    precoVenda: Number(row.price),
    status: row.status,
  };
}

// Tradução parcial PT → EN para updates (não sobrescreve campos ausentes).
function toSupabaseUpdates(updates) {
  const payload = {};
  if ("nome" in updates) payload.name = updates.nome;
  if ("categoria_id" in updates)
    payload.category_id =
      updates.categoria_id != null ? Number(updates.categoria_id) : null;
  if ("barcode" in updates) payload.barcode = updates.barcode || null;
  if ("sku" in updates) payload.sku = updates.sku || null;
  if ("qtd" in updates)
    payload.current_stock = Number.parseInt(updates.qtd, 10) || 0;
  if ("precoCusto" in updates)
    payload.cost_price =
      updates.precoCusto != null && updates.precoCusto !== ""
        ? Number.parseFloat(updates.precoCusto)
        : null;
  if ("precoVenda" in updates)
    payload.price = Number.parseFloat(updates.precoVenda) || 0;
  if ("min_stock" in updates)
    payload.min_stock =
      updates.min_stock != null && updates.min_stock !== ""
        ? Number.parseInt(updates.min_stock, 10)
        : null;
  if ("status" in updates) payload.status = updates.status;
  return payload;
}

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const { preferences: userPreferences } = useUserPreferences();

  // Carregar produtos do Supabase na montagem
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchProducts();
      if (cancelled) return;
      setProducts(rows.map(fromSupabaseProduct));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- FUNÇÕES CRUD ---
  const addProduct = useCallback(async (newProduct) => {
    const payload = toSupabaseProduct(newProduct);
    const saved = await supabaseCreateProduct(payload);

    if (!saved) {
      console.error(
        "❌ addProduct: falha ao persistir no Supabase. Estado local NÃO foi atualizado."
      );
      return { success: false, error: "Falha ao salvar produto no banco" };
    }

    const local = fromSupabaseProduct(saved);
    setProducts((prev) => [...prev, local]);

    // Log de auditoria: criação conta como ENTRADA do estoque inicial.
    await createInventoryLog({
      product_id: local.id,
      type: "ENTRADA",
      quantity: local.qtd || 0,
    });

    return { success: true, product: local };
  }, []);

  const updateProduct = useCallback(async (id, updatedData) => {
    const payload = toSupabaseUpdates(updatedData);
    const saved = await supabaseUpdateProduct(id, payload);

    if (!saved) {
      console.error(
        `❌ updateProduct: falha ao atualizar produto ${id} no Supabase. Estado local NÃO foi atualizado.`
      );
      return { success: false, error: "Falha ao atualizar produto no banco" };
    }

    const local = fromSupabaseProduct(saved);

    // Calcula delta de qtd usando o estado anterior (snapshot dentro do updater).
    let qtdDelta = 0;
    setProducts((prev) => {
      if ("qtd" in updatedData) {
        const old = prev.find((p) => p.id === id);
        if (old) qtdDelta = (local.qtd || 0) - (old.qtd || 0);
      }
      return prev.map((p) => (p.id === id ? local : p));
    });

    await createInventoryLog({
      product_id: id,
      type: "ALTERACAO",
      quantity: qtdDelta,
    });

    return { success: true, product: local };
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const ok = await supabaseDeleteProduct(id);

    if (!ok) {
      console.error(
        `❌ deleteProduct: falha ao excluir produto ${id} no Supabase. Estado local NÃO foi atualizado.`
      );
      return { success: false, error: "Falha ao excluir produto no banco" };
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  }, []);

  // --- FUNÇÃO DE VENDA (PERSISTE EM inventory_movements + ESTADO LOCAL) ---
  const sellItems = useCallback(async (itemsToSell) => {
    const sharedSaleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // 1) Inserir cada item como movimento OUT no Supabase.
    // O trigger do banco decrementa products.current_stock automaticamente,
    // e a CHECK constraint impede estoque negativo.
    const persisted = [];
    for (const item of itemsToSell) {
      const movement = await createInventoryMovement({
        product_id: item.id,
        type: "OUT",
        quantity: item.cartQty,
        reason: "venda",
        sale_id: sharedSaleId,
      });

      if (movement) {
        persisted.push(item);
      } else {
        console.error(
          `❌ sellItems: falha ao registrar saída de ${item.nome} (id ${item.id}). Item ignorado no estado local.`
        );
      }
    }

    if (persisted.length === 0) {
      return { success: false, error: "Nenhuma venda foi persistida" };
    }

    // Log de auditoria: cada item persistido vira uma SAIDA no inventory_logs.
    await Promise.all(
      persisted.map((item) =>
        createInventoryLog({
          product_id: item.id,
          type: "SAIDA",
          quantity: item.cartQty,
        })
      )
    );

    // 2) Atualizar estado local somente com os itens efetivamente persistidos
    const newSalesEntry = persisted.map((item) => ({
      saleId: sharedSaleId,
      productId: item.id,
      nome: item.nome,
      categoria: item.categoria,
      qtdVendida: item.cartQty,
      valorVenda: item.precoVenda,
      custoUnitario: item.precoCusto,
      lucroReal: (item.precoVenda - item.precoCusto) * item.cartQty,
      data: timestamp,
    }));

    setSales((prev) => [...prev, ...newSalesEntry]);

    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const itemInCart = persisted.find((item) => item.id === product.id);
        if (itemInCart) {
          const novaQtd = Math.max(0, (product.qtd || 0) - itemInCart.cartQty);
          const updated = { ...product, qtd: novaQtd };
          return {
            ...updated,
            status: computeStockStatus(updated, userPreferences),
          };
        }
        return product;
      })
    );

    return {
      success: true,
      saleId: sharedSaleId,
      persistedCount: persisted.length,
      requestedCount: itemsToSell.length,
    };
  }, [userPreferences]);

  // --- MÉTRICAS GLOBAIS ---
  const metrics = useMemo(() => {
    const stockCost = products.reduce(
      (acc, p) => acc + p.precoCusto * p.qtd,
      0
    );
    const stockPotentialValue = products.reduce(
      (acc, p) => acc + p.precoVenda * p.qtd,
      0
    );

    const realRevenue = sales.reduce(
      (acc, s) => acc + s.valorVenda * s.qtdVendida,
      0
    );
    const realProfit = sales.reduce((acc, s) => acc + s.lucroReal, 0);

    const lowStockCount = products.filter((p) =>
      isLowStock(p, userPreferences)
    ).length;

    return {
      stockCost,
      stockPotentialValue,
      realRevenue,
      realProfit,
      lowStockCount,
      totalSalesCount: sales.length,
    };
  }, [products, sales, userPreferences]);

  const fetchProductHistory = useCallback(
    (id) => supabaseFetchProductHistory(id),
    []
  );

  return (
    <InventoryContext.Provider
      value={{
        products,
        sales,
        addProduct,
        updateProduct,
        deleteProduct,
        sellItems,
        metrics,
        fetchProductHistory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error(
      "useInventory deve ser usado dentro de um InventoryProvider"
    );
  }
  return context;
};
