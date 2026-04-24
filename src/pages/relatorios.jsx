import { useState, useMemo } from "react";
import { useInventory } from "../context/InventoryContext"; // MUDANÇA: Usando o hook personalizado que criamos
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
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURAÇÕES E HELPERS
// ─────────────────────────────────────────────────────────────

const PERIODOS = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
  { label: "Este ano", value: "1y" },
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

function agruparPorCategoria(lista) {
  const mapa = {};
  for (const p of lista) {
    if (p.qtd > 0) {
      if (!mapa[p.categoria])
        mapa[p.categoria] = { categoria: p.categoria, custo: 0, venda: 0 };
      mapa[p.categoria].custo += (p.precoCusto || 0) * p.qtd;
      mapa[p.categoria].venda += (p.precoVenda || 0) * p.qtd;
    }
  }
  return Object.values(mapa).sort((a, b) => b.venda - a.venda);
}

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
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                  p.value === value
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
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

function ExportButtons() {
  return (
    <div className="flex items-center gap-2">
      <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
        <FileDown size={14} className="text-red-400" />
        PDF
      </button>
      <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[.98] rounded-lg shadow-sm shadow-emerald-200/70 transition-all">
        <FileSpreadsheet size={14} />
        Excel
      </button>
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
            <span className="w-2 h-2 rounded-sm bg-blue-400" />
            Custo
          </span>
          <span className="text-white font-bold tabular-nums">
            {brlK(custo)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-sm bg-emerald-400" />
            Venda
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
  // MUDANÇA: Pegando 'products' do contexto usando o hook useInventory
  const { products } = useInventory();

  const [periodo, setPeriodo] = useState("30d");

  // Cálculos baseados nos dados recebidos do Contexto
  const dadosCategoria = useMemo(
    () => agruparPorCategoria(products),
    [products]
  );

  const topMargem = useMemo(
    () =>
      [...products]
        .filter((p) => p.qtd > 0)
        .map((p) => ({
          ...p,
          margemPct:
            p.precoVenda > 0
              ? ((p.precoVenda - p.precoCusto) / p.precoVenda) * 100
              : 0,
        }))
        .sort((a, b) => b.margemPct - a.margemPct)
        .slice(0, 6),
    [products]
  );

  const topParado = useMemo(
    () =>
      [...products]
        .filter((p) => p.qtd > 0)
        .sort((a, b) => (b.diasEstoque || 0) - (a.diasEstoque || 0))
        .slice(0, 6),
    [products]
  );

  // Totais Globais
  const totalCusto = useMemo(
    () => products.reduce((s, p) => s + (p.precoCusto || 0) * (p.qtd || 0), 0),
    [products]
  );
  const totalVenda = useMemo(
    () => products.reduce((s, p) => s + (p.precoVenda || 0) * (p.qtd || 0), 0),
    [products]
  );
  const lucroBruto = totalVenda - totalCusto;
  const roiGlobal = totalCusto > 0 ? (lucroBruto / totalCusto) * 100 : 0;
  const margemGlobal = totalVenda > 0 ? (lucroBruto / totalVenda) * 100 : 0;
  const maxMargem =
    topMargem.length > 0 ? Math.max(...topMargem.map((p) => p.margemPct)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Cabeçalho ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Relatórios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Análise financeira em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector value={periodo} onChange={setPeriodo} />
          <ExportButtons />
        </div>
      </div>

      {/* ── Gráfico de Custo vs. Venda ─────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">
              Custo vs. Venda por Categoria
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribuição do capital investido por grupo
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
          {dadosCategoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={dadosCategoria}
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
              Nenhum dado disponível para exibir o gráfico.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-100">
          {dadosCategoria.map((cat) => {
            const lucro = cat.venda - cat.custo;
            const mg = cat.venda > 0 ? (lucro / cat.venda) * 100 : 0;
            return (
              <div
                key={cat.categoria}
                className="px-3.5 py-2.5 border-r last:border-r-0 border-b lg:border-b-0 border-slate-100"
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
                  className={`text-[10px] font-semibold mt-0.5 ${mg >= 30 ? "text-emerald-500" : mg >= 15 ? "text-amber-500" : "text-red-500"}`}
                >
                  {pct(mg)} margem
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card: Top Margem */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 leading-none">
                Top Margem
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Produtos com maior rentabilidade unitária
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topMargem.length > 0 ? (
              topMargem.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {p.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MiniBar
                        value={p.margemPct}
                        max={maxMargem}
                        color="bg-emerald-400"
                      />
                      <span className="text-[11px] font-bold text-emerald-600 tabular-nums w-12 text-right">
                        {pct(p.margemPct)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-bold text-slate-700 tabular-nums">
                      {brl(p.precoVenda - p.precoCusto)}
                    </p>
                    <p className="text-[10px] text-slate-400 text-right">
                      lucro/un.
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-10 text-center text-sm text-slate-400 italic">
                Sem itens em estoque.
              </p>
            )}
          </div>
        </div>

        {/* Card: Menor Giro (Capital Parado) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <Clock size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 leading-none">
                Menor Giro
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Produtos há mais tempo no estoque
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topParado.length > 0 ? (
              topParado.map((p, i) => {
                const capParado = (p.precoCusto || 0) * (p.qtd || 0);
                const dias = p.diasEstoque || 0;
                const urgente = dias >= 60;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {p.nome}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <MiniBar
                          value={dias}
                          max={90}
                          color={urgente ? "bg-red-400" : "bg-amber-400"}
                        />
                        <span
                          className={`text-[11px] font-bold tabular-nums w-12 text-right ${urgente ? "text-red-500" : "text-amber-600"}`}
                        >
                          {dias}d
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-700 tabular-nums">
                        {brlK(capParado)}
                      </p>
                      <p className="text-[10px] text-slate-400 text-right">
                        valor parado
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-10 text-center text-sm text-slate-400 italic">
                Nenhum produto em estoque.
              </p>
            )}
          </div>
        </div>
      </div>

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
                Visão geral do retorno sobre o estoque
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Info size={11} className="text-slate-400" />
            ROI = (Venda − Custo) ÷ Custo × 100
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Capital Investido"
              value={brlK(totalCusto)}
              sub="Custo total em estoque"
              icon={Package}
              colorScheme="blue"
            />
            <KpiCard
              label="Valor de Venda"
              value={brlK(totalVenda)}
              sub="Estimativa de faturamento"
              icon={DollarSign}
              colorScheme="emerald"
              positive={totalVenda > totalCusto}
            />
            <KpiCard
              label="Lucro Bruto"
              value={brlK(lucroBruto)}
              sub={`Margem: ${pct(margemGlobal)}`}
              icon={TrendingUp}
              colorScheme="teal"
              positive={lucroBruto > 0}
            />
            <KpiCard
              label="ROI Global"
              value={pct(roiGlobal)}
              sub="Retorno sobre investimento"
              icon={BarChart2}
              colorScheme="violet"
              positive={roiGlobal >= 20}
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">
                Composição do Valor de Estoque
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {brlK(totalVenda)} total estimado
              </p>
            </div>
            <div className="flex h-6 rounded-xl overflow-hidden gap-px mb-3 bg-slate-200">
              {totalVenda > 0 ? (
                <>
                  <div
                    className="bg-blue-400 flex items-center justify-center transition-all duration-700"
                    style={{ width: `${(totalCusto / totalVenda) * 100}%` }}
                  >
                    <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                      {pct((totalCusto / totalVenda) * 100)} Custo
                    </span>
                  </div>
                  <div className="bg-emerald-400 flex-1 flex items-center justify-center transition-all duration-700">
                    <span className="text-[9px] font-bold text-white px-1 truncate hidden sm:block">
                      {pct((lucroBruto / totalVenda) * 100)} Lucro
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Custo —{" "}
                <strong className="text-blue-600">{brlK(totalCusto)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Lucro
                —{" "}
                <strong className="text-emerald-600">{brlK(lucroBruto)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
