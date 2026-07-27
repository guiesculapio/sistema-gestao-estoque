// ═══════════════════════════════════════════════════════════════════════════════
// CORE BUSINESS RULE: LOW STOCK THRESHOLD
// ═══════════════════════════════════════════════════════════════════════════════
// Single source of truth for "when a product is low on stock":
//   1) If product.min_stock is set (non-null), it takes precedence for THAT
//      product, ignoring the user's global threshold.
//   2) If product.min_stock is null, falls back to user_preferences.low_stock_threshold.
//   3) If neither is available, uses the system's global default.
// Any consumer that needs to decide color, badge, counter, or status MUST use
// the functions below — never replicate the comparison inline.

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

// Returns true only when the product has stock > 0 and below the threshold.
// Zeroed-out products are "sold out", not "low stock".
export function isLowStock(product, userPreferences) {
  const qty = getQty(product);
  if (qty <= 0) return false;
  return qty < resolveLowStockThreshold(product, userPreferences);
}

// Derives the product's canonical status from the quantity + threshold rule.
// Used on modal submit and post-sale in the Context.
export function computeStockStatus(product, userPreferences) {
  const qty = getQty(product);
  if (qty <= 0) return "esgotado";
  if (isLowStock(product, userPreferences)) return "estoque_baixo";
  return "em_estoque";
}
