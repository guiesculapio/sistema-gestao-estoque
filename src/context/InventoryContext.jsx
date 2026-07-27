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
  createSale,
  fetchSales,
  fetchProductHistory as supabaseFetchProductHistory,
} from "../lib/supabaseClient";
import { isLowStock, computeStockStatus } from "../lib/stock";
import { useUserPreferences } from "../hooks/useUserPreferences";

export const InventoryContext = createContext();

// ─────────────────────────────────────────────────────────────
// Translation between the Context's PT format and Supabase's EN schema.
// Keeps the external API in PT so as not to break consumers.
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
    // min_stock null = uses the global threshold from user_preferences (rule in src/lib/stock.js).
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

// Row translation from public.sales (EN schema) → PT shape consumed by the
// reports. lucroReal uses the GENERATED gross_profit column when present.
function fromSupabaseSale(row) {
  const sale = Number(row.sale_price);
  const cost = row.cost_price != null ? Number(row.cost_price) : 0;
  const qty = row.qty_sold;
  return {
    saleId: row.id,
    productId: row.product_id,
    nome: row.nome,
    categoria: row.categoria,
    qtdVendida: qty,
    valorVenda: sale,
    custoUnitario: cost,
    lucroReal:
      row.gross_profit != null ? Number(row.gross_profit) : (sale - cost) * qty,
    data: row.sold_at,
  };
}

// Partial PT → EN translation for updates (does not overwrite missing fields).
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
  const [loadError, setLoadError] = useState(null);
  const { preferences: userPreferences } = useUserPreferences();

  // Load products from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchProducts();
        if (cancelled) return;
        setProducts(rows.map(fromSupabaseProduct));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[InventoryContext] Error loading products:", err);
        setLoadError("Falha ao carregar produtos. Verifique sua conexão.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load sales history from Supabase on mount (durable source for the
  // reports — previously the `sales` array was only local state and was lost on reload).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchSales();
        if (cancelled) return;
        setSales(rows.map(fromSupabaseSale));
      } catch (err) {
        if (cancelled) return;
        console.error("[InventoryContext] Error loading sales:", err);
        setLoadError("Falha ao carregar vendas. Verifique sua conexão.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- CRUD FUNCTIONS ---
  const addProduct = useCallback(async (newProduct) => {
    const payload = toSupabaseProduct(newProduct);
    const { data: saved, error } = await supabaseCreateProduct(payload);

    if (error || !saved) {
      console.error(
        "❌ addProduct: failed to persist to Supabase. Local state was NOT updated."
      );
      // Forwards the specific message (e.g. duplicate 23505) to the UI.
      return { success: false, error: error || "Falha ao salvar produto no banco" };
    }

    const local = fromSupabaseProduct(saved);
    setProducts((prev) => [...prev, local]);

    // Audit log: creation counts as initial stock ENTRADA.
    await createInventoryLog({
      product_id: local.id,
      type: "ENTRADA",
      quantity: local.qtd || 0,
    });

    return { success: true, product: local };
  }, []);

  const updateProduct = useCallback(async (id, updatedData) => {
    const payload = toSupabaseUpdates(updatedData);
    const { data: saved, error } = await supabaseUpdateProduct(id, payload);

    if (error || !saved) {
      console.error(
        `❌ updateProduct: failed to update product ${id} in Supabase. Local state was NOT updated.`
      );
      // Forwards the specific message (e.g. duplicate 23505) to the UI.
      return {
        success: false,
        error: error || "Falha ao atualizar produto no banco",
      };
    }

    const local = fromSupabaseProduct(saved);

    // Calculates the qty delta using the previous state (snapshot inside the updater).
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
        `❌ deleteProduct: failed to delete product ${id} in Supabase. Local state was NOT updated.`
      );
      return { success: false, error: "Falha ao excluir produto no banco" };
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  }, []);

  // --- SALE FUNCTION (PERSISTS TO public.sales + inventory_movements) ---
  // Order matters and is strictly sequential: if ANY database step
  // fails, it throws and does NOT update local state (avoids diverging from the database).
  const sellItems = useCallback(
    async (itemsToSell) => {
      // 1) Persist the sale to public.sales — durable source for the reports.
      //    This is the "gate": if it fails, nothing else happens (stock is not touched).
      const { data: salesRows, error: salesError } =
        await createSale(itemsToSell);
      if (salesError) {
        throw new Error(
          `Falha ao registrar venda no banco: ${
            salesError.message || "erro desconhecido"
          }. Nada foi alterado localmente.`
        );
      }

      // 2) Record each outgoing movement in inventory_movements. The database
      //    trigger automatically decrements products.current_stock and the CHECK
      //    constraint prevents negative stock — that's why we do NOT do a manual
      //    stock UPDATE here (it would cause a double deduction).
      const sharedSaleId = `SALE-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      for (const item of itemsToSell) {
        const movement = await createInventoryMovement({
          product_id: item.id,
          type: "OUT",
          quantity: item.cartQty,
          reason: "venda",
          sale_id: sharedSaleId,
        });
        if (!movement) {
          throw new Error(
            `Venda registrada, mas falhou ao dar baixa no estoque de ${item.nome} (id ${item.id}). Recarregue a página para reconciliar com o banco.`
          );
        }
      }

      // 3) Audit log: each item becomes a SAIDA in inventory_logs.
      await Promise.all(
        itemsToSell.map((item) =>
          createInventoryLog({
            product_id: item.id,
            type: "SAIDA",
            quantity: item.cartQty,
          })
        )
      );

      // 4) Only now update local state — after ALL database operations
      //    have returned without error. We use the rows returned
      //    by createSale (real ids and gross_profit coming from the database).
      setSales((prev) => [...prev, ...(salesRows || []).map(fromSupabaseSale)]);

      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          const itemInCart = itemsToSell.find((item) => item.id === product.id);
          if (itemInCart) {
            const novaQtd = Math.max(
              0,
              (product.qtd || 0) - itemInCart.cartQty
            );
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
        persistedCount: itemsToSell.length,
        requestedCount: itemsToSell.length,
      };
    },
    [userPreferences]
  );

  // --- GLOBAL METRICS ---
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
        userPreferences,
        loadError,
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
