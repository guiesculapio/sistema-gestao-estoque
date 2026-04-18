import { TrendingUp, Package, AlertTriangle, ArrowUpRight } from "lucide-react";

/**
 * Card de métrica simples — será expandido nas próximas sprints.
 */
function MetricCard({ label, value, delta, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}
        >
          <Icon size={18} className="text-white" />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <ArrowUpRight size={11} />
          {delta}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">
        {value}
      </p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

/**
 * Dashboard.jsx — Visão geral do estoque.
 * Conteúdo placeholder; será preenchido com dados reais.
 */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Visão geral do seu estoque em tempo real.
        </p>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total de Itens"
          value="4.821"
          delta="+3,2%"
          icon={Package}
          color="bg-teal-500"
        />
        <MetricCard
          label="Valor em Estoque"
          value="R$ 182.490"
          delta="+8,1%"
          icon={TrendingUp}
          color="bg-cyan-600"
        />
        <MetricCard
          label="Itens Críticos"
          value="17"
          delta="+2"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
      </div>

      {/* Placeholder para gráficos futuros */}
      <div className="bg-white rounded-xl border border-slate-200/80 border-dashed p-10 text-center shadow-sm">
        <p className="text-slate-400 text-sm">
          📊 Área reservada para gráficos e tabelas nas próximas sprints.
        </p>
      </div>
    </div>
  );
}
