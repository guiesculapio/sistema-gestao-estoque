import { useState, useMemo } from "react";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileDown,
  FileSpreadsheet,
  ChevronDown,
  BarChart2,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Bibliotecas de exportação
import * as XLSX from "xlsx";
import {
  fetchInboundMovements,
  fetchOutboundMovements,
} from "../lib/supabaseClient";
import { generateInboundPDF, generateOutboundPDF } from "../lib/generatePDF";
import { brl, brlK } from "../utils/format";

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURAÇÕES E HELPERS
// ─────────────────────────────────────────────────────────────

const PERIODOS = [
  { label: "Últimos 7 dias", value: "7d", days: 7 },
  { label: "Últimos 30 dias", value: "30d", days: 30 },
  { label: "Últimos 90 dias", value: "90d", days: 90 },
  { label: "Este ano", value: "1y", days: 365 },
];

const INPUT_CLASS =
  "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all";

const pct = (v) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

// ─────────────────────────────────────────────────────────────
// 2. SUB-COMPONENTES DE UI
// ─────────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PERIODOS.find((p) => p.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl px-3.5 py-2 text-sm hover:border-brand hover:text-slate-900 transition-all duration-150"
      >
        <BarChart2 size={14} className="text-slate-400" />
        {selected?.label}
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onChange(p.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${p.value === value ? "bg-brand/10 text-brand font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DualBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const custo = payload.find((p) => p.dataKey === "custo")?.value ?? 0;
  const venda = payload.find((p) => p.dataKey === "venda")?.value ?? 0;
  const lucro = venda - custo;
  const mg = venda > 0 ? (lucro / venda) * 100 : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-3 shadow-lg text-xs min-w-[160px]">
      <p className="text-slate-900 font-semibold mb-2 pb-1.5 border-b border-slate-100">
        {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-2 h-2 rounded-sm bg-blue-500" /> Custo
          </span>
          <span className="text-slate-900 font-bold tabular-nums">
            {brlK(custo)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-brand">
            <span className="w-2 h-2 rounded-sm bg-brand" /> Venda
          </span>
          <span className="text-slate-900 font-bold tabular-nums">
            {brlK(venda)}
          </span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex justify-between gap-6">
          <span className="text-slate-400">Lucro</span>
          <span className="text-brand font-bold tabular-nums">
            {brlK(lucro)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Margem</span>
          <span className="text-brand font-bold">{pct(mg)}</span>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const styles = [
    "bg-amber-400 text-white",
    "bg-slate-300 text-slate-700",
    "bg-orange-300 text-white",
  ];
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black flex-shrink-0 ${styles[rank - 1] ?? "bg-slate-100 text-slate-500"}`}
    >
      {rank}
    </span>
  );
}

function MiniBar({ value, max, color = "bg-brand" }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand hover:scale-[1.02] transition-all duration-200">
      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mt-2">
        {label}
      </p>
      <p className="text-slate-900 font-black text-2xl tracking-tight leading-none">
        {value}
      </p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Relatorios() {
  const { products, sales, metrics } = useInventory();
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState("30d");

  // Estado do modal de exportação PDF de movimentações
  const [pdfModal, setPdfModal] = useState(false);
  const [pdfTipo, setPdfTipo] = useState("IN"); // 'IN' | 'OUT'
  const [pdfDates, setPdfDates] = useState({ start: "", end: "" });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const salesFiltradas = useMemo(() => {
    const periodObj = PERIODOS.find((p) => p.value === periodo);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (periodObj?.days || 30));
    return sales.filter((s) => new Date(s.data) >= cutoffDate);
  }, [sales, periodo]);

  const filteredMetrics = useMemo(() => {
    const faturamento = salesFiltradas.reduce(
      (acc, s) => acc + s.valorVenda * s.qtdVendida,
      0
    );
    const lucro = salesFiltradas.reduce((acc, s) => acc + s.lucroReal, 0);

    const mapaCat = {};
    salesFiltradas.forEach((sale) => {
      if (!mapaCat[sale.categoria]) {
        mapaCat[sale.categoria] = {
          categoria: sale.categoria,
          custo: 0,
          venda: 0,
        };
      }
      mapaCat[sale.categoria].custo += sale.custoUnitario * sale.qtdVendida;
      mapaCat[sale.categoria].venda += sale.valorVenda * sale.qtdVendida;
    });

    const mapaProd = {};
    salesFiltradas.forEach((sale) => {
      if (!mapaProd[sale.productId]) {
        mapaProd[sale.productId] = {
          nome: sale.nome,
          lucroTotal: 0,
          qtdTotal: 0,
        };
      }
      mapaProd[sale.productId].lucroTotal += sale.lucroReal;
      mapaProd[sale.productId].qtdTotal += sale.qtdVendida;
    });

    const topSelling = Object.values(mapaProd)
      .sort((a, b) => b.lucroTotal - a.lucroTotal)
      .slice(0, 5);

    return {
      totalRevenue: faturamento,
      totalProfit: lucro,
      salesCount: salesFiltradas.length,
      categories: Object.values(mapaCat).sort((a, b) => b.venda - a.venda),
      topSelling,
    };
  }, [salesFiltradas]);

  const topParado = useMemo(() => {
    return products
      .filter((p) => p.qtd > 0 && !salesFiltradas.some((s) => s.productId === p.id))
      .sort((a, b) => b.precoCusto * b.qtd - a.precoCusto * a.qtd)
      .slice(0, 6);
  }, [products, salesFiltradas]);

  const maxMargemReal = useMemo(
    () =>
      filteredMetrics.topSelling.length > 0
        ? Math.max(...filteredMetrics.topSelling.map((p) => p.lucroTotal))
        : 0,
    [filteredMetrics.topSelling]
  );

  // --- LÓGICA DE EXPORTAÇÃO ---

  const handleExportExcel = () => {
    const data = salesFiltradas.map((s) => ({
      Data: new Date(s.data).toLocaleDateString("pt-BR"),
      Produto: s.nome,
      Categoria: s.categoria,
      Quantidade: s.qtdVendida,
      "Custo Unitário": s.custoUnitario,
      "Preço Venda": s.valorVenda,
      Faturamento: s.valorVenda * s.qtdVendida,
      "Lucro Real": s.lucroReal,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `Relatorio_Vendas_${periodo}.xlsx`);
  };

  async function handleExportPDF() {
    if (!pdfDates.start || !pdfDates.end) {
      setPdfError("Selecione o período completo.");
      return;
    }
    if (pdfDates.start > pdfDates.end) {
      setPdfError("Data início não pode ser maior que data fim.");
      return;
    }
    setPdfLoading(true);
    setPdfError("");

    const datas = { startDate: pdfDates.start, endDate: pdfDates.end };
    const base = {
      startDate: pdfDates.start,
      endDate: pdfDates.end,
      userEmail: user?.email ?? "",
    };

    if (pdfTipo === "IN") {
      const { data, error } = await fetchInboundMovements(datas);
      if (error || !data?.length) {
        setPdfError(error || "Nenhuma entrada encontrada no período selecionado.");
        setPdfLoading(false);
        return;
      }
      generateInboundPDF({ movements: data, ...base });
      setPdfLoading(false);
      setPdfModal(false);
      return;
    }

    // pdfTipo === 'OUT'
    const { data, error } = await fetchOutboundMovements(datas);
    if (error || !data?.length) {
      setPdfError(error || "Nenhuma saída encontrada no período selecionado.");
      setPdfLoading(false);
      return;
    }
    generateOutboundPDF({ movements: data, ...base });
    setPdfLoading(false);
    setPdfModal(false);
  }

  return (
    <div className="bg-slate-50 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-slate-900 font-black text-xl tracking-tight">
            Relatórios de Performance
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Análise financeira baseada em vendas reais
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector value={periodo} onChange={setPeriodo} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPdfModal(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl px-3.5 py-2 text-sm hover:border-brand hover:text-slate-900 transition-all duration-150"
            >
              <FileDown size={14} className="text-slate-400" /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-brand text-white font-bold rounded-xl px-3.5 py-2 text-sm hover:bg-brand-hover transition-colors duration-150"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico de Performance Real */}
      <div className="bg-white rounded-xl border border-slate-200 hover:border-brand transition-all duration-200 overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div>
            <h3 className="text-slate-900 font-bold text-sm">
              Vendas vs. Custo por Categoria
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Resultados para o período de{" "}
              {PERIODOS.find((p) => p.value === periodo).label}
            </p>
          </div>
          <div className="flex items-center gap-5 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />{" "}
              Custo
            </span>
            <span className="flex items-center gap-1.5 text-brand">
              <span className="w-3 h-3 rounded-sm bg-brand inline-block" />{" "}
              Venda
            </span>
          </div>
        </div>

        <div className="px-2 pt-4 pb-2">
          {filteredMetrics.categories.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(200, filteredMetrics.categories.length * 55)}
            >
              <BarChart
                data={filteredMetrics.categories}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
                barCategoryGap="30%"
                barGap={3}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={brlK}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  content={<DualBarTooltip />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar
                  dataKey="custo"
                  fill="#3b82f6"
                  barSize={16}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="venda"
                  fill="#22c55e"
                  barSize={16}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm italic">
              Nenhuma venda no período selecionado.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-100">
          {filteredMetrics.categories.map((cat) => {
            const lucro = cat.venda - cat.custo;
            const mg = cat.venda > 0 ? (lucro / cat.venda) * 100 : 0;
            return (
              <div
                key={cat.categoria}
                className="px-3.5 py-2.5 border-r border-b border-slate-100"
              >
                <p className="text-slate-400 text-[10px] truncate mb-0.5">
                  {cat.categoria}
                </p>
                <p className="text-blue-600 text-xs font-bold tabular-nums">
                  {brlK(cat.custo)}
                </p>
                <p className="text-brand text-xs font-bold tabular-nums">
                  {brlK(cat.venda)}
                </p>
                <p
                  className={`text-[10px] font-semibold mt-0.5 ${mg >= 30 ? "text-brand" : "text-amber-500"}`}
                >
                  {pct(mg)} margem
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card: Top Lucro Real */}
        <div className="bg-white rounded-xl border border-slate-200 hover:border-brand transition-all duration-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-slate-900 font-bold text-sm leading-none">
                Top Lucro Real
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                No período selecionado
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredMetrics.topSelling.length > 0 ? (
              filteredMetrics.topSelling.map((p, i) => (
                <div
                  key={p.nome}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors duration-150"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 font-semibold text-sm truncate">
                      {p.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MiniBar value={p.lucroTotal} max={maxMargemReal} />
                      <span className="text-brand font-bold text-xs tabular-nums w-16 text-right">
                        {brl(p.lucroTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-10 text-center text-sm text-slate-400 italic">
                Sem dados.
              </p>
            )}
          </div>
        </div>

        {/* Card: Capital Preso */}
        <div className="bg-white rounded-xl border border-slate-200 hover:border-brand transition-all duration-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-slate-900 font-bold text-sm leading-none">
                Capital Preso
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Itens sem nenhuma venda registrada
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topParado.length > 0 ? (
              topParado.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors duration-150"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 font-semibold text-sm truncate">
                      {p.nome}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {p.qtd} unidades paradas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 font-semibold text-sm tabular-nums">
                      {brlK(p.precoCusto * p.qtd)}
                    </p>
                    <p className="text-slate-400 text-xs">custo total</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-10 text-center text-sm text-slate-400 italic">
                Estoque saudável.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro Real */}
      <div className="bg-white rounded-xl border border-slate-200 hover:border-brand transition-all duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-slate-900 font-bold text-sm leading-none">
                Resumo Financeiro & ROI
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Performance ajustada ao filtro temporal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            ROI do Período Selecionado
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Capital em Estoque"
              value={brlK(metrics.stockCost)}
              sub="Valor total hoje"
            />
            <KpiCard
              label="Faturamento Período"
              value={brlK(filteredMetrics.totalRevenue)}
              sub="Total em vendas"
            />
            <KpiCard
              label="Lucro Período"
              value={brlK(filteredMetrics.totalProfit)}
              sub="Líquido real"
            />
            <KpiCard
              label="Vendas Totais"
              value={filteredMetrics.salesCount}
              sub="Transações"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 hover:border-brand transition-all duration-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-700 font-semibold text-sm">
                Eficiência de Conversão (Faturamento Período vs Estoque Atual)
              </p>
              <p className="text-slate-400 text-xs tabular-nums">
                {brlK(filteredMetrics.totalRevenue)} faturado
              </p>
            </div>
            <div className="flex h-6 rounded-xl overflow-hidden gap-px mb-3 bg-slate-200">
              <div
                className="bg-blue-500 rounded-l-full flex items-center justify-center transition-all duration-700"
                style={{
                  width: `${(metrics.stockCost / (metrics.stockCost + filteredMetrics.totalRevenue)) * 100}%`,
                }}
              >
                <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                  Estoque
                </span>
              </div>
              <div className="bg-brand rounded-r-full flex-1 flex items-center justify-center transition-all duration-700">
                <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                  Vendas no Período
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Capital
                Parado —{" "}
                <strong className="text-blue-600">
                  {brlK(metrics.stockCost)}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" />{" "}
                Convertido em Venda —{" "}
                <strong className="text-brand">
                  {brlK(filteredMetrics.totalRevenue)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de exportação PDF de entradas de mercadorias */}
      {pdfModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !pdfLoading && setPdfModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-slate-900 font-black text-lg mb-1">
              {pdfTipo === "IN"
                ? "Exportar Entradas de Mercadorias"
                : "Exportar Saídas de Mercadorias"}
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              Selecione o tipo e o período a incluir no PDF.
            </p>

            {/* Seletor de tipo de relatório */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { value: "IN", label: "Entradas" },
                { value: "OUT", label: "Saídas" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPdfTipo(opt.value);
                    setPdfError("");
                  }}
                  disabled={pdfLoading}
                  className={`px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-60 ${
                    pdfTipo === opt.value
                      ? "bg-brand text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-brand hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-700 text-xs font-semibold mb-1.5 block">
                  Data início
                </label>
                <input
                  type="date"
                  value={pdfDates.start}
                  onChange={(e) => {
                    setPdfDates((d) => ({ ...d, start: e.target.value }));
                    setPdfError("");
                  }}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="text-slate-700 text-xs font-semibold mb-1.5 block">
                  Data fim
                </label>
                <input
                  type="date"
                  value={pdfDates.end}
                  onChange={(e) => {
                    setPdfDates((d) => ({ ...d, end: e.target.value }));
                    setPdfError("");
                  }}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {pdfError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2.5 mt-4">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPdfModal(false)}
                disabled={pdfLoading}
                className="bg-white border border-slate-200 text-slate-600 font-medium rounded-xl px-4 py-2 hover:border-brand hover:text-slate-900 transition-all duration-150 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-2 bg-brand text-white font-bold rounded-xl px-4 py-2 hover:bg-brand-hover transition-colors duration-150 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <FileDown size={16} /> Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
