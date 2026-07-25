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
  History,
} from "lucide-react";

// Hook do contexto
import { useInventory } from "../context/InventoryContext";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { isLowStock } from "../lib/stock";
// Componentes de Modal
import ModalAddProduto from "../components/layout/ModalAddProduto";
import ModalHistorico from "../components/layout/ModalHistorico";

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
    classes: "bg-brand/10 text-brand border border-brand/20",
  },
  estoque_baixo: {
    label: "Estoque baixo",
    classes: "bg-amber-50 text-amber-600 border border-amber-200",
  },
  esgotado: {
    label: "Esgotado",
    classes: "bg-red-50 text-red-500 border border-red-200",
  },
};

const margemClasses = (pct) => {
  if (pct < 15) return "bg-red-50 text-red-500 border border-red-200";
  if (pct < 30) return "bg-amber-50 text-amber-600 border border-amber-200";
  return "bg-brand/10 text-brand border border-brand/20";
};

// ─────────────────────────────────────────────
// 2. SUB-COMPONENTES
// ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.esgotado;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function MargemBadge({ custo, venda }) {
  const pct = calcMargem(custo, venda);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${margemClasses(pct)}`}
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
    <ChevronUp size={12} className="text-brand ml-1 flex-shrink-0" />
  ) : (
    <ChevronDown size={12} className="text-brand ml-1 flex-shrink-0" />
  );
}

function Th({ children, column, sortConfig, onSort, className = "" }) {
  return (
    <th
      onClick={() => onSort(column)}
      className={`px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap hover:text-slate-700 transition-colors duration-100 ${className}`}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon column={column} sortConfig={sortConfig} />
      </span>
    </th>
  );
}

function ProdutoRow({ produto, userPreferences, onEdit, onDelete, onHistory }) {
  const valorTotal = produto.qtd * produto.precoVenda;
  const qtyColor =
    produto.qtd === 0
      ? "text-red-500"
      : isLowStock(produto, userPreferences)
        ? "text-amber-500"
        : "text-slate-900";
  return (
    <tr className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors duration-150">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Package size={14} className="text-slate-400" />
          </div>
          <span className="text-slate-900 font-semibold text-sm">
            {produto.nome}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-slate-500 text-sm">{produto.categoria}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-sm font-bold tabular-nums ${qtyColor}`}>
          {produto.qtd}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-blue-600 font-medium text-sm tabular-nums">
          {brl(produto.precoCusto)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-brand font-medium text-sm tabular-nums">
          {brl(produto.precoVenda)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <MargemBadge custo={produto.precoCusto} venda={produto.precoVenda} />
      </td>
      <td className="px-4 py-3.5">
        <span className="text-slate-900 font-semibold text-sm tabular-nums">
          {brl(valorTotal)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={produto.status} />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => onHistory(produto)}
            title="Ver histórico"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <History size={14} />
          </button>
          <button
            onClick={() => onEdit(produto)}
            title="Editar produto"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(produto.id, produto.nome)}
            title="Excluir produto"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
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
        <div className="w-12 h-12 bg-slate-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
          <Search size={20} className="text-slate-300" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">
          Nenhum resultado para &ldquo;{query}&rdquo;
        </p>
        <p className="text-slate-400 text-xs mt-1">
          Tente um nome diferente ou limpe o filtro.
        </p>
        <button
          onClick={onClear}
          className="text-xs font-medium text-brand hover:text-brand-hover mt-3"
        >
          <X size={12} className="inline mr-1" /> Limpar busca
        </button>
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
  const [editingProduct, setEditingProduct] = useState(null); // Estado para o produto em edição
  const [historyProduct, setHistoryProduct] = useState(null); // Produto selecionado para histórico

  // Dados e funções do Contexto
  const { products: produtos, deleteProduct } = useInventory();
  const { preferences: userPreferences } = useUserPreferences();

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

  // Função handleEdit atualizada
  const handleEdit = (produto) => {
    setEditingProduct(produto);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null); // Limpa o produto em edição ao fechar
  };

  const handleHistory = (produto) => {
    setHistoryProduct(produto);
  };

  const handleCloseHistory = () => {
    setHistoryProduct(null);
  };

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

  return (
    <div className="bg-slate-50 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-slate-900 font-black text-xl tracking-tight">
            Inventário
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {produtos.length} produtos cadastrados
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null); // Garante que é uma nova adição
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand text-white font-bold rounded-xl px-4 py-2 hover:bg-brand-hover transition-colors duration-150"
        >
          <Plus size={15} /> Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 hover:border-brand transition-all duration-200 overflow-hidden">
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
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
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
            <thead className="bg-slate-50 border-b border-slate-200">
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
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-[7%]">
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
                    userPreferences={userPreferences}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onHistory={handleHistory}
                  />
                ))
              ) : (
                <EmptyState query={busca} onClear={() => setBusca("")} />
              )}
            </tbody>
          </table>
        </div>

        {produtosFiltrados.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex-wrap gap-3">
            <p className="text-slate-400 text-xs">
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
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Unidades
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {totalUnidades.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Total Custo
                </p>
                <p className="text-sm font-bold text-blue-600">
                  {brl(totalCusto)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Total Venda
                </p>
                <p className="text-sm font-bold text-brand">
                  {brl(totalVenda)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ATUALIZADO COM PROPS DE EDIÇÃO */}
      <ModalAddProduto
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        productToEdit={editingProduct} // Passa o produto se estiver editando
      />

      {/* MODAL DE HISTÓRICO (log de auditoria) */}
      <ModalHistorico
        isOpen={!!historyProduct}
        onClose={handleCloseHistory}
        product={historyProduct}
      />
    </div>
  );
}
