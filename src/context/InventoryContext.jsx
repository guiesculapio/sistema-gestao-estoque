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
  // Estado Inicial mantido conforme solicitado
  const [products, setProducts] = useState([
    {
      id: 1,
      barcode: "789001", // Adicionei um exemplo de barcode para você testar
      nome: "Cabo HDMI 2.1 2m",
      categoria: "Cabos",
      qtd: 3,
      precoCusto: 28.0,
      precoVenda: 49.9,
      status: "estoque_baixo",
    },
    {
      id: 2,
      barcode: "789002",
      nome: "Cadeira Ergonômica Flexform",
      categoria: "Mobiliário",
      qtd: 3,
      precoCusto: 980.0,
      precoVenda: 1850.0,
      status: "estoque_baixo",
    },
    {
      id: 3,
      barcode: "789003",
      nome: "Headset Sony WH-1000XM5",
      categoria: "Áudio",
      qtd: 18,
      precoCusto: 870.0,
      precoVenda: 1299.0,
      status: "em_estoque",
    },
  ]);

  // --- FUNÇÕES CRUD EXISTENTES ---

  const addProduct = (newProduct) => {
    // Mantive sua lógica de ID, mas incluí o spread do novo produto
    setProducts((prev) => [...prev, { ...newProduct, id: Date.now() }]);
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // --- NOVA FUNÇÃO: BAIXA DE ESTOQUE (VENDA) ---

  const sellItems = useCallback((itemsToSell) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        // Verifica se o produto atual está no carrinho de vendas
        const itemInCart = itemsToSell.find((item) => item.id === product.id);

        if (itemInCart) {
          const novaQtd = Math.max(0, (product.qtd || 0) - itemInCart.cartQty);

          // Atualiza a quantidade e o status automaticamente baseado na sua regra de negócio
          return {
            ...product,
            qtd: novaQtd,
            status: novaQtd < 5 ? "estoque_baixo" : "em_estoque",
          };
        }
        return product;
      })
    );
  }, []);

  // --- CÁLCULOS AUTOMÁTICOS (MANTIDOS) ---
  const metrics = useMemo(() => {
    const totalCost = products.reduce(
      (acc, p) => acc + (p.precoCusto || 0) * (p.qtd || 0),
      0
    );
    const totalValue = products.reduce(
      (acc, p) => acc + (p.precoVenda || 0) * (p.qtd || 0),
      0
    );
    const totalProfit = totalValue - totalCost;
    const lowStockCount = products.filter((p) => p.qtd < 5).length;

    return { totalCost, totalValue, totalProfit, lowStockCount };
  }, [products]);

  return (
    <InventoryContext.Provider
      // Adicionado sellItems no value para ser acessado pela página de Vendas
      value={{ products, addProduct, deleteProduct, sellItems, metrics }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

// 3. Hook personalizado
export const useInventory = () => useContext(InventoryContext);
