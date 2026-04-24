import { useState, useEffect } from "react";
import { X, Save, Barcode } from "lucide-react";
// Mantendo o seu caminho de importação original
import { useInventory } from "../../context/InventoryContext";

export default function ModalAddProduto({ isOpen, onClose, productToEdit }) {
  const { addProduct, updateProduct } = useInventory();

  const initialState = {
    barcode: "",
    nome: "",
    categoria: "",
    qtd: 0,
    precoCusto: 0,
    precoVenda: 0,
  };

  const [formData, setFormData] = useState(initialState);

  // EFFEITO DE EDIÇÃO: Sincroniza o form quando abre para editar ou limpa para novo
  useEffect(() => {
    if (productToEdit) {
      setFormData(productToEdit);
    } else {
      setFormData(initialState);
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Lógica de status automática (MANTIDA)
    const statusFinal =
      formData.qtd <= 0
        ? "esgotado"
        : formData.qtd < 5
          ? "estoque_baixo"
          : "em_estoque";

    const dadosProcessados = { ...formData, status: statusFinal };

    if (productToEdit) {
      // Se estamos editando, usamos a função de update
      updateProduct(productToEdit.id, dadosProcessados);
    } else {
      // Se é novo, usamos a função de adicionar
      addProduct({ ...dadosProcessados, id: Date.now() });
    }

    // Limpa e fecha
    setFormData(initialState);
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
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Categoria
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm"
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
              />
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-colors"
            >
              <Save size={16} /> {productToEdit ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}