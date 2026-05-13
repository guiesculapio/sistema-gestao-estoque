import { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  ShoppingCart,
  Plus,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLO 1: Componente de Venda com Tratamento de Erro
// ═══════════════════════════════════════════════════════════════════════════════

export function SaleCard({ productId, productName, availableStock }) {
  const { recordOutbound } = useInventory();
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSale = async () => {
    setProcessing(true);
    setFeedback(null);

    const result = await recordOutbound(productId, quantity, "venda");

    if (result.success) {
      setFeedback({
        type: "success",
        message: `✅ Venda confirmada: ${quantity}x ${productName}`,
      });
      setQuantity(1);
    } else {
      // ✅ TRATAMENTO ESPECÍFICO DE ERRO DE ESTOQUE
      if (result.type === "INSUFFICIENT_STOCK") {
        setFeedback({
          type: "error",
          message: `⚠️ Estoque insuficiente!\n${result.error}`,
          isStockError: true,
        });
      } else {
        setFeedback({
          type: "error",
          message: `❌ Erro: ${result.error}`,
        });
      }
    }

    setProcessing(false);

    // Auto-limpar feedback após 5 segundos
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-2">{productName}</h3>

      {/* Status de Estoque */}
      <div className="mb-4 text-sm">
        <p className="text-slate-600">
          Disponível:{" "}
          <span
            className={`font-bold ${
              availableStock === 0
                ? "text-red-600"
                : availableStock <= 5
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {availableStock} un.
          </span>
        </p>
      </div>

      {/* Input de Quantidade */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 block mb-1">Quantidade</label>
        <input
          type="number"
          min="1"
          max={availableStock}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, parseInt(e.target.value) || 1))
          }
          disabled={processing || availableStock === 0}
          className="w-full border border-slate-300 rounded px-2 py-2 text-sm disabled:bg-slate-100"
        />
      </div>

      {/* Feedback de Status */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded text-sm flex items-start gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="whitespace-pre-line">{feedback.message}</p>
            {feedback.isStockError && (
              <p className="text-xs mt-1 opacity-75">
                💡 Dica: Reponha o estoque antes de continuar
              </p>
            )}
          </div>
        </div>
      )}

      {/* Botão de Venda */}
      <button
        onClick={handleSale}
        disabled={
          processing || quantity > availableStock || availableStock === 0
        }
        className={`w-full py-2 px-4 rounded font-medium text-white text-sm flex items-center justify-center gap-2 transition-colors ${
          processing || quantity > availableStock || availableStock === 0
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
        }`}
      >
        {processing ? (
          <>
            <Loader size={16} className="animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <ShoppingCart size={16} />
            Registrar Venda
          </>
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLO 2: Modal de Reposição com Validação Completa
// ═══════════════════════════════════════════════════════════════════════════════

export function RestockingModal({
  isOpen,
  productId,
  productName,
  currentStock,
  onClose,
}) {
  const { recordInbound } = useInventory();
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("reposição");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRestocking = async () => {
    // Validações
    if (!quantity || parseInt(quantity) <= 0) {
      setError("Digite uma quantidade válida (maior que zero)");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await recordInbound(
      productId,
      parseInt(quantity),
      reason || "reposição manual"
    );

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setQuantity("");
        setReason("reposição");
        setSuccess(false);
      }, 2000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        {/* Cabeçalho */}
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Reposição: {productName}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Estoque atual:{" "}
          <span className="font-semibold">{currentStock} un.</span>
        </p>

        {/* Campos de Entrada */}
        <div className="space-y-4 mb-6">
          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantidade a adicionar
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 50"
              disabled={loading}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo da reposição
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
            >
              <option value="reposição">Reposição padrão</option>
              <option value="devolução">Devolução de cliente</option>
              <option value="ajuste">Ajuste de estoque</option>
              <option value="transferência">Transferência</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm flex items-start gap-2">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>✅ Reposição registrada com sucesso!</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2">
          <button
            onClick={handleRestocking}
            disabled={loading || !quantity}
            className={`flex-1 py-2 px-4 rounded font-medium text-white text-sm flex items-center justify-center gap-2 transition-colors ${
              loading || !quantity
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-600 active:bg-teal-700"
            }`}
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus size={16} />
                Confirmar
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded font-medium bg-slate-200 text-slate-800 text-sm hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLO 3: Tabela de Produtos com Ações de Venda/Reposição
// ═══════════════════════════════════════════════════════════════════════════════

export function ProductsTable() {
  const { products, loading, recordOutbound, recordInbound } = useInventory();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [actions, setActions] = useState({}); // Rastrear ações por produto

  const handleQuickSale = async (productId) => {
    setActions((prev) => ({ ...prev, [productId]: "loading" }));

    const result = await recordOutbound(productId, 1, "venda rápida");

    if (result.success) {
      setActions((prev) => ({ ...prev, [productId]: "success" }));
      setTimeout(
        () => setActions((prev) => ({ ...prev, [productId]: null })),
        2000
      );
    } else {
      setActions((prev) => ({
        ...prev,
        [productId]: {
          type: "error",
          message: result.error,
        },
      }));
      setTimeout(
        () => setActions((prev) => ({ ...prev, [productId]: null })),
        3000
      );
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">
                Produto
              </th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">
                Preço
              </th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">
                Estoque
              </th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">
                Mínimo
              </th>
              <th className="px-4 py-2 text-center font-semibold text-slate-700">
                Status
              </th>
              <th className="px-4 py-2 text-center font-semibold text-slate-700">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const action = actions[product.id];
              const isLowStock = product.current_stock <= product.min_stock;
              const isOutOfStock = product.current_stock === 0;

              return (
                <tr
                  key={product.id}
                  className="border-b border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.category}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      isOutOfStock
                        ? "text-red-600"
                        : isLowStock
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {product.current_stock}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {product.min_stock}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isOutOfStock
                          ? "bg-red-50 text-red-700"
                          : isLowStock
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isOutOfStock ? "Esgotado" : isLowStock ? "Baixo" : "OK"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Vender */}
                      <button
                        onClick={() => handleQuickSale(product.id)}
                        disabled={
                          isOutOfStock ||
                          (typeof action === "object" &&
                            action.type === "loading")
                        }
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          typeof action === "object" && action.type === "error"
                            ? "bg-red-50 text-red-600"
                            : action === "success"
                              ? "bg-emerald-50 text-emerald-600"
                              : isOutOfStock
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`}
                      >
                        {typeof action === "object" && action.type === "error"
                          ? "❌"
                          : action === "success"
                            ? "✅"
                            : action === "loading"
                              ? "⏳"
                              : "Vender"}
                      </button>

                      {/* Reposição */}
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowRestockModal(true);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                      >
                        Reposição
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Reposição */}
      {selectedProduct && (
        <RestockingModal
          isOpen={showRestockModal}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentStock={selectedProduct.current_stock}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLO 4: Hook Customizado para Lógica de Venda Completa
// ═══════════════════════════════════════════════════════════════════════════════

export function useSalesFlow() {
  const { recordOutbound, products } = useInventory();
  const [cart, setCart] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const addToCart = (productId, quantity) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setMessage({
        type: "error",
        text: "Carrinho vazio",
      });
      return;
    }

    setProcessing(true);
    const saleId = `SALE-${Date.now()}`;
    const results = [];

    for (const item of cart) {
      const result = await recordOutbound(
        item.id,
        item.quantity,
        "venda",
        saleId
      );
      results.push(result);
    }

    const allSuccess = results.every((r) => r.success);

    if (allSuccess) {
      setMessage({
        type: "success",
        text: `✅ Venda completada! ${cart.length} produtos vendidos.`,
      });
      setCart([]);
    } else {
      const failures = results.filter((r) => !r.success);
      setMessage({
        type: "error",
        text: `⚠️ ${failures.length} produto(s) falharam na venda. Verifique o estoque.`,
      });
    }

    setProcessing(false);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    completeSale,
    processing,
    message,
  };
}

export default ProductsTable;
