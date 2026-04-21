import { Bell, ChevronDown } from "lucide-react";

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
        {/* Sino de notificações */}
        <button
          className="
            relative w-9 h-9 flex items-center justify-center
            text-slate-500 hover:text-slate-800
            hover:bg-slate-100 rounded-lg
            transition-colors duration-150
          "
          aria-label="Notificações"
        >
          <Bell size={18} />
          {/* Badge de notificação */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white" />
        </button>

        {/* Divisor */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

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
              JD
            </span>
          </div>

          {/* Nome */}
          <span className="hidden md:block text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            João Dono
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