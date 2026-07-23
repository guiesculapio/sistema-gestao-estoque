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

// Tradução linha de public.sales (schema EN) → shape PT consumido pelos
// relatórios. lucroReal usa a coluna GERADA gross_profit quando presente.
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

  // Carregar histórico de vendas do Supabase na montagem (fonte durável dos
  // relatórios — antes o array `sales` era só estado local e sumia no reload).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchSales();
      if (cancelled) return;
      setSales(rows.map(fromSupabaseSale));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- FUNÇÕES CRUD ---
  const addProduct = useCallback(async (newProduct) => {
    const payload = toSupabaseProduct(newProduct);
    const { data: saved, error } = await supabaseCreateProduct(payload);

    if (error || !saved) {
      console.error(
        "❌ addProduct: falha ao persistir no Supabase. Estado local NÃO foi atualizado."
      );
      // Repassa a mensagem específica (ex.: duplicata 23505) para a UI.
      return { success: false, error: error || "Falha ao salvar produto no banco" };
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
    const { data: saved, error } = await supabaseUpdateProduct(id, payload);

    if (error || !saved) {
      console.error(
        `❌ updateProduct: falha ao atualizar produto ${id} no Supabase. Estado local NÃO foi atualizado.`
      );
      // Repassa a mensagem específica (ex.: duplicata 23505) para a UI.
      return {
        success: false,
        error: error || "Falha ao atualizar produto no banco",
      };
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

  // --- FUNÇÃO DE VENDA (PERSISTE EM public.sales + inventory_movements) ---
  // Ordem importa e é estritamente sequencial: se QUALQUER etapa do banco
  // falhar, lança erro e NÃO atualiza o estado local (evita divergir do banco).
  const sellItems = useCallback(
    async (itemsToSell) => {
      // 1) Persistir a venda em public.sales — fonte durável dos relatórios.
      //    É o "gate": se falhar, nada mais acontece (estoque não é tocado).
      const { data: salesRows, error: salesError } =
        await createSale(itemsToSell);
      if (salesError) {
        throw new Error(
          `Falha ao registrar venda no banco: ${
            salesError.message || "erro desconhecido"
          }. Nada foi alterado localmente.`
        );
      }

      // 2) Registrar cada saída em inventory_movements. O trigger do banco
      //    decrementa products.current_stock automaticamente e a CHECK
      //    constraint impede estoque negativo — por isso NÃO fazemos UPDATE
      //    manual de estoque aqui (causaria baixa dupla).
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

      // 3) Log de auditoria: cada item vira uma SAIDA no inventory_logs.
      await Promise.all(
        itemsToSell.map((item) =>
          createInventoryLog({
            product_id: item.id,
            type: "SAIDA",
            quantity: item.cartQty,
          })
        )
      );

      // 4) Só agora atualiza o estado local — depois de TODAS as operações
      //    do banco terem retornado sem erro. Usamos as linhas retornadas
      //    por createSale (ids e gross_profit reais vindos do banco).
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
