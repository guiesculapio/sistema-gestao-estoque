// ═══════════════════════════════════════════════════════════════════════════════
// REGRA DE NEGÓCIO CENTRAL: LIMIAR DE ESTOQUE BAIXO
// ═══════════════════════════════════════════════════════════════════════════════
// Fonte única da verdade para "quando um produto está com estoque baixo":
//   1) Se product.min_stock estiver definido (não-nulo), ele manda para AQUELE
//      produto, ignorando o threshold global do usuário.
//   2) Se product.min_stock for nulo, cai no user_preferences.low_stock_threshold.
//   3) Se nenhum dos dois estiver disponível, usa o default global do sistema.
// Todo consumidor que precise decidir cor, badge, contador ou status DEVE usar
// as funções abaixo — nunca replicar a comparação inline.

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

function getQty(product) {
  if (product == null) return 0;
  if (product.qtd != null) return Number(product.qtd) || 0;
  if (product.current_stock != null) return Number(product.current_stock) || 0;
  return 0;
}

export function resolveLowStockThreshold(product, userPreferences) {
  if (product?.min_stock != null && product.min_stock !== "") {
    return Number(product.min_stock);
  }
  if (userPreferences?.low_stock_threshold != null) {
    return Number(userPreferences.low_stock_threshold);
  }
  return DEFAULT_LOW_STOCK_THRESHOLD;
}

// Retorna true somente quando o produto tem estoque > 0 e abaixo do limiar.
// Produtos zerados são "esgotados", não "estoque baixo".
export function isLowStock(product, userPreferences) {
  const qty = getQty(product);
  if (qty <= 0) return false;
  return qty < resolveLowStockThreshold(product, userPreferences);
}

// Deriva o status canônico do produto a partir da quantidade + regra de limiar.
// Usado no submit do modal e no pós-venda do Context.
export function computeStockStatus(product, userPreferences) {
  const qty = getQty(product);
  if (qty <= 0) return "esgotado";
  if (isLowStock(product, userPreferences)) return "estoque_baixo";
  return "em_estoque";
}
