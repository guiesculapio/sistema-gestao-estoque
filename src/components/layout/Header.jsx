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
    <header className="flex items-center justify-between gap-4">
      <div className="hidden sm:block min-w-0">
        <h1 className="text-slate-900 text-base font-bold truncate tracking-tight">
          Estoklab
        </h1>
        <p className="text-slate-400 text-sm">
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
          className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-md hover:bg-slate-50 transition-colors duration-150 group"
          aria-label="Menu do usuário"
          aria-expanded={menuOpen}
        >
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white leading-none">
              {initials}
            </span>
          </div>

          <span className="hidden md:block text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors max-w-[180px] truncate">
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
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-20">
            <button
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LogOut size={14} className="text-slate-400" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
