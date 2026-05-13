// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLOS DE USO - Supabase Client
// ═══════════════════════════════════════════════════════════════════════════════

// 📌 OPÇÃO 1: Usar o hook personalizado (RECOMENDADO)
// ─────────────────────────────────────────────────────────────────────────────

import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";

function MeuComponente() {
  const { products, loading, error, recordSale, recordRestocking } =
    useSupabaseProducts();

  if (loading) return <div>Carregando produtos...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Produtos ({products.length})</h2>
      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Estoque: {product.current_stock}</p>
          <button onClick={() => recordSale(product.id, 1)}>
            Registrar venda
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// 📌 OPÇÃO 2: Usar diretamente as funções (Para casos específicos)
// ─────────────────────────────────────────────────────────────────────────────

import {
  fetchProducts,
  createProduct,
  updateProduct,
  createInventoryMovement,
} from "@/lib/supabaseClient";

async function exemploUsoDirecto() {
  // Buscar todos os produtos
  const produtos = await fetchProducts();
  console.log("Produtos:", produtos);

  // Criar um novo produto
  const novoProduto = await createProduct({
    name: "Novo Produto",
    description: "Descrição do produto",
    sku: "SKU001",
    category: "Eletrônicos",
    price: 99.99,
    cost_price: 50.0,
    current_stock: 10,
    min_stock: 5,
  });

  // Atualizar estoque
  await updateProduct(novoProduto.id, {
    current_stock: 15,
  });

  // Registrar uma movimentação de estoque
  await createInventoryMovement({
    product_id: novoProduto.id,
    type: "IN",
    quantity: 5,
    reason: "Reposição de estoque",
  });
}

// ─────────────────────────────────────────────────────────────────────────────

// 📌 INTEGRAÇÃO NO App.jsx (EXEMPLO COMPLETO)
// ─────────────────────────────────────────────────────────────────────────────

/*
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/mainlayout";
import Dashboard from "./pages/dashboard";
import Inventario from "./pages/inventario";
import Relatorios from "./pages/relatorios";
import Vendas from "./pages/vendas";
import { InventoryProvider } from "./context/InventoryContext";
import { useSupabaseProducts } from "./hooks/useSupabaseProducts"; // ← IMPORTAR

function AppContent() {
  // ✅ Usar o hook para carregar produtos do Supabase
  const { products: supabaseProducts, loading } = useSupabaseProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg font-semibold">Carregando dados do banco...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}

export default App;
*/

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP DO .env.local
// ═══════════════════════════════════════════════════════════════════════════════

/*
Arquivo: .env.local

VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

Você encontra essas valores em:
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em "Settings" → "API"
4. Copie "Project URL" e "anon" key
*/

// ═══════════════════════════════════════════════════════════════════════════════
// OPERAÇÕES COMUNS
// ═══════════════════════════════════════════════════════════════════════════════

// 1️⃣ Listar todos os produtos
export async function exemplo1() {
  const { fetchProducts } = require("@/lib/supabaseClient");
  const produtos = await fetchProducts();
  console.log("Total de produtos:", produtos.length);
}

// 2️⃣ Criar um novo produto
export async function exemplo2() {
  const { createProduct } = require("@/lib/supabaseClient");
  await createProduct({
    name: "Cabo USB-C",
    description: "Cabo de carregamento rápido",
    sku: "USB-C-001",
    category: "Cabos",
    price: 29.99,
    cost_price: 12.0,
    current_stock: 50,
    min_stock: 10,
  });
}

// 3️⃣ Registrar uma venda
export async function exemplo3() {
  const { createInventoryMovement } = require("@/lib/supabaseClient");
  await createInventoryMovement({
    product_id: 1, // ID do produto
    type: "OUT",
    quantity: 2,
    reason: "venda",
    sale_id: "SALE-20260504-001",
  });
}

// 4️⃣ Registrar uma reposição
export async function exemplo4() {
  const { createInventoryMovement } = require("@/lib/supabaseClient");
  await createInventoryMovement({
    product_id: 1,
    type: "IN",
    quantity: 20,
    reason: "reposição",
  });
}

// 5️⃣ Atualizar preço de um produto
export async function exemplo5() {
  const { updateProduct } = require("@/lib/supabaseClient");
  await updateProduct(1, {
    price: 39.99,
    cost_price: 15.0,
  });
}
