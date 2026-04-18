import { Package, Plus, Filter } from "lucide-react";

/**
 * Inventario.jsx — Listagem e gestão de produtos.
 * Estrutura inicial com estado vazio; tabela virá na próxima sprint.
 */
export default function Inventario() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da página com ação principal */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Inventário
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie produtos, SKUs e quantidades.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão secundário: Filtros */}
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter size={14} />
            Filtros
          </button>
          {/* Botão primário: Novo produto */}
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
            <Plus size={14} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Estado vazio — substituído por tabela/grid futuramente */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Package size={22} className="text-slate-400" />
        </div>
        <h3 className="text-slate-700 font-semibold text-base">
          Nenhum produto cadastrado
        </h3>
        <p className="text-slate-400 text-sm mt-1 mb-5 max-w-xs mx-auto">
          Comece adicionando seu primeiro produto ao inventário.
        </p>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
          <Plus size={14} />
          Adicionar Produto
        </button>
      </div>
    </div>
  );
}
