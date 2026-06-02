import { ChevronDown } from "lucide-react";

/**
 * Header.jsx — Barra de topo fixa simplificada.
 * * Removida a barra de busca redundante para focar na busca
 * específica das tabelas de inventário/dashboard.
 */
export default function Header() {
  return (
    <header
      className="
        h-16 flex-shrink-0 flex items-center justify-between
        px-6 gap-4
        bg-white border-b border-slate-200/80
        z-10
      "
    >
      {/* ── Título da página atual ── */}
      <div className="hidden sm:block min-w-0">
        <h1 className="text-slate-800 text-base font-semibold truncate tracking-tight">
          Gestão de Estoque
        </h1>
        <p className="text-slate-400 text-xs">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* ── Spacer (Empurra as ações para a direita) ── */}
      <div className="flex-1" />

      {/* ── Ações da direita ── */}
      <div className="flex items-center gap-1.5">
        {/* Avatar + nome do usuário */}
        <button
          className="
            flex items-center gap-2.5 pl-1 pr-2 py-1
            rounded-lg hover:bg-slate-100
            transition-colors duration-150
            group
          "
          aria-label="Menu do usuário"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[10px] font-bold text-white leading-none">
              CD
            </span>
          </div>

          {/* Nome */}
          <span className="hidden md:block text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            Cronwed
          </span>

          <ChevronDown
            size={14}
            className="text-slate-400 group-hover:text-slate-600 transition-colors"
          />
        </button>
      </div>
    </header>
  );
}
