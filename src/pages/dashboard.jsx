import { useMemo } from "react";
import { useInventory } from "../context/InventoryContext"; // Verifique se o caminho está correto
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
// 1. HELPERS DE FORMATAÇÃO
// ─────────────────────────────────────────────────────────────
const brl = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const brlK = (v) =>
  v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
    : brl(v);

// ─────────────────────────────────────────────────────────────
// 2. SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

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
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${v.glow} before:absolute before:inset-0`}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl ${v.iconBg} ring-4 ${v.iconRing} flex items-center justify-center shadow-sm`}
        >
          <Icon size={18} className="text-white" strokeWidth={2} />
        </div>
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

function ProdutoCritico({ produto, rank }) {
  const esgotado = produto.qtd === 0;
  const cfg = esgotado
    ? {
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-600 ring-red-200",
        label: "Esgotado",
      }
    : {
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
        label: "Baixo",
      };

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <span className="text-[11px] font-bold text-slate-300 w-4 text-center">
        {rank}
      </span>
      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
        <Package size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">
          {produto.nome}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {produto.categoria}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${cfg.badge}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${esgotado ? "animate-pulse" : ""}`}
        />
        {produto.qtd} un.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { products } = useInventory();

  // --- LÓGICA DE MÉTRICAS REAIS ---
  const stats = useMemo(() => {
    const faturamentoPotencial = products.reduce(
      (acc, p) => acc + p.qtd * p.precoVenda,
      0
    );
    const investimentoEstoque = products.reduce(
      (acc, p) => acc + p.qtd * p.precoCusto,
      0
    );
    const lucroEstimado = faturamentoPotencial - investimentoEstoque;
    const criticos = [...products].sort((a, b) => a.qtd - b.qtd).slice(0, 5);
    const alertasCount = products.filter((p) => p.qtd <= 5).length;

    // Agrupamento para o Gráfico de Barras
    const categoriasMap = products.reduce((acc, p) => {
      const cat = p.categoria || "Geral";
      if (!acc[cat]) acc[cat] = { categoria: cat, vendas: 0, custo: 0 };
      acc[cat].vendas += p.qtd * p.precoVenda;
      acc[cat].custo += p.qtd * p.precoCusto;
      return acc;
    }, {});

    const dadosCategoria = Object.values(categoriasMap)
      .map((item) => ({
        ...item,
        margem:
          item.vendas > 0
            ? (((item.vendas - item.custo) / item.vendas) * 100).toFixed(1)
            : 0,
      }))
      .sort((a, b) => b.vendas - a.vendas);

    return {
      faturamentoPotencial,
      investimentoEstoque,
      lucroEstimado,
      criticos,
      alertasCount,
      dadosCategoria,
    };
  }, [products]);

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
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestão de Estoque · Tempo Real
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-white">
          <Zap size={12} className="text-teal-400" />
          <span className="text-xs font-medium">Sincronizado</span>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Faturamento Potencial"
          value={brl(stats.faturamentoPotencial)}
          delta="Real"
          deltaPositive={true}
          icon={DollarSign}
          variant="emerald"
          subtitle="Total de venda em estoque"
        />
        <SummaryCard
          label="Lucro Previsto"
          value={brl(stats.lucroEstimado)}
          delta="Bruto"
          deltaPositive={true}
          icon={TrendingUp}
          variant="blue"
          subtitle={`Margem: ${stats.faturamentoPotencial > 0 ? ((stats.lucroEstimado / stats.faturamentoPotencial) * 100).toFixed(1) : 0}%`}
        />
        <SummaryCard
          label="Custo em Estoque"
          value={brl(stats.investimentoEstoque)}
          delta="Fixo"
          deltaPositive={false}
          icon={ShoppingCart}
          variant="violet"
          subtitle="Dinheiro imobilizado"
        />
        <SummaryCard
          label="Alertas Críticos"
          value={`${stats.alertasCount} itens`}
          delta={`Baixo`}
          deltaPositive={false}
          icon={AlertTriangle}
          variant="amber"
          subtitle="Produtos < 5 unidades"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gráfico de Histórico (Mantido Fictício por falta de Tabela de Vendas) */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Tendência de Mercado (Simulação)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={[
                { m: "Jan", v: 4000 },
                { m: "Fev", v: 3000 },
                { m: "Mar", v: 5000 },
                { m: "Abr", v: 4500 },
              ]}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} axisLine={false} />
              <YAxis
                tickFormatter={brlK}
                tick={{ fontSize: 11 }}
                axisLine={false}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#14b8a6"
                fill="#ccfbf1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lista Real de Críticos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-4 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700">
              Reposição Urgente
            </h3>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div className="flex-1 px-4 divide-y divide-slate-100">
            {stats.criticos.map((p, i) => (
              <ProdutoCritico key={p.id} produto={p} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Categorias Real */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">
          Volume por Categoria
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.dadosCategoria}>
            <XAxis dataKey="categoria" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={brlK} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
              {stats.dadosCategoria.map((_, i) => (
                <Cell key={i} fill={barColors[i % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
