import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";

// Hook do contexto
import { useInventory } from "../context/InventoryContext";
// Componente do Modal
import ModalAddProduto from "../components/layout/ModalAddProduto";

// ─────────────────────────────────────────────
// 1. HELPERS
// ─────────────────────────────────────────────

const brl = (valor) => {
  if (valor === undefined || valor === null) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const calcMargem = (custo, venda) =>
  venda > 0 ? ((venda - custo) / venda) * 100 : 0;

const STATUS_MAP = {
  em_estoque: {
    label: "Em estoque",
    classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  estoque_baixo: {
    label: "Estoque baixo",
    classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  esgotado: {
    label: "Esgotado",
    classes: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

const margemClasses = (pct) => {
  if (pct < 15)
    return { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200" };
  if (pct < 30)
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
    };
  return {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  };
};

// ─────────────────────────────────────────────
// 2. SUB-COMPONENTES
// ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.esgotado;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function MargemBadge({ custo, venda }) {
  const pct = calcMargem(custo, venda);
  const { bg, text, ring } = margemClasses(pct);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ${bg} ${text} ${ring}`}
    >
      {pct.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}
      %
    </span>
  );
}

function SortIcon({ column, sortConfig }) {
  if (sortConfig.key !== column)
    return (
      <ChevronsUpDown size={12} className="text-slate-300 ml-1 flex-shrink-0" />
    );
  return sortConfig.dir === "asc" ? (
    <ChevronUp size={12} className="text-teal-500 ml-1 flex-shrink-0" />
  ) : (
    <ChevronDown size={12} className="text-teal-500 ml-1 flex-shrink-0" />
  );
}

function Th({ children, column, sortConfig, onSort, className = "" }) {
  return (
    <th
      onClick={() => onSort(column)}
      className={`px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-slate-800 transition-colors duration-100 ${className}`}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon column={column} sortConfig={sortConfig} />
      </span>
    </th>
  );
}

function ProdutoRow({ produto, onEdit, onDelete }) {
  const valorTotal = produto.qtd * produto.precoVenda;
  return (
    <tr className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors duration-100">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white border border-slate-200/60 flex items-center justify-center flex-shrink-0 transition-colors">
            <Package size={14} className="text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-800 leading-snug">
            {produto.nome}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm text-slate-500">{produto.categoria}</span>
      </td>
      <td className="px-4 py-3.5">
        <span
          className={`text-sm font-bold tabular-nums ${produto.qtd === 0 ? "text-red-500" : produto.qtd <= 4 ? "text-amber-500" : "text-slate-700"}`}
        >
          {produto.qtd}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-medium text-blue-600 tabular-nums">
          {brl(produto.precoCusto)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-medium text-emerald-600 tabular-nums">
          {brl(produto.precoVenda)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <MargemBadge custo={produto.precoCusto} venda={produto.precoVenda} />
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {brl(valorTotal)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={produto.status} />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => onEdit(produto)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(produto.id, produto.nome)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ query, onClear }) {
  return (
    <tr>
      <td colSpan={9} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <Search size={20} className="text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Tente um nome diferente ou limpe o filtro.
            </p>
          </div>
          <button
            onClick={onClear}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 mt-1"
          >
            <X size={12} className="inline mr-1" /> Limpar busca
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// 3. PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

export default function Inventario() {
  const [busca, setBusca] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "nome", dir: "asc" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dados e funções do Contexto
  const { products: produtos, deleteProduct } = useInventory();

  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrados = termo
      ? produtos.filter((p) => p.nome.toLowerCase().includes(termo))
      : produtos;

    return [...filtrados].sort((a, b) => {
      let va, vb;
      if (sortConfig.key === "valorTotal") {
        va = a.qtd * a.precoVenda;
        vb = b.qtd * b.precoVenda;
      } else if (sortConfig.key === "margem") {
        va = calcMargem(a.precoCusto, a.precoVenda);
        vb = calcMargem(b.precoCusto, b.precoVenda);
      } else {
        va = a[sortConfig.key];
        vb = b[sortConfig.key];
      }
      const cmp =
        typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb;
      return sortConfig.dir === "asc" ? cmp : -cmp;
    });
  }, [busca, produtos, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const handleEdit = (produto) =>
    console.log("[TODO] Abrir modal de edição para:", produto.nome);

  // --- NOVA FUNÇÃO DE EXCLUSÃO COM CONFIRMAÇÃO ---
  const handleDelete = (id, nome) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir o produto "${nome}"?`
    );
    if (confirmou) {
      deleteProduct(id);
    }
  };

  // Métricas do rodapé
  const totalUnidades = produtosFiltrados.reduce((acc, p) => acc + p.qtd, 0);
  const totalVenda = produtosFiltrados.reduce(
    (acc, p) => acc + p.qtd * p.precoVenda,
    0
  );
  const totalCusto = produtosFiltrados.reduce(
    (acc, p) => acc + p.qtd * p.precoCusto,
    0
  );
  const lucroBruto = totalVenda - totalCusto;
  const margemMedia = totalVenda > 0 ? (lucroBruto / totalVenda) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Inventário
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {produtos.length} produtos cadastrados
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-all active:scale-95"
        >
          <Plus size={15} strokeWidth={2.5} /> Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto pelo nome..."
              className="w-full pl-8 pr-8 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <Th
                  column="nome"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[22%]"
                >
                  Produto
                </Th>
                <Th
                  column="categoria"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[11%]"
                >
                  Categoria
                </Th>
                <Th
                  column="qtd"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[5%]"
                >
                  Qtd.
                </Th>
                <Th
                  column="precoCusto"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[10%]"
                >
                  Custo
                </Th>
                <Th
                  column="precoVenda"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[10%]"
                >
                  Venda
                </Th>
                <Th
                  column="margem"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[9%]"
                >
                  Margem
                </Th>
                <Th
                  column="valorTotal"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[11%]"
                >
                  Valor Total
                </Th>
                <Th
                  column="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[13%]"
                >
                  Status
                </Th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[7%]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((produto) => (
                  <ProdutoRow
                    key={produto.id}
                    produto={produto}
                    onEdit={handleEdit}
                    onDelete={handleDelete} // Agora usa a função com confirmação
                  />
                ))
              ) : (
                <EmptyState query={busca} onClear={() => setBusca("")} />
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com métricas automáticas */}
        {produtosFiltrados.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
            {/* ... (código do rodapé mantido como você enviou) ... */}
            <p className="text-xs text-slate-400">
              Exibindo{" "}
              <span className="font-medium text-slate-600">
                {produtosFiltrados.length}
              </span>{" "}
              de{" "}
              <span className="font-medium text-slate-600">
                {produtos.length}
              </span>{" "}
              produtos
            </p>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Unidades</p>
                <p className="text-sm font-bold text-slate-700">
                  {totalUnidades.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-blue-400 uppercase">
                  Total Custo
                </p>
                <p className="text-sm font-bold text-blue-600">
                  {brl(totalCusto)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-emerald-500 uppercase">
                  Total Venda
                </p>
                <p className="text-sm font-bold text-emerald-600">
                  {brl(totalVenda)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalAddProduto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
