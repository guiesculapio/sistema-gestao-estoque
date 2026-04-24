import { useState, useMemo } from "react";
import { useInventory } from "../context/InventoryContext";
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
  TrendingUp,
  DollarSign,
  Package,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Medal,
  Clock,
  Info,
  ShoppingCart,
} from "lucide-react";

// Bibliotecas de exportação
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURAÇÕES E HELPERS
// ─────────────────────────────────────────────────────────────

const PERIODOS = [
  { label: "Últimos 7 dias", value: "7d", days: 7 },
  { label: "Últimos 30 dias", value: "30d", days: 30 },
  { label: "Últimos 90 dias", value: "90d", days: 90 },
  { label: "Este ano", value: "1y", days: 365 },
];

const brl = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlK = (v) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
    : brl(v);
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
        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
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
          <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onChange(p.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${p.value === value ? "bg-teal-50 text-teal-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
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
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-3 shadow-xl text-xs min-w-[160px]">
      <p className="text-slate-300 font-semibold mb-2 pb-1.5 border-b border-slate-700">
        {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-blue-300">
            <span className="w-2 h-2 rounded-sm bg-blue-400" /> Custo
          </span>
          <span className="text-white font-bold tabular-nums">
            {brlK(custo)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-sm bg-emerald-400" /> Venda
          </span>
          <span className="text-white font-bold tabular-nums">
            {brlK(venda)}
          </span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-slate-700 flex justify-between gap-6">
          <span className="text-slate-400">Lucro</span>
          <span className="text-emerald-400 font-bold tabular-nums">
            {brlK(lucro)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Margem</span>
          <span className="text-emerald-400 font-bold">{pct(mg)}</span>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const styles = [
    "bg-amber-400 text-amber-900",
    "bg-slate-300 text-slate-700",
    "bg-orange-300 text-orange-800",
  ];
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0 ${styles[rank - 1] ?? "bg-slate-100 text-slate-500"}`}
    >
      {rank === 1 ? <Medal size={10} /> : rank}
    </span>
  );
}

function MiniBar({ value, max, color = "bg-emerald-400" }) {
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

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  positive,
  colorScheme = "teal",
}) {
  const schemes = {
    teal: { wrap: "bg-teal-50", val: "text-teal-700", ico: "text-teal-500" },
    blue: { wrap: "bg-blue-50", val: "text-blue-700", ico: "text-blue-500" },
    emerald: {
      wrap: "bg-emerald-50",
      val: "text-emerald-700",
      ico: "text-emerald-500",
    },
    violet: {
      wrap: "bg-violet-50",
      val: "text-violet-700",
      ico: "text-violet-500",
    },
  };
  const s = schemes[colorScheme];
  return (
    <div
      className={`${s.wrap} rounded-xl p-4 border border-white/80 shadow-sm`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon size={16} className={s.ico} />
        {positive !== undefined && (
          <span
            className={`text-[10px] font-bold flex items-center gap-0.5 ${positive ? "text-emerald-600" : "text-red-500"}`}
          >
            {positive ? (
              <ArrowUpRight size={10} />
            ) : (
              <ArrowDownRight size={10} />
            )}
            {positive ? "Saudável" : "Revisar"}
          </span>
        )}
      </div>
      <p
        className={`text-xl font-bold ${s.val} tabular-nums leading-none mb-1`}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Relatorios() {
  const { products, sales, metrics } = useInventory();
  const [periodo, setPeriodo] = useState("30d");

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
      .filter((p) => p.qtd > 0 && !sales.some((s) => s.productId === p.id))
      .sort((a, b) => b.precoCusto * b.qtd - a.precoCusto * a.qtd)
      .slice(0, 6);
  }, [products, sales]);

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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const periodLabel = PERIODOS.find((p) => p.value === periodo).label;

    doc.setFontSize(18);
    doc.text("Relatório de Performance - Gestão de Estoque", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Período: ${periodLabel} | Gerado em: ${new Date().toLocaleString()}`,
      14,
      28
    );

    // Tabela de KPIs
    doc.autoTable({
      startY: 35,
      head: [["KPI", "Valor"]],
      body: [
        ["Faturamento Total", brl(filteredMetrics.totalRevenue)],
        ["Lucro Líquido", brl(filteredMetrics.totalProfit)],
        ["Total de Vendas", filteredMetrics.salesCount.toString()],
        ["Capital em Estoque (Atual)", brl(metrics.stockCost)],
      ],
      theme: "striped",
      headStyles: { fillStyle: [31, 41, 55] },
    });

    // Tabela de Top Produtos
    doc.text("Top 5 Produtos por Lucro", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Produto", "Lucro Total"]],
      body: filteredMetrics.topSelling.map((p) => [p.nome, brl(p.lucroTotal)]),
    });

    doc.save(`Relatorio_Performance_${periodo}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Relatórios de Performance
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Análise financeira baseada em vendas reais
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector value={periodo} onChange={setPeriodo} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            >
              <FileDown size={14} className="text-red-400" /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[.98] rounded-lg shadow-sm transition-all"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico de Performance Real */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">
              Vendas vs. Custo por Categoria
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Resultados para o período de{" "}
              {PERIODOS.find((p) => p.value === periodo).label}
            </p>
          </div>
          <div className="flex items-center gap-5 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-blue-500">
              <span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />{" "}
              Custo
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />{" "}
              Venda
            </span>
          </div>
        </div>

        <div className="px-2 pt-4 pb-2">
          {filteredMetrics.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={filteredMetrics.categories}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="30%"
                barGap={3}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tickFormatter={brlK}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<DualBarTooltip />}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="custo" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="venda" fill="#34d399" radius={[4, 4, 0, 0]} />
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
                <p className="text-[10px] text-slate-400 truncate mb-0.5">
                  {cat.categoria}
                </p>
                <p className="text-xs font-bold text-blue-500 tabular-nums">
                  {brlK(cat.custo)}
                </p>
                <p className="text-xs font-bold text-emerald-600 tabular-nums">
                  {brlK(cat.venda)}
                </p>
                <p
                  className={`text-[10px] font-semibold mt-0.5 ${mg >= 30 ? "text-emerald-500" : "text-amber-500"}`}
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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 leading-none">
                Top Lucro Real
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No período selecionado
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredMetrics.topSelling.length > 0 ? (
              filteredMetrics.topSelling.map((p, i) => (
                <div
                  key={p.nome}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {p.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MiniBar
                        value={p.lucroTotal}
                        max={maxMargemReal}
                        color="bg-emerald-400"
                      />
                      <span className="text-[11px] font-bold text-emerald-600 tabular-nums w-16 text-right">
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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <Clock size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 leading-none">
                Capital Preso
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Itens sem nenhuma venda registrada
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topParado.length > 0 ? (
              topParado.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {p.nome}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {p.qtd} unidades paradas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700 tabular-nums">
                      {brlK(p.precoCusto * p.qtd)}
                    </p>
                    <p className="text-[10px] text-slate-400">custo total</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-10 text-center text-sm text-slate-400 italic">
                Estoquesaudável.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro Real */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
              <DollarSign size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 leading-none">
                Resumo Financeiro & ROI
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Performance ajustada ao filtro temporal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Info size={11} className="text-slate-400" /> ROI do Período
            Selecionado
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Capital em Estoque"
              value={brlK(metrics.stockCost)}
              sub="Valor total hoje"
              icon={Package}
              colorScheme="blue"
            />
            <KpiCard
              label="Faturamento Período"
              value={brlK(filteredMetrics.totalRevenue)}
              sub="Total em vendas"
              icon={DollarSign}
              colorScheme="emerald"
              positive={true}
            />
            <KpiCard
              label="Lucro Período"
              value={brlK(filteredMetrics.totalProfit)}
              sub="Líquido real"
              icon={TrendingUp}
              colorScheme="teal"
              positive={filteredMetrics.totalProfit > 0}
            />
            <KpiCard
              label="Vendas Totais"
              value={filteredMetrics.salesCount}
              sub="Transações"
              icon={ShoppingCart}
              colorScheme="violet"
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">
                Eficiência de Conversão (Faturamento Período vs Estoque Atual)
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {brlK(filteredMetrics.totalRevenue)} faturado
              </p>
            </div>
            <div className="flex h-6 rounded-xl overflow-hidden gap-px mb-3 bg-slate-200">
              <div
                className="bg-blue-400 flex items-center justify-center transition-all duration-700"
                style={{
                  width: `${(metrics.stockCost / (metrics.stockCost + filteredMetrics.totalRevenue)) * 100}%`,
                }}
              >
                <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                  Estoque
                </span>
              </div>
              <div className="bg-emerald-400 flex-1 flex items-center justify-center transition-all duration-700">
                <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                  Vendas no Período
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Capital
                Parado —{" "}
                <strong className="text-blue-600">
                  {brlK(metrics.stockCost)}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />{" "}
                Convertido em Venda —{" "}
                <strong className="text-emerald-600">
                  {brlK(filteredMetrics.totalRevenue)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
