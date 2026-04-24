import { createContext, useContext, useState, useMemo } from "react";

// 1. Criamos o Contexto (CORREÇÃO: Adicionado o 'export' aqui)
export const InventoryContext = createContext();

// 2. Provedor que vai envolver o App
export function InventoryProvider({ children }) {
  // ATUALIZADO: Chaves em português para bater com a página de Inventário
  const [products, setProducts] = useState([
    {
      id: 1,
      nome: "Cabo HDMI 2.1 2m",
      categoria: "Cabos",
      qtd: 3,
      precoCusto: 28.0,
      precoVenda: 49.9,
      status: "estoque_baixo",
    },
    {
      id: 2,
      nome: "Cadeira Ergonômica Flexform",
      categoria: "Mobiliário",
      qtd: 3,
      precoCusto: 980.0,
      precoVenda: 1850.0,
      status: "estoque_baixo",
    },
    {
      id: 3,
      nome: "Headset Sony WH-1000XM5",
      categoria: "Áudio",
      qtd: 18,
      precoCusto: 870.0,
      precoVenda: 1299.0,
      status: "em_estoque",
    },
  ]);

  // Funções para manipular os dados (CRUD)
  const addProduct = (newProduct) => {
    setProducts((prev) => [...prev, { ...newProduct, id: Date.now() }]);
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Cálculos Automáticos ATUALIZADOS para ler 'precoCusto', 'precoVenda' e 'qtd'
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
      value={{ products, addProduct, deleteProduct, metrics }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

// 3. Hook personalizado para facilitar o uso nas páginas
export const useInventory = () => useContext(InventoryContext);
