// ═══════════════════════════════════════════════════════════════════════════════
// GUIA COMPLETO DE TESTES - Sistema de Estoque com Supabase
// ═══════════════════════════════════════════════════════════════════════════════

/\*
ÍNDICE:

1. Verificação Inicial
2. Teste de Conexão com Supabase
3. Teste da Tabela products
4. Teste da Tabela inventory_movements
5. Teste de Constraint (Estoque Negativo)
6. Teste do Hook useInventory
7. Teste do Dashboard
8. Teste de Cenários Críticos
   \*/

// ═══════════════════════════════════════════════════════════════════════════════
// 1. VERIFICAÇÃO INICIAL
// ═══════════════════════════════════════════════════════════════════════════════

/\*
✅ CHECKLIST PRÉ-TESTES:

□ npm install @supabase/supabase-js executado
□ .env.local criado com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
□ SQL Schema (supabase_schema.sql) executado no Supabase
□ supabaseClient.js existe em src/lib/
□ useInventory hook existe em src/hooks/
□ dashboard-novo.jsx existe em src/pages/
□ InventoryComponents.jsx existe em src/components/

Se algum item não estiver ✅, volte e execute antes de testar.
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TESTE DE CONEXÃO COM SUPABASE
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Criar arquivo de teste temporário
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie um arquivo src/test-supabase.js:

import { supabase } from './lib/supabaseClient';

async function testConnection() {
console.log('🧪 Testando conexão com Supabase...');

try {
// Testa autenticação anônima
const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Erro de autenticação:', error.message);
      return false;
    }

    console.log('✅ Conexão autenticada!');

    // Tenta fazer uma query simples
    const { data: products, error: queryError } = await supabase
      .from('products')
      .select('count');

    if (queryError) {
      console.error('❌ Erro na query:', queryError.message);
      return false;
    }

    console.log('✅ Query funcionando!');
    return true;

} catch (err) {
console.error('❌ Erro desconhecido:', err);
return false;
}
}

testConnection();

PASSO 2: Executar no console do navegador
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. npm run dev
2. Abra o console do navegador (F12)
3. Você deve ver:
   ✅ Conexão autenticada!
   ✅ Query funcionando!

Se não aparecer, verifique:

- .env.local está configurado corretamente?
- Variáveis de ambiente estão sendo carregadas? (import.meta.env.VITE\_\*)
- Supabase está online?
  \*/

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TESTE DA TABELA PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Inserir um produto de teste via Supabase UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Vá em https://app.supabase.com
2. Selecione seu projeto
3. Table Editor → products
4. Clique em "+" para inserir uma linha
5. Preencha:
   - name: "Produto Teste"
   - category: "Teste"
   - price: 99.99
   - current_stock: 10
   - min_stock: 5

PASSO 2: Verificar no console
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No console do navegador, execute:

import { fetchProducts } from '@/lib/supabaseClient.js';
const products = await fetchProducts();
console.log('Produtos:', products);

Você deve ver seu produto listado com todas as informações.
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TESTE DA TABELA INVENTORY_MOVEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Registrar uma movimentação via código
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No console, execute:

import { createInventoryMovement } from '@/lib/supabaseClient.js';

// Registrar uma entrada
const result = await createInventoryMovement({
product_id: 1, // Substitua pelo ID real do seu produto
type: 'IN',
quantity: 20,
reason: 'teste'
});

console.log('Resultado:', result);

Você deve ver uma mensagem ✅ Movimentação registrada com sucesso!

PASSO 2: Verificar na Supabase UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Vá para Table Editor → inventory_movements
2. Você deve ver a movimentação que acabou de criar
3. Verifique que o current_stock do produto aumentou
   \*/

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TESTE DE CONSTRAINT (ESTOQUE NEGATIVO)
// ═══════════════════════════════════════════════════════════════════════════════

/\*
✅ ESTE É O TESTE MAIS IMPORTANTE!

PASSO 1: Tentar vender mais que o estoque
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No console, execute:

import { createInventoryMovement } from '@/lib/supabaseClient.js';

// Tentar remover 100 unidades quando há apenas 10
const result = await createInventoryMovement({
product_id: 1, // Substitua pelo ID real
type: 'OUT',
quantity: 100,
reason: 'teste de erro'
});

console.log('Resultado:', result);

RESULTADO ESPERADO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você deve ver um erro como:

❌ Erro ao registrar movimentação:
"Estoque insuficiente: tentativa de remover 100 unidades, mas há apenas 10 em estoque"

OU no console.error:
Erro ao registrar saída: Error: Estoque insuficiente...

PASSO 2: Verificar que o estoque NÃO foi alterado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No console, execute:

import { fetchProducts } from '@/lib/supabaseClient.js';
const products = await fetchProducts();
const product = products.find(p => p.id === 1);
console.log('Estoque atual:', product.current_stock);

O estoque deve ser O MESMO de antes (não diminuiu).
✅ Isso confirma que a constraint CHECK funcionou!
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TESTE DO HOOK useInventory
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Criar componente de teste temporário
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie src/test-hook.jsx:

import { useInventory } from '@/hooks/useInventory';

export default function TestHook() {
const {
products,
loading,
error,
recordOutbound,
recordInbound,
} = useInventory();

const handleTest = async () => {
console.log('🧪 Testando recordOutbound...');

    if (products.length === 0) {
      console.error('Nenhum produto disponível');
      return;
    }

    const result = await recordOutbound(
      products[0].id,
      1,
      'teste'
    );

    console.log('Resultado:', result);

};

return (
<div style={{ padding: '20px', fontFamily: 'monospace' }}>
<h2>Teste do Hook</h2>
<p>Loading: {loading ? '✅' : '❌'}</p>
<p>Produtos: {products.length}</p>
{error && <p style={{ color: 'red' }}>Erro: {error}</p>}

      <button onClick={handleTest} style={{ padding: '10px', marginTop: '20px' }}>
        Testar Venda
      </button>

      <div style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(products, null, 2)}
      </div>
    </div>

);
}

PASSO 2: Adicionar à rota temporária
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Em src/App.jsx, adicione:

import TestHook from '@/test-hook';

// Na rota:
<Route path="test" element={<TestHook />} />

PASSO 3: Acessar e testar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. npm run dev
2. Acesse http://localhost:5173/test
3. Você verá:
   - Loading: ✅ (depois muda para ❌)
   - Produtos: [número de produtos]
   - Lista de produtos em JSON
4. Clique em "Testar Venda"
5. Verifique o console do navegador (F12)
   \*/

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TESTE DO DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/\*
PASSO 1: Atualizar rota do Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Em src/App.jsx, atualize a rota de dashboard para usar a versão nova:

import Dashboard from '@/pages/dashboard-novo';

Ou renomeie os arquivos:

- Renomeie dashboard.jsx para dashboard-old.jsx (backup)
- Renomeie dashboard-novo.jsx para dashboard.jsx

PASSO 2: Acessar o Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. npm run dev
2. Acesse http://localhost:5173/
3. Você deve ver:
   ✅ "Carregando dados do banco de dados..." inicialmente
   ✅ Cards com dados reais do Supabase
   ✅ Lista de produtos críticos
   ✅ Gráficos com dados reais
4. Clique em "Simular Venda"
5. Você deve ver um alerta de sucesso ou erro

CENÁRIOS DE TESTE:

A) Venda bem-sucedida:

- Produto com estoque > 1
- Clique "Simular Venda"
- Deve aparecer ✅ sucesso
- Estoque deve diminuir em 1

B) Erro de estoque insuficiente:

- Venda continuamente até esgotar o produto
- Última venda deve falhar com:
  "⚠️ Estoque insuficiente! ... Disponível: 0..."
- Estoque não deve ficar negativo
  \*/

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TESTE DE CENÁRIOS CRÍTICOS
// ═══════════════════════════════════════════════════════════════════════════════

/\*
CENÁRIO 1: Vender até esgotar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Crie um produto com estoque = 5
2. Registre 5 vendas de 1 unidade cada
3. Sexta venda deve falhar
4. Verifique que status mudou para "esgotado"

Esperado: ✅ Tudo funciona sem estoque negativo

CENÁRIO 2: Reposição após esgotamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Produto esgotado (estoque = 0)
2. Registre uma reposição de 50 unidades
3. Verifique que:
   - Estoque virou 50
   - Status virou "em_estoque"
   - Último movimento aparece no histórico

Esperado: ✅ Produto revive corretamente

CENÁRIO 3: Múltiplas movimentações rápidas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Crie um produto com estoque = 100
2. Registre rapidamente:
   - OUT: 30
   - IN: 50
   - OUT: 40
   - OUT: 50 (deve falhar)
3. Estoque final deve ser: 100 - 30 + 50 - 40 = 80

Esperado: ✅ Controle transacional funciona

CENÁRIO 4: Validação de Constraint do Banco
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Tente removendo via SQL direto (bypass da aplicação):

   UPDATE products SET current_stock = -5 WHERE id = 1;

2. Banco deve recusar com erro:
   "new row for relation "products" violates check constraint..."

Esperado: ✅ Banco nega operação inválida (segurança em camadas)

CENÁRIO 5: Erro de rede
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Desconecte a internet (ou use DevTools para simular)
2. Tente registrar uma venda
3. Deve aparecer erro de conexão

Esperado: ✅ Aplicação não quebra, mostra erro amigável

CENÁRIO 6: Concorrência (abra em 2 abas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Abra o app em 2 abas do navegador
2. Aba 1: Produto tem 5 unidades
3. Aba 1: Venda 2 unidades (agora tem 3)
4. Aba 2: Ainda mostra 5 (cache local)
5. Aba 2: Tente vender 4 unidades
6. Deve falhar porque estoque é 3 (servidor tem razão)

Esperado: ✅ Servidor valida, nega tentativa inválida
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLIST FINAL DE TESTES
// ═══════════════════════════════════════════════════════════════════════════════

/\*
✅ Conexão com Supabase funciona
✅ Tabela products pode inserir dados
✅ Tabela inventory_movements registra movimentações
✅ Constraint CHECK impede estoque negativo
✅ Hook useInventory carrega produtos
✅ Hook useInventory registra saídas
✅ Hook useInventory registra entradas
✅ Tratamento de erro de estoque insuficiente funciona
✅ Dashboard exibe dados reais
✅ Status do produto muda automaticamente
✅ Múltiplas movimentações funcionam
✅ Banco rejeita operações inválidas

Se TODOS os ✅ estiverem passando, seu sistema está PRONTO PARA PRODUÇÃO! 🚀
\*/

// ═══════════════════════════════════════════════════════════════════════════════
// DICAS PARA DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════

/\*

1. CONSOLE DO NAVEGADOR (F12 → Console)
   - Mostra logs do supabaseClient.js
   - Mostra errors do hook
   - Dica: supabase.from() logs automáticos

2. SUPABASE STUDIO (app.supabase.com → Logs)
   - Mostra todas as queries SQL executadas
   - Mostra erros de banco de dados
   - Útil para verificar se a constraint disparou

3. NETWORK TAB (F12 → Network)
   - Mostra requisições para Supabase
   - Verifica latência
   - Dica: procure por "supabase" nos requests

4. REACT DEVTOOLS (Chrome Extension)
   - Mostra estado do hook em tempo real
   - Dica: procure pelo hook useInventory

5. Erro comum: "VITE_SUPABASE_URL não está definido"
   - Solução: Reinicie npm run dev depois de adicionar .env.local
   - Os valores são carregados ao iniciar o server

6. Erro comum: "401 Unauthorized"
   - Solução: Verifique se VITE_SUPABASE_ANON_KEY está correto
   - Dica: Copie direto de app.supabase.com → Settings → API

7. Erro comum: "relation 'products' does not exist"
   - Solução: Execute o SQL schema no Supabase SQL Editor
   - Dica: Verifique se as tabelas aparecem em Database → Tables
     \*/

export default {};
