import { useMemo, useState } from "react";
import { useInventory } from "../context/InventoryContext";
import ProfitGoalBar from "../components/ProfitGoalBar";
import { isLowStock } from "../lib/stock";
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
  AlertTriangle,
  Package,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { brl, brlK } from "../utils/format";

// ─────────────────────────────────────────────────────────────
// 2. SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, subtitle, valueClassName }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 cursor-default transition-all duration-200 hover:border-brand hover:scale-[1.02]">
      <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-3">
        {label}
      </p>
      <p
        className={`font-black text-2xl tracking-tight leading-none tabular-nums mb-1.5 ${
          valueClassName || "text-slate-900"
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
    </div>
  );
}

function ProdutoCritico({ produto, rank }) {
  const esgotado = produto.qtd === 0;
  const badgeClass = esgotado
    ? "bg-red-50 text-red-500 border border-red-200"
    : "bg-amber-50 text-amber-600 border border-amber-200";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors duration-150">
      <span className="text-slate-400 text-xs font-bold w-4 text-center">
        {rank}
      </span>
      <Package size={14} className="text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-slate-700 font-semibold text-sm truncate">
          {produto.nome}
        </p>
        <p className="text-slate-400 text-xs truncate">
          {produto.categoria}
        </p>
      </div>
      <span
        className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}
      >
        {produto.qtd} un.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. STATUS ALERT
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
// 4. MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { products, metrics, userPreferences, loadError } = useInventory();

  const [alertMessage, setAlertMessage] = useState(null);

  // Show error for 5 seconds
  const showAlert = (message, type = "error") => {
    setAlertMessage({ type, message });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // --- REAL METRICS LOGIC (updated for Supabase) ---
  const dashboardStats = useMemo(() => {
    // Exact sum of (current stock × price) for all products
    const faturamentoPotencial = products.reduce(
      (acc, p) => acc + Number(p.qtd) * Number(p.precoVenda),
      0
    );
    const investimentoEstoque = products.reduce(
      (acc, p) => acc + Number(p.qtd) * Number(p.precoCusto || 0),
      0
    );
    const lucroEstimado = faturamentoPotencial - investimentoEstoque;
    // Includes in urgent restocking products that are sold out (qty <= 0) or below the
    // threshold (isLowStock respects per-product min_stock and the user's
    // low_stock_threshold — single source of truth in src/lib/stock.js).
    const criticos = [...products]
      .filter((p) => {
        const qty = Number(p.qtd) || 0;
        return qty <= 0 || isLowStock(p, userPreferences);
      })
      .sort((a, b) => {
        const qa = Number(a.qtd) || 0;
        const qb = Number(b.qtd) || 0;
        // Sold out (qty <= 0) first, then by ascending quantity.
        const ea = qa <= 0 ? 0 : 1;
        const eb = qb <= 0 ? 0 : 1;
        if (ea !== eb) return ea - eb;
        return qa - qb;
      })
      .slice(0, 5);

    // Grouping for the Bar Chart
    const categoriasMap = products.reduce((acc, p) => {
      const cat = p.categoria || "Sem categoria";
      if (!acc[cat]) acc[cat] = { categoria: cat, vendas: 0, custo: 0 };
      acc[cat].vendas += Number(p.qtd) * Number(p.precoVenda);
      acc[cat].custo += Number(p.qtd) * Number(p.precoCusto || 0);
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

    // metrics.lowStockCount (isLowStock) excludes sold-out items by definition —
    // the sold-out count is added separately so as not to underestimate the total.
    const baixoCount = metrics.lowStockCount;
    const esgotadoCount = products.filter(
      (p) => (Number(p.qtd) || 0) <= 0
    ).length;

    return {
      faturamentoPotencial,
      investimentoEstoque,
      lucroEstimado,
      criticos,
      alertasCount: baixoCount + esgotadoCount,
      baixoCount,
      esgotadoCount,
      dadosCategoria,
    };
  }, [products, metrics, userPreferences]);

  return (
    <div className="min-h-full bg-surface-page space-y-6">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="flex-shrink-0" />
          {loadError}
        </div>
      )}

      {/* Error/Success Alert */}
      {alertMessage && (
        <AlertMessage
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-ink-secondary mt-0.5">
            Estoklab · Sincronizado com Supabase
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised border-2 border-stroke-subtle rounded-md text-ink-primary">
          <Zap size={12} className="text-brand" />
          <span className="text-xs font-medium">
            {products.length} produtos
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Faturamento Potencial"
          value={brl(dashboardStats.faturamentoPotencial)}
          subtitle="Total de venda em estoque"
        />
        <SummaryCard
          label="Lucro Previsto"
          value={brl(dashboardStats.lucroEstimado)}
          subtitle={`Margem: ${dashboardStats.faturamentoPotencial > 0 ? ((dashboardStats.lucroEstimado / dashboardStats.faturamentoPotencial) * 100).toFixed(1) : 0}%`}
        />
        <SummaryCard
          label="Custo em Estoque"
          value={brl(dashboardStats.investimentoEstoque)}
          subtitle="Dinheiro imobilizado"
        />
        <SummaryCard
          label="Alertas Críticos"
          value={`${dashboardStats.alertasCount} itens`}
          subtitle={`${dashboardStats.baixoCount} baixo, ${dashboardStats.esgotadoCount} esgotado`}
          valueClassName={
            dashboardStats.alertasCount > 0 ? "text-amber-500" : "text-brand"
          }
        />
      </div>

      {/* Profit Goal Bar */}
      <ProfitGoalBar />

      {/* Real Category Chart */}
      {dashboardStats.dadosCategoria.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand transition-all duration-200">
          <h3 className="text-slate-900 font-bold text-base mb-4">
            Volume por Categoria
          </h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, dashboardStats.dadosCategoria.length * 45)}
          >
            <BarChart
              data={dashboardStats.dadosCategoria}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
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
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  color: "#0f172a",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#0f172a" }}
                itemStyle={{ color: "#0f172a" }}
              />
              <Bar
                dataKey="vendas"
                fill="#22c55e"
                barSize={20}
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
                activeBar={{
                  fill: "#16a34a",
                  radius: [0, 4, 4, 0],
                  filter: "drop-shadow(0 0 6px rgba(34,197,94,0.5))",
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Real Critical Items List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-brand transition-all duration-200 flex flex-col">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-900 font-bold text-sm">
            Reposição Urgente
          </h3>
          <AlertTriangle size={14} className="text-amber-500" />
        </div>
        <div className="flex-1">
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
  );
}
