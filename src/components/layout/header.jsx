import { useState } from "react";
import { Search, Bell, ChevronDown, X } from "lucide-react";

/**
 * Header.jsx — Barra de topo fixa.
 *
 * Contém:
 * - Barra de busca central (expansível)
 * - Ícone de notificações com badge
 * - Avatar de usuário com dropdown (visual)
 */
export default function Header() {
  // Controla o foco/expansão da barra de busca
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <header
      className="
        h-16 flex-shrink-0 flex items-center justify-between
        px-6 gap-4
        bg-white border-b border-slate-200/80
        z-10
      "
    >
      {/* ── Título da página atual (dinâmico via breadcrumb futuro) ── */}
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

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Barra de busca ── */}
      <div
        className={`
          relative flex items-center
          transition-all duration-200 ease-out
          ${searchFocused ? "w-72" : "w-48 sm:w-56"}
        `}
      >
        <Search
          size={15}
          className="absolute left-3 text-slate-400 pointer-events-none flex-shrink-0"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Buscar produto, SKU..."
          className="
            w-full pl-9 pr-8 py-2
            text-sm text-slate-700 placeholder-slate-400
            bg-slate-100 rounded-lg
            border border-transparent
            outline-none
            focus:bg-white focus:border-slate-300 focus:shadow-sm
            transition-all duration-200
          "
        />
        {/* Botão limpar busca */}
        {searchValue && (
          <button
            onClick={() => setSearchValue("")}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

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

          {/* Nome (visível em telas maiores) */}
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
