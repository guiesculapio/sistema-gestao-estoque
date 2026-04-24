import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

export const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  // Inicialização do estado com persistência local
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("@inventory_products");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            barcode: "789001",
            nome: "Cabo HDMI 2.1 2m",
            categoria: "Cabos",
            qtd: 10,
            precoCusto: 28.0,
            precoVenda: 49.9,
            status: "em_estoque",
          },
          {
            id: 2,
            barcode: "789002",
            nome: "Cadeira Ergonômica Flexform",
            categoria: "Mobiliário",
            qtd: 5,
            precoCusto: 980.0,
            precoVenda: 1850.0,
            status: "em_estoque",
          },
        ];
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
  const addProduct = useCallback((newProduct) => {
    setProducts((prev) => [...prev, { ...newProduct, id: Date.now() }]);
  }, []);

  const updateProduct = useCallback((id, updatedData) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p))
    );
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- FUNÇÃO DE VENDA (COM REGISTRO DE HISTÓRICO) ---
  const sellItems = useCallback((itemsToSell) => {
    const timestamp = new Date().toISOString();

    const newSalesEntry = itemsToSell.map((item) => ({
      saleId: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        const itemInCart = itemsToSell.find((item) => item.id === product.id);
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
