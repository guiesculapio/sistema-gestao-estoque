// ═══════════════════════════════════════════════════════════════════════════════
// GUIA COMPLETO: Hook useInventory com Supabase
// ═══════════════════════════════════════════════════════════════════════════════

// 📚 ÍNDICE:
// 1. Como importar e usar o hook
// 2. Funções disponíveis
// 3. Tratamento de erro de estoque insuficiente
// 4. Exemplos práticos
// 5. Integração no seu projeto

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMO IMPORTAR E USAR
// ═══════════════════════════════════════════════════════════════════════════════

import { useInventory } from "@/hooks/useInventory";

function MeuComponente() {
const {
products, // Array de produtos do Supabase
loading, // boolean: carregando dados?
error, // string: mensagem de erro (se houver)
lastMovements, // Array: últimas movimentações
stats, // Objeto com métricas
addProduct, // Função: adicionar novo produto
recordOutbound, // Função: registrar saída (venda)
recordInbound, // Função: registrar entrada (reposição)
updateProductData, // Função: atualizar dados do produto
getProductMovements, // Função: buscar histórico de movimentações
clearError, // Função: limpar mensagem de erro
} = useInventory();

// Seu código aqui...
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FUNÇÕES DISPONÍVEIS
// ═══════════════════════════════════════════════════════════════════════════════

// ┌─────────────────────────────────────────────────────────────────────────────
// │ A. recordOutbound(productId, quantity, reason, saleId)
// │ Registra uma SAÍDA (venda, consumo, etc)
// └─────────────────────────────────────────────────────────────────────────────

async function exemploVenda() {
const { recordOutbound } = useInventory();

// Registrar uma venda simples
const result = await recordOutbound(
1, // ID do produto
2, // Quantidade
"venda", // Motivo (padrão: "venda")
"SALE-20260504-001" // ID da venda (opcional)
);

if (result.success) {
console.log("✅ Venda registrada:", result.movement);
} else {
console.error("❌ Erro:", result.error);
console.log("Tipo de erro:", result.type); // 'INSUFFICIENT_STOCK' se for estoque
}
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ B. recordInbound(productId, quantity, reason)
// │ Registra uma ENTRADA (reposição, devolução, etc)
// └─────────────────────────────────────────────────────────────────────────────

async function exemploReposicao() {
const { recordInbound } = useInventory();

const result = await recordInbound(
1, // ID do produto
50, // Quantidade
"reposição" // Motivo
);

if (result.success) {
console.log("✅ Reposição registrada:", result.movement);
}
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ C. addProduct(productData)
// │ Cria um novo produto
// └─────────────────────────────────────────────────────────────────────────────

async function exemploCriarProduto() {
const { addProduct } = useInventory();

const result = await addProduct({
name: "Cabo USB-C",
description: "Cabo de carregamento rápido",
sku: "USB-C-001",
barcode: "123456789",
category: "Cabos",
price: 29.99,
cost_price: 12.00,
current_stock: 50,
min_stock: 10,
});

if (result.success) {
console.log("✅ Produto criado:", result.product);
}
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ D. updateProductData(productId, updates)
// │ Atualiza informações do produto
// └─────────────────────────────────────────────────────────────────────────────

async function exemploAtualizarProduto() {
const { updateProductData } = useInventory();

const result = await updateProductData(1, {
price: 34.99,
cost_price: 15.00,
min_stock: 20,
});

if (result.success) {
console.log("✅ Produto atualizado:", result.product);
}
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ E. getProductMovements(productId)
// │ Busca o histórico de movimentações de um produto
// └─────────────────────────────────────────────────────────────────────────────

async function exemploHistorico() {
const { getProductMovements } = useInventory();

const movements = await getProductMovements(1);
console.log("Movimentações do produto 1:", movements);
// Retorna algo como:
// [
// { id: 1, product_id: 1, type: 'OUT', quantity: 2, reason: 'venda', created_at: '2026-05-04...' },
// { id: 2, product_id: 1, type: 'IN', quantity: 50, reason: 'reposição', created_at: '2026-05-03...' },
// ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TRATAMENTO DE ERRO DE ESTOQUE INSUFICIENTE
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";

function ComponenteComTratamentoErro() {
const { recordOutbound, error, clearError } = useInventory();
const [messageAlert, setMessageAlert] = useState(null);

const handleVenda = async (productId, quantity) => {
// Limpar erro anterior
clearError();

    const result = await recordOutbound(productId, quantity, "venda");

    if (!result.success) {
      // ✅ VERIFICAR TIPO ESPECÍFICO DE ERRO
      if (result.type === "INSUFFICIENT_STOCK") {
        // Erro de estoque insuficiente
        setMessageAlert({
          type: "error",
          message: `⚠️ ${result.error}`, // Inclui detalhes: "Disponível: X, Solicitado: Y"
          showRetry: true,
        });
      } else {
        // Outro tipo de erro
        setMessageAlert({
          type: "error",
          message: `Erro: ${result.error}`,
          showRetry: false,
        });
      }
      return;
    }

    // Sucesso!
    setMessageAlert({
      type: "success",
      message: "✅ Venda registrada com sucesso!",
    });

};

return (
<div>
{messageAlert && (
<div
className={`p-4 rounded ${
            messageAlert.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`} >
{messageAlert.message}
{messageAlert.showRetry && (
<p className="text-xs mt-2">
💡 Dica: Reponha o estoque antes de registrar mais vendas
</p>
)}
</div>
)}
<button onClick={() => handleVenda(1, 5)}>Vender 5 unidades</button>
</div>
);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EXEMPLOS PRÁTICOS
// ═══════════════════════════════════════════════════════════════════════════════

// ┌─────────────────────────────────────────────────────────────────────────────
// │ EXEMPLO 1: Componente de Venda
// └─────────────────────────────────────────────────────────────────────────────

function VendaCard({ productId, productName, availableStock }) {
const { recordOutbound, error } = useInventory();
const [quantity, setQuantity] = useState(1);

const handleSale = async () => {
const result = await recordOutbound(productId, quantity, "venda");
if (result.success) {
alert(`✅ ${quantity}x ${productName} vendido!`);
setQuantity(1);
} else {
alert(`❌ Erro: ${result.error}`);
}
};

return (
<div className="border rounded p-4">
<h3>{productName}</h3>
<p>Disponível: {availableStock} un.</p>
<input
type="number"
min="1"
max={availableStock}
value={quantity}
onChange={(e) => setQuantity(parseInt(e.target.value))}
/>
<button
        onClick={handleSale}
        disabled={quantity > availableStock}
className={quantity > availableStock ? "opacity-50 cursor-not-allowed" : ""} >
Vender
</button>
</div>
);
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ EXEMPLO 2: Dashboard com produtos em tempo real
// └─────────────────────────────────────────────────────────────────────────────

function DashboardComSupabase() {
const { products, loading, stats } = useInventory();

if (loading) return <p>Carregando...</p>;

return (
<div>
<h1>Dashboard</h1>
<p>Total de produtos: {stats.totalProducts}</p>
<p>Produtos em falta: {stats.outOfStockCount}</p>
<p>Valor total em estoque: R$ {stats.totalValue.toFixed(2)}</p>

      <h2>Lista de Produtos</h2>
      {products.map((p) => (
        <div key={p.id} className="border p-2 mb-2">
          <h3>{p.name}</h3>
          <p>Categoria: {p.category}</p>
          <p>Estoque: {p.current_stock} / {p.min_stock}</p>
          <p>Preço: R$ {p.price}</p>
        </div>
      ))}
    </div>

);
}

// ┌─────────────────────────────────────────────────────────────────────────────
// │ EXEMPLO 3: Modal para reposição com validação
// └─────────────────────────────────────────────────────────────────────────────

function ModalReposicao({ productId, productName, onClose }) {
const { recordInbound } = useInventory();
const [quantity, setQuantity] = useState("");
const [loading, setLoading] = useState(false);

const handleRestocking = async () => {
if (!quantity || parseInt(quantity) <= 0) {
alert("Digite uma quantidade válida");
return;
}

    setLoading(true);
    const result = await recordInbound(
      productId,
      parseInt(quantity),
      "reposição manual"
    );
    setLoading(false);

    if (result.success) {
      alert(`✅ ${quantity} unidades adicionadas ao estoque!`);
      onClose();
    } else {
      alert(`❌ ${result.error}`);
    }

};

return (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
<div className="bg-white p-6 rounded-lg w-96">
<h2>Reposição: {productName}</h2>
<input
type="number"
placeholder="Quantidade"
value={quantity}
onChange={(e) => setQuantity(e.target.value)}
className="w-full border rounded p-2 my-4"
/>
<div className="flex gap-2">
<button
            onClick={handleRestocking}
            disabled={loading}
            className="flex-1 bg-teal-500 text-white p-2 rounded"
          >
{loading ? "Salvando..." : "Confirmar"}
</button>
<button onClick={onClose} className="flex-1 bg-gray-300 p-2 rounded">
Cancelar
</button>
</div>
</div>
</div>
);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FLUXO DE INTEGRAÇÃO NO SEU PROJETO
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Certificar-se que as variáveis de ambiente estão configuradas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arquivo: .env.local

VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

PASSO 2: Certificar-se que o SQL foi executado no Supabase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Vá em https://app.supabase.com
2. Selecione seu projeto
3. SQL Editor → New query
4. Cole todo o conteúdo de supabase_schema.sql
5. Clique "Run"

PASSO 3: Substituir o Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A. OPÇÃO A (Recomendado): Use o arquivo dashboard-novo.jsx que criei

- Renomeie seu dashboard.jsx atual para dashboard-old.jsx (backup)
- Renomeie dashboard-novo.jsx para dashboard.jsx

B. OPÇÃO B (Manual): Atualize seu dashboard.jsx atual

- Substitua: import { useInventory } from "../context/InventoryContext";
- Por: import { useInventory } from "../hooks/useInventory";
- Atualize as referências de propriedades:
  - p.qtd → p.current_stock
  - p.precoVenda → p.price
  - p.precoCusto → p.cost_price
  - p.nome → p.name
  - p.categoria → p.category

PASSO 4: Testar a conexão
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Abra seu app (npm run dev)
2. Vá para o Dashboard
3. Você deve ver "Carregando..." inicialmente
4. Depois, os produtos do Supabase aparecem
5. Clique no botão "Simular Venda" para testar
6. Experimente com estoque insuficiente para ver o erro

PASSO 5: Outras páginas (inventario.jsx, vendas.jsx, relatorios.jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Faça o mesmo: substitua useInventory do context pelo hook Supabase:

import { useInventory } from "../hooks/useInventory";

function Inventario() {
const { products, recordOutbound, recordInbound } = useInventory();
// ... seu código
}
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// CHEAT SHEET: Propriedades de Produto
// ═══════════════════════════════════════════════════════════════════════════════

/\*
Cada produto tem as seguintes propriedades:

{
id: number, // ID único
name: string, // Nome do produto
description: string | null, // Descrição
sku: string | null, // Código SKU
barcode: string | null, // Código de barras
category: string, // Categoria
price: number, // Preço de venda
cost_price: number | null, // Preço de custo
current_stock: number, // Quantidade em estoque (NUNCA negativo)
min_stock: number, // Quantidade mínima para alerta
status: string, // 'em_estoque', 'estoque_baixo', 'esgotado'
created_at: string (ISO), // Data de criação
updated_at: string (ISO), // Última atualização
}
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// PERGUNTAS FREQUENTES (FAQ)
// ═══════════════════════════════════════════════════════════════════════════════

/\*
P: Como adiciono um produto novo via interface?
R: Use a função addProduct():
const { addProduct } = useInventory();
await addProduct({ name: "...", category: "...", ... });

P: Como verifico se houve erro de estoque insuficiente?
R: Verifique result.type === 'INSUFFICIENT_STOCK'

P: Posso usar o hook em múltiplos componentes?
R: Sim! Cada componente que usar o hook terá sua própria instância
(você pode refatorar para um Context se quiser compartilhar estado)

P: O que acontece se eu tentar vender mais que o estoque?
R: Há validação local e no banco. Você recebe um erro detalhado.

P: Como removo um produto?
R: A função deleteProduct não está exposta no hook por segurança.
Você pode adicionar em src/lib/supabaseClient.js se precisar.

P: Posso editar um produto existente?
R: Sim, use updateProductData():
const { updateProductData } = useInventory();
await updateProductData(productId, { price: 39.99 });
\*/
