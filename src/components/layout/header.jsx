import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const email = user?.email ?? "";
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header
      className="
        h-16 flex-shrink-0 flex items-center justify-between
        px-6 gap-4
        bg-white border-b border-slate-200/80
        z-10
      "
    >
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

      <div className="flex-1" />

      <div className="relative flex items-center gap-1.5" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors duration-150 group"
          aria-label="Menu do usuário"
          aria-expanded={menuOpen}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[10px] font-bold text-white leading-none">
              {initials}
            </span>
          </div>

          <span className="hidden md:block text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors max-w-[180px] truncate">
            {email || "Usuário"}
          </span>

          <ChevronDown
            size={14}
            className={`text-slate-400 group-hover:text-slate-600 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            <button
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut size={14} className="text-slate-500" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
