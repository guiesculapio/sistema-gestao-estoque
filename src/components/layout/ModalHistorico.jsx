import { useEffect, useState } from "react";
import { X, History, ArrowDownCircle, ArrowUpCircle, Pencil } from "lucide-react";
import { useInventory } from "../../context/InventoryContext";

const TYPE_META = {
  ENTRADA: {
    label: "Entrada",
    Icon: ArrowDownCircle,
    iconClass: "text-emerald-500",
    chipClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    sentence: (nome, qty) =>
      `O produto "${nome}" foi adicionado ao estoque (${qty} un.)`,
  },
  SAIDA: {
    label: "Saída",
    Icon: ArrowUpCircle,
    iconClass: "text-red-500",
    chipClass: "bg-red-50 text-red-700 ring-1 ring-red-200",
    sentence: (nome, qty) =>
      `O produto "${nome}" saiu do estoque (${qty} un.)`,
  },
  ALTERACAO: {
    label: "Alteração",
    Icon: Pencil,
    iconClass: "text-amber-500",
    chipClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    sentence: (nome, qty) => {
      if (qty > 0) return `O produto "${nome}" foi alterado (+${qty} un.)`;
      if (qty < 0) return `O produto "${nome}" foi alterado (${qty} un.)`;
      return `O cadastro do produto "${nome}" foi alterado`;
    },
  },
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ModalHistorico({ isOpen, onClose, product }) {
  const { fetchProductHistory } = useInventory();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const rows = await fetchProductHistory(product.id);
      if (cancelled) return;
      setLogs(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id, fetchProductHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                Histórico de movimentação
              </h3>
              {product?.nome && (
                <p className="text-xs text-slate-500 mt-0.5">{product.nome}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Carregando histórico...
            </p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Nenhum evento registrado para este produto ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => {
                const meta = TYPE_META[log.type] ?? TYPE_META.ALTERACAO;
                const { Icon } = meta;
                return (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <Icon
                      size={18}
                      className={`mt-0.5 flex-shrink-0 ${meta.iconClass}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${meta.chipClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-snug">
                        {meta.sentence(product?.nome ?? "—", log.quantity)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
