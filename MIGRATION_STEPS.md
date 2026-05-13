// ═══════════════════════════════════════════════════════════════════════════════
// GUIA: Substituir Dashboard Antigo pelo Novo (Com Supabase)
// ═══════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════════
// OPÇÃO 1: RÁPIDA (Recomendado para começar)
// ═════════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Criar backup do seu dashboard antigo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Renomeie: src/pages/dashboard.jsx → src/pages/dashboard.old.jsx

PASSO 2: Usar a versão nova
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. Renomeie: src/pages/dashboard-novo.jsx → src/pages/dashboard.jsx

PRONTO! Seu Dashboard agora usa Supabase ao invés de localStorage! ✅

PASSO 3: Testar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. npm run dev
4. Acesse http://localhost:5173/
5. Você deve ver seus produtos carregando do Supabase
   \*/

// ═════════════════════════════════════════════════════════════════════════════════
// OPÇÃO 2: MANUAL (Se quiser manter customizações do dashboard antigo)
// ═════════════════════════════════════════════════════════════════════════════════

/\*
Se você fez customizações no seu dashboard.jsx e quer mantê-las,
siga estas substituições passo a passo:

PASSO 1: Atualizar o import do hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANTES (localStorage):
import { useInventory } from "../context/InventoryContext";

DEPOIS (Supabase):
import { useInventory } from "../hooks/useInventory";

PASSO 2: Atualizar a desestruturação do hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANTES:
const { products } = useInventory();

DEPOIS (mais completo):
const {
products,
loading,
error,
stats,
recordOutbound,
clearError,
} = useInventory();

PASSO 3: Adicionar carregamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adicione após o return da função:

if (loading) {
return (
<div className="flex items-center justify-center h-96">
<div className="text-center">
<div className="inline-block animate-spin">
<Zap size={32} className="text-teal-500" />
</div>
<p className="mt-4 text-slate-600">
Carregando dados do banco de dados...
</p>
</div>
</div>
);
}

PASSO 4: Substituir referências de propriedades
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Faça estas substituições globais no arquivo (Ctrl+H):

ANTES → DEPOIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
p.qtd → p.current_stock
p.precoVenda → p.price
p.precoCusto → p.cost_price
p.nome → p.name
p.categoria → p.category
item.id → item.id (sem mudança)
item.cartQty → item.quantity (se tiver)

EXEMPLO ESPECÍFICO - Onde está:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Procure por "stats" e atualize assim:

ANTES:
const stats = useMemo(() => {
const faturamentoPotencial = products.reduce(
(acc, p) => acc + p.qtd _ p.precoVenda,
0
);
const investimentoEstoque = products.reduce(
(acc, p) => acc + p.qtd _ p.precoCusto,
0
);
const lucroEstimado = faturamentoPotencial - investimentoEstoque;
const criticos = [...products].sort((a, b) => a.qtd - b.qtd).slice(0, 5);
const alertasCount = products.filter((p) => p.qtd <= 5).length;
...
}, [products]);

DEPOIS:
const dashboardStats = useMemo(() => {
const faturamentoPotencial = products.reduce(
(acc, p) => acc + p.current_stock _ p.price,
0
);
const investimentoEstoque = products.reduce(
(acc, p) => acc + p.current_stock _ (p.cost_price || 0),
0
);
const lucroEstimado = faturamentoPotencial - investimentoEstoque;
const criticos = [...products]
.sort((a, b) => a.current_stock - b.current_stock)
.slice(0, 5);
const alertasCount = stats.lowStockCount + stats.outOfStockCount;
...
}, [products, stats]);

PASSO 5: Referências na renderização
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Todos os usos de "stats" devem ser "dashboardStats":

ANTES:
{stats.alertasCount} itens

DEPOIS:
{dashboardStats.alertasCount} itens

Faça: Ctrl+H → stats. → dashboardStats. (em todo o arquivo)

PASSO 6: Função de teste (ADICIONE NO FINAL DO COMPONENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adicione este código antes do return:

const [alertMessage, setAlertMessage] = useState(null);

const showAlert = (message, type = "error") => {
setAlertMessage({ type, message });
setTimeout(() => setAlertMessage(null), 5000);
};

const handleSaleExample = async () => {
if (products.length === 0) {
showAlert("Nenhum produto disponível para venda", "error");
return;
}

    const productId = products[0].id;
    const result = await recordOutbound(productId, 1, "venda");

    if (result.success) {
      showAlert(
        `Venda registrada: 1x ${products[0].name}`,
        "success"
      );
    } else {
      showAlert(result.error, "error");
    }

};

E no return, adicione este componente alertMessage (veja dashboard-novo.jsx).

\*/

// ═════════════════════════════════════════════════════════════════════════════════
// OUTRAS PÁGINAS (inventario.jsx, vendas.jsx, etc)
// ═════════════════════════════════════════════════════════════════════════════════

/\*
PARA CADA PÁGINA que usa produtos:

1️⃣ INVENTÁRIO (inventario.jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useInventory } from "../hooks/useInventory";

export default function Inventario() {
const { products, loading, recordOutbound, recordInbound } = useInventory();

if (loading) return <div>Carregando...</div>;

return (
<div>
{products.map(product => (
<div key={product.id}>
<h3>{product.name}</h3>
<p>Estoque: {product.current_stock}</p>
<p>Preço: R$ {product.price}</p>

          <button onClick={() => recordOutbound(product.id, 1)}>
            Vender
          </button>
          <button onClick={() => recordInbound(product.id, 10)}>
            Repor 10
          </button>
        </div>
      ))}
    </div>

);
}

2️⃣ VENDAS (vendas.jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useInventory } from "../hooks/useInventory";

export default function Vendas() {
const { products, recordOutbound } = useInventory();

const handleVenda = async (productId, quantity) => {
const result = await recordOutbound(
productId,
quantity,
"venda",
`SALE-${Date.now()}`
);

    if (result.success) {
      alert("✅ Venda registrada!");
    } else {
      alert(`❌ Erro: ${result.error}`);
    }

};

// ... seu código
}

3️⃣ RELATÓRIOS (relatorios.jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useInventory } from "../hooks/useInventory";

export default function Relatorios() {
const { products, stats, getProductMovements } = useInventory();

return (
<div>
<h2>Relatórios</h2>
<p>Total de produtos: {stats.totalProducts}</p>
<p>Valor total em estoque: R$ {stats.totalValue.toFixed(2)}</p>
<p>Produtos sem estoque: {stats.outOfStockCount}</p>

      {/* Listar movimentações de um produto */}
      <button onClick={() => getProductMovements(1)}>
        Ver histórico do produto 1
      </button>
    </div>

);
}
\*/

// ═════════════════════════════════════════════════════════════════════════════════
// O QUE MUDA NA SUA APP.JSX (se precisar)
// ═════════════════════════════════════════════════════════════════════════════════

/\*
Se você quer remover o InventoryContext antigo (opcional):

ANTES:
import { InventoryProvider } from "./context/InventoryContext";

function App() {
return (
<InventoryProvider>
<BrowserRouter>
<Routes>
{/_ ... _/}
</Routes>
</BrowserRouter>
</InventoryProvider>
);
}

DEPOIS (pode manter ou remover o Provider - não faz mal manter):
function App() {
return (
<BrowserRouter>
<Routes>
{/_ ... _/}
</Routes>
</BrowserRouter>
);
}

Deixar o Provider não causa problemas, apenas não será usado.
\*/

// ═════════════════════════════════════════════════════════════════════════════════
// CHECKLIST FINAL
// ═════════════════════════════════════════════════════════════════════════════════

/\*
□ .env.local configurado com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
□ SQL schema executado no Supabase (supabase_schema.sql)
□ supabaseClient.js existe em src/lib/
□ useInventory hook existe em src/hooks/
□ dashboard-novo.jsx criado ou dashboard.jsx atualizado
□ Todos os imports do hook atualizados
□ Todas as propriedades de produto renomeadas (p.qtd → p.current_stock, etc)
□ npm run dev funciona sem erros
□ Dashboard carrega dados do Supabase
□ Botão "Simular Venda" funciona
□ Erro de estoque insuficiente é tratado corretamente

Se TODOS estiverem ✅, você está pronto para usar! 🚀
\*/

export default {};
