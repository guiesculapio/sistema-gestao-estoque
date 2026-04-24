import { NavLink } from "react-router-dom";
import {
  Package,
  Home,
  BarChart2,
  Settings,
  Layers,
  ShoppingCart,
} from "lucide-react";

/**
 * NAV_ITEMS — Itens de navegação principal.
 * Adicionado: Rota "/vendas" com ícone ShoppingCart.
 */
const NAV_ITEMS = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/inventario", icon: Package, label: "Inventário" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" }, // <-- NOVO ITEM
  { to: "/relatorios", icon: BarChart2, label: "Relatórios" },
];

const BOTTOM_ITEMS = [
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 px-3 py-2.5 rounded-lg",
          "text-sm font-medium transition-all duration-150 ease-out",
          isActive
            ? "bg-teal-500/15 text-teal-300 shadow-sm"
            : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-100",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            className={`flex-shrink-0 transition-colors duration-150 ${
              isActive
                ? "text-teal-400"
                : "text-slate-500 group-hover:text-slate-300"
            }`}
          />
          <span className="truncate">{label}</span>

          {isActive && (
            <span className="ml-auto w-1 h-4 rounded-full bg-teal-400 flex-shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="
        w-60 flex-shrink-0 flex flex-col h-screen
        bg-slate-900 border-r border-slate-700/50
        select-none
      "
    >
      {/* ── Logotipo / Marca (Copiloto SaaS) ── */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-700/50">
        <div className="w-7 h-7 rounded-md bg-teal-500 flex items-center justify-center flex-shrink-0">
          <Layers size={15} className="text-slate-900" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="text-white text-sm font-semibold tracking-tight">
            Copiloto SaaS
          </p>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
            v1.0.0
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Menu Principal
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/50 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Card de usuário */}
        <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">JD</span>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">
              João Dono
            </p>
            <p className="text-slate-500 text-[10px] truncate">Plano Pro</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
