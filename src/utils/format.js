/**
 * Formats a number as BRL currency.
 * @param {number} valor
 * @returns {string} e.g.: "R$ 1.234,56"
 */
export function brl(valor) {
  if (valor === undefined || valor === null) return "R$ 0,00";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formats a number as abbreviated BRL (k for thousands).
 * @param {number} valor
 * @returns {string} e.g.: "R$ 1,2k"
 */
export function brlK(valor) {
  if (valor === undefined || valor === null) return "R$ 0";
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}k`;
  }
  return brl(valor);
}
