import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

// 1. Criamos o Contexto
export const InventoryContext = createContext();

// 2. Provedor que vai envolver o App
export function InventoryProvider({ children }) {
  // Estado de Produtos (Estoque Atual)
  const [products, setProducts] = useState([
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
  ]);

  // --- NOVO ESTADO: HISTÓRICO DE VENDAS REALIZADAS ---
  const [sales, setSales] = useState([]);

  // --- FUNÇÕES CRUD ---
  const addProduct = (newProduct) => {
    setProducts((prev) => [...prev, { ...newProduct, id: Date.now() }]);
  };

  // NOVA FUNÇÃO: updateProduct (Essencial para o Modal de Edição funcionar)
  const updateProduct = useCallback((id, updatedData) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p))
    );
  }, []);

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // --- FUNÇÃO DE VENDA ATUALIZADA (BAIXA + REGISTRO) ---
  const sellItems = useCallback((itemsToSell) => {
    const timestamp = new Date().toISOString();

    // 1. Registra a venda no histórico
    const newSalesEntry = itemsToSell.map((item) => ({
      saleId: Date.now() + Math.random(),
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

    // 2. Atualiza o estoque
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

  // --- CÁLCULOS DE MÉTRICAS ---
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

    const salesPerformance = sales.reduce((acc, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = {
          nome: sale.nome,
          lucroTotal: 0,
          totalVendido: 0,
        };
      }
      acc[sale.productId].lucroTotal += sale.lucroReal;
      acc[sale.productId].totalVendido += sale.qtdVendida;
      return acc;
    }, {});

    const topSellingProducts = Object.values(salesPerformance)
      .sort((a, b) => b.lucroTotal - a.lucroTotal)
      .slice(0, 5);

    const lowStockCount = products.filter((p) => p.qtd < 5).length;

    return {
      stockCost,
      stockPotentialValue,
      realRevenue,
      realProfit,
      topSellingProducts,
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
        updateProduct, // Exportada para uso no Modal
        deleteProduct,
        sellItems,
        metrics,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

// 3. Hook personalizado
export const useInventory = () => useContext(InventoryContext);