// ═══════════════════════════════════════════════════════════════════════════
// restockForecast
// ═══════════════════════════════════════════════════════════════════════════
// Pure calculation module — no network calls, no imports from supabaseClient.
// This file is meant to be copied as-is into supabase/functions/_shared/ so
// the same forecast logic can run inside a Deno Edge Function without any
// adaptation. Keep it dependency-free for that reason.

/**
 * A single day's aggregated sales for one product.
 * @typedef {Object} SalesHistoryEntry
 * @property {string} date - ISO date string (e.g. "2026-08-01" or a full
 *   ISO timestamp). Only the calendar date portion is used.
 * @property {number} quantity - Units sold on that date.
 */

/**
 * @typedef {Object} RestockForecastInput
 * @property {number} currentStock - Units currently in stock for the product.
 * @property {SalesHistoryEntry[]} salesHistory - Sales entries for the
 *   product, expected to cover roughly the last 28 days, but any range works.
 * @property {number} minStock - The product's configured minimum stock
 *   threshold. Reserved for future use (e.g. blending with velocity-based
 *   urgency); not currently used to compute `urgency`.
 */

/**
 * @typedef {Object} RestockForecastResult
 * @property {boolean} [insufficientData] - True when salesHistory has fewer
 *   than 3 entries. When true, none of the other fields are present —
 *   callers must check this first before reading the rest of the result.
 * @property {number} [avgDailyVelocity] - Average units sold per day, over
 *   the number of days actually covered by salesHistory (not a fixed window).
 * @property {number} [daysUntilStockout] - currentStock / avgDailyVelocity.
 *   `Infinity` when avgDailyVelocity is 0 (no sales in the period).
 * @property {'esgotado'|'critico'|'atencao'|'ok'} [urgency] - Restock urgency
 *   bucket: 'esgotado' when currentStock <= 0, 'critico' when
 *   daysUntilStockout <= 7, 'atencao' when daysUntilStockout <= 14, otherwise
 *   'ok'.
 */

const MIN_ENTRIES_FOR_FORECAST = 3;

/**
 * Calculates a restock forecast for a single product from its recent sales
 * history. Pure function: same input always yields the same output, no
 * side effects, no I/O.
 *
 * @param {RestockForecastInput} input
 * @returns {RestockForecastResult}
 */
export function calculateRestockForecast({
  currentStock,
  salesHistory,
  minStock,
}) {
  void minStock; // reserved for future use — not part of the current urgency rule

  if (!Array.isArray(salesHistory) || salesHistory.length < MIN_ENTRIES_FOR_FORECAST) {
    return { insufficientData: true };
  }

  const totalQuantity = salesHistory.reduce(
    (acc, entry) => acc + (Number(entry.quantity) || 0),
    0
  );

  const daysCovered = countDaysCovered(salesHistory);
  const avgDailyVelocity = daysCovered > 0 ? totalQuantity / daysCovered : 0;

  const daysUntilStockout =
    avgDailyVelocity > 0 ? currentStock / avgDailyVelocity : Infinity;

  const urgency = resolveUrgency(currentStock, daysUntilStockout);

  return { avgDailyVelocity, daysUntilStockout, urgency };
}

/**
 * Counts the number of calendar days spanned by the sales history, from the
 * earliest to the latest entry (inclusive), regardless of how many entries
 * fall on each day. This is what makes the velocity calculation adapt to
 * however much real history is available instead of assuming a fixed
 * 28-day window.
 *
 * @param {SalesHistoryEntry[]} salesHistory
 * @returns {number}
 */
function countDaysCovered(salesHistory) {
  const timestamps = salesHistory
    .map((entry) => toUtcDayTimestamp(entry.date))
    .filter((ts) => ts !== null);

  if (timestamps.length === 0) return 0;

  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  return Math.round((latest - earliest) / MS_PER_DAY) + 1;
}

/**
 * Normalizes a date string to midnight UTC so calendar-day math is not
 * affected by the time-of-day portion of a timestamp.
 *
 * @param {string} dateStr
 * @returns {number|null} milliseconds since epoch, or null if unparseable
 */
function toUtcDayTimestamp(dateStr) {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );
}

/**
 * @param {number} currentStock
 * @param {number} daysUntilStockout
 * @returns {'esgotado'|'critico'|'atencao'|'ok'}
 */
function resolveUrgency(currentStock, daysUntilStockout) {
  if (currentStock <= 0) return "esgotado";
  if (daysUntilStockout <= 7) return "critico";
  if (daysUntilStockout <= 14) return "atencao";
  return "ok";
}
