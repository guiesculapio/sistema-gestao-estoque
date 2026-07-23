import { useState, useEffect } from "react";
import { X, Save, Barcode, Plus, Check, AlertCircle } from "lucide-react";
// Mantendo o seu caminho de importação original
import { useInventory } from "../../context/InventoryContext";
import { useCategories } from "../../hooks/useCategories";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { computeStockStatus } from "../../lib/stock";

export default function ModalAddProduto({ isOpen, onClose, productToEdit }) {
  const { addProduct, updateProduct } = useInventory();
  const {
    categories,
    loading: loadingCategories,
    createCategory,
  } = useCategories();
  const { preferences: userPreferences } = useUserPreferences();

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const initialState = {
    barcode: "",
    nome: "",
    categoria_id: null,
    qtd: 0,
    precoCusto: 0,
    precoVenda: 0,
  };

  const [formData, setFormData] = useState(initialState);

  // EFFEITO DE EDIÇÃO: Sincroniza o form quando abre para editar ou limpa para novo
  useEffect(() => {
    if (productToEdit) {
      setFormData({
        ...productToEdit,
        categoria_id:
          productToEdit.categoria_id != null &&
          productToEdit.categoria_id !== ""
            ? Number(productToEdit.categoria_id)
            : null,
      });
    } else {
      setFormData(initialState);
    }
    // Limpa erros ao (re)abrir o modal ou trocar de produto.
    setFormError(null);
    setCategoryError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Garante que category_id é um inteiro válido (> 0) antes de mandar pro Supabase.
    // Sem isso, "" cairia em Number("") = 0 e quebraria a FK em categories (23503).
    const categoriaIdNum = Number(formData.categoria_id);
    if (!Number.isInteger(categoriaIdNum) || categoriaIdNum <= 0) {
      setCategoryError("Selecione uma categoria válida antes de salvar.");
      return;
    }

    const statusFinal = computeStockStatus(
      { qtd: formData.qtd, min_stock: formData.min_stock ?? null },
      userPreferences
    );

    const dadosProcessados = {
      ...formData,
      categoria_id: categoriaIdNum,
      status: statusFinal,
    };

    setSaving(true);
    const result = productToEdit
      ? await updateProduct(productToEdit.id, dadosProcessados)
      : await addProduct(dadosProcessados);
    setSaving(false);

    // Só fecha se salvou de verdade. Em erro (ex.: duplicata 23505), mostra
    // a mensagem inline e mantém o modal aberto com os dados preenchidos.
    if (!result?.success) {
      setFormError(result?.error || "Não foi possível salvar o produto.");
      return;
    }

    setFormData(initialState);
    setCategoryError(null);
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">
            {productToEdit ? "Editar Produto" : "Novo Produto"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* BANNER DE ERRO (ex.: produto duplicado) */}
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* CAMPO: CÓDIGO DE BARRAS */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">
              <Barcode size={14} className="text-slate-400" />
              Código de Barras / SKU
            </label>
            <input
              required
              type="text"
              placeholder="Bipe o código ou digite..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm font-mono"
              value={formData.barcode}
              onChange={(e) =>
                setFormData({ ...formData, barcode: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Nome do Produto
            </label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase">
                  Categoria
                </label>
                {!creatingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingCategory(true);
                      setCategoryError(null);
                    }}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5"
                  >
                    <Plus size={11} /> Nova
                  </button>
                )}
              </div>

              {creatingCategory ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome da categoria"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={savingCategory}
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    disabled={savingCategory || !newCategoryName.trim()}
                    onClick={async () => {
                      setSavingCategory(true);
                      setCategoryError(null);
                      const result = await createCategory(newCategoryName);
                      setSavingCategory(false);
                      if (result.success) {
                        setFormData((prev) => ({
                          ...prev,
                          categoria_id: result.category.id,
                        }));
                        setNewCategoryName("");
                        setCreatingCategory(false);
                      } else {
                        setCategoryError(result.error);
                      }
                    }}
                    className="px-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    aria-label="Salvar categoria"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingCategory(false);
                      setNewCategoryName("");
                      setCategoryError(null);
                    }}
                    disabled={savingCategory}
                    className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    aria-label="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <select
                  required
                  disabled={loadingCategories || categories.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  value={formData.categoria_id ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setFormData({
                      ...formData,
                      categoria_id: raw === "" ? null : Number(raw),
                    });
                    setCategoryError(null);
                  }}
                >
                  <option value="" disabled>
                    {loadingCategories
                      ? "Carregando categorias..."
                      : categories.length === 0
                        ? "Nenhuma categoria cadastrada"
                        : "Selecione uma categoria"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              {categoryError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={11} /> {categoryError}
                </p>
              )}
              {!creatingCategory &&
                !loadingCategories &&
                categories.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Clique em &quot;+ Nova&quot; para criar sua primeira categoria.
                  </p>
                )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Quantidade
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm"
                value={formData.qtd}
                onChange={(e) =>
                  setFormData({ ...formData, qtd: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm"
                value={formData.precoCusto}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precoCusto: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm"
                value={formData.precoVenda}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precoVenda: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed"
            >
              <Save size={16} />{" "}
              {saving
                ? "Salvando..."
                : productToEdit
                  ? "Atualizar"
                  : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}