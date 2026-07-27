import { NavLink } from "react-router-dom";
import {
  Package,
  Home,
  BarChart2,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * NAV_ITEMS — Main navigation items.
 * Added: "/vendas" route with the ShoppingCart icon.
 */
const NAV_ITEMS = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/inventario", icon: Package, label: "Inventário" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" }, // <-- NEW ITEM
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
          "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl",
          "text-sm transition-colors duration-150",
          isActive
            ? "bg-brand/10 text-brand font-semibold border-l-2 border-brand"
            : "text-slate-400 hover:text-white hover:bg-slate-800 font-medium",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            className={`flex-shrink-0 ${
              isActive ? "text-brand" : "text-slate-500"
            }`}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const displayEmail = email.length > 22 ? email.slice(0, 22) + "..." : email;

  return (
    <div className="p-3 flex-shrink-0 h-screen sticky top-0 bg-slate-100 select-none">
      <aside className="bg-slate-900 w-56 h-full rounded-2xl flex flex-col overflow-hidden">
        {/* ── Logo / Brand ── */}
        <div className="px-4 py-5 flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Estoklab"
            className="w-8 h-8 rounded-lg object-contain bg-white"
          />
          <div className="leading-tight">
            <p className="text-white font-bold text-sm tracking-tight">
              Estoklab
            </p>
            <p className="text-slate-500 text-[10px] font-mono">v1.0</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold px-4 mb-1 mt-4">
            Menu Principal
          </p>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {/* User card */}
          <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 bg-slate-800 rounded-xl">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold">
              {initials}
            </div>
            <p className="text-slate-400 text-xs truncate">{displayEmail}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
