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
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar produtos:", error.message);
    throw error;
  }
  return data || [];
}

/**
 * Buscar todas as categorias do banco de dados
 * RLS filtra automaticamente pelas categorias do usuário logado.
 * @returns {Promise<Array<{id:number,name:string}>>} Lista de categorias ou [] em caso de erro
 */
export async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar categorias:", err.message);
    return [];
  }
}

/**
 * Criar uma nova categoria.
 * Envia user_id explicitamente a partir da sessão ativa para garantir
 * que o INSERT satisfaça a policy RLS (auth.uid() = user_id) mesmo se
 * o DEFAULT auth.uid() não estiver expandindo no contexto da request.
 * @param {string} name
 * @returns {Promise<{category:{id:number,name:string}|null, error:string|null}>}
 */
export async function createCategory(name) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.error(
      "❌ createCategory abortado: sem sessão ativa.",
      sessionError
    );
    return {
      category: null,
      error: "Sessão expirada. Faça logout e login novamente.",
    };
  }

  const userId = session.user.id;
  console.log("🔍 createCategory: usando user_id =", userId);

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name: name.trim(), user_id: userId }])
    .select("id, name");

  if (error) {
    console.error("❌ Erro ao criar categoria:", error.message, error);
    return { category: null, error: error.message };
  }

  const category = data?.[0] || null;
  if (!category) {
    const msg =
      "INSERT passou mas SELECT não retornou a linha — verifique a policy SELECT de categories";
    console.error("❌", msg);
    return { category: null, error: msg };
  }

  return { category, error: null };
}

/**
 * Atualizar o nome de uma categoria.
 * A RLS garante que só o dono pode atualizar; ainda assim retornamos
 * o registro para o consumidor detectar "nada foi atualizado".
 * @param {number} id
 * @param {string} name
 * @returns {Promise<{category:{id:number,name:string}|null, error:string|null}>}
 */
export async function updateCategory(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { category: null, error: "Informe um nome para a categoria" };
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("id", id)
    .select("id, name");

  if (error) {
    console.error("❌ Erro ao atualizar categoria:", error.message, error);
    return { category: null, error: error.message };
  }

  const category = data?.[0] || null;
  if (!category) {
    return {
      category: null,
      error: "Categoria não encontrada ou sem permissão para editar",
    };
  }

  return { category, error: null };
}

/**
 * Excluir uma categoria.
 * Antes de tentar apagar, verifica se existe algum produto vinculado —
 * se sim, aborta com erro descritivo para não deletar em cascata silenciosamente
 * nem quebrar produtos com FK órfã.
 * @param {number} id
 * @returns {Promise<{success:boolean, error:string|null}>}
 */
export async function deleteCategory(id) {
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    console.error(
      "❌ Erro ao verificar produtos da categoria:",
      countError.message
    );
    return {
      success: false,
      error: "Não foi possível verificar produtos vinculados à categoria",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Existem ${count} produto(s) usando esta categoria. Remova ou reatribua antes de excluir.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("❌ Erro ao excluir categoria:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Buscar as preferências do usuário logado.
 * Retorna null se o usuário ainda não tem linha em user_preferences.
 * Inclui as colunas de meta de lucro (profit_goal, profit_goal_start,
 * profit_goal_end) para alimentar a barra de meta do Dashboard.
 * @returns {Promise<{low_stock_threshold:number, profit_goal:number|null, profit_goal_start:string|null, profit_goal_end:string|null}|null>}
 */
export async function getUserPreferences() {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select(
        "low_stock_threshold, profit_goal, profit_goal_start, profit_goal_end"
      )
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("❌ Erro ao buscar preferências:", err.message);
    return null;
  }
}

/**
 * Atualizar as preferências do usuário logado.
 * Aceita um objeto com qualquer subconjunto dos campos de preferências;
 * apenas os campos presentes no objeto são enviados (spread), preservando
 * os demais valores já gravados. Usa upsert por user_id para cobrir tanto
 * o caso de já existir seed quanto o de linha ausente (novo usuário).
 * Usa getUser() — nunca getSession().
 *
 * @param {{low_stock_threshold?:number, profit_goal?:number, profit_goal_start?:string, profit_goal_end?:string}} prefs
 * @returns {Promise<{preferences:Object|null, error:string|null}>}
 */
export async function updateUserPreferences(prefs) {
  const patch = prefs && typeof prefs === "object" ? prefs : {};

  // Validação leve dos campos presentes.
  if ("low_stock_threshold" in patch) {
    const value = Number(patch.low_stock_threshold);
    if (!Number.isInteger(value) || value < 0) {
      return {
        preferences: null,
        error: "O limiar deve ser um número inteiro maior ou igual a zero",
      };
    }
  }
  if ("profit_goal" in patch) {
    const goal = Number(patch.profit_goal);
    if (!Number.isFinite(goal) || goal < 0) {
      return {
        preferences: null,
        error: "A meta de lucro deve ser um número maior ou igual a zero",
      };
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "❌ updateUserPreferences abortado: sem usuário autenticado.",
      userError
    );
    return {
      preferences: null,
      error: "Sessão expirada. Faça logout e login novamente.",
    };
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, ...patch },
      { onConflict: "user_id" }
    )
    .select(
      "low_stock_threshold, profit_goal, profit_goal_start, profit_goal_end"
    );

  if (error) {
    console.error("❌ Erro ao atualizar preferências:", error.message, error);
    return { preferences: null, error: error.message };
  }

  return { preferences: data?.[0] || null, error: null };
}

/**
 * Traduz um erro do Supabase em mensagem amigável para duplicatas (23505).
 * A tabela products tem UNIQUE em (barcode, user_id) e (name, user_id); o nome
 * do índice violado vem em error.message, então detectamos qual campo colidiu.
 * @param {{code?:string, message?:string}} error
 * @returns {string|null} Mensagem amigável, ou null se não for duplicata
 */
function duplicateProductMessage(error) {
  if (error?.code !== "23505") return null;
  const message = error.message || "";
  if (message.includes("barcode")) {
    return "Este código de barras já está cadastrado.";
  }
  if (message.includes("name")) {
    return "Já existe um produto com este nome.";
  }
  return "Produto duplicado. Verifique o nome e o código de barras.";
}

/**
 * Inserir um novo produto
 * @param {Object} product - Dados do produto
 * @returns {Promise<{data:Object|null, error:string|null}>} Produto criado ou erro amigável
 */
export async function createProduct(product) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Sessão expirada. Faça login novamente." };
    }

    const { data, error } = await supabase
      .from("products")
      .insert([{ ...product, user_id: user.id }])
      .select();

    if (error) {
      const dup = duplicateProductMessage(error);
      if (dup) return { data: null, error: dup };
      throw error;
    }

    console.log("✅ Produto criado com sucesso!");
    const created = data?.[0] || null;

    // Auditoria (não crítica): registra a entrada inicial de estoque como
    // movimento type='IN', no mesmo formato dos OUT de venda. Se falhar, o
    // produto permanece criado — createInventoryMovement retorna null sem lançar.
    if (created?.id) {
      const initialQty = Number(created.current_stock) || 0;
      if (initialQty > 0) {
        const movement = await createInventoryMovement({
          product_id: created.id,
          type: "IN",
          quantity: initialQty,
          reason: "Cadastro inicial",
        });
        if (!movement) {
          console.error(
            "⚠️ Produto criado, mas falhou ao registrar entrada inicial (type='IN') em inventory_movements."
          );
        }
      }
    }

    return { data: created, error: null };
  } catch (err) {
    console.error("❌ Erro ao criar produto:", err.message);
    return { data: null, error: err.message || "Falha ao salvar produto no banco" };
  }
}

/**
 * Atualizar um produto existente
 * @param {number} id - ID do produto
 * @param {Object} updates - Dados a atualizar
 * @returns {Promise<{data:Object|null, error:string|null}>} Produto atualizado ou erro amigável
 */
export async function updateProduct(id, updates) {
  try {
    // Captura a quantidade ANTERIOR antes do UPDATE para detectar reposição.
    const { data: atual } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      const dup = duplicateProductMessage(error);
      if (dup) return { data: null, error: dup };
      throw error;
    }

    console.log("✅ Produto atualizado com sucesso!");
    const updated = data?.[0] || null;

    // Auditoria (não crítica): se a quantidade AUMENTOU, registra a diferença
    // como movimento type='IN'. Saída manual (diferença <= 0) não é rastreada
    // aqui. Falha no movimento não reverte o UPDATE (retorna null sem lançar).
    if ("current_stock" in updates) {
      const qtdAnterior = Number(atual?.current_stock) || 0;
      const qtdNova = Number(updates.current_stock) || 0;
      const diferenca = qtdNova - qtdAnterior;
      if (diferenca > 0) {
        const movement = await createInventoryMovement({
          product_id: id,
          type: "IN",
          quantity: diferenca,
          reason: "Reposição de estoque",
        });
        if (!movement) {
          console.error(
            "⚠️ Produto atualizado, mas falhou ao registrar reposição (type='IN') em inventory_movements."
          );
        }
      }
    }

    return { data: updated, error: null };
  } catch (err) {
    console.error("❌ Erro ao atualizar produto:", err.message);
    return {
      data: null,
      error: err.message || "Falha ao atualizar produto no banco",
    };
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const { data, error } = await supabase
      .from("inventory_movements")
      .insert([{ ...movement, user_id: user.id }])
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
 * Buscar as entradas de mercadoria (inventory_movements type='IN') do usuário
 * logado dentro de um intervalo de datas, já com os dados do produto e categoria
 * embutidos para alimentar o PDF de entradas.
 * @param {{startDate:string, endDate:string}} range - datas no formato YYYY-MM-DD
 * @returns {Promise<{data:Array|null, error:string|null}>}
 */
export async function fetchInboundMovements({ startDate, endDate }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão expirada.");

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      `
      id,
      created_at,
      quantity,
      products (
        name,
        cost_price,
        categories ( name )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("type", "IN")
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Buscar as saídas de mercadoria (inventory_movements type='OUT') do usuário
 * logado dentro de um intervalo de datas, já com os dados do produto e categoria
 * embutidos para alimentar o PDF de saídas. Usa `price` (preço de venda) porque
 * saída representa faturamento, não custo.
 * @param {{startDate:string, endDate:string}} range - datas no formato YYYY-MM-DD
 * @returns {Promise<{data:Array|null, error:string|null}>}
 */
export async function fetchOutboundMovements({ startDate, endDate }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Sessão expirada.");

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      `
      id,
      created_at,
      quantity,
      products (
        name,
        price,
        categories ( name )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("type", "OUT")
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Registrar um evento de log de produto (ENTRADA / SAIDA / ALTERACAO)
 * @param {{product_id: number, type: 'ENTRADA'|'SAIDA'|'ALTERACAO', quantity?: number}} log
 * @returns {Promise<Object|null>}
 */
export async function createInventoryLog({ product_id, type, quantity = 0 }) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const { data, error } = await supabase
      .from("inventory_logs")
      .insert([{ product_id, type, quantity, user_id: user.id }])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error("❌ Erro ao registrar log de produto:", err.message);
    return null;
  }
}

/**
 * Buscar o histórico (log de auditoria) de um produto, mais recente primeiro
 * @param {number} productId
 * @returns {Promise<Array>}
 */
export async function fetchProductHistory(productId) {
  try {
    const { data, error } = await supabase
      .from("inventory_logs")
      .select("id, type, quantity, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(
      `❌ Erro ao buscar histórico do produto ${productId}:`,
      err.message
    );
    return [];
  }
}

/**
 * Registrar uma venda persistindo cada item do carrinho em public.sales.
 * É a fonte DURÁVEL dos relatórios (sobrevive a reload / troca de aba).
 *
 * ⚠️ NÃO decrementa estoque: quem dá baixa em products.current_stock é o
 * trigger disparado pelo movimento OUT em inventory_movements (ver sellItems).
 * Por isso NÃO existe updateProductStock — decrementar aqui causaria baixa dupla.
 * NÃO envia gross_profit — é coluna GERADA pelo banco.
 *
 * Usa getUser() (nunca getSession()) e envia user_id explícito para satisfazer
 * a policy RLS mesmo se o DEFAULT auth.uid() não expandir no contexto da request.
 *
 * @param {Array<{id:string, nome:string, categoria:string, cartQty:number, precoVenda:number, precoCusto:number}>} items
 * @returns {Promise<{data: Array|null, error: {message:string}|null}>}
 */
export async function createSale(items) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: { message: "Sessão expirada. Faça login novamente." },
    };
  }

  const registros = items.map((item) => ({
    user_id: user.id,
    product_id: item.id,
    nome: item.nome,
    categoria: item.categoria,
    qty_sold: item.cartQty,
    sale_price: item.precoVenda,
    cost_price: item.precoCusto,
    // gross_profit: NÃO enviar — coluna gerada pelo banco.
  }));

  const { data, error } = await supabase
    .from("sales")
    .insert(registros)
    .select();

  if (error) {
    console.error("❌ Erro ao registrar venda:", error.message, error);
  }

  return { data, error };
}

/**
 * Buscar o histórico de vendas do usuário logado, mais recente primeiro.
 * A RLS filtra automaticamente por auth.uid() = user_id.
 * @returns {Promise<Array>} Linhas de public.sales ou [] em caso de erro
 */
export async function fetchSales() {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("sold_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar vendas:", error.message);
    throw error;
  }
  return data || [];
}
