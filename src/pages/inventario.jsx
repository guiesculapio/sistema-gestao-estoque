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

// ─────────────────────────────────────────────
// 1. DADOS DE EXEMPLO
// ─────────────────────────────────────────────

const produtosExemplo = [
  //                                                                                           precoCusto  precoVenda  → margem calculada
  {
    id: 1,
    nome: "Notebook Dell Inspiron 15",
    categoria: "Eletrônicos",
    qtd: 12,
    precoCusto: 2650.0,
    precoVenda: 3499.9,
    status: "em_estoque",
  },
  {
    id: 2,
    nome: "Mouse Logitech MX Master 3",
    categoria: "Periféricos",
    qtd: 4,
    precoCusto: 290.0,
    precoVenda: 459.0,
    status: "estoque_baixo",
  },
  {
    id: 3,
    nome: "Teclado Mecânico Keychron Q1",
    categoria: "Periféricos",
    qtd: 0,
    precoCusto: 620.0,
    precoVenda: 899.0,
    status: "esgotado",
  },
  {
    id: 4,
    nome: 'Monitor LG UltraWide 29"',
    categoria: "Eletrônicos",
    qtd: 7,
    precoCusto: 1590.0,
    precoVenda: 2190.0,
    status: "em_estoque",
  },
  {
    id: 5,
    nome: "Cadeira Ergonômica Flexform",
    categoria: "Mobiliário",
    qtd: 3,
    precoCusto: 980.0,
    precoVenda: 1850.0,
    status: "estoque_baixo",
  },
  {
    id: 6,
    nome: "Headset Sony WH-1000XM5",
    categoria: "Áudio",
    qtd: 18,
    precoCusto: 870.0,
    precoVenda: 1299.0,
    status: "em_estoque",
  },
  {
    id: 7,
    nome: "Webcam Logitech Brio 4K",
    categoria: "Periféricos",
    qtd: 0,
    precoCusto: 620.0,
    precoVenda: 749.9,
    status: "esgotado",
  },
  {
    id: 8,
    nome: "SSD Samsung 990 Pro 1TB",
    categoria: "Armazenamento",
    qtd: 25,
    precoCusto: 390.0,
    precoVenda: 579.0,
    status: "em_estoque",
  },
  {
    id: 9,
    nome: "Mesa Digitalizadora Wacom",
    categoria: "Periféricos",
    qtd: 2,
    precoCusto: 870.0,
    precoVenda: 1120.0,
    status: "estoque_baixo",
  },
  {
    id: 10,
    nome: "Hub USB-C Anker 10-em-1",
    categoria: "Acessórios",
    qtd: 31,
    precoCusto: 110.0,
    precoVenda: 219.9,
    status: "em_estoque",
  },
  {
    id: 11,
    nome: "Suporte Articulado Notebook",
    categoria: "Acessórios",
    qtd: 14,
    precoCusto: 42.0,
    precoVenda: 89.9,
    status: "em_estoque",
  },
  {
    id: 12,
    nome: "Cabo HDMI 2.1 2m",
    categoria: "Cabos",
    qtd: 3,
    precoCusto: 28.0,
    precoVenda: 49.9,
    status: "estoque_baixo",
  },
];

// ─────────────────────────────────────────────
// 2. HELPERS
// ─────────────────────────────────────────────

/** Formata número para moeda BRL */
const brl = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Calcula margem de lucro sobre o preço de venda: (venda - custo) / venda */
const calcMargem = (custo, venda) =>
  venda > 0 ? ((venda - custo) / venda) * 100 : 0;

/** Configuração visual por status */
const STATUS_MAP = {
  em_estoque: {
    label: "Em estoque",
    classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  estoque_baixo: {
    label: "Estoque baixo",
    classes: "bg-amber-50   text-amber-700   ring-1 ring-amber-200",
  },
  esgotado: {
    label: "Esgotado",
    classes: "bg-red-50     text-red-700     ring-1 ring-red-200",
  },
};

/**
 * Retorna classes de cor para o badge de margem:
 *  < 15% → vermelho (margem perigosamente baixa)
 * 15–30% → âmbar   (margem aceitável)
 *  > 30% → esmeralda (margem saudável)
 */
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
// 3. SUB-COMPONENTES
// ─────────────────────────────────────────────

/** Badge colorido de status */
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

/**
 * MargemBadge — exibe a % de margem com cor semântica.
 * Formato: "32,4%" em negrito dentro de um pill colorido.
 */
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

/** Ícone de ordenação exibido no cabeçalho */
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

/** <th> clicável para ordenar */
function Th({ children, column, sortConfig, onSort, className = "" }) {
  return (
    <th
      onClick={() => onSort(column)}
      className={`
        px-4 py-3 text-left text-[11px] font-semibold text-slate-500
        uppercase tracking-wider cursor-pointer select-none whitespace-nowrap
        hover:text-slate-800 transition-colors duration-100
        ${className}
      `}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon column={column} sortConfig={sortConfig} />
      </span>
    </th>
  );
}

/** Uma linha da tabela de produtos */
function ProdutoRow({ produto, onEdit, onDelete }) {
  const valorTotal = produto.qtd * produto.precoVenda;

  return (
    <tr className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors duration-100">
      {/* Produto */}
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

      {/* Categoria */}
      <td className="px-4 py-3.5">
        <span className="text-sm text-slate-500">{produto.categoria}</span>
      </td>

      {/* Quantidade — cor muda conforme criticidade */}
      <td className="px-4 py-3.5">
        <span
          className={`text-sm font-bold tabular-nums ${
            produto.qtd === 0
              ? "text-red-500"
              : produto.qtd <= 4
                ? "text-amber-500"
                : "text-slate-700"
          }`}
        >
          {produto.qtd}
        </span>
      </td>

      {/* Custo — azul para sinalizar "entrada/compra" */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-medium text-blue-600 tabular-nums">
          {brl(produto.precoCusto)}
        </span>
      </td>

      {/* Venda — esmeralda para sinalizar "receita" */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-medium text-emerald-600 tabular-nums">
          {brl(produto.precoVenda)}
        </span>
      </td>

      {/* Margem — badge colorido semântico em negrito */}
      <td className="px-4 py-3.5">
        <MargemBadge custo={produto.precoCusto} venda={produto.precoVenda} />
      </td>

      {/* Valor total (precoVenda × qtd) */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {brl(valorTotal)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={produto.status} />
      </td>

      {/* Ações — visíveis no hover da linha */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => onEdit(produto)}
            title="Editar produto"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(produto.id)}
            title="Excluir produto"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Estado vazio quando a busca retorna zero resultados */
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
            className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors mt-1"
          >
            <X size={12} /> Limpar busca
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// 4. PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

export default function Inventario() {
  const [busca, setBusca] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "nome", dir: "asc" });
  const [produtos, setProdutos] = useState(produtosExemplo);

  // ── Filtro + ordenação (memo para evitar recalcular em cada render) ──
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    // 1. Filtra pelo nome do produto
    const filtrados = termo
      ? produtos.filter((p) => p.nome.toLowerCase().includes(termo))
      : produtos;

    // 2. Ordena pela coluna ativa (colunas calculadas tratadas explicitamente)
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

  // ── Alterna direção ao clicar na mesma coluna ──
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // ── Exclusão (com TODO para modal de confirmação) ──
  const handleDelete = (id) =>
    setProdutos((prev) => prev.filter((p) => p.id !== id));

  // ── Edição (TODO: abrir drawer/modal) ──
  const handleEdit = (produto) =>
    console.log("[TODO] Abrir modal de edição para:", produto.nome);

  // ── Métricas do rodapé ──
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
      {/* ── Cabeçalho ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Inventário
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {produtos.length} produtos cadastrados
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[.98] rounded-lg shadow-sm shadow-emerald-200/70 transition-all duration-150">
          <Plus size={15} strokeWidth={2.5} />
          Adicionar Produto
        </button>
      </div>

      {/* ── Card com barra de busca + tabela ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Toolbar */}
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
              className="w-full pl-8 pr-8 py-2 text-sm text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all duration-150"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Contador de resultados do filtro */}
          {busca && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {produtosFiltrados.length} resultado
              {produtosFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabela */}
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
                {/* Cabeçalho "Custo" com pílula azul */}
                <Th
                  column="precoCusto"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[10%]"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    Custo
                  </span>
                </Th>
                {/* Cabeçalho "Venda" com pílula esmeralda */}
                <Th
                  column="precoVenda"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="w-[10%]"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    Venda
                  </span>
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
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <EmptyState query={busca} onClear={() => setBusca("")} />
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totalizadores estratégicos */}
        {produtosFiltrados.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
            <p className="text-xs text-slate-400">
              Exibindo{" "}
              <span className="font-medium text-slate-600">
                {produtosFiltrados.length}
              </span>{" "}
              de{" "}
              <span className="font-medium text-slate-600">
                {produtos.length}
              </span>{" "}
              produto{produtos.length !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Unidades */}
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">
                  Unidades
                </p>
                <p className="text-sm font-bold text-slate-700 tabular-nums">
                  {totalUnidades.toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="w-px h-6 bg-slate-200" />

              {/* Custo total */}
              <div className="text-right">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide leading-none mb-0.5">
                  Total Custo
                </p>
                <p className="text-sm font-bold text-blue-600 tabular-nums">
                  {brl(totalCusto)}
                </p>
              </div>

              <div className="w-px h-6 bg-slate-200" />

              {/* Valor de venda */}
              <div className="text-right">
                <p className="text-[10px] text-emerald-500 uppercase tracking-wide leading-none mb-0.5">
                  Total Venda
                </p>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">
                  {brl(totalVenda)}
                </p>
              </div>

              <div className="w-px h-6 bg-slate-200" />

              {/* Lucro bruto */}
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">
                  Lucro Bruto
                </p>
                <p className="text-sm font-bold text-slate-700 tabular-nums">
                  {brl(lucroBruto)}
                </p>
              </div>

              <div className="w-px h-6 bg-slate-200" />

              {/* Margem média ponderada */}
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">
                  Margem Média
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${margemClasses(margemMedia).text}`}
                >
                  {margemMedia.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
