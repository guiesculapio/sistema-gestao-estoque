import { useMemo, useState } from "react";
import { useInventory } from "../hooks/useInventory"; // ✅ NOVO HOOK COM SUPABASE
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
  AlertCircle,
  CheckCircle,
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
  const esgotado = produto.current_stock === 0;
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
          {produto.name}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {produto.category}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${cfg.badge}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${esgotado ? "animate-pulse" : ""}`}
        />
        {produto.current_stock} un.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. ALERT DE STATUS
// ─────────────────────────────────────────────────────────────

function AlertMessage({ type, message, onClose }) {
  const bgColor =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  const Icon = type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm p-4 rounded-lg border ${bgColor} flex items-start gap-3 shadow-lg`}
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-lg font-bold opacity-50 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  // ✅ USAR O NOVO HOOK COM SUPABASE
  const {
    products,
    loading,
    error,
    stats,
    recordOutbound,
    clearError,
    outboundHistory,
  } = useInventory();

  console.log({ products, stats, loading });

  const [alertMessage, setAlertMessage] = useState(null);

  // Mostrar erro por 5 segundos
  const showAlert = (message, type = "error") => {
    setAlertMessage({ type, message });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // --- LÓGICA DE MÉTRICAS REAIS (atualizada para Supabase) ---
  const dashboardStats = useMemo(() => {
    // Soma exata de (estoque atual × preço) de todos os produtos
    const faturamentoPotencial = products.reduce(
      (acc, p) => acc + Number(p.current_stock) * Number(p.price),
      0
    );
    const investimentoEstoque = products.reduce(
      (acc, p) => acc + Number(p.current_stock) * Number(p.cost_price || 0),
      0
    );
    const lucroEstimado = faturamentoPotencial - investimentoEstoque;
    const criticos = [...products]
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 5);

    // Agrupamento para o Gráfico de Barras
    const categoriasMap = products.reduce((acc, p) => {
      const cat = p.category || "Geral";
      if (!acc[cat]) acc[cat] = { categoria: cat, vendas: 0, custo: 0 };
      acc[cat].vendas += Number(p.current_stock) * Number(p.price);
      acc[cat].custo += Number(p.current_stock) * Number(p.cost_price || 0);
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
      alertasCount: stats.lowStockCount + stats.outOfStockCount,
      dadosCategoria,
    };
  }, [products, stats]);

  // --- HISTÓRICO REAL DE VENDAS AGRUPADO POR MÊS ---
  const tendenciaData = useMemo(() => {
    console.log("🔍 [DIAG] tendenciaData inputs:", {
      outboundHistoryLen: outboundHistory?.length ?? 0,
      productsLen: products?.length ?? 0,
      tzOffsetMin: new Date().getTimezoneOffset(),
      hojeLocal: new Date().toString(),
    });

    if (!outboundHistory || outboundHistory.length === 0) {
      console.log("🔍 [DIAG] tendenciaData → vazio (sem outboundHistory)");
      return [];
    }
    if (!products || products.length === 0) {
      console.log("🔍 [DIAG] tendenciaData → vazio (sem products)");
      return [];
    }

    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    // Lookup de preço por product_id — evita dependência do embed PostgREST
    const priceById = new Map(
      products.map((p) => [p.id, Number(p.price) || 0])
    );

    let descartadasData = 0;
    let descartadasReceita = 0;
    const buckets = new Map();
    const trace = [];

    for (const mov of outboundHistory) {
      // Parse defensivo da data (Supabase devolve ISO 8601 com timezone)
      const date = new Date(mov.created_at);
      if (Number.isNaN(date.getTime())) {
        descartadasData++;
        continue;
      }

      const price = priceById.get(mov.product_id) ?? 0;
      const qty = Number(mov.quantity) || 0;
      const revenue = qty * price;

      if (trace.length < 5) {
        trace.push({
          rawCreatedAt: mov.created_at,
          parsedISO: date.toISOString(),
          parsedLocal: date.toString(),
          year: date.getFullYear(),
          month: date.getMonth(),
          product_id: mov.product_id,
          priceFromMap: price,
          qty,
          revenue,
        });
      }

      if (revenue <= 0) {
        descartadasReceita++;
        continue;
      }

      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          sortKey: key,
          m: `${monthNames[month]}/${String(year).slice(-2)}`,
          v: 0,
        });
      }
      buckets.get(key).v += revenue;
    }

    const result = Array.from(buckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ m, v }) => ({ m, v }));

    console.log("🔍 [DIAG] tendenciaData processamento:", {
      totalMov: outboundHistory.length,
      descartadasPorData: descartadasData,
      descartadasPorReceita: descartadasReceita,
      bucketsGerados: result.length,
      trace,
      result,
    });

    return result;
  }, [outboundHistory, products]);

  // Exemplo de como registrar uma venda
  const handleSaleExample = async () => {
    if (products.length === 0) {
      showAlert("Nenhum produto disponível para venda", "error");
      return;
    }

    const productId = products[0].id;
    const result = await recordOutbound(productId, 1, "venda");

    if (result.success) {
      showAlert(`Venda registrada: 1x ${products[0].name}`, "success");
    } else {
      showAlert(result.error, "error");
    }
  };

  const barColors = [
    "#0d9488",
    "#14b8a6",
    "#2dd4bf",
    "#5eead4",
    "#99f6e4",
    "#ccfbf1",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Zap size={32} className="text-teal-500" />
          </div>
          <p className="mt-4 text-slate-600">
            Carregando dados do banco de dados...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert de Erro/Sucesso */}
      {alertMessage && (
        <AlertMessage
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestão de Estoque · Sincronizado com Supabase
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-white">
          <Zap size={12} className="text-teal-400" />
          <span className="text-xs font-medium">
            {products.length} produtos
          </span>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Faturamento Potencial"
          value={brl(dashboardStats.faturamentoPotencial)}
          delta="Real"
          deltaPositive={true}
          icon={DollarSign}
          variant="emerald"
          subtitle="Total de venda em estoque"
        />
        <SummaryCard
          label="Lucro Previsto"
          value={brl(dashboardStats.lucroEstimado)}
          delta="Bruto"
          deltaPositive={true}
          icon={TrendingUp}
          variant="blue"
          subtitle={`Margem: ${dashboardStats.faturamentoPotencial > 0 ? ((dashboardStats.lucroEstimado / dashboardStats.faturamentoPotencial) * 100).toFixed(1) : 0}%`}
        />
        <SummaryCard
          label="Custo em Estoque"
          value={brl(dashboardStats.investimentoEstoque)}
          delta="Fixo"
          deltaPositive={false}
          icon={ShoppingCart}
          variant="violet"
          subtitle="Dinheiro imobilizado"
        />
        <SummaryCard
          label="Alertas Críticos"
          value={`${dashboardStats.alertasCount} itens`}
          delta={dashboardStats.alertasCount > 0 ? "Crítico" : "OK"}
          deltaPositive={dashboardStats.alertasCount === 0}
          icon={AlertTriangle}
          variant={dashboardStats.alertasCount > 0 ? "amber" : "emerald"}
          subtitle={`${stats.lowStockCount} baixo, ${stats.outOfStockCount} esgotado`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gráfico de Histórico Real de Vendas */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Histórico de Vendas
          </h3>
          {tendenciaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tendenciaData}>
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
                <Tooltip
                  formatter={(value) => [brl(value), "Faturamento"]}
                  labelStyle={{ color: "#475569", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#14b8a6"
                  fill="#ccfbf1"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <TrendingUp size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Sem histórico de vendas ainda
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Quando você registrar saídas (vendas), o faturamento mensal
                aparecerá aqui automaticamente.
              </p>
            </div>
          )}
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
            {dashboardStats.criticos.length > 0 ? (
              dashboardStats.criticos.map((p, i) => (
                <ProdutoCritico key={p.id} produto={p} rank={i + 1} />
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Package size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Todos os produtos em bom nível</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Categorias Real */}
      {dashboardStats.dadosCategoria.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Volume por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardStats.dadosCategoria}>
              <XAxis dataKey="categoria" axisLine={false} tickLine={false} />
              <YAxis tickFormatter={brlK} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                {dashboardStats.dadosCategoria.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
