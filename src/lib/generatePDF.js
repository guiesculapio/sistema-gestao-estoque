import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────────────────────
// Helpers compartilhados
// ─────────────────────────────────────────────────────────────
function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

// Desenha o cabeçalho Estoklab da seção na página atual do doc.
function drawHeader(doc, { title, startDate, endDate, userEmail }) {
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110); // teal-600
  doc.text("Estoklab", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(title, 14, 28);
  doc.text(`Período: ${formatDate(startDate)} até ${formatDate(endDate)}`, 14, 35);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 42);
  doc.text(`Conta: ${userEmail}`, 14, 49);

  // Linha separadora
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 53, 196, 53);
}

// Aplica o rodapé de paginação em TODAS as páginas do doc.
function drawFooters(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Estoklab — Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: "center" }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Entradas de mercadoria (type='IN') — usa cost_price
// ─────────────────────────────────────────────────────────────
export function generateInboundPDF({
  movements,
  startDate,
  endDate,
  userEmail,
  doc = null,
  save = true,
  fileName,
}) {
  // Se recebeu um doc existente, esta seção entra numa nova página.
  const document = doc ?? new jsPDF();
  if (doc) document.addPage();

  drawHeader(document, {
    title: "Relatório de Entrada de Mercadorias",
    startDate,
    endDate,
    userEmail,
  });

  // Prepara linhas da tabela
  let totalCusto = 0;
  const rows = movements.map((m) => {
    const nome = m.products?.name ?? "—";
    const categoria = m.products?.categories?.name ?? "Sem categoria";
    const qtd = m.quantity ?? 0;
    const custo = m.products?.cost_price ?? 0;
    const total = qtd * custo;
    totalCusto += total;
    return [
      nome,
      categoria,
      qtd.toString(),
      formatBRL(custo),
      formatBRL(total),
      formatDate(m.created_at),
    ];
  });

  autoTable(document, {
    startY: 58,
    head: [["Produto", "Categoria", "Qtd.", "Custo Unit.", "Custo Total", "Data"]],
    body: rows,
    foot: [["", "", "", "TOTAL", formatBRL(totalCusto), ""]],
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 55 },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center", cellWidth: 28 },
    },
  });

  // Só finaliza (rodapé em todas as páginas + save) quando standalone ou quando
  // esta é a última seção de um PDF combinado.
  if (save) {
    drawFooters(document);
    document.save(fileName ?? `entradas_${startDate}_${endDate}.pdf`);
  }

  return document;
}

// ─────────────────────────────────────────────────────────────
// Saídas de mercadoria (type='OUT') — usa price (preço de venda)
// ─────────────────────────────────────────────────────────────
export function generateOutboundPDF({
  movements,
  startDate,
  endDate,
  userEmail,
  doc = null,
  save = true,
  fileName,
}) {
  // Se recebeu um doc existente, esta seção entra numa nova página.
  const document = doc ?? new jsPDF();
  if (doc) document.addPage();

  drawHeader(document, {
    title: "Relatório de Saída de Mercadorias",
    startDate,
    endDate,
    userEmail,
  });

  // Prepara linhas da tabela
  let totalFaturado = 0;
  const rows = movements.map((m) => {
    const nome = m.products?.name ?? "—";
    const categoria = m.products?.categories?.name ?? "Sem categoria";
    const qtd = m.quantity ?? 0;
    const preco = m.products?.price ?? 0;
    const total = qtd * preco;
    totalFaturado += total;
    return [
      nome,
      categoria,
      qtd.toString(),
      formatBRL(preco),
      formatBRL(total),
      formatDate(m.created_at),
    ];
  });

  autoTable(document, {
    startY: 58,
    head: [
      ["Produto", "Categoria", "Qtd. Vendida", "Preço Unit.", "Total", "Data"],
    ],
    body: rows,
    foot: [["", "", "", "TOTAL FATURADO", formatBRL(totalFaturado), ""]],
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 55 },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center", cellWidth: 28 },
    },
  });

  if (save) {
    drawFooters(document);
    document.save(fileName ?? `saidas_${startDate}_${endDate}.pdf`);
  }

  return document;
}
