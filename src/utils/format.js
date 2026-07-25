/**
 * Formata um número para moeda BRL.
 * @param {number} valor
 * @returns {string} ex: "R$ 1.234,56"
 */
export function brl(valor) {
  if (valor === undefined || valor === null) return "R$ 0,00";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata número para BRL abreviado (k para milhares).
 * @param {number} valor
 * @returns {string} ex: "R$ 1,2k"
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
