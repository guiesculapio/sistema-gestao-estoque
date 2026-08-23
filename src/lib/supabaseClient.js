import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
// This file configures the connection to Supabase using the environment
// variables from the .env.local file

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Security validations
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Variáveis de ambiente não configuradas! Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local"
  );
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all products from the database
 * @returns {Promise<Array>} List of products, or an empty array on error
 */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching products:", error.message);
    throw error;
  }
  return data || [];
}

/**
 * Fetch all categories from the database
 * RLS automatically filters by the logged-in user's categories.
 * @returns {Promise<Array<{id:number,name:string}>>} List of categories, or [] on error
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
    console.error("❌ Error fetching categories:", err.message);
    return [];
  }
}

/**
 * Create a new category.
 * Explicitly sends user_id from the active session to ensure
 * the INSERT satisfies the RLS policy (auth.uid() = user_id) even if
 * the DEFAULT auth.uid() isn't expanding in the request context.
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
      "❌ createCategory aborted: no active session.",
      sessionError
    );
    return {
      category: null,
      error: "Sessão expirada. Faça logout e login novamente.",
    };
  }

  const userId = session.user.id;
  console.log("🔍 createCategory: using user_id =", userId);

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name: name.trim(), user_id: userId }])
    .select("id, name");

  if (error) {
    console.error("❌ Error creating category:", error.message, error);
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
 * Update a category's name.
 * RLS ensures only the owner can update; we still return
 * the record so the consumer can detect "nothing was updated".
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
    console.error("❌ Error updating category:", error.message, error);
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
 * Delete a category.
 * Before attempting to delete, checks whether any product is linked to it —
 * if so, aborts with a descriptive error to avoid silently cascading the delete
 * or breaking products with an orphan FK.
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
      "❌ Error checking category's products:",
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
    console.error("❌ Error deleting category:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Fetch the logged-in user's preferences.
 * Returns null if the user doesn't have a row in user_preferences yet.
 * Includes the profit goal columns (profit_goal, profit_goal_start,
 * profit_goal_end) to feed the Dashboard's goal bar.
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
    console.error("❌ Error fetching preferences:", err.message);
    return null;
  }
}

/**
 * Update the logged-in user's preferences.
 * Accepts an object with any subset of the preference fields;
 * only the fields present in the object are sent (spread), preserving
 * the other already-saved values. Uses upsert by user_id to cover both
 * the case where a seed already exists and the case of a missing row (new user).
 * Uses getUser() — never getSession().
 *
 * @param {{low_stock_threshold?:number, profit_goal?:number, profit_goal_start?:string, profit_goal_end?:string}} prefs
 * @returns {Promise<{preferences:Object|null, error:string|null}>}
 */
export async function updateUserPreferences(prefs) {
  const patch = prefs && typeof prefs === "object" ? prefs : {};

  // Light validation of the present fields.
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
      "❌ updateUserPreferences aborted: no authenticated user.",
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
    console.error("❌ Error updating preferences:", error.message, error);
    return { preferences: null, error: error.message };
  }

  return { preferences: data?.[0] || null, error: null };
}

/**
 * Translates a Supabase error into a friendly message for duplicates (23505).
 * The products table has UNIQUE on (barcode, user_id) and (name, user_id); the name
 * of the violated index comes in error.message, so we detect which field collided.
 * @param {{code?:string, message?:string}} error
 * @returns {string|null} Friendly message, or null if it's not a duplicate
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
 * Insert a new product
 * @param {Object} product - Product data
 * @returns {Promise<{data:Object|null, error:string|null}>} Created product, or a friendly error
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

    console.log("✅ Product created successfully!");
    const created = data?.[0] || null;

    // Audit (non-critical): records the initial stock entry as a
    // type='IN' movement, in the same format as sale OUTs. If it fails, the
    // product remains created — createInventoryMovement returns null without throwing.
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
            "⚠️ Product created, but failed to record initial entry (type='IN') in inventory_movements."
          );
        }
      }
    }

    return { data: created, error: null };
  } catch (err) {
    console.error("❌ Error creating product:", err.message);
    return { data: null, error: err.message || "Falha ao salvar produto no banco" };
  }
}

/**
 * Update an existing product
 * @param {number} id - Product ID
 * @param {Object} updates - Data to update
 * @returns {Promise<{data:Object|null, error:string|null}>} Updated product, or a friendly error
 */
export async function updateProduct(id, updates) {
  try {
    // Captures the PREVIOUS quantity before the UPDATE to detect restocking.
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

    console.log("✅ Product updated successfully!");
    const updated = data?.[0] || null;

    // Audit (non-critical): if the quantity INCREASED, records the difference
    // as a type='IN' movement. Manual removal (difference <= 0) is not tracked
    // here. A movement failure does not revert the UPDATE (returns null without throwing).
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
            "⚠️ Product updated, but failed to record restock (type='IN') in inventory_movements."
          );
        }
      }
    }

    return { data: updated, error: null };
  } catch (err) {
    console.error("❌ Error updating product:", err.message);
    return {
      data: null,
      error: err.message || "Falha ao atualizar produto no banco",
    };
  }
}

/**
 * Delete a product
 * @param {number} id - Product ID
 * @returns {Promise<boolean>} true if deleted, false otherwise
 */
export async function deleteProduct(id) {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;
    console.log("✅ Product deleted successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error deleting product:", err.message);
    return false;
  }
}

/**
 * Record an inventory movement
 * @param {Object} movement - Movement data
 * @returns {Promise<Object|null>} Recorded movement, or null
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
    console.log("✅ Movement recorded successfully!");
    return data?.[0] || null;
  } catch (err) {
    console.error("❌ Error recording movement:", err.message);
    return null;
  }
}

/**
 * Fetch the logged-in user's inbound goods movements (inventory_movements type='IN')
 * within a date range, already with the product and category data
 * embedded to feed the inbound PDF.
 * @param {{startDate:string, endDate:string}} range - dates in YYYY-MM-DD format
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
 * Fetch the logged-in user's outbound goods movements (inventory_movements type='OUT')
 * within a date range, already with the product and category data
 * embedded to feed the outbound PDF. Uses `price` (sale price) because
 * an outbound movement represents revenue, not cost.
 * @param {{startDate:string, endDate:string}} range - dates in YYYY-MM-DD format
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
 * Record a product log event (ENTRADA / SAIDA / ALTERACAO)
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
    console.error("❌ Error recording product log:", err.message);
    return null;
  }
}

/**
 * Fetch a product's history (audit log), most recent first
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
      `❌ Error fetching history for product ${productId}:`,
      err.message
    );
    return [];
  }
}

/**
 * Record a sale by persisting each cart item to public.sales.
 * This is the DURABLE source for the reports (survives reload / tab switch).
 *
 * ⚠️ Does NOT decrement stock: products.current_stock is decremented by the
 * trigger fired by the OUT movement in inventory_movements (see sellItems).
 * That's why there is NO updateProductStock — decrementing here would cause a double deduction.
 * Does NOT send gross_profit — it's a column GENERATED by the database.
 *
 * Uses getUser() (never getSession()) and sends an explicit user_id to satisfy
 * the RLS policy even if the DEFAULT auth.uid() doesn't expand in the request context.
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
    // gross_profit: do NOT send — column generated by the database.
  }));

  const { data, error } = await supabase
    .from("sales")
    .insert(registros)
    .select();

  if (error) {
    console.error("❌ Error recording sale:", error.message, error);
  }

  return { data, error };
}

/**
 * Fetch the logged-in user's sales history, most recent first.
 * RLS automatically filters by auth.uid() = user_id.
 * @returns {Promise<Array>} Rows from public.sales, or [] on error
 */
export async function fetchSales() {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("sold_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching sales:", error.message);
    throw error;
  }
  return data || [];
}

/**
 * Registers an LGPD account deletion request for the logged-in user.
 * Does not delete any data — only queues the request; an administrator
 * processes it manually within 15 days.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function requestAccountDeletion() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Sessão expirada." };

  const { data: existing } = await supabase
    .from("account_deletion_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Você já possui uma solicitação de exclusão pendente." };
  }

  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: user.id,
    email: user.email,
    status: "pending",
  });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Fetches sales rows for the logged-in user since a given date, for use as
 * restock-forecast input. RLS automatically filters by auth.uid() = user_id,
 * same as fetchSales.
 * @param {string} sinceISODate - ISO date/timestamp; only rows with
 *   sold_at >= sinceISODate are returned.
 * @returns {Promise<Array<{product_id:number, qty_sold:number, sold_at:string}>>}
 */
export async function fetchSalesSince(sinceISODate) {
  const { data, error } = await supabase
    .from("sales")
    .select("product_id, qty_sold, sold_at")
    .gte("sold_at", sinceISODate)
    .order("sold_at", { ascending: true });

  if (error) {
    console.error("❌ Error fetching recent sales:", error.message);
    throw error;
  }
  return data || [];
}
