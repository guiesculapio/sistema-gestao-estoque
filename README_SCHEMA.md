# 📚 Sistema de Gestão de Estoque com Supabase - Resumo Completo

## 🎯 O que foi criado?

### **Arquivos de Configuração**

| Arquivo               | Descrição                                                          | Status                            |
| --------------------- | ------------------------------------------------------------------ | --------------------------------- |
| `.env.local`          | Variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) | 📝 Edite com suas credenciais     |
| `supabase_schema.sql` | Script SQL para criar tabelas no Supabase                          | ✅ Execute no Supabase SQL Editor |

### **Arquivos Core**

| Arquivo                            | Descrição                    | Função                              |
| ---------------------------------- | ---------------------------- | ----------------------------------- |
| `src/lib/supabaseClient.js`        | Cliente Supabase configurado | Conecta e comunica com banco        |
| `src/hooks/useInventory.js`        | Hook customizado React       | Gerencia estado e lógica de estoque |
| `src/hooks/useSupabaseProducts.js` | Hook base para produtos      | Carrega produtos do Supabase        |

### **Componentes UI**

| Arquivo                                  | Descrição                 | Uso                                      |
| ---------------------------------------- | ------------------------- | ---------------------------------------- |
| `src/pages/dashboard-novo.jsx`           | Dashboard com dados reais | Exibe métricas e gráficos                |
| `src/components/InventoryComponents.jsx` | Componentes reutilizáveis | SaleCard, RestockingModal, ProductsTable |

### **Documentação**

| Arquivo                | Conteúdo                            |
| ---------------------- | ----------------------------------- |
| `SUPABASE_EXAMPLES.md` | Exemplos de uso do cliente Supabase |
| `INTEGRATION_GUIDE.md` | Guia completo de integração         |
| `TESTING_GUIDE.md`     | Passo a passo para testar           |
| `MIGRATION_STEPS.md`   | Como substituir código antigo       |
| `README_SCHEMA.md`     | **Este arquivo**                    |

---

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENTE REACT                         │
│            (Dashboard, Inventário, Vendas, etc)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   useInventory Hook            │
        │ (Estado + Lógica de Negócio)   │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  supabaseClient.js             │
        │ (Funções de API/Database)      │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   Supabase (PostgreSQL)        │
        │  - Tabela: products            │
        │  - Tabela: inventory_movements │
        │  - Triggers automáticos        │
        └────────────────────────────────┘
```

---

## 📊 Estrutura das Tabelas

### **Tabela: products**

```sql
{
  id: number (SERIAL PRIMARY KEY)
  name: string UNIQUE
  description: string | null
  sku: string | null UNIQUE
  barcode: string | null UNIQUE
  category: string
  price: decimal (> 0)
  cost_price: decimal | null (>= 0)
  current_stock: integer (>= 0) ⚠️ CHECK CONSTRAINT
  min_stock: integer (>= 0)
  status: 'em_estoque' | 'estoque_baixo' | 'esgotado'
  created_at: timestamp (auto)
  updated_at: timestamp (auto)
}
```

### **Tabela: inventory_movements**

```sql
{
  id: number (SERIAL PRIMARY KEY)
  product_id: number (FOREIGN KEY → products.id)
  type: 'IN' | 'OUT'
  quantity: integer (> 0)
  reason: string (motivo da movimentação)
  sale_id: string | null (rastreabilidade)
  created_at: timestamp (auto)
}
```

---

## 🔐 Proteções Contra Estoque Negativo

### **Camada 1: CHECK Constraint (Banco de Dados)**

```sql
CHECK (current_stock >= 0)
```

O banco **rejeita** qualquer tentativa de deixar estoque negativo.

### **Camada 2: Trigger (Banco de Dados)**

```plpgsql
BEFORE INSERT ON inventory_movements
EXECUTE FUNCTION update_stock_after_movement()
```

- Valida antes de cada movimentação
- Verifica se há estoque disponível
- Lança erro descritivo se insuficiente

### **Camada 3: Validação Local (React)**

```javascript
if (product.current_stock < quantity) {
  throw new Error("Estoque insuficiente...");
}
```

Feedback imediato ao usuário.

### **Resultado:**

✅ Impossível ter estoque negativo em qualquer cenário!

---

## 🚀 Começar em 5 Passos

### **Passo 1: Configurar Variáveis de Ambiente**

Edite `.env.local` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### **Passo 2: Executar Schema no Supabase**

1. Vá em https://app.supabase.com
2. SQL Editor → New query
3. Cole todo o conteúdo de `supabase_schema.sql`
4. Clique "Run"

### **Passo 3: Substituir Dashboard**

```bash
# Opção A (rápido):
mv src/pages/dashboard.jsx src/pages/dashboard.old.jsx
mv src/pages/dashboard-novo.jsx src/pages/dashboard.jsx

# Opção B (manual):
# Siga MIGRATION_STEPS.md para manter customizações
```

### **Passo 4: Atualizar Outros Componentes**

Se usa `useInventory` em outras páginas:

```javascript
// Trocar de:
import { useInventory } from "../context/InventoryContext";
// Para:
import { useInventory } from "../hooks/useInventory";
```

### **Passo 5: Testar**

```bash
npm run dev
# Acessar http://localhost:5173/
# Verificar se produtos carregam e vendas funcionam
```

---

## 📖 Como Usar em Componentes

### **Exemplo Simples - Listar Produtos**

```javascript
import { useInventory } from "@/hooks/useInventory";

function MeusProtudos() {
  const { products, loading } = useInventory();

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      {products.map((p) => (
        <div key={p.id}>
          <h3>{p.name}</h3>
          <p>Estoque: {p.current_stock}</p>
        </div>
      ))}
    </div>
  );
}
```

### **Exemplo Completo - Registrar Venda com Erro**

```javascript
const { recordOutbound, error, clearError } = useInventory();

const handleSale = async (productId, quantity) => {
  const result = await recordOutbound(productId, quantity, "venda");

  if (result.success) {
    alert("✅ Venda registrada!");
  } else if (result.type === "INSUFFICIENT_STOCK") {
    alert(`⚠️ ${result.error}`); // Erro específico de estoque
  } else {
    alert(`❌ ${result.error}`);
  }
};
```

---

## 🎮 API do Hook useInventory

### **Estado**

```javascript
const {
  products, // Array de produtos
  loading, // boolean: carregando?
  error, // string: mensagem de erro
  lastMovements, // Array: últimas movimentações
  stats, // Métricas úteis
} = useInventory();
```

### **Funções**

```javascript
// Registrar venda
recordOutbound(productId, quantity, reason, saleId);
// Retorna: { success, movement } ou { success: false, error, type }

// Registrar reposição
recordInbound(productId, quantity, reason);
// Retorna: { success, movement } ou { success: false, error }

// Criar produto novo
addProduct(productData);
// Retorna: { success, product } ou { success: false, error }

// Atualizar produto
updateProductData(productId, updates);
// Retorna: { success, product } ou { success: false, error }

// Buscar histórico
getProductMovements(productId);
// Retorna: Array de movimentações

// Limpar erro
clearError();
```

---

## ⚠️ Tratamento de Erros

### **Erro de Estoque Insuficiente**

```javascript
const result = await recordOutbound(1, 100);

if (result.type === "INSUFFICIENT_STOCK") {
  // Erro específico de estoque - mostrar sugestão
  console.log(result.error);
  // "Estoque insuficiente: tentativa de remover 100 unidades,
  //  mas há apenas 10 em estoque"
}
```

### **Outros Erros**

```javascript
if (!result.success) {
  // Erro genérico
  console.error(result.error);
}
```

---

## 🧪 Testes Importantes

### **Verificar Conexão**

```javascript
import { fetchProducts } from "@/lib/supabaseClient";
const prods = await fetchProducts();
console.log(prods); // Deve listar produtos
```

### **Testar Estoque Negativo (Deve Falhar)**

```javascript
// Tentar remover mais do que existe
const result = await recordOutbound(1, 999);
// Resultado: error detalhado, estoque não mudou
```

### **Testar Múltiplas Movimentações**

```javascript
await recordInbound(1, 50); // Adiciona 50
await recordOutbound(1, 20); // Remove 20
await recordOutbound(1, 50); // Remove 20 (falta 10)
// Resultado: erro na terceira, estoque = 30 final
```

---

## 📁 Estrutura de Pastas Criada

```
sistema-gestao/
├── .env.local                              (✏️ Editar)
├── supabase_schema.sql                     (🔧 Executar no Supabase)
├── src/
│   ├── lib/
│   │   └── supabaseClient.js               (✅ Novo)
│   ├── hooks/
│   │   ├── useInventory.js                 (✅ Novo)
│   │   └── useSupabaseProducts.js          (✅ Novo)
│   ├── pages/
│   │   ├── dashboard.jsx                   (📝 Manter ou Atualizar)
│   │   ├── dashboard-novo.jsx              (✅ Novo)
│   │   ├── dashboard.old.jsx               (📦 Backup)
│   │   ├── inventario.jsx                  (📝 Atualizar)
│   │   ├── vendas.jsx                      (📝 Atualizar)
│   │   └── relatorios.jsx                  (📝 Atualizar)
│   ├── components/
│   │   └── InventoryComponents.jsx         (✅ Novo)
│   └── ...
├── SUPABASE_EXAMPLES.md                    (📚 Documentação)
├── INTEGRATION_GUIDE.md                    (📚 Documentação)
├── TESTING_GUIDE.md                        (📚 Documentação)
├── MIGRATION_STEPS.md                      (📚 Documentação)
└── README_SCHEMA.md                        (📚 Este arquivo)
```

---

## ✅ Checklist de Implementação

### **Configuração**

- [ ] `.env.local` criado com credenciais corretas
- [ ] `supabase_schema.sql` executado no Supabase
- [ ] Tabelas `products` e `inventory_movements` criadas

### **Código**

- [ ] `supabaseClient.js` em `src/lib/`
- [ ] `useInventory.js` em `src/hooks/`
- [ ] `dashboard-novo.jsx` atualizado ou substituindo `dashboard.jsx`
- [ ] Imports de hook atualizados em todos os componentes

### **Testes**

- [ ] Conexão com Supabase funciona
- [ ] Produtos carregam no Dashboard
- [ ] Venda bem-sucedida registra movimento
- [ ] Erro de estoque insuficiente é tratado
- [ ] Status do produto muda automaticamente
- [ ] Histórico de movimentações aparece

### **Deploy (Se aplicável)**

- [ ] Variáveis de ambiente configuradas no servidor
- [ ] SQL executado no Supabase produção
- [ ] Testado em ambiente de produção

---

## 🆘 Problemas Comuns

| Problema                           | Solução                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| "VITE_SUPABASE_URL não definido"   | Reinicie `npm run dev` após editar `.env.local`         |
| "401 Unauthorized"                 | Verifique `VITE_SUPABASE_ANON_KEY` em Supabase Settings |
| "relation products does not exist" | Execute `supabase_schema.sql` no SQL Editor             |
| Produtos não carregam              | Abra DevTools (F12) e verifique se há erro na Network   |
| Estoque permite negativo           | Verifique se as triggers estão criadas no Supabase      |
| "Cannot find module useInventory"  | Verifique caminho do import (use `@/` ou `../`)         |

---

## 📞 Próximos Passos Sugeridos

1. **Autenticação**: Implementar login com Supabase Auth
2. **Relatórios Avançados**: Gráficos de vendas, tendências
3. **Notificações**: Alertar quando estoque fica baixo
4. **Multi-usuário**: Controle de permissões
5. **API REST**: Exposer dados para aplicativos externos
6. **Backup Automático**: Exportar dados periodicamente

---

## 📄 Licença & Créditos

Criado como parte do **Sistema de Gestão de Estoque** com:

- **React** para UI
- **Supabase** para Backend/Database
- **Recharts** para Gráficos
- **Lucide React** para Ícones
- **Tailwind CSS** para Estilos

---

**Última Atualização**: 4 de maio de 2026
**Versão**: 1.0.0
