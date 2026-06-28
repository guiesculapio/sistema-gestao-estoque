import { useState } from "react";
import {
  Settings,
  Tags,
  AlertTriangle,
  Clock,
  Lock,
} from "lucide-react";

const TABS = [
  {
    id: "categorias",
    label: "Categorias",
    icon: Tags,
    description: "Gerencie as categorias usadas para classificar seus produtos",
  },
  {
    id: "estoque",
    label: "Limiar de Estoque Baixo",
    icon: AlertTriangle,
    description:
      "Defina a partir de qual quantidade um produto é considerado com estoque baixo",
  },
];

function ComingSoonCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
        <Icon size={20} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[11px] font-semibold">
        <Clock size={11} /> Em breve
      </span>
    </div>
  );
}

function CategoriasSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            Categorias de produtos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
            Crie, renomeie e exclua as categorias que aparecem ao cadastrar um
            produto. Hoje a criação acontece pelo modal de novo produto — esta
            tela vai centralizar a gestão.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg shadow-sm opacity-50 cursor-not-allowed"
        >
          <Lock size={13} /> Nova categoria
        </button>
      </div>

      <ComingSoonCard
        icon={Tags}
        title="Gestão de categorias chega em breve"
        description="Você poderá listar, renomear e remover categorias direto daqui, sem precisar abrir o cadastro de produto."
      />
    </div>
  );
}

function LimiarEstoqueSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-700">
          Limiar de estoque baixo
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
          Quando um produto fica com a quantidade abaixo desse valor, ele entra
          na lista de alertas críticos do Dashboard. Em breve esse limiar será
          configurável por aqui.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Limiar atual
          </span>
          <div className="mt-1 relative">
            <input
              type="number"
              disabled
              value=""
              placeholder="—"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed focus:outline-none"
            />
            <Lock
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Aplicar a
          </span>
          <div className="mt-1 relative">
            <select
              disabled
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed appearance-none focus:outline-none"
            >
              <option>Todos os produtos</option>
            </select>
            <Lock
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
            />
          </div>
        </label>
      </div>

      <ComingSoonCard
        icon={AlertTriangle}
        title="Configuração de limiar chega em breve"
        description="Você vai poder definir um valor global e, futuramente, sobrescrever por produto ou por categoria."
      />
    </div>
  );
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState("categorias");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm">
            <Settings size={16} className="text-teal-300" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Configurações
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Preferências da conta e regras de operação do estoque
            </p>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200/80 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3.5 text-sm font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? "border-teal-500 text-teal-700 bg-teal-50/40"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-teal-500" : "text-slate-400"}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da tab ativa */}
        <div className="p-6">
          {activeTab === "categorias" && <CategoriasSection />}
          {activeTab === "estoque" && <LimiarEstoqueSection />}
        </div>
      </div>
    </div>
  );
}
