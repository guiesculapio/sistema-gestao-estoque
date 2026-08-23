import { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Tags,
  AlertTriangle,
  Save,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
  Search,
  Info,
  AlertCircle,
  UserX,
  CheckCircle2,
} from "lucide-react";

import { useCategories } from "../hooks/useCategories";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import {
  updateCategory as supabaseUpdateCategory,
  deleteCategory as supabaseDeleteCategory,
  requestAccountDeletion,
} from "../lib/supabaseClient";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../lib/stock";
import ConfirmModal from "../components/ConfirmModal";

const TABS = [
  {
    id: "categorias",
    label: "Categorias",
    icon: Tags,
    description: "Gerencie as categorias usadas para classificar seus produtos",
  },
  {
    id: "estoque",
    label: "Limiar de Estoque Baixo",
    icon: AlertTriangle,
    description:
      "Defina a partir de qual quantidade um produto é considerado com estoque baixo",
  },
  {
    id: "conta",
    label: "Conta",
    icon: UserX,
    description: "Informações da conta e exclusão de dados",
  },
];

// ─────────────────────────────────────────────────────────────
// TAB: LOW STOCK THRESHOLD
// ─────────────────────────────────────────────────────────────
function LimiarEstoqueSection() {
  const {
    preferences,
    loading: loadingPrefs,
    updatePreferences,
  } = useUserPreferences();
  const { products, updateProduct } = useInventory();

  const [globalDraft, setGlobalDraft] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [globalOk, setGlobalOk] = useState(false);

  useEffect(() => {
    if (!loadingPrefs) {
      setGlobalDraft(String(preferences.low_stock_threshold ?? ""));
    }
  }, [loadingPrefs, preferences.low_stock_threshold]);

  const currentGlobal =
    preferences.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const dirty =
    String(globalDraft).trim() !== "" &&
    Number(globalDraft) !== Number(currentGlobal);

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    setGlobalError(null);
    setGlobalOk(false);
    const value = Number(globalDraft);
    if (!Number.isInteger(value) || value < 0) {
      setGlobalError("Informe um inteiro maior ou igual a zero");
      setSavingGlobal(false);
      return;
    }
    const { success, error } = await updatePreferences(value);
    setSavingGlobal(false);
    if (!success) {
      setGlobalError(error);
      return;
    }
    setGlobalOk(true);
    setTimeout(() => setGlobalOk(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Global threshold */}
      <div>
        <h3 className="text-sm font-bold text-slate-700">
          Limiar global do usuário
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
          Quando um produto fica abaixo desse valor ele entra em{" "}
          <span className="font-semibold">estoque baixo</span>. Vale para todos
          os produtos que <em>não</em> tenham um limiar próprio configurado
          abaixo.
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Limiar atual
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={globalDraft}
              onChange={(e) => setGlobalDraft(e.target.value)}
              disabled={loadingPrefs || savingGlobal}
              className="mt-1 block w-40 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all disabled:opacity-60"
            />
          </label>

          <button
            type="button"
            onClick={handleSaveGlobal}
            disabled={!dirty || savingGlobal || loadingPrefs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg shadow-sm transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {savingGlobal ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Salvando...
              </>
            ) : globalOk ? (
              <>
                <Check size={13} /> Salvo
              </>
            ) : (
              <>
                <Save size={13} /> Salvar limiar
              </>
            )}
          </button>

          {globalError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={11} /> {globalError}
            </p>
          )}
        </div>
      </div>

      {/* Per-product threshold */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-700">
              Limiar específico por produto
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Deixe em branco para o produto seguir o limiar global. Um valor
              preenchido{" "}
              <span className="font-semibold text-slate-700">
                sobrescreve o global apenas para este produto
              </span>
              .
            </p>
          </div>
          <div className="text-xs text-slate-500 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Info size={12} className="text-slate-400" />
            {products.length} produto(s)
          </div>
        </div>

        <ProdutosMinStockTable
          products={products}
          globalThreshold={currentGlobal}
          updateProduct={updateProduct}
        />
      </div>
    </div>
  );
}

function ProdutosMinStockTable({ products, globalThreshold, updateProduct }) {
  const [busca, setBusca] = useState("");
  const [drafts, setDrafts] = useState({}); // id -> string
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({}); // id -> message

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const base = termo
      ? products.filter((p) => p.nome.toLowerCase().includes(termo))
      : products;
    return [...base].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR")
    );
  }, [busca, products]);

  const getDraft = (p) => {
    if (drafts[p.id] !== undefined) return drafts[p.id];
    return p.min_stock == null ? "" : String(p.min_stock);
  };

  const dirty = (p) => {
    const d = getDraft(p);
    const persisted = p.min_stock == null ? "" : String(p.min_stock);
    return d.trim() !== persisted;
  };

  const handleSaveRow = async (p) => {
    setSavingId(p.id);
    setRowError((prev) => ({ ...prev, [p.id]: null }));

    const raw = getDraft(p).trim();
    let payloadMin;
    if (raw === "") {
      payloadMin = null;
    } else {
      const v = Number(raw);
      if (!Number.isInteger(v) || v < 0) {
        setRowError((prev) => ({
          ...prev,
          [p.id]: "Use um inteiro ≥ 0 ou deixe em branco",
        }));
        setSavingId(null);
        return;
      }
      payloadMin = v;
    }

    const { success, error } = await updateProduct(p.id, {
      min_stock: payloadMin,
    });
    setSavingId(null);
    if (!success) {
      setRowError((prev) => ({
        ...prev,
        [p.id]: error || "Falha ao salvar",
      }));
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  };

  if (products.length === 0) {
    return (
      <div className="mt-4 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-500">
          Você ainda não tem produtos cadastrados.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white border border-slate-200/80 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-8 pr-8 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[110px]">
                Qtd. atual
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[180px]">
                Limiar próprio
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[130px]">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const usaGlobal = p.min_stock == null;
              const err = rowError[p.id];
              return (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-800">{p.nome}</span>
                      {usaGlobal ? (
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          usa o global ({globalThreshold})
                        </span>
                      ) : (
                        <span className="text-[11px] text-teal-600 mt-0.5">
                          limiar próprio ignora o global
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-slate-600 tabular-nums">
                      {p.qtd}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder={`(global: ${globalThreshold})`}
                      value={getDraft(p)}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      disabled={savingId === p.id}
                      className="w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all disabled:opacity-60"
                    />
                    {err && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle size={10} /> {err}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleSaveRow(p)}
                      disabled={!dirty(p) || savingId === p.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-md shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {savingId === p.id ? (
                        <>
                          <Loader2 size={11} className="animate-spin" /> ...
                        </>
                      ) : (
                        <>
                          <Save size={11} /> Salvar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    Nenhum produto para &ldquo;{busca}&rdquo;.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: CATEGORIES
// ─────────────────────────────────────────────────────────────
function CategoriasSection() {
  const {
    categories,
    loading: loadingCategories,
    refetch,
  } = useCategories();

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rowError, setRowError] = useState({}); // id -> message
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null); // { id, name } da categoria

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setRowError((prev) => ({ ...prev, [cat.id]: null }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const commitEdit = async (cat) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setRowError((prev) => ({
        ...prev,
        [cat.id]: "Informe um nome para a categoria",
      }));
      return;
    }
    if (trimmed === cat.name) {
      cancelEdit();
      return;
    }
    setSavingId(cat.id);
    setRowError((prev) => ({ ...prev, [cat.id]: null }));
    const { category, error } = await supabaseUpdateCategory(cat.id, trimmed);
    setSavingId(null);
    if (error || !category) {
      setRowError((prev) => ({
        ...prev,
        [cat.id]: error || "Não foi possível atualizar",
      }));
      return;
    }
    await refetch();
    cancelEdit();
  };

  const handleDeleteClick = (cat) => {
    setConfirmDeleteCat({ id: cat.id, name: cat.name });
  };

  const handleDeleteCatConfirm = async () => {
    const cat = confirmDeleteCat;
    setDeletingId(cat.id);
    setRowError((prev) => ({ ...prev, [cat.id]: null }));
    const { success, error } = await supabaseDeleteCategory(cat.id);
    setDeletingId(null);
    if (!success) {
      setRowError((prev) => ({
        ...prev,
        [cat.id]: error || "Não foi possível excluir",
      }));
      setConfirmDeleteCat(null);
      return;
    }
    await refetch();
    setConfirmDeleteCat(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-700">
          Categorias de produtos
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
          Renomeie inline ou remova categorias que não estão em uso. Para criar
          novas, use o botão &ldquo;+ Nova&rdquo; no modal de cadastro de
          produto. Categorias com produtos vinculados não podem ser excluídas.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden">
        {loadingCategories ? (
          <div className="p-10 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 size={14} className="animate-spin" /> Carregando
            categorias...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">
              Você ainda não tem categorias.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre a primeira no modal de novo produto.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[180px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const isSaving = savingId === cat.id;
                const isDeleting = deletingId === cat.id;
                const err = rowError[cat.id];
                return (
                  <tr
                    key={cat.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(cat);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          disabled={isSaving}
                          className="w-full max-w-sm px-2.5 py-1.5 text-sm bg-white border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-100 outline-none disabled:opacity-60"
                        />
                      ) : (
                        <span className="text-sm text-slate-800">
                          {cat.name}
                        </span>
                      )}
                      {err && (
                        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle size={10} /> {err}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => commitEdit(cat)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-md shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              {isSaving ? (
                                <Loader2
                                  size={11}
                                  className="animate-spin"
                                />
                              ) : (
                                <Check size={11} />
                              )}
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-60"
                            >
                              <X size={11} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(cat)}
                              disabled={isDeleting}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-60"
                              title="Renomear"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(cat)}
                              disabled={isDeleting}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                              title="Excluir"
                            >
                              {isDeleting ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteCat}
        onConfirm={handleDeleteCatConfirm}
        onCancel={() => setConfirmDeleteCat(null)}
        title="Excluir categoria"
        message={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-slate-900">{confirmDeleteCat?.name}</strong>?
            Categorias com produtos vinculados não podem ser excluídas.
          </>
        }
        confirmLabel="Excluir categoria"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ACCOUNT (LGPD deletion request)
// ─────────────────────────────────────────────────────────────────────────────
function ContaSection() {
  const { user, signOut } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    const result = await requestAccountDeletion();
    setDeleteLoading(false);
    setShowDeleteConfirm(false);

    if (result?.error) {
      setDeleteError(result.error);
      return;
    }

    setDeleteSuccess(true);
    setTimeout(() => {
      signOut();
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-700">
          Informações da conta
        </h3>
        <div className="mt-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Email cadastrado
          </span>
          <p className="mt-1 text-sm text-slate-800">{user?.email}</p>
        </div>
      </div>

      <div className="border border-red-200 bg-red-50 rounded-xl p-5">
        <h3 className="text-red-700 font-bold text-sm">Zona de perigo</h3>
        <h4 className="text-slate-900 font-semibold text-sm mt-3">
          Excluir minha conta
        </h4>
        <p className="text-slate-500 text-xs mt-1 mb-4">
          Ao solicitar a exclusão, todos os seus dados (produtos, vendas,
          relatórios e configurações) serão removidos permanentemente em até
          15 dias, conforme a LGPD. Esta ação não pode ser desfeita.
        </p>

        {deleteSuccess ? (
          <div className="flex items-center gap-2 text-brand text-sm font-medium">
            <CheckCircle2 size={16} />
            Solicitação enviada. Seus dados serão removidos em até 15 dias.
            Você será desconectado em instantes.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading}
              className="inline-flex items-center gap-2 border-2 border-red-500 text-red-600 font-bold rounded-xl px-4 py-2.5 text-sm hover:bg-red-500 hover:text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} />
              {deleteLoading ? "Enviando..." : "Solicitar exclusão de conta"}
            </button>
            {deleteError && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={11} /> {deleteError}
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Solicitar exclusão de conta"
        message="Tem certeza? Todos os seus dados serão excluídos permanentemente em até 15 dias. Esta ação não pode ser desfeita."
        confirmLabel="Excluir minha conta"
        danger={true}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState("categorias");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm">
            <Settings size={16} className="text-teal-300" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Configurações
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Preferências da conta e regras de operação do estoque
            </p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200/80 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3.5 text-sm font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? "border-teal-500 text-teal-700 bg-teal-50/40"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-teal-500" : "text-slate-400"}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <div className="p-6">
          {activeTab === "categorias" && <CategoriasSection />}
          {activeTab === "estoque" && <LimiarEstoqueSection />}
          {activeTab === "conta" && <ContaSection />}
        </div>
      </div>
    </div>
  );
}
