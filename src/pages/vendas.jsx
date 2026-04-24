import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useInventory } from "../context/InventoryContext";
import {
  ShoppingCart,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

// ── SUB-COMPONENTES ──────────────────────────────────────────────

const BarcodeScannerInput = ({ onSearch, error }) => {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSearch(code);
    setCode("");
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-center bg-slate-800 border-2 rounded-xl transition-all h-16 ${
            error
              ? "border-red-500 animate-pulse"
              : "border-slate-700 focus-within:border-teal-500"
          }`}
        >
          <div className="pl-6 text-slate-500">
            <Barcode size={24} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Escaneie o código ou digite o ID..."
            className="w-full px-4 bg-transparent outline-none text-lg font-medium text-slate-100 placeholder:text-slate-600"
          />
          <div className="pr-6 flex gap-2">
            <kbd className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-[10px] border border-slate-600 font-mono">
              ENTER
            </kbd>
          </div>
        </div>
        {error && (
          <p className="absolute -bottom-6 left-2 text-red-400 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </form>
    </div>
  );
};

const CartItem = ({ item, onUpdateQty, onRemove }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-colors group">
    <div className="flex-1">
      <h4 className="font-bold text-slate-100">{item.nome}</h4>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
        Estoque disponível: {item.qtd}
      </p>
    </div>

    <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
      <button
        onClick={() => onUpdateQty(item.id, -1)}
        className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
      >
        <Minus size={16} />
      </button>
      <span className="font-bold text-teal-400 min-w-[20px] text-center font-mono">
        {item.cartQty}
      </span>
      <button
        onClick={() => onUpdateQty(item.id, 1)}
        disabled={item.cartQty >= item.qtd}
        className={`p-1 rounded-lg transition-all ${
          item.cartQty >= item.qtd
            ? "text-slate-700 cursor-not-allowed"
            : "hover:bg-slate-700 text-slate-400 hover:text-white"
        }`}
      >
        <Plus size={16} />
      </button>
    </div>

    <div className="w-32 text-right">
      <p className="font-mono font-bold text-emerald-400 text-lg">
        {(item.precoVenda * item.cartQty).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
      <p className="text-[10px] text-slate-500 font-medium tracking-tight">
        {item.precoVenda.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}{" "}
        un.
      </p>
    </div>

    <button
      onClick={() => onRemove(item.id)}
      className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
    >
      <Trash2 size={20} />
    </button>
  </div>
);

// ── COMPONENTE PRINCIPAL (VIEW) ──────────────────────────────────

export default function Vendas() {
  const { products, sellItems } = useInventory();
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(""); // Ajustado para string para mensagens dinâmicas
  const [success, setSuccess] = useState(false);

  const handleSearch = useCallback(
    (code) => {
      setError("");
      const product = products.find(
        (p) => String(p.barcode) === code || String(p.id) === code
      );

      if (!product) {
        setError("Produto não encontrado");
        setTimeout(() => setError(""), 2000);
        return;
      }

      if (product.qtd <= 0) {
        setError("Produto sem estoque disponível!");
        setTimeout(() => setError(""), 2000);
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        if (existing) {
          if (existing.cartQty >= product.qtd) {
            setError("Limite de estoque atingido!");
            setTimeout(() => setError(""), 2000);
            return prev;
          }
          return prev.map((item) =>
            item.id === product.id
              ? { ...item, cartQty: item.cartQty + 1 }
              : item
          );
        }
        return [...prev, { ...product, cartQty: 1 }];
      });
    },
    [products]
  );

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const productInInv = products.find((p) => p.id === id);
          const newQty = item.cartQty + delta;

          if (newQty < 1) return item;
          if (newQty > productInInv.qtd) {
            setError(`Apenas ${productInInv.qtd} unidades disponíveis!`);
            setTimeout(() => setError(""), 2000);
            return item;
          }

          return { ...item, cartQty: newQty };
        }
        return item;
      })
    );
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    sellItems(cart);
    setSuccess(true);
    setCart([]);
    setTimeout(() => setSuccess(false), 4000);
  };

  const totalValue = useMemo(
    () => cart.reduce((acc, item) => acc + item.precoVenda * item.cartQty, 0),
    [cart]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") finalizeSale();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  return (
    <div className="flex-1 flex flex-col bg-slate-900 min-h-screen animate-in fade-in duration-500 overflow-hidden">
      <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        <div className="lg:col-span-8 flex flex-col space-y-6 overflow-hidden">
          <header>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart className="text-teal-400" />
              Frente de Caixa
            </h2>
            <p className="text-slate-500 text-sm">
              Escaneie produtos para iniciar a venda
            </p>
          </header>

          <BarcodeScannerInput onSearch={handleSearch} error={error} />

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold flex items-center gap-3 animate-in zoom-in">
                <CheckCircle size={20} /> Venda processada e estoque atualizado!
              </div>
            )}

            {cart.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-600">
                <ShoppingCart
                  size={48}
                  strokeWidth={1}
                  className="mb-2 opacity-20"
                />
                <p className="font-medium text-sm italic">Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQty={updateQty}
                  onRemove={(id) =>
                    setCart((prev) => prev.filter((i) => i.id !== id))
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-slate-800 rounded-[2rem] p-8 border border-slate-700 flex flex-col h-full shadow-2xl">
            <div className="flex-1">
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 text-center">
                Valor Total
              </p>
              <h3 className="text-5xl font-black text-white mb-8 tabular-nums text-center">
                {totalValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h3>

              <div className="space-y-4 pt-6 border-t border-slate-700">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Itens no carrinho:</span>
                  <span className="text-white font-bold">{cart.length}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Qtd. Total:</span>
                  <span className="text-white font-bold">
                    {cart.reduce((acc, item) => acc + item.cartQty, 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl flex gap-3">
                <Info size={24} className="text-teal-500 flex-shrink-0" />
                <p className="text-[11px] text-teal-500/80 leading-relaxed italic">
                  O sistema atualiza automaticamente os relatórios e o estoque
                  global ao finalizar.
                </p>
              </div>

              <button
                onClick={finalizeSale}
                disabled={cart.length === 0}
                className="w-full py-5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 rounded-2xl font-black text-xl text-slate-900 transition-all shadow-lg shadow-teal-500/10 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                FINALIZAR VENDA (F2)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
