import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
// Este arquivo configura a conexão com o Supabase usando as variáveis de
// ambiente do arquivo .env.local

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validações de segurança
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Variáveis de ambiente não configuradas! Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local"
  );
}

// Criar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTIONS AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Buscar todos os produtos do banco de dados
 * @returns {Promise<Array>} Lista de produtos ou array vazio em caso de erro
 */
export async function fetchProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar produtos:", err.message);
    return [];
  }
}

/**
 * Buscar um produto específico pelo ID
 * @param {number} id - ID do produto
 * @returns {Promise<Object|null>} Dados do produto ou null
 */
export async function fetchProductById(id) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`❌ Erro ao buscar produto ${id}:`, err.message);
    return null;
  }
}

/**
 * Inserir um novo produto
 * @param {Object} product - Dados do produto
 * @returns {Promise<Object|null>} Produto criado ou null
 */
export async function createProduct(product) {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select();

    if (error) throw error;
    console.log("✅ Produto criado com sucesso!");
    return data?.[0] || null;
  } catch (err) {
    console.error("❌ Erro ao criar produto:", err.message);
    return null;
  }
}

/**
 * Atualizar um produto existente
 * @param {number} id - ID do produto
 * @param {Object} updates - Dados a atualizar
 * @returns {Promise<Object|null>} Produto atualizado ou null
 */
export async function updateProduct(id, updates) {
  try {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    console.log("✅ Produto atualizado com sucesso!");
    return data?.[0] || null;
  } catch (err) {
    console.error("❌ Erro ao atualizar produto:", err.message);
    return null;
  }
}

/**
 * Deletar um produto
 * @param {number} id - ID do produto
 * @returns {Promise<boolean>} true se deletado, false caso contrário
 */
export async function deleteProduct(id) {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;
    console.log("✅ Produto deletado com sucesso!");
    return true;
  } catch (err) {
    console.error("❌ Erro ao deletar produto:", err.message);
    return false;
  }
}

/**
 * Registrar uma movimentação de estoque
 * @param {Object} movement - Dados da movimentação
 * @returns {Promise<Object|null>} Movimentação registrada ou null
 */
export async function createInventoryMovement(movement) {
  try {
    const { data, error } = await supabase
      .from("inventory_movements")
      .insert([movement])
      .select();

    if (error) throw error;
    console.log("✅ Movimentação registrada com sucesso!");
    return data?.[0] || null;
  } catch (err) {
    console.error("❌ Erro ao registrar movimentação:", err.message);
    return null;
  }
}

/**
 * Buscar movimentações de um produto
 * @param {number} productId - ID do produto
 * @returns {Promise<Array>} Lista de movimentações
 */
export async function fetchProductMovements(productId) {
  try {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar movimentações:", err.message);
    return [];
  }
}

/**
 * Buscar todo o histórico de saídas (vendas)
 * Retorna product_id para que o consumidor cruze com a lista de produtos
 * em memória (evita depender do embed PostgREST, que pode falhar se a
 * relação FK não for inferida corretamente)
 * @returns {Promise<Array>} Lista de movimentações OUT
 */
export async function fetchOutboundHistory() {
  try {
    // 🔍 DIAGNÓSTICO: amostra sem filtro, para inspecionar quais 'type'
    // realmente existem na tabela e detectar divergência de casing/valor.
    const { data: diag } = await supabase
      .from("inventory_movements")
      .select("id, type, quantity, product_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const distinctTypes = [...new Set((diag || []).map((m) => m.type))];
    console.log("🔍 [DIAG] inventory_movements (sem filtro):", {
      totalAmostra: diag?.length ?? 0,
      tiposEncontrados: distinctTypes,
      primeirasLinhas: diag?.slice(0, 5),
    });

    const { data, error } = await supabase
      .from("inventory_movements")
      .select("id, created_at, quantity, product_id")
      .eq("type", "OUT")
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log("🔍 [DIAG] Filtro type='OUT' retornou:", {
      total: data?.length ?? 0,
      primeiras: data?.slice(0, 3),
    });

    return data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar histórico de saídas:", err.message);
    return [];
  }
}
