import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ChevronRight,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// 1. DADOS FICTÍCIOS
// ─────────────────────────────────────────────────────────────

/** Faturamento mensal (últimos 7 meses) */
const dadosMensais = [
  { mes: "Out", faturamento: 38400, lucro: 11200, custo: 27200 },
  { mes: "Nov", faturamento: 42100, lucro: 13500, custo: 28600 },
  { mes: "Dez", faturamento: 61800, lucro: 21000, custo: 40800 },
  { mes: "Jan", faturamento: 34900, lucro: 10200, custo: 24700 },
  { mes: "Fev", faturamento: 47200, lucro: 15800, custo: 31400 },
  { mes: "Mar", faturamento: 52600, lucro: 18900, custo: 33700 },
  { mes: "Abr", faturamento: 58300, lucro: 21400, custo: 36900 },
];

/** Vendas por categoria */
const dadosCategoria = [
  { categoria: "Eletrônicos", vendas: 89400, margem: 24.1 },
  { categoria: "Periféricos", vendas: 43200, margem: 31.8 },
  { categoria: "Áudio", vendas: 28700, margem: 36.4 },
  { categoria: "Armazenamento", vendas: 19500, margem: 27.9 },
  { categoria: "Mobiliário", vendas: 16200, margem: 47.0 },
  { categoria: "Acessórios", vendas: 11300, margem: 55.2 },
];

/** Produtos com estoque crítico (menor quantidade) */
const produtosCriticos = [
  {
    id: 7,
    nome: "Webcam Logitech Brio 4K",
    categoria: "Periféricos",
    qtd: 0,
    precoVenda: 749.9,
  },
  {
    id: 3,
    nome: "Teclado Mecânico Keychron Q1",
    categoria: "Periféricos",
    qtd: 0,
    precoVenda: 899.0,
  },
  {
    id: 12,
    nome: "Cabo HDMI 2.1 2m",
    categoria: "Cabos",
    qtd: 3,
    precoVenda: 49.9,
  },
  {
    id: 5,
    nome: "Cadeira Ergonômica Flexform",
    categoria: "Mobiliário",
    qtd: 3,
    precoVenda: 1850.0,
  },
  {
    id: 9,
    nome: "Mesa Digitalizadora Wacom",
    categoria: "Periféricos",
    qtd: 2,
    precoVenda: 1120.0,
  },
];

// ─────────────────────────────────────────────────────────────
// 2. HELPERS
// ─────────────────────────────────────────────────────────────

const brl = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlK = (v) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
    : brl(v);

// ─────────────────────────────────────────────────────────────
// 3. SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

/**
 * SummaryCard — Card de métrica com ícone, valor, delta e micro-trend.
 * Variantes de cor passadas via prop `variant`.
 */
const CARD_VARIANTS = {
  emerald: {
    iconBg: "bg-emerald-500",
    iconRing: "ring-emerald-400/30",
    glow: "before:bg-emerald-400/10",
    delta: "text-emerald-600 bg-emerald-50",
  },
  blue: {
    iconBg: "bg-blue-500",
    iconRing: "ring-blue-400/30",
    glow: "before:bg-blue-400/10",
    delta: "text-blue-600 bg-blue-50",
  },
  violet: {
    iconBg: "bg-violet-500",
    iconRing: "ring-violet-400/30",
    glow: "before:bg-violet-400/10",
    delta: "text-violet-600 bg-violet-50",
  },
  amber: {
    iconBg: "bg-amber-500",
    iconRing: "ring-amber-400/30",
    glow: "before:bg-amber-400/10",
    delta: "text-amber-700 bg-amber-50",
  },
};

function SummaryCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  variant = "emerald",
  subtitle,
}) {
  const v = CARD_VARIANTS[variant];
  return (
    <div className="relative bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-200">
      {/* Glow de fundo sutil no hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${v.glow} before:absolute before:inset-0`}
      />

      <div className="relative flex items-start justify-between mb-4">
        {/* Ícone */}
        <div
          className={`w-10 h-10 rounded-xl ${v.iconBg} ring-4 ${v.iconRing} flex items-center justify-center shadow-sm`}
        >
          <Icon size={18} className="text-white" strokeWidth={2} />
        </div>

        {/* Delta badge */}
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${v.delta}`}
        >
          {deltaPositive ? (
            <ArrowUpRight size={11} strokeWidth={2.5} />
          ) : (
            <ArrowDownRight size={11} strokeWidth={2.5} />
          )}
          {delta}
        </span>
      </div>

      <p className="text-2xl font-bold text-slate-800 tracking-tight tabular-nums leading-none mb-1">
        {value}
      </p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1.5 border-t border-slate-100 pt-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Tooltip personalizado para o gráfico de área */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 font-medium mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <span
            className="flex items-center gap-1.5"
            style={{ color: entry.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="text-white font-bold tabular-nums">
            {brlK(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tooltip para o gráfico de barras de categorias */
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      <p className="text-white font-bold">{brlK(payload[0]?.value)}</p>
      <p className="text-emerald-400 text-[11px]">
        Margem: {payload[0]?.payload?.margem}%
      </p>
    </div>
  );
}

/** Item de produto crítico na lista lateral */
function ProdutoCritico({ produto, rank }) {
  const esgotado = produto.qtd === 0;
  const urgencia = esgotado
    ? "esgotado"
    : produto.qtd <= 3
      ? "critico"
      : "baixo";

  const urgenciaConfig = {
    esgotado: {
      dot: "bg-red-500",
      label: "Esgotado",
      text: "text-red-600",
      badge: "bg-red-50 text-red-600 ring-red-200",
    },
    critico: {
      dot: "bg-amber-500",
      label: "Crítico",
      text: "text-amber-600",
      badge: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    baixo: {
      dot: "bg-yellow-400",
      label: "Baixo",
      text: "text-yellow-600",
      badge: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    },
  };
  const cfg = urgenciaConfig[urgencia];

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      {/* Rank */}
      <span className="text-[11px] font-bold text-slate-300 w-4 text-center flex-shrink-0">
        {rank}
      </span>

      {/* Ícone produto */}
      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center flex-shrink-0">
        <Package size={13} className="text-slate-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate leading-snug">
          {produto.nome}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {produto.categoria}
        </p>
      </div>

      {/* Quantidade + badge */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${cfg.badge}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${esgotado ? "animate-pulse" : ""}`}
          />
          {esgotado ? "0 un." : `${produto.qtd} un.`}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const mesAtual = dadosMensais[dadosMensais.length - 1];
  const mesAnterior = dadosMensais[dadosMensais.length - 2];

  const deltaFaturamento = (
    ((mesAtual.faturamento - mesAnterior.faturamento) /
      mesAnterior.faturamento) *
    100
  ).toFixed(1);
  const deltaLucro = (
    ((mesAtual.lucro - mesAnterior.lucro) / mesAnterior.lucro) *
    100
  ).toFixed(1);
  const margemAtual = ((mesAtual.lucro / mesAtual.faturamento) * 100).toFixed(
    1
  );
  const alertasTotal = produtosCriticos.filter((p) => p.qtd === 0).length;

  // Cores alternadas para o gráfico de barras (escala de saturação do teal)
  const barColors = [
    "#0d9488",
    "#14b8a6",
    "#2dd4bf",
    "#5eead4",
    "#99f6e4",
    "#ccfbf1",
  ];

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Resumo financeiro · Abril 2025
          </p>
        </div>
        {/* Indicador de período */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg">
          <Zap size={12} className="text-teal-400" />
          <span className="text-xs font-medium text-slate-300">
            Dados em tempo real
          </span>
        </div>
      </div>

      {/* ── 4 Cards de resumo ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Faturamento (Abr)"
          value={brlK(mesAtual.faturamento)}
          delta={`${deltaFaturamento}%`}
          deltaPositive={parseFloat(deltaFaturamento) >= 0}
          icon={DollarSign}
          variant="emerald"
          subtitle={`vs. ${brlK(mesAnterior.faturamento)} em Mar`}
        />
        <SummaryCard
          label="Lucro Bruto (Abr)"
          value={brlK(mesAtual.lucro)}
          delta={`${deltaLucro}%`}
          deltaPositive={parseFloat(deltaLucro) >= 0}
          icon={TrendingUp}
          variant="blue"
          subtitle={`Margem atual: ${margemAtual}%`}
        />
        <SummaryCard
          label="Investimento em Estoque"
          value={brlK(mesAtual.custo)}
          delta="3,1%"
          deltaPositive={false}
          icon={ShoppingCart}
          variant="violet"
          subtitle="Capital imobilizado em produtos"
        />
        <SummaryCard
          label="Alertas de Estoque"
          value={`${alertasTotal} produto${alertasTotal !== 1 ? "s" : ""}`}
          delta={`+${alertasTotal}`}
          deltaPositive={false}
          icon={AlertTriangle}
          variant="amber"
          subtitle="Itens esgotados aguardando reposição"
        />
      </div>

      {/* ── Linha central: Gráfico + Ações Urgentes ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gráfico de área — faturamento vs lucro (ocupa 2 colunas) */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header do card */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-700 tracking-tight">
                Evolução Financeira
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Faturamento vs. Lucro — últimos 7 meses
              </p>
            </div>
            {/* Legenda manual */}
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-teal-500 inline-block" />
                Faturamento
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-blue-400 inline-block" />
                Lucro
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dadosMensais}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="gradFaturamento"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
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
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#gradFaturamento)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#gradLucro)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Painel de Ações Urgentes */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
                <AlertTriangle
                  size={13}
                  className="text-white"
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 tracking-tight leading-none">
                  Ações Urgentes
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Menor estoque disponível
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 transition-colors">
              Ver todos
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 px-4 divide-y divide-slate-100">
            {produtosCriticos.map((produto, i) => (
              <ProdutoCritico key={produto.id} produto={produto} rank={i + 1} />
            ))}
          </div>

          {/* Footer CTA */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <button className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm shadow-amber-200/60">
              <ShoppingCart size={13} />
              Gerar Pedido de Compra
            </button>
          </div>
        </div>
      </div>

      {/* ── Gráfico de barras: vendas por categoria ──────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-700 tracking-tight">
              Vendas por Categoria
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Volume de receita acumulado · Margem % no tooltip
            </p>
          </div>
          {/* Legenda de melhor margem */}
          <div className="text-right">
            <p className="text-[11px] text-slate-400">Maior margem</p>
            <p className="text-xs font-bold text-emerald-600">
              Acessórios · 55,2%
            </p>
          </div>
        </div>

        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={dadosCategoria}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="28%"
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
              <Tooltip content={<BarTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="vendas" name="Vendas" radius={[5, 5, 0, 0]}>
                {dadosCategoria.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColors[index % barColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mini tabela de referência abaixo do gráfico */}
        <div className="grid grid-cols-3 sm:grid-cols-6 border-t border-slate-100">
          {dadosCategoria.map((cat, i) => (
            <div
              key={cat.categoria}
              className="px-4 py-2.5 border-r last:border-r-0 border-slate-100"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: barColors[i] }}
                />
                <p className="text-[10px] text-slate-400 truncate">
                  {cat.categoria}
                </p>
              </div>
              <p className="text-xs font-bold text-slate-700 tabular-nums">
                {brlK(cat.vendas)}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                {cat.margem}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
