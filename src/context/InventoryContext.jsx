import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  createProduct as supabaseCreateProduct,
  createInventoryMovement,
} from "../lib/supabaseClient";

export const InventoryContext = createContext();

// ─────────────────────────────────────────────────────────────
// Tradução entre o formato PT do Context e o schema EN do Supabase.
// Mantém a API externa em PT para não quebrar consumidores.
// ─────────────────────────────────────────────────────────────
function toSupabaseProduct(p) {
  return {
    name: p.nome,
    category: p.categoria || "Geral",
    barcode: p.barcode || null,
    sku: p.sku || null,
    current_stock: Number.parseInt(p.qtd, 10) || 0,
    cost_price:
      p.precoCusto != null && p.precoCusto !== ""
        ? Number.parseFloat(p.precoCusto)
        : null,
    price: Number.parseFloat(p.precoVenda) || 0,
    min_stock: 5,
    status: p.status || "em_estoque",
  };
}

function fromSupabaseProduct(row) {
  return {
    id: row.id,
    barcode: row.barcode,
    nome: row.name,
    categoria: row.category,
    qtd: row.current_stock,
    precoCusto: row.cost_price != null ? Number(row.cost_price) : 0,
    precoVenda: Number(row.price),
    status: row.status,
  };
}

export function InventoryProvider({ children }) {
  // Inicialização do estado com persistência local
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("@inventory_products");
    return saved ? JSON.parse(saved) : [];
  });

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem("@inventory_sales");
    return saved ? JSON.parse(saved) : [];
  });

  // Persistência automática
  useEffect(() => {
    localStorage.setItem("@inventory_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("@inventory_sales", JSON.stringify(sales));
  }, [sales]);

  // --- FUNÇÕES CRUD ---
  const addProduct = useCallback(async (newProduct) => {
    // 1) Persistir no Supabase
    const payload = toSupabaseProduct(newProduct);
    const saved = await supabaseCreateProduct(payload);

    if (!saved) {
      console.error(
        "❌ addProduct: falha ao persistir no Supabase. Estado local NÃO foi atualizado."
      );
      return { success: false, error: "Falha ao salvar produto no banco" };
    }

    // 2) Adotar o id real gerado pelo banco e atualizar estado local
    const local = fromSupabaseProduct(saved);
    setProducts((prev) => [...prev, local]);

    return { success: true, product: local };
  }, []);

  const updateProduct = useCallback((id, updatedData) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p))
    );
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
          return {
            ...product,
            qtd: novaQtd,
            status:
              novaQtd <= 0
                ? "esgotado"
                : novaQtd < 5
                  ? "estoque_baixo"
                  : "em_estoque",
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
  }, []);

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

    const lowStockCount = products.filter((p) => p.qtd < 5).length;

    return {
      stockCost,
      stockPotentialValue,
      realRevenue,
      realProfit,
      lowStockCount,
      totalSalesCount: sales.length,
    };
  }, [products, sales]);

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
